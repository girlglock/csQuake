import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors, clipVelocity } from "../physics/qmath";
import { traceHull, testPosition, SolidBox } from "../physics/trace";
import { safeRemove, SkillTag, findSpawnMarkers, matchesSkill, spawnTagOf, hasSpawnVar, hasTag } from "../entutil";
import { Combatant, T_Damage } from "../combat/combat";
import { Loot } from "../items/pickups";
import { Sounds } from "../game/sound";
import { Particles } from "../game/particles";
import {
    Monster, Range, NodeRoute,
    V0, RAD, NODIR, anglemod, yawDelta, vectoyaw,
    keyOf, findByNamePrefix, loadNodeRoutes, nearestWaypoint,
} from "./monster";
import { Soldier } from "./soldier";
import { Dog } from "./dog";
import { Ogre } from "./ogre";
import { Knight } from "./knight";
import { Demon } from "./demon";
import { Zombie } from "./zombie";
import { Wizard } from "./wizard";
import { Shambler } from "./shambler";
import { Boss } from "./boss";

const AI_ALIASES: Record<string, string> = {
    army: "monster_army", grunt: "monster_army", soldier: "monster_army",
    dog: "monster_dog",
    ogre: "monster_ogre",
    knight: "monster_knight",
    demon: "monster_demon1", demon1: "monster_demon1", fiend: "monster_demon1",
    zombie: "monster_zombie",
    wizard: "monster_wizard", scrag: "monster_wizard",
    shambler: "monster_shambler", sham: "monster_shambler",
};
const shortSpecies = (className: string): string => className.replace(/^monster_/, "");

const PUSH_MOVER_RE = /^func_(door|button|movelinear|plat)/;
const PD = 0.70710678;
const PUSH_NUDGE_DIRS: Vec3[] = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0),
    new Vec3(PD, PD, 0), new Vec3(-PD, PD, 0), new Vec3(PD, -PD, 0), new Vec3(-PD, -PD, 0),
    new Vec3(0, 0, 1),
];
const PUSH_NUDGE_STEPS = [2, 6, 12, 20, 32, 48];

const MAKE: Record<string, { tmpl: string; make: (p: Entity, o: Vec3, y: number) => Monster }> = {
    monster_army:     { tmpl: C.SOLDIER_TEMPLATE_NAME,  make: (p, o, y) => new Soldier(p, o, y) },
    monster_dog:      { tmpl: C.DOG_TEMPLATE_NAME,      make: (p, o, y) => new Dog(p, o, y) },
    monster_ogre:     { tmpl: C.OGRE_TEMPLATE_NAME,     make: (p, o, y) => new Ogre(p, o, y) },
    monster_knight:   { tmpl: C.KNIGHT_TEMPLATE_NAME,   make: (p, o, y) => new Knight(p, o, y) },
    monster_demon1:   { tmpl: C.DEMON_TEMPLATE_NAME,    make: (p, o, y) => new Demon(p, o, y) },
    monster_zombie:   { tmpl: C.ZOMBIE_TEMPLATE_NAME,   make: (p, o, y) => new Zombie(p, o, y) },
    monster_wizard:   { tmpl: C.WIZARD_TEMPLATE_NAME,   make: (p, o, y) => new Wizard(p, o, y) },
    monster_shambler: { tmpl: C.SHAMBLER_TEMPLATE_NAME, make: (p, o, y) => new Shambler(p, o, y) },
    monster_boss:     { tmpl: C.BOSS_TEMPLATE_NAME,     make: (p, o, y) => new Boss(p, o, y) },
};

export class Enemies {
    monsters: Monster[] = [];
    private playerOrigin = new Vec3(0, 0, 0);
    private playerEye = new Vec3(0, 0, 0);
    private playerVel = new Vec3(0, 0, 0);
    private props: Entity[] = [];
    private visIgnore: Entity[] = [];
    now = 0;

    player: Combatant | undefined;
    pawn: Entity | undefined;
    private playerAlive = true;
    private playerInvisible = false;
    private killed = 0;
    private spawnTag: SkillTag = "normal";
    private difficulty = "normal";
    private triggerConns: number[] = [];
    private aiDisabled = new Set<string>();

    private sightEntity: Monster | undefined;
    private sightEntityTime = 0;
    private playerShowHostile = 0;
    sounds: Sounds | undefined;
    private particles: Particles | undefined;
    private dropSink: ((origin: Vec3, loot: Loot, now: number) => void) | undefined;
    private gibSink: ((origin: Vec3, head: string | null, now: number) => void) | undefined;
    private static readonly GIB_HEAD: Record<string, string> = {
        monster_army: "head_soldier", monster_dog: "head_dog",
        monster_ogre: "head_ogre", monster_knight: "head_knight", monster_demon1: "head_demon",
        monster_zombie: "head_zombie", monster_wizard: "head_wizard",
        monster_shambler: "head_shambler",
    };
    private grenadeSink: ((muzzle: Vec3, vel: Vec3, owner: Entity, now: number) => void) | undefined;
    private zombieGibSink: ((muzzle: Vec3, vel: Vec3, owner: Entity, now: number) => void) | undefined;
    private spikeSink: ((origin: Vec3, dir: Vec3, owner: Entity, now: number) => void) | undefined;
    private playerPushSink: ((box: SolidBox) => void) | undefined;
    private bossMissileSink: ((muzzle: Vec3, dir: Vec3, owner: Entity, now: number) => void) | undefined;
    private bossDeathSink: ((boss: Boss, now: number) => void) | undefined;
    private bossSpawned = false;

    setPlayer(player: Combatant, pawn: Entity): void {
        this.player = player;
        this.pawn = pawn;
    }

    setPlayerAlive(v: boolean): void {
        this.playerAlive = v;
    }

    setPlayerInvisible(v: boolean): void {
        this.playerInvisible = v;
    }

    aiToggle(token: string, force?: boolean): string {
        const t = token.trim().toLowerCase();
        if (!t) {
            const off = [...this.aiDisabled].map(shortSpecies).sort();
            return off.length ? `AI frozen: ${off.join(", ")}` : "AI running for every species";
        }
        const uniq = (a: string[]): string[] => a.filter((v, i) => a.indexOf(v) === i);
        const targets = t === "all"
            ? uniq(Object.keys(AI_ALIASES).map((k) => AI_ALIASES[k]))
            : [t.startsWith("monster_") ? t : AI_ALIASES[t]].filter((v): v is string => !!v);
        if (targets.length === 0) {
            return `unknown monster "${token}" - try: army dog ogre knight fiend zombie scrag shambler (or all)`;
        }
        const out: string[] = [];
        for (const cn of targets) {
            const freeze = force === undefined ? !this.aiDisabled.has(cn) : !force;
            if (freeze) this.aiDisabled.add(cn); else this.aiDisabled.delete(cn);
            out.push(`${shortSpecies(cn)} AI ${freeze ? "OFF" : "ON"}`);
        }
        return out.join(", ");
    }

