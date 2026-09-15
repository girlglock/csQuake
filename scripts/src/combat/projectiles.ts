import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { traceHull } from "../physics/trace";
import { clipVelocity } from "../physics/qmath";
import { safeRemove } from "../entutil";
import { Enemies } from "../monsters/enemies";
import { Barrels } from "./barrels";
import { Sounds } from "../game/sound";
import { Particles, TrailHandle, FxName } from "../game/particles";

const V0 = new Vec3(0, 0, 0);
const DEG = 180 / Math.PI;

let nextProjSndId = 0;

export type ProjKind = "nail" | "snail" | "rocket" | "grenade" | "zomgib" | "fireball" | "bossball";

interface Proj {
    prop: Entity;
    kind: ProjKind;
    sndName: string;
    origin: Vec3;
    velocity: Vec3;
    angles: { pitch: number; yaw: number; roll: number };
    dieAt: number;
    damage: number;
    atRest: boolean;
    dead: boolean;
    owner?: Entity;
    trail?: TrailHandle;
}

export class Projectiles {
    private live: Proj[] = [];
    private tmpl = new Map<ProjKind, PointTemplate>();
    private enemies: Enemies | undefined;
    private sounds: Sounds | undefined;
    private particles: Particles | undefined;
    private onExplode: (origin: Vec3, damage: number, now: number, ignore?: Entity,
                        fromMonster?: boolean) => void = () => {};
    private onTrapHit: (damage: number, origin: Vec3, now: number) => void = () => {};
    private onImpact: ((ent: Entity | undefined) => boolean) | undefined;
    private barrels: Barrels | undefined;
    private spikeFxSeq = 0;

    setOnImpact(fn: (ent: Entity | undefined) => boolean): void { this.onImpact = fn; }
    setBarrels(b: Barrels): void { this.barrels = b; }
    setParticles(p: Particles): void { this.particles = p; }

    private attachTrail(kind: ProjKind, prop: Entity): TrailHandle | undefined {
        const fx: FxName | undefined =
            kind === "rocket" || kind === "fireball" || kind === "bossball" ? "rock2_trail"
            : kind === "grenade" ? "rock_trail"
            : kind === "zomgib" ? "blood_trail" : undefined;
        return fx ? this.particles?.attachTrail(fx, prop) : undefined;
    }

    onEnable(
        enemies: Enemies, sounds: Sounds,
        onExplode: (origin: Vec3, damage: number, now: number, ignore?: Entity,
                    fromMonster?: boolean) => void,
        onTrapHit: (damage: number, origin: Vec3, now: number) => void,
    ): void {
        this.onDisable();
        this.enemies = enemies;
        this.sounds = sounds;
        this.onExplode = onExplode;
        this.onTrapHit = onTrapHit;
        for (const [k, name] of [
            ["nail", C.NAIL_TEMPLATE], ["snail", C.SNAIL_TEMPLATE],
            ["rocket", C.ROCKET_TEMPLATE], ["grenade", C.GRENADE_TEMPLATE],
        ] as [ProjKind, string][]) {
            const t = css.FindEntityByName(name);
            if (t instanceof PointTemplate) this.tmpl.set(k, t);
        }
        const zg = css.FindEntityByName(C.ZOMGIB_TEMPLATE);
        const zgt = zg instanceof PointTemplate ? zg : this.tmpl.get("grenade");
        if (zgt) this.tmpl.set("zomgib", zgt);
        const lb = css.FindEntityByName(C.LAVABALL_TEMPLATE);
        const lbt = lb instanceof PointTemplate ? lb : this.tmpl.get("rocket");
        if (lbt) { this.tmpl.set("fireball", lbt); this.tmpl.set("bossball", lbt); }
    }

    onDisable(): void {
        for (const p of this.live) { p.trail?.stop(); safeRemove(p.prop); }
        this.live = [];
    }

    props(): Entity[] {
        return this.live.filter((p) => p.prop.IsValid()).map((p) => p.prop);
    }

