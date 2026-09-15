import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { traceHull } from "../physics/trace";
import { clipVelocity } from "../physics/qmath";
import { safeRemove, SkillTag, findSpawnMarkers, spawnTagOf, hasSpawnVar } from "../entutil";
import { Sounds } from "../game/sound";

export interface Loot {
    shells: number;
}

function playerTouches(itemOrigin: Vec3, mins: Vec3, maxs: Vec3, playerOrigin: Vec3): boolean {
    if (Math.abs(itemOrigin.x - playerOrigin.x) >= -C.HULL_MIN.x + maxs.x) return false;
    if (Math.abs(itemOrigin.y - playerOrigin.y) >= -C.HULL_MIN.y + maxs.y) return false;
    const pLo = playerOrigin.z + C.HULL_MIN.z;
    const pHi = playerOrigin.z + C.HULL_MAX.z;
    return itemOrigin.z + mins.z < pHi && itemOrigin.z + maxs.z > pLo;
}

class Backpack {
    velocity: Vec3;
    onGround = false;
    removeAt: number;
    trigger: Entity | undefined;
    taken = false;

    constructor(
        public prop: Entity, public origin: Vec3, public yaw: number,
        public loot: Loot, now: number,
    ) {
        this.velocity = new Vec3(
            -C.BACKPACK_TOSS_SPREAD + Math.random() * 2 * C.BACKPACK_TOSS_SPREAD,
            -C.BACKPACK_TOSS_SPREAD + Math.random() * 2 * C.BACKPACK_TOSS_SPREAD,
            C.BACKPACK_TOSS_UP,
        );
        this.removeAt = now + C.BACKPACK_LIFETIME;
    }

    step(dt: number): void {
        if (this.onGround) return;
        this.velocity = this.velocity.withZ(this.velocity.z - C.SV_GRAVITY * dt);
        const move = this.velocity.scale(dt);
        const tr = traceHull(
            this.origin, C.BACKPACK_HULL_MIN, C.BACKPACK_HULL_MAX,
            this.origin.add(move), [this.prop]);
        this.origin = new Vec3(tr.endpos);
        if (tr.fraction === 1) return;

        this.velocity = clipVelocity(this.velocity, tr.normal, 1).out;
        if (tr.normal.z > 0.7) {
            this.onGround = true;
            this.velocity = new Vec3(0, 0, 0);
        }
    }

    push(): void {
        this.prop.Move({
            position: this.origin.withZ(this.origin.z + C.BACKPACK_MODEL_Z_OFS),
            angles: { pitch: 0, yaw: this.yaw, roll: 0 },
        });
    }
}

type Grant = (loot: Loot) => string;
type OnMessage = (msg: string, center?: boolean) => void;

export class Backpacks {
    private packs: Backpack[] = [];
    private tmpl: PointTemplate | undefined;
    private touchTmpl: PointTemplate | undefined;
    private grant: Grant = () => "";
    private onMessage: OnMessage = () => {};
    private sounds: Sounds | undefined;
    private playerSrc = "";
    private isToucher: (e: Entity | undefined) => boolean = () => false;
    private conns: number[] = [];

    setToucher(fn: (e: Entity | undefined) => boolean): void {
        this.isToucher = fn;
    }

    onEnable(grant: Grant, sounds: Sounds, playerSrc: string, onMessage: OnMessage = () => {}): void {
        this.onDisable();
        this.grant = grant;
        this.onMessage = onMessage;
        this.sounds = sounds;
        this.playerSrc = playerSrc;
        const t = css.FindEntityByName(C.BACKPACK_TEMPLATE_NAME);
        this.tmpl = t instanceof PointTemplate ? t : undefined;
        if (!this.tmpl) {
        }
        const tt = css.FindEntityByName(C.BACKPACK_TOUCH_TEMPLATE);
        this.touchTmpl = tt instanceof PointTemplate ? tt : undefined;
        if (!this.touchTmpl) {
        }
    }

    onDisable(): void {
        for (const id of this.conns) { try { css.DisconnectOutput(id); } catch {} }
        this.conns = [];
        for (const p of this.packs) {
            safeRemove(p.prop);
            if (p.trigger) safeRemove(p.trigger);
        }
        this.packs = [];
    }

    props(): Entity[] {
        const out: Entity[] = [];
        for (const p of this.packs) {
            if (p.prop.IsValid()) out.push(p.prop);
            if (p.trigger?.IsValid()) out.push(p.trigger);
        }
        return out;
    }