    setSounds(sounds: Sounds): void {
        this.sounds = sounds;
    }

    setParticles(particles: Particles): void {
        this.particles = particles;
    }

    private hitHook: (() => void) | undefined;
    setHitHook(fn: () => void): void {
        this.hitHook = fn;
    }

    private achievementSink: ((id: string) => void) | undefined;
    setAchievementSink(fn: (id: string) => void): void {
        this.achievementSink = fn;
    }

    bloodFx(at: Vec3, from: Vec3, now: number): void {
        const dir = at.subtract(from);
        this.particles?.burst("blood_impact", at, dir.length > 1 ? dir.normal : undefined, now);
    }

    beamFx(from: Vec3, to: Vec3, now: number): void {
        this.particles?.zap("lightning", from, to, now);
    }

    setDropSink(fn: (origin: Vec3, loot: Loot, now: number) => void): void {
        this.dropSink = fn;
    }

    setGibSink(fn: (origin: Vec3, head: string | null, now: number) => void): void {
        this.gibSink = fn;
    }

    setGrenadeSink(fn: (muzzle: Vec3, vel: Vec3, owner: Entity, now: number) => void): void {
        this.grenadeSink = fn;
    }

    setZombieGibSink(fn: (muzzle: Vec3, vel: Vec3, owner: Entity, now: number) => void): void {
        this.zombieGibSink = fn;
    }

    setSpikeSink(fn: (origin: Vec3, dir: Vec3, owner: Entity, now: number) => void): void {
        this.spikeSink = fn;
    }

    setPlayerPushSink(fn: (box: SolidBox) => void): void {
        this.playerPushSink = fn;
    }

    setBossMissileSink(fn: (muzzle: Vec3, dir: Vec3, owner: Entity, now: number) => void): void {
        this.bossMissileSink = fn;
    }

    setBossDeathSink(fn: (boss: Boss, now: number) => void): void {
        this.bossDeathSink = fn;
    }

    boss(): Boss | undefined {
        const b = this.monsters.find((m) => m instanceof Boss);
        return b instanceof Boss && b.state !== "dead" && !b.dormant ? b : undefined;
    }

    fireBossMissile(m: Monster, now: number): void {
        const tgt = this.tgtEye(m);
        const flat = new Vec3(tgt.x - m.origin.x, tgt.y - m.origin.y, 0);
        const fl = flat.length;
        const fwd = fl > 1e-3 ? flat.scale(1 / fl) : new Vec3(1, 0, 0);
        const org = m.origin.add(fwd.scale(C.BOSS_MUZZLE_FWD)).withZ(m.origin.z + C.BOSS_MUZZLE_UP);
        let d = new Vec3(tgt);
        if (this.spawnTag === "hard") {
            const t = d.subtract(org).length / C.BOSS_MISSILE_SPEED;
            d = d.add(new Vec3(this.playerVel.x, this.playerVel.y, 0).scale(t));
        }
        this.bossMissileSink?.(org, d.subtract(org).normal, m.prop, now);
    }

    lobGrenade(m: Monster, speed: number, up: number, now: number): void {
        const from = m.origin.withZ(m.origin.z + 16);
        const t = this.tgtOrigin(m);
        const vel = t.subtract(from).normal.scale(speed).withZ(up);
        this.grenadeSink?.(from, vel, m.prop, now);
    }

    lobZombieGib(m: Monster, speed: number, up: number, now: number): void {
        const from = m.origin.withZ(m.origin.z + 6);
        const t = this.tgtOrigin(m);
        const vel = t.subtract(from).normal.scale(speed).withZ(up);
        this.zombieGibSink?.(from, vel, m.prop, now);
    }

    fireSpike(m: Monster, muzzle: Vec3, aimAt: Vec3, now: number): void {
        this.spikeSink?.(muzzle, aimAt.subtract(muzzle).normal, m.prop, now);
    }

    emit(m: Monster, event: string): void {
        this.sounds?.play(event, m.sndName);
    }

    private afterDamage(m: Monster, wasAlive: boolean, now: number, byPlayer = false): void {
        if (!wasAlive) return;
        if (m.state === "dead") {
            if (m.dropped) return;
            m.dropped = true;
            this.killed++;
            if (m instanceof Boss) this.bossDeathSink?.(m, now);
            if (byPlayer && m.spawnMarker && m.spawnMarker.IsValid()) {
                css.EntFireAtTarget({ target: m.spawnMarker,
                    input: m instanceof Boss ? "FireUser2" : "FireUser1" });
            }
            if (m.health < m.def.gibHealth && this.gibSink) {
                this.gibSink(m.origin, Enemies.GIB_HEAD[m.def.className] ?? null, now);
                m.settled = true;
                if (m.prop.IsValid()) m.prop.Teleport({ position: new Vec3(0, 0, -16384) });
            } else {
                this.emit(m, m.def.snd.death);
            }
            if (m.def.dropShells > 0 && this.dropSink) {
                this.dropSink(m.origin, { shells: m.def.dropShells }, now);
            }
        } else if (m.state === "pain") {
            this.emit(m, m.painSound);
        }
    }

    killStats(): { killed: number; total: number } {
        return { killed: this.killed, total: this.monsters.length };
    }