    spawn(kind: ProjKind, muzzle: Vec3, dir: Vec3, now: number, damage: number): void {
        const t = this.tmpl.get(kind);
        const speed = kind === "grenade" ? C.GRENADE_SPEED
            : kind === "rocket" ? C.ROCKET_SPEED : C.NAIL_SPEED;
        let vel = dir.scale(speed);
        if (kind === "grenade") vel = vel.withZ(vel.z + C.GRENADE_UP);
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop, kind, sndName, origin: new Vec3(pos), velocity: vel, angles: ang,
            dieAt: now + (kind === "grenade" ? C.GRENADE_FUSE : C.PROJ_LIFETIME),
            damage, atRest: false, dead: false, trail: this.attachTrail(kind, prop),
        });
    }

    monsterGrenade(muzzle: Vec3, vel: Vec3, now: number, owner: Entity): void {
        const t = this.tmpl.get("grenade");
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop, kind: "grenade", sndName, origin: new Vec3(pos), velocity: new Vec3(vel), angles: ang,
            dieAt: now + C.OGRE_GRENADE_FUSE, damage: C.OGRE_GRENADE_DAMAGE,
            atRest: false, dead: false, owner, trail: this.attachTrail("grenade", prop),
        });
    }

    zombieGib(muzzle: Vec3, vel: Vec3, now: number, owner: Entity): void {
        const t = this.tmpl.get("zomgib");
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop, kind: "zomgib", sndName, origin: new Vec3(pos), velocity: new Vec3(vel), angles: ang,
            dieAt: now + C.ZOMBIE_GIB_FUSE, damage: C.ZOMBIE_GIB_DAMAGE,
            atRest: false, dead: false, owner, trail: this.attachTrail("zomgib", prop),
        });
    }

    fireball(origin: Vec3, speed: number, now: number): void {
        const t = this.tmpl.get("fireball");
        const vel = new Vec3(Math.random() * 100 - 50, Math.random() * 100 - 50,
            speed + Math.random() * 200);
        const pos = new Vec3(origin);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        this.live.push({
            prop, kind: "fireball", sndName: this.nameProp(prop),
            origin: new Vec3(pos), velocity: vel, angles: ang,
            dieAt: now + C.FIREBALL_LIFETIME, damage: C.FIREBALL_DAMAGE,
            atRest: false, dead: false, trail: this.attachTrail("fireball", prop),
        });
    }

    bossball(origin: Vec3, dir: Vec3, owner: Entity, now: number): void {
        const t = this.tmpl.get("bossball");
        const vel = dir.normal.scale(C.BOSS_MISSILE_SPEED);
        const pos = new Vec3(origin);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        this.live.push({
            prop, kind: "bossball", sndName: this.nameProp(prop),
            origin: new Vec3(pos), velocity: vel, angles: ang,
            dieAt: now + C.BOSS_MISSILE_FUSE, damage: C.BOSS_MISSILE_DAMAGE,
            atRest: false, dead: false, owner, trail: this.attachTrail("bossball", prop),
        });
    }

    spikeShot(owner: Entity, origin: Vec3, dir: Vec3, sup: boolean, now: number,
              speed = C.SPIKESHOOTER_SPEED, dmg = sup ? C.SNAIL_DAMAGE : C.NAIL_DAMAGE): void {
        const kind: ProjKind = sup ? "snail" : "nail";
        const t = this.tmpl.get(kind);
        const vel = dir.normal.scale(speed);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(new Vec3(origin), ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop, kind, sndName, origin: new Vec3(origin), velocity: vel, angles: ang,
            dieAt: now + C.SPIKESHOOTER_FUSE,
            damage: dmg,
            atRest: false, dead: false, owner, trail: this.particles?.attachTrail("rock_trail", prop),
        });
    }

    update(now: number, dt: number): void {
        if (this.live.length === 0 || !this.enemies) return;
        const props = this.props();
        const pawn = this.enemies.pawn;
        const steps = C.PROJ_SUBSTEPS;
        const sdt = dt / steps;

        for (const p of this.live) {
            if (!p.prop.IsValid() || p.dead) continue;
            const isGren = p.kind === "grenade";
            const ballistic = isGren || p.kind === "zomgib" || p.kind === "fireball";
            if (ballistic && p.atRest) continue;
            const mn = isGren ? C.GRENADE_HULL_MIN : V0;
            const mx = isGren ? C.GRENADE_HULL_MAX : V0;
            const ignore = p.owner ? [p.owner, ...props]
                : p.kind === "fireball" ? [...props]
                : [pawn, ...props];

            for (let s = 0; s < steps && p.prop.IsValid() && !p.dead; s++) {
                if (ballistic) p.velocity = p.velocity.withZ(p.velocity.z - C.SV_GRAVITY * sdt);
                const tr = traceHull(p.origin, mn, mx, p.origin.add(p.velocity.scale(sdt)),
                    [p.prop, ...ignore]);
                if (tr.fraction >= 1) {
                    p.origin = p.origin.add(p.velocity.scale(sdt));
                    continue;
                }
                p.origin = new Vec3(tr.endpos);
                const mon = this.enemies.monsterByProp(tr.ent);
                const shot = !mon && !!this.onImpact && this.onImpact(tr.ent);

                if (p.kind === "nail" || p.kind === "snail") {
                    p.dead = true;
                    const shooter = p.owner ? this.enemies.monsterByProp(p.owner) : undefined;
                    if (p.owner && tr.ent === pawn) {
                        this.onTrapHit(p.damage, p.origin, now);
                        p.prop.Remove();
                    } else if (mon) {
                        if (shooter) this.enemies.hurtMonster(mon, p.damage, shooter, now);
                        else this.enemies.damageFromPlayer(tr.ent, p.damage, p.origin, now);
                        p.prop.Remove();
                    } else if (this.barrels?.isBarrelProp(tr.ent)) {
                        this.barrels.hit(tr.ent, p.damage, now);
                        p.prop.Remove();
                    } else if (shot) {
                        p.prop.Remove();
                    } else {
                        const nm = `q_spikefx_${++this.spikeFxSeq}`;
                        p.prop.SetEntityName(nm);
                        p.prop.Move({ position: p.origin.subtract(tr.normal.scale(3)) });
                        this.particles?.burst("wall_impact", p.origin, tr.normal, now);
                        this.sounds?.play(this.pick(C.SND.spikeHitWall), nm);
                        css.EntFireAtTarget({ target: p.prop, input: "Kill",
                            delay: C.SPIKE_FX_TTL });
                    }
                } else if (p.kind === "zomgib") {
                    const shooter = p.owner ? this.enemies.monsterByProp(p.owner) : undefined;
                    if (p.owner && tr.ent === pawn) {
                        this.onTrapHit(p.damage, p.origin, now);
                        p.prop.Move({ position: p.origin });
                        this.sounds?.play(C.SND.zombieHit, p.sndName);
                        p.dead = true; p.prop.Remove();
                    } else if (mon && shooter) {
                        this.enemies.hurtMonster(mon, p.damage, shooter, now);
                        p.dead = true; p.prop.Remove();
                    } else {
                        p.velocity = clipVelocity(p.velocity, tr.normal, 1.0).out;
                        p.prop.Move({ position: p.origin });
                        this.sounds?.play(C.SND.zombieMiss, p.sndName);
                        if (tr.normal.z > 0.7 && p.velocity.z < 60) {
                            p.velocity = new Vec3(0, 0, 0);
                            p.atRest = true;
                            break;
                        }
                    }
                } else if (p.kind === "fireball") {
                    p.dead = true;
                    if (tr.ent === pawn) this.onTrapHit(p.damage, p.origin, now);
                    p.prop.Remove();
                } else if (p.kind === "bossball") {
                    if (!mon && this.barrels?.isBarrelProp(tr.ent)) this.barrels.hit(tr.ent, p.damage, now);
                    this.explode(p, now);
                } else if (isGren) {
                    if (mon || this.barrels?.isBarrelProp(tr.ent)
                        || (p.owner && tr.ent === pawn)) {
                        this.explode(p, now);
                    } else {
                        p.velocity = clipVelocity(p.velocity, tr.normal, 1.5).out;
                        p.prop.Move({ position: p.origin });
                        this.sounds?.play(C.SND.grenadeBounce, p.sndName);
                        if (tr.normal.z > 0.7 && p.velocity.z < 60) {
                            p.velocity = new Vec3(0, 0, 0);
                            p.atRest = true;
                            break;
                        }
                    }
                } else {
                    const barrel = !mon && this.barrels?.isBarrelProp(tr.ent)
                        ? tr.ent : undefined;
                    if (mon) this.enemies.damageFromPlayer(tr.ent, p.damage, p.origin, now);
                    else if (barrel) this.barrels!.hit(barrel, p.damage, now);
                    this.explode(p, now, mon ? tr.ent : barrel);
                }
                if (p.dead) break;
            }
            if ((isGren || p.kind === "zomgib" || p.kind === "bossball") && !p.atRest) {
                const d = C.GRENADE_AVELOCITY * dt;
                p.angles.pitch = (p.angles.pitch + d) % 360;
                p.angles.yaw = (p.angles.yaw + d) % 360;
                p.angles.roll = (p.angles.roll + d) % 360;
            }
            if (p.prop.IsValid() && !p.dead) this.pushProp(p);
        }

        for (const p of this.live) {
            if (!p.prop.IsValid() || p.dead) continue;
            if (p.kind === "grenade" && now >= p.dieAt) this.explode(p, now);
            else if (now >= p.dieAt) { p.dead = true; p.prop.Remove(); }
        }
        this.live = this.live.filter((p) => {
            if (p.prop.IsValid() && !p.dead) return true;
            p.trail?.stop();
            return false;
        });
    }

    private explode(p: Proj, now: number, ignore?: Entity): void {
        if (p.dead) return;
        p.dead = true;
        const dmg = p.owner ? p.damage : C.EXPLOSION_DAMAGE;
        this.onExplode(p.origin, dmg, now, p.owner ?? ignore, !!p.owner);
        if (C.DEBUG) {
            css.DebugSphere({ center: p.origin, radius: dmg - 40,
                duration: 0.4, color: { r: 255, g: 150, b: 20 } });
        }
        p.prop.Remove();
    }

    private pushProp(p: Proj): void {
        const tumbling = p.kind === "grenade" || p.kind === "zomgib" || p.kind === "bossball";
        p.prop.Move({ position: p.origin, angles: tumbling ? p.angles : this.aim(p.velocity) });
    }

    private aim(v: Vec3): { pitch: number; yaw: number; roll: number } {
        return {
            pitch: -Math.atan2(v.z, Math.hypot(v.x, v.y)) * DEG,
            yaw: Math.atan2(v.y, v.x) * DEG,
            roll: 0,
        };
    }

    private pick(a: readonly string[]): string {
        return a[Math.floor(Math.random() * a.length)];
    }

    private nameProp(prop: Entity): string {
        const nm = `q_proj_${nextProjSndId++}`;
        prop.SetEntityName(nm);
        return nm;
    }
}
