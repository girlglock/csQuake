import { Instance as css, Entity, TraceResult } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";

export interface QTrace {
    fraction: number;
    endpos: Vec3;
    normal: Vec3;
    allsolid: boolean;
    startsolid: boolean;
    didHit: boolean;
    ent: Entity | undefined;
}

const DIST_EPSILON = 0.03125;

let ignore: Entity[] = [];

export function setTraceIgnore(ents: (Entity | undefined)[]): void {
    ignore = [];
    for (const e of ents) {
        if (e && !ignore.includes(e)) ignore.push(e);
    }
}

export interface SolidBox {
    id: Entity;
    center: Vec3;
    mins: Vec3;
    maxs: Vec3;
}

let solidBoxes: SolidBox[] = [];

export function setSolidBoxes(list: SolidBox[]): void {
    solidBoxes = list;
}

interface BoxHit {
    fraction: number;
    normal: Vec3;
    startsolid: boolean;
}

function clipToBox(start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3, b: SolidBox): BoxHit | undefined {
    const lo = [
        b.center.x + b.mins.x - maxs.x,
        b.center.y + b.mins.y - maxs.y,
        b.center.z + b.mins.z - maxs.z,
    ];
    const hi = [
        b.center.x + b.maxs.x - mins.x,
        b.center.y + b.maxs.y - mins.y,
        b.center.z + b.maxs.z - mins.z,
    ];
    const s = [start.x, start.y, start.z];
    const d = [end.x - start.x, end.y - start.y, end.z - start.z];

    let tenter = 0;
    let texit = 1;
    let axis = -1;
    let sign = 0;

    for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-9) {
            if (s[i] < lo[i] || s[i] > hi[i]) return undefined;
            continue;
        }
        let t1 = (lo[i] - s[i]) / d[i];
        let t2 = (hi[i] - s[i]) / d[i];
        let sgn = -1;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; sgn = 1; }
        if (t1 > tenter) { tenter = t1; axis = i; sign = sgn; }
        if (t2 < texit) texit = t2;
        if (tenter > texit) return undefined;
    }

    if (axis < 0) {
        const inside =
            s[0] > lo[0] && s[0] < hi[0] &&
            s[1] > lo[1] && s[1] < hi[1] &&
            s[2] > lo[2] && s[2] < hi[2];
        return inside ? { fraction: 0, normal: new Vec3(0, 0, 0), startsolid: true } : undefined;
    }
    if (tenter >= 1) return undefined;

    const normal = new Vec3(
        axis === 0 ? sign : 0,
        axis === 1 ? sign : 0,
        axis === 2 ? sign : 0,
    );
    return { fraction: tenter < 0 ? 0 : tenter, normal, startsolid: tenter <= 0 };
}

export function traceHull(
    start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3,
    extra?: (Entity | undefined)[],
    skipSolidBoxes?: boolean,
): QTrace {
    let list = ignore;
    if (extra && extra.length) {
        list = ignore.slice();
        for (const e of extra) if (e) list.push(e);
    }
    const ignoreEntity = list.length ? list : undefined;
    const pointTrace =
        mins.x === 0 && mins.y === 0 && mins.z === 0 &&
        maxs.x === 0 && maxs.y === 0 && maxs.z === 0;
    const r: TraceResult = pointTrace
        ? css.TraceLine({ start, end, ignoreEntity, ignorePlayers: true })
        : css.TraceBox({ start, end, mins, maxs, ignoreEntity, ignorePlayers: true });

    let fraction = r.fraction;
    let normal = new Vec3(r.normal ?? { x: 0, y: 0, z: 0 });
    let didHit = r.didHit;
    let hitEnt: Entity | undefined = r.hitEntity;
    let startsolid = r.startedInSolid;
    let allsolid = r.startedInSolid && r.fraction === 0;

    for (const b of skipSolidBoxes ? [] : solidBoxes) {
        if (extra && extra.includes(b.id)) continue;
        const hit = clipToBox(start, mins, maxs, end, b);
        if (!hit) continue;
        if (hit.startsolid) startsolid = true;
        if (hit.fraction < fraction) {
            fraction = hit.fraction;
            normal = hit.normal;
            hitEnt = b.id;
            didHit = true;
            if (hit.fraction === 0 && hit.startsolid) allsolid = true;
        }
    }

    const delta = new Vec3(end).subtract(start);
    let endpos = new Vec3(start).add(delta.scale(fraction));
    if (didHit && !pointTrace && fraction < 1 && normal.lengthSquared > 0.5) {
        endpos = endpos.add(normal.scale(DIST_EPSILON));
    }
    return { fraction, endpos, normal, allsolid, startsolid, didHit, ent: hitEnt };
}

export function testPosition(
    origin: Vec3, mins: Vec3, maxs: Vec3, extra?: (Entity | undefined)[],
): boolean {
    return traceHull(origin, mins, maxs, origin, extra).startsolid;
}