    drop(origin: Vec3, loot: Loot, now: number): void {
        if (!this.tmpl) return;
        if (loot.shells <= 0) return;
        const pos = new Vec3(origin).withZ(origin.z - C.BACKPACK_DROP_Z);
        const yaw = Math.random() * 360;
        const sp = this.tmpl.ForceSpawn(pos, { pitch: 0, yaw, roll: 0 });
        if (!sp || sp.length === 0) return;
        const pack = new Backpack(sp[0], pos, yaw, loot, now);
        this.packs.push(pack);

        if (this.touchTmpl) {
            const tsp = this.touchTmpl.ForceSpawn(pos, { pitch: 0, yaw: 0, roll: 0 });
            const trig = tsp && tsp.length ? tsp[0] : undefined;
            if (trig) {
                pack.trigger = trig;
                const id = css.ConnectOutput(trig, "OnStartTouch", (d) => {
                    if (this.isToucher(d.activator)) this.collect(pack);
                });
                if (id !== undefined) this.conns.push(id);
            }
        }
    }

    update(now: number, dt: number, playerOrigin: Vec3, playerAlive: boolean): void {
        for (const p of this.packs) {
            if (!p.prop.IsValid()) continue;
            p.step(dt);
            p.push();
            if (p.trigger?.IsValid()) p.trigger.Move({ position: p.origin });

            if (!p.trigger && playerAlive && this.touching(p, playerOrigin)) {
                this.collect(p);
                continue;
            }
            if (now >= p.removeAt) p.prop.Remove();
        }
        this.packs = this.packs.filter((p) => p.prop.IsValid());
    }

    private collect(p: Backpack): void {
        if (p.taken || !p.prop.IsValid()) return;
        p.taken = true;
        const msg = this.grant(p.loot);
        if (msg) this.onMessage(msg);
        this.sounds?.play(C.SND.itemAmmo, this.playerSrc);
        p.prop.Remove();
        if (p.trigger) safeRemove(p.trigger);
    }

    private touching(p: Backpack, playerOrigin: Vec3): boolean {
        return playerTouches(p.origin, C.BACKPACK_HULL_MIN, C.BACKPACK_HULL_MAX, playerOrigin);
    }
}

export type AmmoKind = "shells" | "nails" | "rockets" | "cells";

export interface ItemEffects {
    armor(type: number, value: number): boolean;
    heal(amount: number, ignoreMax: boolean): boolean;
    shells(n: number): boolean;
    suit(): boolean;
    powerup(kind: PowerupKind): boolean;
    ammo(kind: AmmoKind, n: number): boolean;
    weapon(csName: string): boolean;
    key(idx: number): boolean;
    rune(idx: number): boolean;
}

export type PowerupKind = "quad" | "pent" | "ring";

type ItemKind = "armor" | "health" | "shells" | "suit" | "powerup" | "ammo" | "weapon" | "key" | "rune";

interface ItemDef {
    templateName: string;
    spawnName: string;
    kind: ItemKind;
    armorType: number; armorValue: number;
    heal: number; healIgnoreMax: boolean;
    shells: number;
    ammoKind?: AmmoKind; ammoN?: number;
    csWeapon?: string;
    powerKind?: PowerupKind;
    keyIdx?: number;
    runeIdx?: number;
    give: string;
    sound: string;
}

function ammoDef(t: string, s: string, kind: AmmoKind, n: number): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "ammo", ammoKind: kind, ammoN: n,
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give: `You got the ${kind}`, sound: C.SND.itemAmmo,
    };
}
function powerupDef(t: string, s: string, kind: PowerupKind, give: string, sound: string): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "powerup", powerKind: kind,
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give, sound,
    };
}
function weaponDef(t: string, s: string, cs: string, kind: AmmoKind, n: number, label: string): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "weapon", csWeapon: cs, ammoKind: kind, ammoN: n,
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give: `You got the ${label}`, sound: C.SND.itemAmmo,
    };
}
function keyDef(t: string, s: string, idx: number, label: string): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "key", keyIdx: idx,
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give: `You got the ${label}`, sound: C.SND.keyPickup,
    };
}
function runeDef(t: string, s: string, idx: number, label: string): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "rune", runeIdx: idx,
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give: label, sound: C.SND.runePickup,
    };
}
function armorDef(t: string, s: string, type: number, value: number, colour: string): ItemDef {
    return {
        templateName: t, spawnName: s, kind: "armor", armorType: type, armorValue: value,
        heal: 0, healIgnoreMax: false, shells: 0,
        give: `You got the ${colour} armor`, sound: C.SND.itemArmor,
    };
}

