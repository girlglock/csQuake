import { Vec3 } from "@s2ze/math";

const DEG2RAD = Math.PI / 180;

export interface Basis {
    forward: Vec3;
    right: Vec3;
    up: Vec3;
}

export function angleVectors(pitch: number, yaw: number, roll: number): Basis {
    const sy = Math.sin(yaw * DEG2RAD);
    const cy = Math.cos(yaw * DEG2RAD);
    const sp = Math.sin(pitch * DEG2RAD);
    const cp = Math.cos(pitch * DEG2RAD);
    const sr = Math.sin(roll * DEG2RAD);
    const cr = Math.cos(roll * DEG2RAD);

    return {
        forward: new Vec3(cp * cy, cp * sy, -sp),
        right: new Vec3(
            -sr * sp * cy + cr * sy,
            -sr * sp * sy - cr * cy,
            -sr * cp,
        ),
        up: new Vec3(
            cr * sp * cy + sr * sy,
            cr * sp * sy - sr * cy,
            cr * cp,
        ),
    };
}

export function clipVelocity(inVel: Vec3, normal: Vec3, overbounce: number): { out: Vec3; blocked: number } {
    const STOP_EPSILON = 0.1;
    let blocked = 0;
    if (normal.z > 0) blocked |= 1;
    if (Math.abs(normal.z) < 0.02) blocked |= 2;

    const backoff = inVel.dot(normal) * overbounce;
    const c = [inVel.x, inVel.y, inVel.z];
    const n = [normal.x, normal.y, normal.z];
    for (let i = 0; i < 3; i++) {
        c[i] -= n[i] * backoff;
        if (c[i] > -STOP_EPSILON && c[i] < STOP_EPSILON) c[i] = 0;
    }
    return { out: new Vec3(c[0], c[1], c[2]), blocked };
}