    spawnAll(now: number, diff: string = C.DIFFICULTY_DEFAULT): void {
        this.despawnAll();
        this.killed = 0;
        this.sightEntity = undefined;
        this.sightEntityTime = 0;
        this.spawnTag = spawnTagOf(diff);
        this.difficulty = diff;
        const routes = loadNodeRoutes();
        this.spawnSpecies(C.SOLDIER_TEMPLATE_NAME, "Grunt", routes,
            C.SOLDIER_SPAWN_NAME, C.SOLDIER_SPAWN_ROAM_NAME, now, (p, o, y) => new Soldier(p, o, y));
        this.spawnSpecies(C.DOG_TEMPLATE_NAME, "Dog", routes,
            C.DOG_SPAWN_NAME, C.DOG_SPAWN_ROAM_NAME, now, (p, o, y) => new Dog(p, o, y));
        this.spawnSpecies(C.OGRE_TEMPLATE_NAME, "Ogre", routes,
            C.OGRE_SPAWN_NAME, C.OGRE_SPAWN_ROAM_NAME, now, (p, o, y) => new Ogre(p, o, y));
        this.spawnSpecies(C.KNIGHT_TEMPLATE_NAME, "Knight", routes,
            C.KNIGHT_SPAWN_NAME, C.KNIGHT_SPAWN_ROAM_NAME, now, (p, o, y) => new Knight(p, o, y));
        this.spawnSpecies(C.DEMON_TEMPLATE_NAME, "Fiend", routes,
            C.DEMON_SPAWN_NAME, C.DEMON_SPAWN_ROAM_NAME, now, (p, o, y) => new Demon(p, o, y));
        this.spawnSpecies(C.ZOMBIE_TEMPLATE_NAME, "Zombie", routes,
            C.ZOMBIE_SPAWN_NAME, C.ZOMBIE_SPAWN_ROAM_NAME, now, (p, o, y) => new Zombie(p, o, y));
        this.spawnSpecies(C.WIZARD_TEMPLATE_NAME, "Scrag", routes,
            C.WIZARD_SPAWN_NAME, C.WIZARD_SPAWN_ROAM_NAME, now, (p, o, y) => new Wizard(p, o, y));
        this.spawnSpecies(C.SHAMBLER_TEMPLATE_NAME, "Shambler", routes,
            C.SHAMBLER_SPAWN_NAME, C.SHAMBLER_SPAWN_ROAM_NAME, now, (p, o, y) => new Shambler(p, o, y));
        this.armBoss();
    }

    private armBoss(): void {
        this.bossSpawned = false;
        const mk = css.FindEntityByName(C.BOSS_SPAWN_NAME);
        if (!mk || !mk.IsValid()) return;
        const id = css.ConnectOutput(mk, "OnUser1", () => this.spawnBoss(mk, this.now));
        if (id !== undefined) this.triggerConns.push(id);
    }

    private spawnBoss(mk: Entity, now: number): void {
        if (this.bossSpawned || !mk.IsValid()) return;
        const tmpl = css.FindEntityByName(C.BOSS_TEMPLATE_NAME);
        if (!(tmpl instanceof PointTemplate)) {
            return;
        }
        const mo = new Vec3(mk.GetAbsOrigin());
        const yaw = mk.GetAbsAngles().yaw;
        const sp = tmpl.ForceSpawn(mo, { pitch: 0, yaw, roll: 0 });
        if (!sp || sp.length === 0) return;
        const boss = new Boss(sp[0], mo, yaw);
        boss.spawnMarker = mk;
        boss.maxHealth = Math.round(C.BOSS_HEALTH * (C.BOSS_HEALTH_SCALE[this.difficulty] ?? 1));
        boss.health = boss.maxHealth;
        boss.nextThink = now;
        boss.wake(now);
        this.monsters.push(boss);
        this.bossSpawned = true;
    }

    private spawnSpecies(
        tmplName: string, label: string, routes: NodeRoute[],
        stationaryName: string, roamPrefix: string, now: number,
        make: (prop: Entity, origin: Vec3, yaw: number) => Monster,
    ): void {
        const tmpl = css.FindEntityByName(tmplName);
        if (!tmpl) return;
        if (!(tmpl instanceof PointTemplate)) {
            return;
        }
        const groups: [Entity[], boolean][] = [
            [findSpawnMarkers(stationaryName, this.spawnTag), false],
            [findByNamePrefix(roamPrefix).filter((e) => matchesSkill(e.GetEntityName(), this.spawnTag)), true],
        ];
        let n = 0;
        let deferred = 0;
        for (const [markers, isRoam] of groups) {
            for (const mk of markers) {
                const aid = css.ConnectOutput(mk, "OnUser3", () => this.angerFromMarker(mk));
                if (aid !== undefined) this.triggerConns.push(aid);
                if (hasSpawnVar(mk.GetEntityName(), "trigger")) {
                    const id = css.ConnectOutput(mk, "OnUser2", () => {
                        if (this.monsters.some((m) => m.spawnMarker === mk && m.state !== "dead")) return;
                        this.spawnFromMarker(tmpl, mk, isRoam, label, tmplName, routes, make, this.now);
                    });
                    if (id !== undefined) this.triggerConns.push(id);
                    deferred++;
                    continue;
                }
                if (this.spawnFromMarker(tmpl, mk, isRoam, label, tmplName, routes, make, now)) n++;
            }
        }
        if (n || deferred) {
        }
    }

    private spawnFromMarker(
        tmpl: PointTemplate, mk: Entity, isRoam: boolean, label: string, tmplName: string,
        routes: NodeRoute[], make: (prop: Entity, origin: Vec3, yaw: number) => Monster, now: number,
    ): boolean {
        if (!mk.IsValid()) return false;
        const mo = new Vec3(mk.GetAbsOrigin());
        const pos = mo.withZ(mo.z + 8);
        const yaw = mk.GetAbsAngles().yaw;
        const sp = tmpl.ForceSpawn(pos, { pitch: 0, yaw, roll: 0 });
        if (!sp || sp.length === 0) {
            return false;
        }
        const m = make(sp[0], pos, yaw);
        const seat = this.dropToFloor(m, new Vec3(m.origin), C.MONSTER_SPAWN_DROP);
        if (seat) m.origin = seat;
        m.spawnMarker = mk;
        m.nextThink = now
            + (this.monsters.length % C.AI_THINK_STAGGER) * (C.AI_THINK_INTERVAL / C.AI_THINK_STAGGER);

        const route = routes.find((r) => keyOf(r.owner) === keyOf(mo));
        if (route) {
            m.route = route.points.map((p) => new Vec3(p));
            m.routeIdx = nearestWaypoint(m.route, m.origin);
            this.aimAt(m, m.route[m.routeIdx].x, m.route[m.routeIdx].y);
            m.state = "walk";
            m.play(m.def.anims.walk, true);
        } else if (isRoam) {
        }
        this.monsters.push(m);
        return true;
    }