const ITEM_DEFS: ItemDef[] = [
    armorDef("armor_template_1", "armor_spawn_1", C.ARMOR1_TYPE, C.ARMOR1_VALUE, "green"),
    armorDef("armor_template_2", "armor_spawn_2", C.ARMOR2_TYPE, C.ARMOR2_VALUE, "yellow"),
    armorDef("armor_template_3", "armor_spawn_3", C.ARMOR3_TYPE, C.ARMOR3_VALUE, "red"),
    {
        templateName: "bh10_template", spawnName: "bh10_spawn", kind: "health",
        armorType: 0, armorValue: 0, heal: C.HEALTH_ROTTEN, healIgnoreMax: false,
        shells: 0, give: `You receive ${C.HEALTH_ROTTEN} health`,
        sound: C.SND.itemHealthRotten,
    },
    {
        templateName: "bh25_template", spawnName: "bh25_spawn", kind: "health",
        armorType: 0, armorValue: 0, heal: C.HEALTH_BOX, healIgnoreMax: false,
        shells: 0, give: `You receive ${C.HEALTH_BOX} health`,
        sound: C.SND.itemHealthBox,
    },
    {
        templateName: "bh100_template", spawnName: "bh100_spawn", kind: "health",
        armorType: 0, armorValue: 0, heal: C.HEALTH_MEGA, healIgnoreMax: true,
        shells: 0, give: `You receive ${C.HEALTH_MEGA} health`,
        sound: C.SND.itemHealthMega,
    },
    {
        templateName: "shell0_template", spawnName: "shell0_spawn", kind: "shells",
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false,
        shells: C.SHELLS_SMALL, give: "You got the shells",
        sound: C.SND.itemAmmo,
    },
    {
        templateName: "shell1_template", spawnName: "shell1_spawn", kind: "shells",
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false,
        shells: C.SHELLS_BIG, give: "You got the shells",
        sound: C.SND.itemAmmo,
    },
    {
        templateName: "suit_template", spawnName: "suit_spawn", kind: "suit",
        armorType: 0, armorValue: 0, heal: 0, healIgnoreMax: false, shells: 0,
        give: "You got the enviro-suit", sound: C.SND.itemSuit,
    },
    powerupDef("quad_template", "quad_spawn", "quad", "You got the Quad Damage", C.SND.itemQuad),
    powerupDef("pent_template", "pent_spawn", "pent", "You got the Pentagram of Protection", C.SND.itemPent),
    powerupDef("ring_template", "ring_spawn", "ring", "You got the Ring of Shadows", C.SND.itemRing),
    ammoDef("nail0_template", "nail0_spawn", "nails", C.AMMO_NAILS_SMALL),
    ammoDef("nail1_template", "nail1_spawn", "nails", C.AMMO_NAILS_BIG),
    ammoDef("rocket0_template", "rocket0_spawn", "rockets", C.AMMO_ROCKETS_SMALL),
    ammoDef("rocket1_template", "rocket1_spawn", "rockets", C.AMMO_ROCKETS_BIG),
    ammoDef("cell0_template", "cell0_spawn", "cells", C.AMMO_CELLS_SMALL),
    ammoDef("cell1_template", "cell1_spawn", "cells", C.AMMO_CELLS_BIG),
    weaponDef("weapon_ssg_template", "weapon_ssg_spawn", "weapon_glock", "shells", 5, "Double-barrelled Shotgun"),
    weaponDef("weapon_ng_template", "weapon_ng_spawn", "weapon_knife", "nails", 30, "nailgun"),
    weaponDef("weapon_sng_template", "weapon_sng_spawn", "weapon_smokegrenade", "nails", 30, "Super Nailgun"),
    weaponDef("weapon_gl_template", "weapon_gl_spawn", "weapon_molotov", "rockets", 5, "Grenade Launcher"),
    weaponDef("weapon_rl_template", "weapon_rl_spawn", "weapon_hegrenade", "rockets", 5, "Rocket Launcher"),
    weaponDef("weapon_lg_template", "weapon_lg_spawn", "weapon_flashbang", "cells", 15, "Thunderbolt"),
    keyDef("silver_key_template", "silver_key_spawn", 0, "silver key"),
    keyDef("gold_key_template", "gold_key_spawn", 1, "gold key"),
    runeDef(C.SIGIL_TEMPLATE, C.SIGIL_SPAWN_NAME, 0, "You got the Rune of Earth Magic"),
];

