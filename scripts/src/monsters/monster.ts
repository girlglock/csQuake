import { Instance as css, Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { Combatant, DamageInfo } from "../combat/combat";
import { SolidBox } from "../physics/trace";
import type { Enemies } from "./enemies";

export const V0 = new Vec3(0, 0, 0);
export const RAD = Math.PI / 180;
export const NODIR = -1;

let nextSndId = 0;

export function anglemod(a: number): number {
    return ((a % 360) + 360) % 360;
}
export function yawDelta(to: number, from: number): number {
    let d = anglemod(to) - anglemod(from);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
}
export function vectoyaw(dx: number, dy: number): number {
    if (dx === 0 && dy === 0) return 0;
    const y = Math.atan2(dy, dx) / RAD;
    return y < 0 ? y + 360 : y;
}
export function crand(): number {
    return Math.random() * 2 - 1;
}

export interface NodeRoute { owner: Vec3; points: Vec3[]; }

export function keyOf(v: { x: number; y: number; z: number }): string {
    return `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)}`;
}

export function findByNamePrefix(prefix: string): Entity[] {
    const out: Entity[] = [];
    for (const cls of ["info_target", "path_track", "path_corner"]) {
        for (const e of css.FindEntitiesByClass(cls)) {
            if (e.GetEntityName().startsWith(prefix)) out.push(e);
        }
    }
    return out;
}

export function loadNodeRoutes(): NodeRoute[] {
    const groups = new Map<string, { order: number; pos: Vec3 }[]>();
    for (const cls of ["info_target", "path_track", "path_corner"]) {
        for (const e of css.FindEntitiesByClass(cls)) {
            const name = e.GetEntityName();
            if (!name.startsWith(C.PATH_NODE_PREFIX)) continue;
            const parent = e.GetParent();
            if (!parent) continue;
            const key = keyOf(parent.GetAbsOrigin());
            const md = /(\d+)\s*$/.exec(name);
            const arr = groups.get(key) ?? [];
            arr.push({ order: md ? parseInt(md[1], 10) : arr.length, pos: new Vec3(e.GetAbsOrigin()) });
            groups.set(key, arr);
        }
    }
    const out: NodeRoute[] = [];
    for (const [key, pts] of groups) {
        if (pts.length < 2) continue;
        pts.sort((a, b) => a.order - b.order);
        const [x, y, z] = key.split(",").map(Number);
        out.push({ owner: new Vec3(x, y, z), points: pts.map((p) => p.pos) });
    }
    return out;
}

export function nearestWaypoint(route: Vec3[], origin: Vec3): number {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < route.length; i++) {
        const d = route[i].distance(origin);
        if (d < best) { best = d; idx = i; }
    }
    return idx;
}

export type Range = "melee" | "near" | "mid" | "far";
export type State = "stand" | "walk" | "run" | "attack" | "pain" | "dead";

export interface MonsterDef {
    className: string;
    hullMin: Vec3; hullMax: Vec3;
    viewOfsZ: number;
    yawSpeed: number;
    modelZOfs: number; modelYawOfs: number;
    animPrefix: string;
    health: number;
    gibHealth: number;
    runSpeed: number;
    walkSpeed: number;
    giveUp: number;
    firstAttackDelay: number;
    dropShells: number;
    anims: { stand: string; walk: string; run: string };
    snd: { sight: string; idle: string; attack: string; death: string; pain: readonly string[] };
}

export abstract class Monster implements Combatant {
    origin: Vec3;
    yaw: number;
    idealYaw: number;
    state: State = "stand";
    nextThink = 0;
    attackFinished = 0;
    searchTime = 0;
    painFinished = 0;
    painEnd = 0;
    anim = "";

    enemy: Monster | undefined;
    oldEnemy: Monster | undefined;
    dropped = false;
    ambush = false;
    aware = false;

    flying = false;
    slide = false;
    lefty = false;

    spawnMarker: Entity | undefined;