    spawnOne(token: string, origin: Vec3, yaw: number, now: number): string {
        const t = token.trim().toLowerCase();
        if (!t) return "usage: qspawn <army|dog|ogre|knight|fiend|zombie|scrag|shambler>";
        const cn = t.startsWith("monster_") ? t : (AI_ALIASES[t] ?? "");
        const spec = cn ? MAKE[cn] : undefined;
        if (!spec) return `unknown monster "${token}" - try: army dog ogre knight fiend zombie scrag shambler`;
        const tmpl = css.FindEntityByName(spec.tmpl);
        if (!(tmpl instanceof PointTemplate)) return `no point_template "${spec.tmpl}" in this map`;
        const pos = origin.withZ(origin.z + 24);
        const sp = tmpl.ForceSpawn(pos, { pitch: 0, yaw, roll: 0 });
        if (!sp || sp.length === 0) return `${cn} ForceSpawn returned nothing`;
        const m = spec.make(sp[0], pos, yaw);
        const seat = this.dropToFloor(m, new Vec3(m.origin), 512);
        if (seat) m.origin = seat;
        m.idealYaw = yaw;
        m.nextThink = now
            + (this.monsters.length % C.AI_THINK_STAGGER) * (C.AI_THINK_INTERVAL / C.AI_THINK_STAGGER);
        m.prop.Teleport({
            position: m.origin.withZ(m.origin.z + m.def.modelZOfs),
            angles: { pitch: 0, yaw: yaw + m.def.modelYawOfs, roll: 0 },
        });
        this.monsters.push(m);
        return `spawned ${shortSpecies(cn)} at ${keyOf(m.origin)}`;
    }

    despawnAll(): void {
        for (const id of this.triggerConns) css.DisconnectOutput(id);
        this.triggerConns = [];
        for (const m of this.monsters) safeRemove(m.prop);
        this.monsters = [];
    }

    allProps(): Entity[] {
        return this.monsters.filter((m) => m.prop.IsValid()).map((m) => m.prop);
    }

    solidBoxes(): SolidBox[] {
        return this.monsters
            .filter((m) => m.prop.IsValid() && m.state !== "dead" && !m.hullOverride)
            .map((m) => m.box());
    }

    private angerFromMarker(mk: Entity): void {
        let woke = 0;
        for (const m of this.monsters) {
            if (m.spawnMarker !== mk || m.state === "dead") continue;
            m.enemy = undefined;
            m.oldEnemy = undefined;
            this.foundTarget(m, this.now);
            woke++;
        }
    }

    calmDown(): void {
        this.sightEntity = undefined;
        this.sightEntityTime = 0;
        for (const m of this.monsters) {
            if (m.state === "dead") continue;
            m.enemy = undefined;
            m.oldEnemy = undefined;
            m.searchTime = 0;
            this.idle(m);
        }
    }

    forgetPlayer(): void {
        this.sightEntity = undefined;
        this.sightEntityTime = 0;
        for (const m of this.monsters) {
            if (m.state === "dead" || m.state === "stand" || m.state === "walk") continue;
            if (m.enemy !== undefined) continue;
            m.oldEnemy = undefined;
            m.searchTime = 0;
            this.idle(m);
        }
    }

    private idle(m: Monster): void {
        m.aware = false;
        if (m.route.length >= 2) {
            m.state = "walk";
            m.routeIdx = nearestWaypoint(m.route, m.origin);
            this.aimAt(m, m.route[m.routeIdx].x, m.route[m.routeIdx].y);
            m.play(m.def.anims.walk, true);
        } else {
            m.state = "stand";
            m.play(m.def.anims.stand, true);
        }
    }

    damageFromPlayer(hitEnt: Entity | undefined, damage: number, hitPos: Vec3, now: number, weapon?: string): boolean {
        if (!hitEnt) return false;
        const m = this.monsters.find((x) => x.prop === hitEnt);
        if (!m || !m.takeDamage) return false;
        const dmg = m instanceof Boss ? damage * C.BOSS_WEAPON_DAMAGE_SCALE : damage;
        const wasAlive = m.state !== "dead";
        T_Damage(m, { inflictorCenter: this.playerEye, damage: dmg, byPlayer: true, time: now });
        if (wasAlive && m.state === "dead" && m instanceof Shambler) {
            if (weapon === "axe") this.achievementSink?.("close_shave");
            if (!m.everCastLightning) this.achievementSink?.("shambler_dance");
        }
        this.hitHook?.();
        m.enemy = undefined;
        m.oldEnemy = undefined;
        this.afterDamage(m, true, now, true);
        if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
        this.bloodFx(hitPos, this.playerEye, now);
        if (C.DEBUG) css.DebugSphere({ center: hitPos, radius: 4, duration: 0.5, color: { r: 255, g: 40, b: 40 } });
        return true;
    }

    hurtByLightning(hitEnt: Entity | undefined, now: number): boolean {
        if (!hitEnt) return false;
        const m = this.monsters.find((x) => x.prop === hitEnt);
        if (!m || !m.takeDamage) return false;
        const dmg = m instanceof Boss ? C.EVENT_LIGHTNING_BOSS_DAMAGE : C.EVENT_LIGHTNING_DAMAGE;
        T_Damage(m, { inflictorCenter: m.bodyCenter(), damage: dmg, byPlayer: true, time: now });
        this.afterDamage(m, true, now, true);
        if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
        this.bloodFx(m.bodyCenter(), this.playerEye, now);
        return true;
    }

    update(now: number, playerOrigin: Vec3, playerVel: Vec3, playerAttackedAt: number): void {
        this.now = now;
        if (this.monsters.length === 0) return;
        this.playerShowHostile = playerAttackedAt + C.SHOW_HOSTILE_TIME;
        this.playerOrigin = new Vec3(playerOrigin);
        this.playerEye = playerOrigin.withZ(playerOrigin.z + C.VIEW_OFS_Z);
        this.playerVel = new Vec3(playerVel);
        this.props = this.monsters.map((m) => m.prop);
        this.visIgnore = this.pawn ? [...this.props, this.pawn] : this.props;

        for (const m of this.monsters) {
            if (!m.prop.IsValid()) continue;
            if (this.aiDisabled.has(m.def.className)) continue;
            if (m.state === "dead" && m.settled) continue;
            if (now >= m.nextThink) {
                m.thinkDt = this.thinkInterval(m);
                m.nextThink = now + m.thinkDt;
                m.beginSegment(now);
                this.think(m, now);
                m.wasAirborne = m.airborne();
            }
            if (!m.settled && now - m.lastPush >= C.AI_INTERP_INTERVAL) m.pushInterpolated(now);
            if (C.SOLDIER_DEBUG) this.drawState(m);
        }
        this.monsters = this.monsters.filter((m) => m.prop.IsValid());
    }