class WorldItem {
    trigger: Entity | undefined;
    taken = false;
    parent: Entity | undefined;
    propOfs = new Vec3(0, 0, 0);
    trigOfs = new Vec3(0, 0, 0);

    constructor(
        public prop: Entity, public origin: Vec3, public def: ItemDef, public marker: Entity,
    ) {}
}
const SPIN_KINDS = new Set<ItemKind>(["weapon", "powerup", "suit", "key", "rune"]);
const IDLE_ANIM = "pickup_idle";

export class LevelExit {
    private exits: { prop: Entity; origin: Vec3 }[] = [];
    private onExit: () => void = () => {};
    private fired = false;

    onEnable(onExit: () => void): void {
        this.onDisable();
        this.onExit = onExit;
        const t = css.FindEntityByName(C.LEVEL_END_TEMPLATE_NAME);
        if (!t) { return};
        if (!(t instanceof PointTemplate)) {
            return;
        }
        for (const mk of css.FindEntitiesByName(C.LEVEL_END_SPAWN_NAME)) {
            const pos = new Vec3(mk.GetAbsOrigin());
            const yaw = mk.GetAbsAngles().yaw;
            const sp = t.ForceSpawn(pos, { pitch: 0, yaw, roll: 0 });
            if (sp && sp.length) this.exits.push({ prop: sp[0], origin: pos });
        }
    }

    onDisable(): void {
        for (const e of this.exits) safeRemove(e.prop);
        this.exits = [];
        this.fired = false;
    }

    props(): Entity[] {
        return this.exits.filter((e) => e.prop.IsValid()).map((e) => e.prop);
    }

    update(playerOrigin: Vec3, playerAlive: boolean): void {
        if (this.fired || !playerAlive) return;
        for (const e of this.exits) {
            if (!e.prop.IsValid()) continue;
            if (playerTouches(e.origin, C.LEVEL_END_HULL_MIN, C.LEVEL_END_HULL_MAX, playerOrigin)) {
                this.fired = true;
                this.onExit();
                return;
            }
        }
    }
}

export class Items {
    private items: WorldItem[] = [];
    private fx: ItemEffects | undefined;
    private onMessage: OnMessage = () => {};
    private sounds: Sounds | undefined;
    private playerSrc = "";
    private touchTmpl: PointTemplate | undefined;
    private isToucher: (e: Entity | undefined) => boolean = () => false;
    private conns: number[] = [];
    private spawnTag: SkillTag = "normal";

    setToucher(fn: (e: Entity | undefined) => boolean): void {
        this.isToucher = fn;
    }

    onEnable(fx: ItemEffects, sounds: Sounds, playerSrc: string, onMessage: OnMessage = () => {},
        diff: string = C.DIFFICULTY_DEFAULT): void {
        this.spawnTag = spawnTagOf(diff);
        this.onDisable();
        this.fx = fx;
        this.onMessage = onMessage;
        this.sounds = sounds;
        this.playerSrc = playerSrc;
        const tt = css.FindEntityByName(C.ITEM_TOUCH_TEMPLATE);
        this.touchTmpl = tt instanceof PointTemplate ? tt : undefined;
        for (const def of ITEM_DEFS) this.spawn(def);
    }

    onDisable(): void {
        for (const id of this.conns) { try { css.DisconnectOutput(id); } catch {} }
        this.conns = [];
        for (const it of this.items) {
            safeRemove(it.prop);
            if (it.trigger) safeRemove(it.trigger);
        }
        this.items = [];
    }

    props(): Entity[] {
        const out: Entity[] = [];
        for (const it of this.items) {
            if (it.prop.IsValid()) out.push(it.prop);
            if (it.trigger?.IsValid()) out.push(it.trigger);
        }
        return out;
    }

    private spawn(def: ItemDef): void {
        const t = css.FindEntityByName(def.templateName);
        if (!t) return;
        if (!(t instanceof PointTemplate)) {
            return;
        }
        let n = 0;
        let deferred = 0;
        for (const mk of findSpawnMarkers(def.spawnName, this.spawnTag)) {
            if (hasSpawnVar(mk.GetEntityName(), "trigger")) {
                const id = css.ConnectOutput(mk, "OnUser2", () => {
                    if (this.items.some((it) => it.marker === mk && !it.taken)) return;
                    this.placeItem(t, def, mk);
                });
                if (id !== undefined) this.conns.push(id);
                deferred++;
                continue;
            }
            if (this.placeItem(t, def, mk)) n++;
        }
        if (n || deferred) {
        }
    }