    readonly sndName: string;
    painSound = "";

    route: Vec3[] = [];
    routeIdx = 0;

    health: number;
    armorValue = 0;
    armorType = 0;
    takeDamage = true;
    getsKnockback = false;
    velocity = new Vec3(0, 0, 0);

    settled = false;
    corpseSettleAt = 0;

    groundEntity: Entity | undefined;
    groundVel = new Vec3(0, 0, 0);
    gevPos = new Vec3(0, 0, 0);
    gevTime = -1;

    posHist: Vec3[] = [];
    histAt = -1;

    visCache = false;
    visAt = -1;

    moved = true;
    wasAirborne = false;

    thinkDt = C.AI_THINK_INTERVAL;

    hullOverride: { min: Vec3; max: Vec3 } | undefined;

    private prevOrigin: Vec3;
    private prevYaw: number;
    private segStart = 0;
    lastPush = 0;

    constructor(readonly def: MonsterDef, public prop: Entity, origin: Vec3, yaw: number) {
        this.origin = new Vec3(origin);
        this.yaw = yaw;
        this.idealYaw = yaw;
        this.prevOrigin = new Vec3(origin);
        this.prevYaw = yaw;
        this.posHist = [new Vec3(origin)];
        this.health = def.health;
        this.sndName = `q_snd_m${nextSndId++}`;
        this.prop.SetEntityName(this.sndName);
        this.prop.Teleport({
            position: this.modelPos(),
            angles: { pitch: 0, yaw: yaw + def.modelYawOfs, roll: 0 },
        });
    }

    eye(): Vec3 {
        return this.origin.withZ(this.origin.z + this.def.viewOfsZ);
    }
    box(): SolidBox {
        const h = this.hullOverride;
        return { id: this.prop, center: this.origin,
            mins: h ? h.min : this.def.hullMin, maxs: h ? h.max : this.def.hullMax };
    }
    bodyCenter(): Vec3 {
        return this.origin.withZ(this.origin.z + (this.def.hullMin.z + this.def.hullMax.z) * 0.5);
    }
    private modelPos(): Vec3 {
        return this.origin.withZ(this.origin.z + this.def.modelZOfs);
    }

    airborne(): boolean {
        return false;
    }

    onPainTick(_now: number): void {}

    consumeWokeUp(): boolean { return false; }

    play(seq: string, force = false): void {
        if (!force && this.anim === seq) return;
        this.anim = seq;
        const a = this.def.anims;
        const loop = seq === a.stand || seq === a.walk || seq === a.run;
        const input = force
            ? (loop ? "SetAnimationLooping" : "SetAnimationNotLooping")
            : (loop ? "SetAnimationNoResetLooping" : "SetAnimationNoResetNotLooping");
        css.EntFireAtTarget({ target: this.prop, input, value: this.def.animPrefix + seq });
    }

    painOver(now: number): boolean {
        return now >= this.painEnd;
    }

    beginSegment(now: number): void {
        this.prevOrigin = new Vec3(this.origin);
        this.prevYaw = this.yaw;
        this.segStart = now;
    }

    pushInterpolated(now: number): void {
        let t = (now - this.segStart) / this.thinkDt;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const delta = this.origin.subtract(this.prevOrigin);
        const io = this.prevOrigin.add(delta.scale(t));
        const iy = this.prevYaw + yawDelta(this.yaw, this.prevYaw) * t;
        this.prop.Move({
            position: io.withZ(io.z + this.def.modelZOfs),
            angles: { pitch: 0, yaw: iy + this.def.modelYawOfs, roll: 0 },
            velocity: delta.scale(1 / this.thinkDt),
        });
        this.lastPush = now;
    }

    abstract pain(d: DamageInfo): void;
    abstract die(d: DamageInfo): void;
    abstract checkAttack(ai: Enemies, now: number): boolean;
    abstract runAttack(ai: Enemies, now: number): void;
}