    private drawState(m: Monster): void {
        if (!C.DEBUG) return;
        const color = m.state === "dead" ? { r: 40, g: 40, b: 40 }
            : m.state === "pain" ? { r: 240, g: 220, b: 60 }
            : m.state === "stand" ? { r: 120, g: 120, b: 120 }
            : m.state === "walk" ? { r: 90, g: 160, b: 220 }
            : m.enemy ? { r: 255, g: 130, b: 20 }
            : m.state === "run" ? { r: 80, g: 200, b: 80 }
            : { r: 240, g: 80, b: 80 };
        const b = m.box();
        css.DebugBox({
            mins: b.center.add(b.mins), maxs: b.center.add(b.maxs),
            duration: C.TICK_INTERVAL, color,
        });
        css.DebugSphere({
            center: m.origin.withZ(m.origin.z + m.def.hullMax.z + 6),
            radius: 6, duration: C.TICK_INTERVAL, color,
        });
    }

    private thinkInterval(m: Monster): number {
        const d = m.origin.distance(this.playerOrigin);
        if (d <= C.AI_THINK_FULL_DIST) return C.AI_THINK_INTERVAL;
        const span = C.AI_THINK_FAR_DIST - C.AI_THINK_FULL_DIST;
        const t = span > 0 ? Math.min(1, (d - C.AI_THINK_FULL_DIST) / span) : 1;
        return C.AI_THINK_INTERVAL + t * (C.AI_THINK_MAX_INTERVAL - C.AI_THINK_INTERVAL);
    }

    private think(m: Monster, now: number): void {
        if (m.state === "dead") {
            if (!m.settled) this.corpseFall(m, now);
            return;
        }
        this.checkEnemy(m);
        if (!m.airborne()) this.rideGround(m);
        this.pushOut(m);

        if (m.state === "pain") {
            m.onPainTick(now);
            if (m.consumeWokeUp()) this.playerPushSink?.(m.box());
            if (m.painOver(now)) {
                m.state = "run";
                m.searchTime = now + m.def.giveUp;
                const t = this.tgtEye(m);
                this.aimAt(m, t.x, t.y);
                m.play(m.def.anims.run, true);
            }
            this.checkMonsterStuck(m);
            if (m.hullOverride) {
                m.groundEntity = undefined;
                m.groundVel = new Vec3(0, 0, 0);
            } else if (!m.airborne()) {
                this.captureGround(m, now);
            }
            this.recordMonsterPos(m, now);
            return;
        }

        if (!m.airborne()) {
            if (m.wasAirborne || m.groundEntity) {
                this.snapToGround(m, 2048);
                this.unstuckGround(m);
            } else if (!this.snapToGround(m, C.MONSTER_STEPSIZE * 2)) {
                this.snapToGround(m, C.MONSTER_UNSUPPORTED_DROP);
            }
        }

        const preOrigin = new Vec3(m.origin);
        if (m.state === "stand") this.aiStand(m, now);
        else if (m.state === "walk") this.aiWalk(m, now);
        else if (m.state === "run") this.aiRun(m, now);
        else m.runAttack(this, now);

        m.moved = m.airborne() || m.origin.distance(preOrigin) > 0.1;
        if (m.moved) this.checkMonsterStuck(m);
        if (!m.airborne() && (m.moved || m.groundEntity)) this.captureGround(m, now);
        if (m.moved) this.recordMonsterPos(m, now);
    }

    private captureGround(m: Monster, now: number): void {
        const tr = traceHull(
            m.origin, m.def.hullMin, m.def.hullMax,
            m.origin.withZ(m.origin.z - 2), [m.prop]);
        const e = tr.ent;
        if (!e || !e.IsValid() || tr.normal.z <= 0.7 || !e.GetClassName().startsWith("func_")) {
            m.groundEntity = undefined;
            m.groundVel = new Vec3(0, 0, 0);
            m.gevTime = -1;
            return;
        }
        const o = e.GetAbsOrigin();
        if (m.groundEntity === e && m.gevTime >= 0 && now - m.gevTime > 1e-5) {
            const dt = now - m.gevTime;
            m.groundVel = new Vec3((o.x - m.gevPos.x) / dt,
                (o.y - m.gevPos.y) / dt, (o.z - m.gevPos.z) / dt);
        } else if (m.groundEntity !== e) {
            m.groundVel = new Vec3(0, 0, 0);
        }
        m.groundEntity = e;
        m.gevPos = new Vec3(o.x, o.y, o.z);
        m.gevTime = now;
    }