    private placeItem(t: PointTemplate, def: ItemDef, mk: Entity): boolean {
        if (!mk.IsValid()) return false;
        const box = def.kind === "health" || def.kind === "shells" || def.kind === "ammo";
        const raised = new Vec3(mk.GetAbsOrigin()).withZ(mk.GetAbsOrigin().z + C.ITEM_PLACE_RAISE);
        const floor = box ? this.dropToFloor(raised) : raised;
        const yaw = mk.GetAbsAngles().yaw;
        const sp = t.ForceSpawn(box ? floor.add(C.BOX_SPAWN_OFS) : floor, { pitch: 0, yaw, roll: 0 });
        if (!sp || sp.length === 0) {
            return false;
        }
        if (SPIN_KINDS.has(def.kind)) {
            css.EntFireAtTarget({ target: sp[0], input: "SetAnimation", value: IDLE_ANIM });
        }
        const propPos = box ? floor.add(C.BOX_SPAWN_OFS) : floor;
        const it = new WorldItem(sp[0], floor, def, mk);
        this.wireTouch(it, floor);
        if (mk.GetParent()?.IsValid()) {
            const mo = new Vec3(mk.GetAbsOrigin());
            it.parent = mk;
            it.propOfs = propPos.subtract(mo);
            it.trigOfs = floor.subtract(mo);
        }
        this.items.push(it);
        return true;
    }

    private wireTouch(it: WorldItem, floor: Vec3): void {
        if (!this.touchTmpl) return;
        const tsp = this.touchTmpl.ForceSpawn(floor, { pitch: 0, yaw: 0, roll: 0 });
        const trig = tsp && tsp.length ? tsp[0] : undefined;
        if (!trig) return;
        it.trigger = trig;
        for (const out of ["OnStartTouch", "OnTrigger"]) {
            const id = css.ConnectOutput(trig, out, (d) => {
                if (this.isToucher(d.activator)) this.collect(it);
            });
            if (id !== undefined) this.conns.push(id);
        }
    }

    private dropToFloor(pos: Vec3): Vec3 {
        const z0 = new Vec3(0, 0, 0);
        const tr = traceHull(pos, z0, z0, pos.withZ(pos.z - C.ITEM_DROP_DIST));
        return tr.fraction < 1 && !tr.allsolid ? new Vec3(tr.endpos) : new Vec3(pos);
    }

    update(playerOrigin: Vec3, playerAlive: boolean): void {
        for (const it of this.items) {
            if (!it.parent?.IsValid() || !it.prop.IsValid()) continue;
            const o = new Vec3(it.parent.GetAbsOrigin());
            it.prop.Move({ position: o.add(it.propOfs) });
            it.origin = o.add(it.trigOfs);
            it.trigger?.Move({ position: it.origin });
        }
        if (!playerAlive || this.items.length === 0) return;
        for (const it of this.items) {
            if (!it.prop.IsValid() || it.trigger) continue;
            if (!playerTouches(it.origin, C.ITEM_HULL_MIN, C.ITEM_HULL_MAX, playerOrigin)) continue;
            this.collect(it);
        }
        this.items = this.items.filter((it) => it.prop.IsValid());
    }

    private collect(it: WorldItem): void {
        if (it.taken || !it.prop.IsValid()) return;
        if (!this.apply(it.def)) return;
        it.taken = true;
        const k = it.def.kind;
        this.onMessage(it.def.give, k === "powerup" || k === "key" || k === "rune");
        this.sounds?.play(it.def.sound, this.playerSrc);
        if (it.marker.IsValid()) css.EntFireAtTarget({ target: it.marker, input: "FireUser1" });
        it.prop.Remove();
        if (it.trigger) safeRemove(it.trigger);
    }

    private apply(def: ItemDef): boolean {
        if (!this.fx) return false;
        if (def.kind === "armor") return this.fx.armor(def.armorType, def.armorValue);
        if (def.kind === "health") return this.fx.heal(def.heal, def.healIgnoreMax);
        if (def.kind === "suit") return this.fx.suit();
        if (def.kind === "powerup") return this.fx.powerup(def.powerKind!);
        if (def.kind === "ammo") return this.fx.ammo(def.ammoKind!, def.ammoN!);
        if (def.kind === "key") return this.fx.key(def.keyIdx!);
        if (def.kind === "rune") return this.fx.rune(def.runeIdx!);
        if (def.kind === "weapon") {
            this.fx.weapon(def.csWeapon!);
            if (def.ammoKind) this.fx.ammo(def.ammoKind, def.ammoN ?? 0);
            return true;
        }
        return this.fx.shells(def.shells);
    }
}