    private rideGround(m: Monster): void {
        if (!m.groundEntity || !m.groundEntity.IsValid()) return;
        if (m.groundVel.x === 0 && m.groundVel.y === 0 && m.groundVel.z === 0) return;
        const push = m.groundVel.scale(m.thinkDt);
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax,
            m.origin.add(push), [m.prop]);
        m.origin = new Vec3(tr.endpos);
    }

    private unstuckGround(m: Monster): void {
        if (!m.groundEntity) return;
        if (!testPosition(m.origin, m.def.hullMin, m.def.hullMax, [m.prop])) return;
        const cap = C.MONSTER_STEPSIZE + Math.ceil(m.groundVel.z * m.thinkDt) + 2;
        for (let z = 1; z <= cap; z++) {
            const test = m.origin.withZ(m.origin.z + z);
            if (!testPosition(test, m.def.hullMin, m.def.hullMax, [m.prop])) { m.origin = test; return; }
        }
    }

    private pushOut(m: Monster): boolean {
        if (m.hullOverride) return false;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        if (!testPosition(m.origin, mn, mx, [m.prop])) return false;
        const e = traceHull(m.origin, mn, mx, m.origin, [m.prop]).ent;
        if (!e || !e.IsValid() || !PUSH_MOVER_RE.test(e.GetClassName())
            || !hasTag(e.GetEntityName(), "push")) return false;
        if (testPosition(m.origin, mn, mx, [m.prop, e])) return false;
        for (const step of PUSH_NUDGE_STEPS) {
            for (const d of PUSH_NUDGE_DIRS) {
                const test = m.origin.add(d.scale(step));
                if (!testPosition(test, mn, mx, [m.prop])) {
                    m.origin = test;
                    m.velocity = new Vec3(0, 0, 0);
                    return true;
                }
            }
        }
        return false;
    }

    private checkMonsterStuck(m: Monster): void {
        if (m.hullOverride) return;
        if (this.pushOut(m)) return;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        if (!testPosition(m.origin, mn, mx, [m.prop])) return;
        for (let i = m.posHist.length - 1; i >= 0; i--) {
            const p = m.posHist[i];
            if (!testPosition(p, mn, mx, [m.prop])) {
                m.origin = new Vec3(p);
                m.velocity = new Vec3(0, 0, 0);
                return;
            }
        }
        for (let z = 1; z <= C.MONSTER_STEPSIZE; z++) {
            const test = m.origin.withZ(m.origin.z + z);
            if (!testPosition(test, mn, mx, [m.prop])) { m.origin = test; return; }
        }
    }

    private recordMonsterPos(m: Monster, now: number): void {
        if (m.hullOverride || now - m.histAt < C.STUCK_HIST_INTERVAL) return;
        if (testPosition(m.origin, m.def.hullMin, m.def.hullMax, [m.prop])) return;
        m.histAt = now;
        const last = m.posHist[m.posHist.length - 1];
        if (last && last.distance(m.origin) < 1) return;
        m.posHist.push(new Vec3(m.origin));
        if (m.posHist.length > C.STUCK_HIST_LEN) m.posHist.shift();
    }

    private checkEnemy(m: Monster): void {
        if (m.enemy && (!m.enemy.prop.IsValid() || m.enemy.state === "dead")) {
            m.enemy = m.oldEnemy;
            m.oldEnemy = undefined;
        }
        if (m.enemy === undefined && !this.playerAlive &&
            (m.state === "run" || m.state === "attack")) {
            this.idle(m);
        }
    }

    private snapToGround(m: Monster, maxDrop: number): boolean {
        const tr = traceHull(
            m.origin.withZ(m.origin.z + C.MONSTER_STEPSIZE),
            m.def.hullMin, m.def.hullMax,
            m.origin.withZ(m.origin.z - maxDrop), [m.prop]);
        if (tr.fraction >= 1 || tr.normal.z <= 0.7) return false;
        if (tr.endpos.z <= m.origin.z + 0.1) m.origin = new Vec3(tr.endpos);
        return true;
    }

    private corpseFall(m: Monster, now: number): void {
        const dt = m.thinkDt;
        m.velocity = m.velocity.withZ(m.velocity.z - C.SV_GRAVITY * dt);
        const from = new Vec3(m.origin);
        const tr = traceHull(
            m.origin, m.def.hullMin, m.def.hullMax,
            m.origin.add(m.velocity.scale(dt)), [m.prop]);
        m.origin = new Vec3(tr.endpos);

        const stuck = tr.fraction < 1 && m.origin.distance(from) < 0.5;
        if ((tr.fraction < 1 && tr.normal.z > 0.7) || stuck || now >= m.corpseSettleAt) {
            m.velocity = new Vec3(0, 0, 0);
            m.settled = true;
            m.prop.Teleport({
                position: m.origin.withZ(m.origin.z + m.def.modelZOfs),
                angles: { pitch: 0, yaw: m.yaw + m.def.modelYawOfs, roll: 0 },
            });
        } else if (tr.fraction < 1) {
            m.velocity = clipVelocity(m.velocity, tr.normal, 1.0).out;
        }
    }

    private idleChatter(m: Monster): void {
        if (Math.random() < C.MONSTER_IDLE_SOUND_CHANCE) this.emit(m, m.def.snd.idle);
    }

    private aiStand(m: Monster, now: number): void {
        if (this.findTarget(m, now)) return;
        this.idleChatter(m);
        m.play(m.def.anims.stand);
    }

    private aiWalk(m: Monster, now: number): void {
        if (this.findTarget(m, now)) return;
        this.idleChatter(m);
        if (m.route.length < 2) { this.idle(m); return; }

        const goal = m.route[m.routeIdx];
        const dx = goal.x - m.origin.x;
        const dy = goal.y - m.origin.y;
        if (Math.hypot(dx, dy) < C.PATH_REACH_DIST) {
            m.routeIdx = (m.routeIdx + 1) % m.route.length;
            const g2 = m.route[m.routeIdx];
            this.aimAt(m, g2.x, g2.y);
        } else if (m.flying) {
            this.flyMove(m, m.def.walkSpeed * C.AI_THINK_INTERVAL, goal, false);
        } else {
            this.chaseToward(m, m.def.walkSpeed * C.AI_THINK_INTERVAL, goal.x, goal.y);
        }
        m.play(m.def.anims.walk);
    }

    private aiRun(m: Monster, now: number): void {
        if (this.visible(m)) m.searchTime = now + m.def.giveUp;
        else if (now > m.searchTime) {
            this.idle(m);
            return;
        }

        if (m.checkAttack(this, now)) return;

        if (m.flying) {
            this.flyMove(m, m.def.runSpeed * C.AI_THINK_INTERVAL, this.tgtEye(m), m.slide);
            m.play(m.def.anims.run);
            return;
        }

        const t = this.tgtEye(m);
        this.chaseToward(m, m.def.runSpeed * C.AI_THINK_INTERVAL, t.x, t.y);
        m.play(m.def.anims.run);
    }

    private flyMove(m: Monster, dist: number, goal: Vec3, strafe: boolean): void {
        this.aimAt(m, goal.x, goal.y);
        this.changeYaw(m);
        let dir = goal.subtract(m.origin);
        if (dir.length < 1) return;
        if (strafe) {
            const perp = new Vec3(-dir.y, dir.x, 0);
            if (perp.length < 1) return;
            dir = (m.lefty ? perp : perp.scale(-1)).normal;
        } else {
            dir = dir.normal;
        }
        const step = dir.scale(dist);
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax,
            m.origin.add(step), [m.prop]);
        m.origin = new Vec3(tr.fraction < 1 ? tr.endpos : m.origin.add(step));
        if (strafe && tr.fraction < 1) m.lefty = !m.lefty;
    }

    getMad(victim: Monster, attacker: Monster, now: number): void {
        if (victim === attacker || victim.enemy === attacker || victim.state === "dead") return;
        if (victim instanceof Boss || attacker instanceof Boss) return;
        if (victim.def.className === attacker.def.className &&
            victim.def.className !== "monster_army") return;

        victim.oldEnemy = victim.enemy;
        victim.enemy = attacker;
        victim.searchTime = now + victim.def.giveUp;
        const first = now + victim.def.firstAttackDelay;
        if (victim.attackFinished < first) victim.attackFinished = first;
        if (victim.state === "stand") {
            victim.state = "run";
            this.aimAt(victim, attacker.origin.x, attacker.origin.y);
            victim.play(victim.def.anims.run, true);
        }
    }

    hurtMonster(victim: Monster, dmg: number, attacker: Monster, now: number): void {
        if (!victim.takeDamage || victim instanceof Boss) return;
        const wasAlive = victim.state !== "dead";
        T_Damage(victim, {
            inflictorCenter: attacker.bodyCenter(), damage: dmg, byPlayer: false, time: now,
        });
        if (wasAlive && victim.state === "dead") this.achievementSink?.("friendly_fire");
        this.getMad(victim, attacker, now);
        this.afterDamage(victim, true, now);
        this.bloodFx(victim.bodyCenter(), attacker.bodyCenter(), now);
        if (C.DEBUG) css.DebugSphere({ center: victim.bodyCenter(), radius: 5, duration: 0.4, color: { r: 255, g: 120, b: 20 } });
    }

    radiusHurt(origin: Vec3, damage: number, now: number, ignore?: Entity,
               byPlayer = true): void {
        const reach = damage + C.EXPLOSION_RADIUS_PAD;
        let hit = false;
        for (const m of this.monsters) {
            if (!m.takeDamage || m.prop === ignore) continue;
            if (m instanceof Boss && !byPlayer) continue;
            const dist = m.origin.distance(origin);
            if (dist > reach) continue;
            let pts = damage - 0.5 * dist;
            if (pts <= 0) continue;
            if (m instanceof Boss) pts *= C.BOSS_WEAPON_DAMAGE_SCALE;
            T_Damage(m, { inflictorCenter: origin, damage: pts, byPlayer: true, time: now });
            this.afterDamage(m, true, now, byPlayer);
            if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
            hit = true;
        }
        if (hit && byPlayer) this.hitHook?.();
    }

    damageEnemyOf(m: Monster, dmg: number, now: number): void {
        if (m.enemy) { this.hurtMonster(m.enemy, dmg, m, now); return; }
        if (this.player && this.player.takeDamage) {
            T_Damage(this.player, {
                inflictorCenter: m.bodyCenter(), damage: dmg, byPlayer: false, time: now,
            });
        }
    }

    tgtOrigin(m: Monster): Vec3 { return m.enemy ? m.enemy.origin : this.playerOrigin; }
    tgtEye(m: Monster): Vec3 { return m.enemy ? m.enemy.eye() : this.playerEye; }
    tgtVel(m: Monster): Vec3 { return m.enemy ? m.enemy.velocity : this.playerVel; }
    tgtId(m: Monster): Entity | undefined { return m.enemy ? m.enemy.prop : this.pawn; }

    monsterByProp(ent: Entity | undefined): Monster | undefined {
        return ent ? this.monsters.find((x) => x.prop === ent && x.state !== "dead") : undefined;
    }

    private findTarget(m: Monster, now: number): boolean {
        if (!this.playerAlive) return false;
        if (this.playerInvisible) return false;

        const beacon = this.sightEntity;
        if (beacon && beacon !== m && !m.ambush
            && beacon.prop.IsValid() && beacon.state !== "dead"
            && now - this.sightEntityTime <= C.SIGHT_RELAY_WINDOW) {
            const d = m.eye().distance(beacon.eye());
            if (d < C.RANGE_MID && this.visiblePoint(m, beacon.eye())
                && (d < C.RANGE_NEAR || this.infrontPoint(m, beacon.origin))) {
                return this.acquirePlayer(m, now);
            }
        }

        const r = this.range(m);
        if (r === "far") return false;
        if (!this.visible(m)) return false;
        if (r === "near") {
            if (now >= this.playerShowHostile && !this.infront(m)) return false;
        } else if (r === "mid" && !this.infront(m)) {
            return false;
        }
        return this.acquirePlayer(m, now);
    }

    private acquirePlayer(m: Monster, now: number): boolean {
        this.foundTarget(m, now);
        return true;
    }

    private foundTarget(m: Monster, now: number): void {
        if (!m.aware) this.emit(m, m.def.snd.sight);
        m.aware = true;
        m.enemy = undefined;
        m.searchTime = now + m.def.giveUp;
        const first = now + m.def.firstAttackDelay;
        if (m.attackFinished < first) m.attackFinished = first;
        const t = this.tgtEye(m);
        this.aimAt(m, t.x, t.y);
        if (m.state === "stand" || m.state === "walk") {
            m.state = "run";
            m.play(m.def.anims.run, true);
        }
        this.sightEntity = m;
        this.sightEntityTime = now;
    }

    range(m: Monster): Range {
        const d = m.eye().distance(this.tgtEye(m));
        if (d < C.RANGE_MELEE) return "melee";
        if (d < C.RANGE_NEAR) return "near";
        if (d < C.RANGE_MID) return "mid";
        return "far";
    }

    visible(m: Monster): boolean {
        if (this.now - m.visAt < C.AI_VIS_TTL) return m.visCache;
        m.visAt = this.now;
        m.visCache = this.visiblePoint(m, this.tgtEye(m));
        return m.visCache;
    }

    private visiblePoint(m: Monster, targetEye: Vec3): boolean {
        return traceHull(m.eye(), V0, V0, targetEye, this.visIgnore, true).fraction === 1;
    }

    infront(m: Monster): boolean {
        return this.infrontPoint(m, this.tgtOrigin(m));
    }

    private infrontPoint(m: Monster, target: Vec3): boolean {
        const fwd = angleVectors(0, m.yaw, 0).forward;
        const to = new Vec3(
            target.x - m.origin.x, target.y - m.origin.y, target.z - m.origin.z).normal;
        return to.dot(fwd) > C.SOLDIER_INFRONT_DOT;
    }

    clearShot(m: Monster): boolean {
        const tr = traceHull(m.eye(), V0, V0, this.tgtEye(m), [m.prop]);
        return tr.fraction >= 1 || tr.ent === this.tgtId(m);
    }

    private aimAt(m: Monster, x: number, y: number): void {
        m.idealYaw = vectoyaw(x - m.origin.x, y - m.origin.y);
    }

    aiFace(m: Monster): void {
        const t = this.tgtEye(m);
        this.aimAt(m, t.x, t.y);
        this.changeYaw(m);
    }

    private changeYaw(m: Monster): void {
        let move = yawDelta(m.idealYaw, m.yaw);
        if (move > m.def.yawSpeed) move = m.def.yawSpeed;
        if (move < -m.def.yawSpeed) move = -m.def.yawSpeed;
        m.yaw = anglemod(m.yaw + move);
    }

    moveToGoal(m: Monster, dist: number): void {
        const t = this.tgtEye(m);
        this.chaseToward(m, dist, t.x, t.y);
    }

    private chaseToward(m: Monster, dist: number, gx: number, gy: number): void {
        const dx = gx - m.origin.x;
        const dy = gy - m.origin.y;
        if (Math.hypot(dx, dy) < dist + 16) return;
        if (Math.random() < 0.25 || !this.stepDirection(m, m.idealYaw, dist)) {
            this.newChaseDir(m, dist, dx, dy);
        }
    }

    private stepDirection(m: Monster, yaw: number, dist: number): boolean {
        m.idealYaw = yaw;
        this.changeYaw(m);
        const mv = new Vec3(Math.cos(yaw * RAD) * dist, Math.sin(yaw * RAD) * dist, 0);
        const old = new Vec3(m.origin);
        if (!this.moveStep(m, mv)) return false;
        if (Math.abs(yawDelta(m.yaw, m.idealYaw)) > 45) m.origin = old;
        return true;
    }

    private moveStep(m: Monster, move: Vec3): boolean {
        const step = C.MONSTER_STEPSIZE;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        const oldorg = new Vec3(m.origin);

        const flat = traceHull(oldorg, mn.withZ(mn.z + 2), mx, oldorg.add(move), [m.prop]);
        const walled = flat.fraction < 1 && Math.abs(flat.normal.z) < 0.7;
        let best = walled ? undefined : this.dropToFloor(m, new Vec3(flat.endpos), step);

        if (!best) {
            const lift = traceHull(oldorg, mn, mx, oldorg.withZ(oldorg.z + step), [m.prop]);
            const upOrg = new Vec3(lift.endpos);
            if (upOrg.z - oldorg.z < 2) return false;
            const raised = traceHull(upOrg, mn, mx, upOrg.add(move), [m.prop]);
            if (new Vec3(raised.endpos).distance(upOrg) < 1) return false;
            best = this.dropToFloor(m, new Vec3(raised.endpos), step);
            if (!best || best.z < oldorg.z - 1) return false;
        }

        const rise = best.z - oldorg.z;

        if (rise <= 2) {
            if (!this.checkBottom(m, best)) return false;
            const len = move.length;
            if (len > 0.01) {
                const dir = move.scale(1 / len);
                if (C.MONSTER_EDGE_MARGIN > 0) {
                    const a = best.add(dir.scale(C.MONSTER_EDGE_MARGIN)).withZ(best.z + step);
                    const fl = traceHull(a, V0, V0,
                        a.withZ(best.z - C.MONSTER_LEDGE_DROP - step), [m.prop]);
                    if (fl.fraction === 1 || best.z - fl.endpos.z > C.MONSTER_LEDGE_DROP) return false;
                }
                const nose = traceHull(best.withZ(best.z + step),
                    mn.withZ(mn.z + step), mx,
                    best.withZ(best.z + step).add(dir.scale(C.MONSTER_WALL_MARGIN)), [m.prop]);
                if (nose.fraction < 1 && Math.abs(nose.normal.z) < 0.7) return false;
            }
        }
        m.origin = best;
        return true;
    }

    private dropToFloor(m: Monster, org: Vec3, maxDrop: number): Vec3 | undefined {
        const from = org.withZ(org.z + 2);
        const tr = traceHull(from, m.def.hullMin, m.def.hullMax,
            from.withZ(org.z - maxDrop), [m.prop]);
        if (tr.startsolid || tr.allsolid) return undefined;
        if (tr.fraction === 1) return undefined;
        if (tr.normal.z < 0.7) return undefined;
        return new Vec3(tr.endpos);
    }

    checkBottomAt(m: Monster, org: Vec3): boolean {
        return this.checkBottom(m, org);
    }

    private checkBottom(m: Monster, org: Vec3): boolean {
        const mn = m.def.hullMin, mx = m.def.hullMax;
        const step = C.MONSTER_STEPSIZE;
        const corners: [number, number][] = [
            [mn.x, mn.y], [mn.x, mx.y], [mx.x, mn.y], [mx.x, mx.y],
        ];

        let easy = true;
        for (const [cx, cy] of corners) {
            const s = new Vec3(org.x + cx, org.y + cy, org.z + mn.z + 1);
            if (traceHull(s, V0, V0, s.withZ(s.z - 3), [m.prop]).fraction === 1) { easy = false; break; }
        }
        if (easy) return true;

        const c = new Vec3(org.x, org.y, org.z + mn.z);
        const mid = traceHull(c, V0, V0, c.withZ(c.z - 2 * step), [m.prop]);
        if (mid.fraction === 1) return false;
        const midZ = mid.endpos.z;

        for (const [cx, cy] of corners) {
            const s = new Vec3(org.x + cx, org.y + cy, org.z + mn.z);
            const t = traceHull(s, V0, V0, s.withZ(s.z - 2 * step), [m.prop]);
            if (t.fraction === 1 || midZ - t.endpos.z > step) return false;
        }
        return true;
    }

    private newChaseDir(m: Monster, dist: number, dx: number, dy: number): void {
        const olddir = anglemod(Math.floor(anglemod(m.idealYaw) / 45) * 45);
        const turn = anglemod(olddir - 180);

        const d1 = dx > 10 ? 0 : dx < -10 ? 180 : NODIR;
        const d2 = dy < -10 ? 270 : dy > 10 ? 90 : NODIR;

        if (d1 !== NODIR && d2 !== NODIR) {
            const tdir = d1 === 0 ? (d2 === 90 ? 45 : 315) : (d2 === 90 ? 135 : 215);
            if (tdir !== turn && this.stepDirection(m, tdir, dist)) return;
        }

        let a = d1, b = d2;
        if (Math.random() < 0.5 || Math.abs(dy) > Math.abs(dx)) { const tmp = a; a = b; b = tmp; }

        if (a !== NODIR && a !== turn && this.stepDirection(m, a, dist)) return;
        if (b !== NODIR && b !== turn && this.stepDirection(m, b, dist)) return;
        if (this.stepDirection(m, olddir, dist)) return;

        if (Math.random() < 0.5) {
            for (let tt = 0; tt <= 315; tt += 45)
                if (tt !== turn && this.stepDirection(m, tt, dist)) return;
        } else {
            for (let tt = 315; tt >= 0; tt -= 45)
                if (tt !== turn && this.stepDirection(m, tt, dist)) return;
        }
        if (this.stepDirection(m, turn, dist)) return;

        m.idealYaw = olddir;
    }
}
