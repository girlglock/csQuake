import { Instance, Entity, CSInputs, CSGearSlot, CSDamageTypes, PointTemplate, CustomHudLayout, CustomCameraMode, CSMoveType } from "cs_script/point_script";

function lineMap(value) {
    if (value === null) return "<null>";
    if (value === undefined) return "<undefined>";
    if (value instanceof Entity) {
        if (!value.IsValid()) return `<Invalid entity handle>`;
        const name = value.GetEntityName();
        return `<${value.GetClassName()}>${name ? ` (${name})` : ""}: ${JSON.stringify(value, null, 2)}`;
    }
    return typeof value === "object" ? JSON.stringify(value, null, 2) : value;
}

function print(...args) {
    Instance.Msg(args.map(lineMap).join(" "));
}

class MathUtils {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

const RAD_TO_DEG = 180 / Math.PI;

const DEG_TO_RAD = Math.PI / 180;

class Vector3Utils {
    static equals(a, b) {
        return a.x === b.x && a.y === b.y && a.z === b.z;
    }
    static add(a, b) {
        return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }
    static subtract(a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    static scale(vector, scale) {
        return new Vec3(vector.x * scale, vector.y * scale, vector.z * scale);
    }
    static multiply(a, b) {
        return new Vec3(a.x * b.x, a.y * b.y, a.z * b.z);
    }
    static divide(vector, divider) {
        if (typeof divider === "number") {
            if (divider === 0) throw Error("Division by zero");
            return new Vec3(vector.x / divider, vector.y / divider, vector.z / divider);
        } else {
            if (divider.x === 0 || divider.y === 0 || divider.z === 0) throw Error("Division by zero");
            return new Vec3(vector.x / divider.x, vector.y / divider.y, vector.z / divider.z);
        }
    }
    static length(vector) {
        return Math.sqrt(Vector3Utils.lengthSquared(vector));
    }
    static lengthSquared(vector) {
        return vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
    }
    static length2D(vector) {
        return Math.sqrt(Vector3Utils.length2DSquared(vector));
    }
    static length2DSquared(vector) {
        return vector.x ** 2 + vector.y ** 2;
    }
    static normalize(vector) {
        const length = Vector3Utils.length(vector);
        return length ? Vector3Utils.divide(vector, length) : Vec3.Zero;
    }
    static dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    static cross(a, b) {
        return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    static inverse(vector) {
        return new Vec3(-vector.x, -vector.y, -vector.z);
    }
    static distance(a, b) {
        return Vector3Utils.subtract(a, b).length;
    }
    static distanceSquared(a, b) {
        return Vector3Utils.subtract(a, b).lengthSquared;
    }
    static distance2D(a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, 0).length;
    }
    static distance2DSquared(a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, 0).lengthSquared;
    }
    static floor(vector) {
        return new Vec3(Math.floor(vector.x), Math.floor(vector.y), Math.floor(vector.z));
    }
    static vectorAngles(vector) {
        let yaw = 0;
        let pitch = 0;
        if (!vector.y && !vector.x) {
            if (vector.z > 0) pitch = -90; else pitch = 90;
        } else {
            yaw = Math.atan2(vector.y, vector.x) * RAD_TO_DEG;
            pitch = Math.atan2(-vector.z, Vector3Utils.length2D(vector)) * RAD_TO_DEG;
        }
        return new Euler({
            pitch,
            yaw,
            roll: 0
        });
    }
    static lerp(a, b, fraction, clamp = true) {
        let t = fraction;
        if (clamp) {
            t = MathUtils.clamp(t, 0, 1);
        }
        return new Vec3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    }
    static directionTowards(a, b) {
        return Vector3Utils.subtract(b, a).normal;
    }
    static lookAt(a, b) {
        return Vector3Utils.directionTowards(a, b).eulerAngles;
    }
    static withX(vector, x) {
        return new Vec3(x, vector.y, vector.z);
    }
    static withY(vector, y) {
        return new Vec3(vector.x, y, vector.z);
    }
    static withZ(vector, z) {
        return new Vec3(vector.x, vector.y, z);
    }
    static round(vector) {
        return new Vec3(Math.round(vector.x), Math.round(vector.y), Math.round(vector.z));
    }
    static ceil(vector) {
        return new Vec3(Math.ceil(vector.x), Math.ceil(vector.y), Math.ceil(vector.z));
    }
    static map(vector, callback) {
        return new Vec3(callback(vector.x), callback(vector.y), callback(vector.z));
    }
}

class Vec3 {
    x;
    y;
    z;
    static get Zero() {
        return new Vec3(0, 0, 0);
    }
    static get Forward() {
        return new Vec3(1, 0, 0);
    }
    static get Right() {
        return new Vec3(0, 1, 0);
    }
    static get Up() {
        return new Vec3(0, 0, 1);
    }
    constructor(xOrVector, y, z) {
        if (typeof xOrVector === "object") {
            this.x = xOrVector.x === 0 ? 0 : xOrVector.x;
            this.y = xOrVector.y === 0 ? 0 : xOrVector.y;
            this.z = xOrVector.z === 0 ? 0 : xOrVector.z;
        } else {
            this.x = xOrVector === 0 ? 0 : xOrVector;
            this.y = y === 0 ? 0 : y;
            this.z = z === 0 ? 0 : z;
        }
    }
    get length() {
        return Vector3Utils.length(this);
    }
    get lengthSquared() {
        return Vector3Utils.lengthSquared(this);
    }
    get length2D() {
        return Vector3Utils.length2D(this);
    }
    get length2DSquared() {
        return Vector3Utils.length2DSquared(this);
    }
    get normal() {
        return Vector3Utils.normalize(this);
    }
    get inverse() {
        return Vector3Utils.inverse(this);
    }
    get floored() {
        return Vector3Utils.floor(this);
    }
    get ceil() {
        return Vector3Utils.ceil(this);
    }
    get round() {
        return Vector3Utils.round(this);
    }
    get eulerAngles() {
        return Vector3Utils.vectorAngles(this);
    }
    toString() {
        return `Vec3: [${this.x}, ${this.y}, ${this.z}]`;
    }
    equals(vector) {
        return Vector3Utils.equals(this, vector);
    }
    add(vector) {
        return Vector3Utils.add(this, vector);
    }
    subtract(vector) {
        return Vector3Utils.subtract(this, vector);
    }
    divide(vector) {
        return Vector3Utils.divide(this, vector);
    }
    scale(scaleOrVector) {
        return typeof scaleOrVector === "number" ? Vector3Utils.scale(this, scaleOrVector) : Vector3Utils.multiply(this, scaleOrVector);
    }
    multiply(scaleOrVector) {
        return typeof scaleOrVector === "number" ? Vector3Utils.scale(this, scaleOrVector) : Vector3Utils.multiply(this, scaleOrVector);
    }
    dot(vector) {
        return Vector3Utils.dot(this, vector);
    }
    cross(vector) {
        return Vector3Utils.cross(this, vector);
    }
    distance(vector) {
        return Vector3Utils.distance(this, vector);
    }
    distance2D(vector) {
        return Vector3Utils.distance2D(this, vector);
    }
    distanceSquared(vector) {
        return Vector3Utils.distanceSquared(this, vector);
    }
    distance2DSquared(vector) {
        return Vector3Utils.distance2DSquared(this, vector);
    }
    lerpTo(vector, fraction, clamp = true) {
        return Vector3Utils.lerp(this, vector, fraction, clamp);
    }
    directionTowards(vector) {
        return Vector3Utils.directionTowards(this, vector);
    }
    lookAt(vector) {
        return Vector3Utils.lookAt(this, vector);
    }
    withX(x) {
        return Vector3Utils.withX(this, x);
    }
    withY(y) {
        return Vector3Utils.withY(this, y);
    }
    withZ(z) {
        return Vector3Utils.withZ(this, z);
    }
}

class EulerUtils {
    static equals(a, b) {
        return a.pitch === b.pitch && a.yaw === b.yaw && a.roll === b.roll;
    }
    static normalize(angle) {
        const normalizeAngle = angle => {
            angle = angle % 360;
            if (angle > 180) return angle - 360;
            if (angle < -180) return angle + 360;
            return angle;
        };
        return new Euler(normalizeAngle(angle.pitch), normalizeAngle(angle.yaw), normalizeAngle(angle.roll));
    }
    static forward(angle) {
        const pitchInRad = angle.pitch / 180 * Math.PI;
        const yawInRad = angle.yaw / 180 * Math.PI;
        const cosPitch = Math.cos(pitchInRad);
        return new Vec3(cosPitch * Math.cos(yawInRad), cosPitch * Math.sin(yawInRad), -Math.sin(pitchInRad));
    }
    static right(angle) {
        const pitchInRad = angle.pitch / 180 * Math.PI;
        const yawInRad = angle.yaw / 180 * Math.PI;
        const rollInRad = angle.roll / 180 * Math.PI;
        const sinPitch = Math.sin(pitchInRad);
        const sinYaw = Math.sin(yawInRad);
        const sinRoll = Math.sin(rollInRad);
        const cosPitch = Math.cos(pitchInRad);
        const cosYaw = Math.cos(yawInRad);
        const cosRoll = Math.cos(rollInRad);
        return new Vec3(-1 * sinRoll * sinPitch * cosYaw + -1 * cosRoll * -sinYaw, -1 * sinRoll * sinPitch * sinYaw + -1 * cosRoll * cosYaw, -1 * sinRoll * cosPitch);
    }
    static up(angle) {
        const pitchInRad = angle.pitch / 180 * Math.PI;
        const yawInRad = angle.yaw / 180 * Math.PI;
        const rollInRad = angle.roll / 180 * Math.PI;
        const sinPitch = Math.sin(pitchInRad);
        const sinYaw = Math.sin(yawInRad);
        const sinRoll = Math.sin(rollInRad);
        const cosPitch = Math.cos(pitchInRad);
        const cosYaw = Math.cos(yawInRad);
        const cosRoll = Math.cos(rollInRad);
        return new Vec3(cosRoll * sinPitch * cosYaw + -sinRoll * -sinYaw, cosRoll * sinPitch * sinYaw + -sinRoll * cosYaw, cosRoll * cosPitch);
    }
    static lerp(a, b, fraction, clamp = true) {
        let t = fraction;
        if (clamp) {
            t = MathUtils.clamp(t, 0, 1);
        }
        const lerpComponent = (start, end, t) => {
            let delta = end - start;
            if (delta > 180) {
                delta -= 360;
            } else if (delta < -180) {
                delta += 360;
            }
            return start + delta * t;
        };
        return new Euler(lerpComponent(a.pitch, b.pitch, t), lerpComponent(a.yaw, b.yaw, t), lerpComponent(a.roll, b.roll, t));
    }
    static withPitch(angle, pitch) {
        return new Euler(pitch, angle.yaw, angle.roll);
    }
    static withYaw(angle, yaw) {
        return new Euler(angle.pitch, yaw, angle.roll);
    }
    static withRoll(angle, roll) {
        return new Euler(angle.pitch, angle.yaw, roll);
    }
    static rotateTowards(current, target, maxStep) {
        const rotateComponent = (current, target, step) => {
            let delta = target - current;
            if (delta > 180) {
                delta -= 360;
            } else if (delta < -180) {
                delta += 360;
            }
            if (Math.abs(delta) <= step) {
                return target;
            } else {
                return current + Math.sign(delta) * step;
            }
        };
        return new Euler(rotateComponent(current.pitch, target.pitch, maxStep), rotateComponent(current.yaw, target.yaw, maxStep), rotateComponent(current.roll, target.roll, maxStep));
    }
    static clamp(angle, min, max) {
        return new Euler(MathUtils.clamp(angle.pitch, min.pitch, max.pitch), MathUtils.clamp(angle.yaw, min.yaw, max.yaw), MathUtils.clamp(angle.roll, min.roll, max.roll));
    }
    static round(angle) {
        return new Euler(Math.round(angle.pitch), Math.round(angle.yaw), Math.round(angle.roll));
    }
    static floor(angle) {
        return new Euler(Math.floor(angle.pitch), Math.floor(angle.yaw), Math.floor(angle.roll));
    }
    static ceil(angle) {
        return new Euler(Math.ceil(angle.pitch), Math.ceil(angle.yaw), Math.ceil(angle.roll));
    }
}

class Euler {
    pitch;
    yaw;
    roll;
    static Zero=new Euler(0, 0, 0);
    static Forward=new Euler(1, 0, 0);
    static Right=new Euler(0, 1, 0);
    static Up=new Euler(0, 0, 1);
    constructor(pitchOrAngle, yaw, roll) {
        if (typeof pitchOrAngle === "object") {
            this.pitch = pitchOrAngle.pitch === 0 ? 0 : pitchOrAngle.pitch;
            this.yaw = pitchOrAngle.yaw === 0 ? 0 : pitchOrAngle.yaw;
            this.roll = pitchOrAngle.roll === 0 ? 0 : pitchOrAngle.roll;
        } else {
            this.pitch = pitchOrAngle === 0 ? pitchOrAngle : pitchOrAngle;
            this.yaw = yaw === 0 ? 0 : yaw;
            this.roll = roll === 0 ? 0 : roll;
        }
    }
    get normal() {
        return EulerUtils.normalize(this);
    }
    get forward() {
        return EulerUtils.forward(this);
    }
    get backward() {
        return this.forward.inverse;
    }
    get right() {
        return EulerUtils.right(this);
    }
    get left() {
        return this.right.inverse;
    }
    get up() {
        return EulerUtils.up(this);
    }
    get down() {
        return this.up.inverse;
    }
    get floor() {
        return EulerUtils.floor(this);
    }
    get ceil() {
        return EulerUtils.ceil(this);
    }
    get round() {
        return EulerUtils.round(this);
    }
    toString() {
        return `Euler: [${this.pitch}, ${this.yaw}, ${this.roll}]`;
    }
    equals(angle) {
        return EulerUtils.equals(this, angle);
    }
    lerp(angle, fraction, clamp = true) {
        return EulerUtils.lerp(this, angle, fraction, clamp);
    }
    withPitch(pitch) {
        return EulerUtils.withPitch(this, pitch);
    }
    withYaw(yaw) {
        return EulerUtils.withYaw(this, yaw);
    }
    withRoll(roll) {
        return EulerUtils.withRoll(this, roll);
    }
    rotateTowards(angle, maxStep) {
        return EulerUtils.rotateTowards(this, angle, maxStep);
    }
    clamp(min, max) {
        return EulerUtils.clamp(this, min, max);
    }
}

class Matrix3x4 {
    m=new Float32Array(12);
    constructor() {
        this.m.fill(0);
        this.m[0] = 1;
        this.m[5] = 1;
        this.m[10] = 1;
    }
    equals(mat2, tolerance = 1e-5) {
        for (let i = 0; i < 12; ++i) {
            if (Math.abs(this.m[i] - mat2.m[i]) > tolerance) return false;
        }
        return true;
    }
    get isIdentity() {
        return this.equals(Matrix3x4.identityMatrix);
    }
    get isValid() {
        if (!this.isOrthogonal) {
            return false;
        }
        for (let i = 0; i < 12; i++) {
            if (!Number.isFinite(this.m[i])) return false;
        }
        return true;
    }
    get isOrthogonal() {
        return this.multiply(this.inverse).isIdentity;
    }
    get inverse() {
        const retMat = new Matrix3x4;
        retMat.m[0] = this.m[0];
        retMat.m[1] = this.m[4];
        retMat.m[2] = this.m[8];
        retMat.m[4] = this.m[1];
        retMat.m[5] = this.m[5];
        retMat.m[6] = this.m[9];
        retMat.m[8] = this.m[2];
        retMat.m[9] = this.m[6];
        retMat.m[10] = this.m[10];
        const x = this.m[3];
        const y = this.m[7];
        const z = this.m[11];
        retMat.m[3] = -(x * retMat.m[0] + y * retMat.m[1] + z * retMat.m[2]);
        retMat.m[7] = -(x * retMat.m[4] + y * retMat.m[5] + z * retMat.m[6]);
        retMat.m[11] = -(x * retMat.m[8] + y * retMat.m[9] + z * retMat.m[10]);
        return retMat;
    }
    setOrigin(x, y, z) {
        this.m[3] = x;
        this.m[7] = y;
        this.m[11] = z;
    }
    get origin() {
        return new Vec3(this.m[3], this.m[7], this.m[11]);
    }
    set origin({x, y, z}) {
        this.setOrigin(x, y, z);
    }
    setAngles(pitch, yaw, roll) {
        const ay = DEG_TO_RAD * yaw;
        const ax = DEG_TO_RAD * pitch;
        const az = DEG_TO_RAD * roll;
        const sy = Math.sin(ay), cy = Math.cos(ay);
        const sp = Math.sin(ax), cp = Math.cos(ax);
        const sr = Math.sin(az), cr = Math.cos(az);
        this.m[0] = cp * cy;
        this.m[4] = cp * sy;
        this.m[8] = -sp;
        this.m[1] = sr * sp * cy + cr * -sy;
        this.m[5] = sr * sp * sy + cr * cy;
        this.m[9] = sr * cp;
        this.m[2] = cr * sp * cy + -sr * -sy;
        this.m[6] = cr * sp * sy + -sr * cy;
        this.m[10] = cr * cp;
    }
    set angles(angles) {
        this.setAngles(angles.pitch, angles.yaw, angles.roll);
    }
    get angles() {
        const returnAngles = new Euler(0, 0, 0);
        const forward0 = this.m[0];
        const forward1 = this.m[4];
        const xyDist = Math.sqrt(forward0 * forward0 + forward1 * forward1);
        if (xyDist > .001) {
            returnAngles.yaw = Math.atan2(forward1, forward0) * RAD_TO_DEG;
            returnAngles.pitch = Math.atan2(-this.m[8], xyDist) * RAD_TO_DEG;
            returnAngles.roll = Math.atan2(this.m[9], this.m[10]) * RAD_TO_DEG;
        } else {
            returnAngles.yaw = Math.atan2(-this.m[1], this.m[5]) * RAD_TO_DEG;
            returnAngles.pitch = Math.atan2(-this.m[8], xyDist) * RAD_TO_DEG;
            returnAngles.roll = 0;
        }
        return returnAngles;
    }
    get forward() {
        return new Vec3(this.m[0], this.m[4], this.m[8]);
    }
    set forward(vec) {
        const fwd = vec.normal;
        let right;
        if (Math.abs(fwd.dot(Vec3.Up)) > .999) {
            right = fwd.cross(Vec3.Forward).normal;
        } else {
            right = Vec3.Up.cross(fwd).normal;
        }
        const up = fwd.cross(right).normal;
        this.m[0] = fwd.x;
        this.m[4] = fwd.y;
        this.m[8] = fwd.z;
        this.m[1] = right.x;
        this.m[5] = right.y;
        this.m[9] = right.z;
        this.m[2] = up.x;
        this.m[6] = up.y;
        this.m[10] = up.z;
    }
    get backward() {
        return new Vec3(-this.m[0], -this.m[4], -this.m[8]);
    }
    set backward(vec) {
        this.forward = vec.inverse;
    }
    get right() {
        return new Vec3(-this.m[1], -this.m[5], -this.m[9]);
    }
    set right(vec) {
        const right = vec.normal;
        let fwd;
        if (Math.abs(right.dot(Vec3.Up)) > .999) {
            fwd = Vec3.Forward.cross(right).normal;
        } else {
            fwd = right.cross(Vec3.Up).normal;
        }
        const up = fwd.cross(right).normal;
        this.m[0] = fwd.x;
        this.m[4] = fwd.y;
        this.m[8] = fwd.z;
        this.m[1] = right.x;
        this.m[5] = right.y;
        this.m[9] = right.z;
        this.m[2] = up.x;
        this.m[6] = up.y;
        this.m[10] = up.z;
    }
    get left() {
        return this.right.inverse;
    }
    set left(vec) {
        this.right = vec.inverse;
    }
    get up() {
        return new Vec3(this.m[2], this.m[6], this.m[10]);
    }
    set up(vec) {
        const up = vec.normal;
        let right;
        if (Math.abs(up.dot(Vec3.Forward)) > .999) {
            right = Vec3.Right.cross(up).normal;
        } else {
            right = up.cross(Vec3.Forward).normal;
        }
        const fwd = right.cross(up).normal;
        this.m[0] = fwd.x;
        this.m[4] = fwd.y;
        this.m[8] = fwd.z;
        this.m[1] = right.x;
        this.m[5] = right.y;
        this.m[9] = right.z;
        this.m[2] = up.x;
        this.m[6] = up.y;
        this.m[10] = up.z;
    }
    get down() {
        return new Vec3(-this.m[2], -this.m[6], -this.m[10]);
    }
    set down(vec) {
        this.up = vec.inverse;
    }
    multiply(mat2) {
        const out = new Matrix3x4;
        const m1 = this.m;
        const m2 = mat2.m;
        const m3 = out.m;
        m3[0] = m1[0] * m2[0] + m1[1] * m2[4] + m1[2] * m2[8];
        m3[1] = m1[0] * m2[1] + m1[1] * m2[5] + m1[2] * m2[9];
        m3[2] = m1[0] * m2[2] + m1[1] * m2[6] + m1[2] * m2[10];
        m3[3] = m1[0] * m2[3] + m1[1] * m2[7] + m1[2] * m2[11] + m1[3];
        m3[4] = m1[4] * m2[0] + m1[5] * m2[4] + m1[6] * m2[8];
        m3[5] = m1[4] * m2[1] + m1[5] * m2[5] + m1[6] * m2[9];
        m3[6] = m1[4] * m2[2] + m1[5] * m2[6] + m1[6] * m2[10];
        m3[7] = m1[4] * m2[3] + m1[5] * m2[7] + m1[6] * m2[11] + m1[7];
        m3[8] = m1[8] * m2[0] + m1[9] * m2[4] + m1[10] * m2[8];
        m3[9] = m1[8] * m2[1] + m1[9] * m2[5] + m1[10] * m2[9];
        m3[10] = m1[8] * m2[2] + m1[9] * m2[6] + m1[10] * m2[10];
        m3[11] = m1[8] * m2[3] + m1[9] * m2[7] + m1[10] * m2[11] + m1[11];
        return out;
    }
    rotateVec3(vec) {
        return new Vec3(vec.x * this.m[0] + vec.y * this.m[1] + vec.z * this.m[2], vec.x * this.m[4] + vec.y * this.m[5] + vec.z * this.m[6], vec.x * this.m[8] + vec.y * this.m[9] + vec.z * this.m[10]);
    }
    transformVec3(vec) {
        return new Vec3(vec.x * this.m[0] + vec.y * this.m[1] + vec.z * this.m[2] + this.m[3], vec.x * this.m[4] + vec.y * this.m[5] + vec.z * this.m[6] + this.m[7], vec.x * this.m[8] + vec.y * this.m[9] + vec.z * this.m[10] + this.m[11]);
    }
    rotateInverseVec3(vec) {
        return new Vec3(vec.x * this.m[0] + vec.y * this.m[4] + vec.z * this.m[8], vec.x * this.m[1] + vec.y * this.m[5] + vec.z * this.m[9], vec.x * this.m[2] + vec.y * this.m[6] + vec.z * this.m[10]);
    }
    transformInverseVec3(vec) {
        const vecMy = vec.x - this.m[3];
        const vecMx = vec.y - this.m[7];
        const vecMz = vec.z - this.m[11];
        return new Vec3(vecMy * this.m[0] + vecMx * this.m[4] + vecMz * this.m[8], vecMy * this.m[1] + vecMx * this.m[5] + vecMz * this.m[9], vecMy * this.m[2] + vecMx * this.m[6] + vecMz * this.m[10]);
    }
    toString() {
        return `\n           [${this.m[0]}, ${this.m[1]}, ${this.m[2]}, ${this.m[3]}]\n                \nMatrix3_4: [${this.m[4]}, ${this.m[5]}, ${this.m[6]}, ${this.m[7]}]\n                \n           [${this.m[8]}, ${this.m[9]}, ${this.m[10]}, ${this.m[11]}]`;
    }
    toArray() {
        return this.m;
    }
    static getScaleMatrix(x, y, z) {
        const matrix = new Matrix3x4;
        matrix.m[0] = x;
        matrix.m[5] = y;
        matrix.m[10] = z;
        return matrix;
    }
    static identityMatrix=Object.freeze(new Matrix3x4);
}

const SV_GRAVITY = 800;

const SV_MAXVELOCITY = 2e3;

const SV_MAXSPEED = 320;

const SV_ACCELERATE = 10;

const SV_FRICTION = 4;

const SV_EDGEFRICTION = 2;

const SV_STOPSPEED = 100;

const SV_JUMP_VELOCITY = 270;

const AIR_ACCEL_CAP = 30;

const STEPSIZE = 18;

const MAX_CLIP_PLANES = 5;

const MOVE_BUMPS = 4;

const STUCK_HIST_INTERVAL = .2;

const STUCK_HIST_LEN = 64;

const STUCK_TP_GRACE_TICKS = 16;

const STUCK_LIFT_GRACE_TICKS = 10;

const MOVE_PITCH_DIVISOR = 3;

const CL_FORWARDSPEED = 400;

const CL_SIDESPEED = 400;

const CL_FORWARDSPEED_WALK = 200;

const CL_SIDESPEED_WALK = 200;

const NOCLIP_SPEED = 900;

const WATER_SINK_SPEED = 60;

const WATER_SWIM_UP = 100;

const SLIME_SWIM_UP = 80;

const LAVA_SWIM_UP = 50;

const WATER_WISHSPEED_SCALE = .7;

const WATER_JUMP_UP = 225;

const LAVA_WATER_JUMP_UP = WATER_JUMP_UP * .75;

const WATER_JUMP_TIME = 2;

const WATER_JUMP_START_UP = 8;

const WATER_JUMP_FWD_DIST = 24;

const WATER_TRIGGER_PREFIX = "water";

const POISON_TRIGGER_PREFIX = "poison";

const LAVA_TRIGGER_PREFIX = "lava";

const TELEPORT_TRIGGER_PREFIX = "teleport";

const TELEPORT_EXIT_SPEED = 300;

const TELEPORT_DEST_Z_OFS = 27;

const KEY_DOOR_TRIGGER_PREFIX = "needs_key_";

const OPENS_ELSEWHERE_TRIGGER_PREFIX = "opens_else_where";

const DEATH_TRIGGER_PREFIX = "death";

const HURT_TRIGGER_PREFIX = "hurt";

const AIR_TIME = 12;

const DROWN_INTERVAL = 1;

const DROWN_DMG_STEP = 2;

const DROWN_DMG_MAX = 15;

const SLIME_INTERVAL = 1;

const SLIME_DMG_PER_LEVEL = 4;

const LAVA_INTERVAL = .2;

const LAVA_INTERVAL_SUITED = 1;

const LAVA_DMG_PER_LEVEL = 10;

const RADSUIT_TIME = 30;

const QUAD_TIME = 30;

const PENT_TIME = 30;

const RING_TIME = 30;

const QUAD_DAMAGE_MUL = 4;

const HULL_MIN = new Vec3(-16, -16, -24);

const HULL_MAX = new Vec3(16, 16, 32);

const VIEW_OFS_Z = 22;

const STEP_SMOOTH_SPEED = 150;

const STEP_SMOOTH_MAX = 18;

const FOV_MIN = 90;

const FOV_MAX = 140;

const FOV_STEP = 5;

const FOV_DEFAULT = 90;

const TOUCH_BODY_NAME = "quake_player_touch";

const TOUCH_GROUND_LIFT = 16;

const PROX_RADIUS = 112;

const PROX_Z = 128;

const BUTTON_PROX_RADIUS = 40;

const BUTTON_PROX_Z = 44;

const DOOR_PROX_RADIUS = 144;

const DOOR_PROX_Z = 128;

const DOOR_ACTIVATE_DIST = 96;

const LIFT_DEBOUNCE = 1;

const LIFT_CRUSH_HOLD = 2.5;

const LIFT_CRUSH_DAMAGE = 1;

const HURT_TRIGGER_DAMAGE = LIFT_CRUSH_DAMAGE;

const LIFT_CRUSH_HURT_INTERVAL = .1;

const DEATH_VIEW_OFS = -8;

const DEATH_TOSS_UP = 300;

const DEATH_VIEW_LERP = .18;

const SPAWN_VIEW_HOLD = .2;

const HITMARK_DEBOUNCE = .05;

const SPAWN_ENTER_DELAY = .1;

const LEVEL_COUNT = 1;

const SAVE_SLOTS = 3;

const DIFFICULTIES = [ "easy", "normal", "hard", "nightmare" ];

const DIFFICULTY_DEFAULT = "normal";

const STATS_MAX_ROWS = 12;

const STATS_ROW_COLS = 26;

const LEVEL_STREAM_TIMEOUT = 10;

const LEVEL_UNLOAD_TIMEOUT = 8;

const LEVEL_SETTLE_DELAY = .15;

const LOAD_SCREEN_MIN = 3;

const LEVEL_END_CAM = "level_end_cam";

const LEVEL_END_TEMPLATE_NAME = "level_end_template";

const LEVEL_END_SPAWN_NAME = "level_end";

const LEVEL_END_HULL_MIN = new Vec3(-40, -40, -8);

const LEVEL_END_HULL_MAX = new Vec3(40, 40, 88);

const INTER_SWAY_PITCH = .7;

const INTER_SWAY_YAW = 1.1;

const INTER_SWAY_ROLL = .5;

const INTER_SWAY_PITCH_CYCLE = .42;

const INTER_SWAY_YAW_CYCLE = .27;

const INTER_SWAY_ROLL_CYCLE = .19;

const INTER_SWAY_POS = 1.5;

const INTER_SWAY_POS_CYCLE = .23;

const SV_ROLLANGLE = 2;

const SV_ROLLSPEED = 200;

const CL_BOB = .02;

const CL_BOBCYCLE = .6;

const CL_BOBUP = .5;

const V_BOB_UP_MAX = 4;

const VM_BOB_FWD = .4;

const VM_SIDE_OFFSET = 8;

const STRAFE_ROLL_TARGET = "pawn";

const STRAFE_ROLL_SCALE = 1;

const PUNCH_RETURN = 10;

const VIEWKICK_SCALE = 1;

const PUNCH_PITCH = {
    shotgun: -2,
    ssg: -4,
    nailgun: -2,
    snailgun: -2,
    glauncher: -2,
    rlauncher: -2,
    lightning: -2
};

const TICK_INTERVAL = .015625;

const LAND_SOFT_SPEED = 180;

const LAND_HARD_SPEED = 650;

const FALL_DAMAGE = 5;

const MONSTER_IDLE_SOUND_CHANCE = .015;

const SND = {
    playerJump: "Quake.player_plyrjmp8",
    playerLand: "Quake.player_land",
    playerLandHard: "Quake.player_land2",
    playerPain: "Quake.player_pain",
    playerDeath: "Quake.player_death",
    axeSwing: "Quake.weapons_ax1",
    axeHitWall: "Quake.player_axhit2",
    axeHitFlesh: "Quake.player_axhit2",
    shotgun: "Quake.weapons_guncock",
    ssg: "Quake.weapons_shotgn2",
    nailgun: "Quake.weapons_rocket1i",
    snailgun: "Quake.weapons_spike2",
    grenadeFire: "Quake.weapons_grenade",
    grenadeFireEnemy: "Quake.weapons_grenade_enemy",
    rocketFire: "Quake.weapons_sgun1",
    lightningStart: "Quake.weapons_lstart",
    lightningFire: "Quake.weapons_lhit",
    explosion: "Quake.weapons_r_exp3",
    gibSplat: "Quake.gib_udeath",
    gibSplatPlayer: "Quake.player_udeath",
    grenadeBounce: "Quake.weapons_bounce",
    spikeHitWall: [ "Quake.weapons_ric1", "Quake.weapons_ric2", "Quake.weapons_ric3" ],
    spikeShooterFire: "Quake.weapons_spike2",
    soldierSight: "Quake.soldier_sight1",
    soldierIdle: "Quake.soldier_idle",
    soldierFire: "Quake.soldier_sattck1",
    soldierPain: [ "Quake.soldier_pain1", "Quake.soldier_pain2" ],
    soldierDeath: "Quake.soldier_death1",
    dogSight: "Quake.dog_dsight",
    dogIdle: "Quake.dog_idle",
    dogAttack: "Quake.dog_dattack1",
    dogPain: "Quake.dog_dpain1",
    dogDeath: "Quake.dog_ddeath",
    ogreSight: "Quake.ogre_ogwake",
    ogreIdle: "Quake.ogre_ogidle",
    ogreSaw: "Quake.ogre_ogsawatk",
    ogrePain: [ "Quake.ogre_ogpain1" ],
    ogreDeath: "Quake.ogre_ogdth",
    knightSight: "Quake.knight_ksight",
    knightIdle: "Quake.knight_idle",
    knightSword: [ "Quake.knight_sword1", "Quake.knight_sword2" ],
    knightPain: [ "Quake.knight_khurt" ],
    knightDeath: "Quake.knight_kdeath",
    demonSight: "Quake.demon_sight2",
    demonIdle: "Quake.demon_idle1",
    demonJump: "Quake.demon_djump",
    demonHit: "Quake.demon_dhit2",
    demonPain: [ "Quake.demon_dpain1" ],
    demonDeath: "Quake.demon_ddeath",
    zombieSight: "Quake.zombie_z_idle",
    zombieIdle: "Quake.zombie_z_idle1",
    zombieShot: "Quake.zombie_z_shot1",
    zombieHit: "Quake.zombie_z_hit",
    zombieMiss: "Quake.zombie_z_miss",
    zombieFall: "Quake.zombie_z_fall",
    zombiePain: [ "Quake.zombie_z_pain", "Quake.zombie_z_pain1" ],
    zombieDeath: "Quake.zombie_z_gib",
    wizardSight: "Quake.wizard_wsight",
    wizardIdle: "Quake.wizard_widle1",
    wizardAttack: "Quake.wizard_wattack",
    wizardPain: [ "Quake.wizard_wpain" ],
    wizardDeath: "Quake.wizard_wdeath",
    shamblerSight: "Quake.shambler_ssight",
    shamblerIdle: "Quake.shambler_sidle",
    shamblerAttack: "Quake.shambler_sattck1",
    shamblerBoom: "Quake.shambler_sboom",
    shamblerMelee1: "Quake.shambler_melee1",
    shamblerMelee2: "Quake.shambler_melee2",
    shamblerSmack: "Quake.shambler_smack",
    shamblerPain: [ "Quake.shambler_shurt2" ],
    shamblerDeath: "Quake.shambler_sdeath",
    bossSight: "Quake.boss1_sight1",
    bossRise: "Quake.boss1_out1",
    bossThrow: "Quake.boss1_throw",
    bossPain: [ "Quake.boss1_pain" ],
    bossDeath: "Quake.boss1_death",
    runePickup: "Quake.misc_runekey",
    itemArmor: "Quake.items_armor1",
    itemHealthBox: "Quake.items_health1",
    itemHealthRotten: "Quake.items_r_item1",
    itemHealthMega: "Quake.items_r_item2",
    itemAmmo: "Quake.weapons_lock4",
    keyPickup: "Quake.misc_medkey",
    doorLocked: "Quake.doors_medtry",
    doorTalk: "Quake.misc_talk",
    itemSuit: "Quake.items_suit",
    itemQuad: "Quake.items_damage",
    itemPent: "Quake.items_protect",
    itemRing: "Quake.items_inv1",
    quadWarn: "Quake.items_damage2",
    quadKill: "Quake.items_damage2",
    pentTick: "Quake.items_protect3",
    pentWarn: "Quake.items_protect2",
    ringTick: "Quake.items_inv3",
    ringWarn: "Quake.items_inv2",
    secret: "Quake.misc_secret",
    hitmarker: "Quake.hitmarker",
    teleport: [ "Quake.misc_r_tele1", "Quake.misc_r_tele2", "Quake.misc_r_tele3", "Quake.misc_r_tele4", "Quake.misc_r_tele5" ],
    doorMove: "Quake.doors_stndr1",
    doorStop: "Quake.doors_stndr2",
    buttonPress: "Quake.buttons_switch21",
    waterIn: "Quake.player_inh2o",
    slimeIn: "Quake.player_slimbrn2",
    lavaIn: "Quake.player_inlava",
    waterOut: "Quake.misc_outwater",
    swim: [ "Quake.misc_water1", "Quake.misc_water2" ],
    gaspRecover: "Quake.player_gasp1",
    gaspEmpty: "Quake.player_gasp2"
};

const PROX_THEME_ALIAS = {
    medieval: "med",
    base: "tech",
    hydraulic: "tech",
    wind: "metal",
    retractor: "train",
    stab: "train",
    spike: "train"
};

const PROX_THEMES = {
    tech: {
        move: "Quake.doors_hydro1",
        stop: "Quake.doors_hydro2",
        btn: "Quake.buttons_switch21"
    },
    med: {
        move: "Quake.doors_doormv1",
        stop: "Quake.doors_drclos4",
        btn: "Quake.buttons_switch02"
    },
    stone: {
        move: "Quake.doors_stndr1",
        stop: "Quake.doors_stndr2",
        btn: "Quake.buttons_switch04"
    },
    metal: {
        move: "Quake.doors_ddoor1",
        stop: "Quake.doors_ddoor2",
        btn: "Quake.buttons_airbut1"
    },
    train: {
        move: "Quake.plats_train1",
        stop: "Quake.plats_train2",
        btn: "Quake.plats_train2"
    }
};

const TOUCHDEATH_TAG = "touchdeath";

const TOUCHDEATH_MARGIN = 2;

const TOUCHDEATH_DAMAGE = 9999;

const NOSOUND_TAG = "nosound";

const DEFAULT_SOUNDS_NAME = "default_sounds";

function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
}

const MUSIC_TITLE_EVENT = "Quake.music_track1";

const MUSIC_INTER_EVENT = "Quake.music_track2";

const LEVEL_MUSIC_TRACK = {
    start: 3,
    end: 3,
    e1m1: 5,
    e1m2: 7,
    e1m3: 8,
    e1m4: 4,
    e1m5: 10,
    e1m6: 3,
    e1m7: 6,
    e1m8: 9,
    e2m1: 5,
    e2m2: 7,
    e2m3: 8,
    e2m4: 4,
    e2m5: 10,
    e2m6: 3,
    e2m7: 6,
    e3m1: 5,
    e3m2: 7,
    e3m3: 8,
    e3m4: 7,
    e3m5: 10,
    e3m6: 3,
    e3m7: 4,
    e4m1: 5,
    e4m2: 7,
    e4m3: 8,
    e4m4: 4,
    e4m5: 10,
    e4m6: 3,
    e4m7: 6,
    e4m8: 9,
    dm1: 4,
    dm2: 4,
    dm3: 5,
    dm4: 1,
    dm5: 4,
    dm6: 4
};

function levelMusicEvent(id) {
    const n = LEVEL_MUSIC_TRACK[id.toLowerCase()];
    return n ? `Quake.music_track${n}` : undefined;
}

const EMULATED_FPS = 64;

const SUB_FRAMETIME = 1 / EMULATED_FPS;

const WHEEL_ORDER = [ "axe", "shotgun", "ssg", "nailgun", "snailgun", "glauncher", "rlauncher", "lightning" ];

const WHEEL_TIME_SCALE = .1;

const AXE_RANGE = 64;

const AXE_DAMAGE = 20;

const AXE_REFIRE = .5;

const VM_FIRE_ANIM_TIME = .7;

const SHOTGUN_PELLETS = 6;

const SHOTGUN_PELLET_DAMAGE = 4;

const SHOTGUN_SPREAD = .04;

const SHOTGUN_RANGE = 2048;

const SHOTGUN_REFIRE = .5;

const WEAPON_START_SHELLS = 25;

const AMMO_MAX = {
    shells: 100,
    nails: 200,
    rockets: 100,
    cells: 100
};

const AMMO_NAILS_SMALL = 25;

const AMMO_NAILS_BIG = 50;

const AMMO_ROCKETS_SMALL = 5;

const AMMO_ROCKETS_BIG = 10;

const AMMO_CELLS_SMALL = 6;

const AMMO_CELLS_BIG = 12;

const SSG_PELLETS = 14;

const SSG_PELLET_DAMAGE = 4;

const SSG_SPREAD_X = .14;

const SSG_SPREAD_Y = .08;

const SSG_SHELLS = 2;

const SSG_REFIRE = .7;

const NAIL_SPEED = 1e3;

const NAIL_DAMAGE = 9;

const SNAIL_DAMAGE = 18;

const NAIL_REFIRE = .1;

const SPIKESHOOTER_SPEED = 500;

const SPIKESHOOTER_FUSE = 6;

const SPIKESHOOTER_SUPER_PREFIX = "trap_spikeshooter_s";

const SPIKESHOOTER_INPUT = "spikeshooter_fire";

const GRENADE_SPEED = 600;

const GRENADE_UP = 200;

const GRENADE_FUSE = 2.5;

const GRENADE_REFIRE = .6;

const GRENADE_AVELOCITY = 300;

const ROCKET_SPEED = 1e3;

const ROCKET_DIRECT_MIN = 100;

const ROCKET_DIRECT_RND = 20;

const ROCKET_REFIRE = .8;

const EXPLOSION_DAMAGE = 120;

const EXPLOSION_RADIUS_PAD = 40;

const PARTICLE_BURST_TTL_DEFAULT = 2;

const PARTICLE_BLOOD_TTL = 1.2;

const PARTICLE_WALL_TTL = 1.2;

const PARTICLE_EXPLOSION_TTL = 3;

const PARTICLE_ZAP_TTL = .16;

const PARTICLE_TRAIL_LINGER = 2.5;

const AIR_BUBBLES_BASE = "air_bubbles";

const LG_RANGE = 600;

const LG_DAMAGE = 30;

const LG_REFIRE = .1;

const LG_CELLS_PER_SHOT = 1;

const LG_BEAM_REFRESH = .05;

const LG_BEAM_TTL = .16;

const PROJ_LIFETIME = 5;

const PROJ_SUBSTEPS = 4;

const SPIKE_FX_TTL = .6;

new Vec3(0, 0, 0);

const FIREBALL_SPAWN_BASE = "fireball_spawn";

const FIREBALL_SPEED_DEFAULT = 1e3;

const FIREBALL_DAMAGE = 20;

const FIREBALL_LIFETIME = 5;

const FIREBALL_DELAY_MIN = 3;

const FIREBALL_DELAY_RAND = 5;

const GRENADE_HULL_MIN = new Vec3(-2, -2, -2);

const GRENADE_HULL_MAX = new Vec3(2, 2, 2);

const NAIL_TEMPLATE = "nail_template";

const SNAIL_TEMPLATE = "snail_template";

const ROCKET_TEMPLATE = "rocket_template";

const GRENADE_TEMPLATE = "grenade_template";

const ZOMGIB_TEMPLATE = "zom_gib_template";

const LAVABALL_TEMPLATE = "lavaball_template";

const EVENT_LIGHTNING_BASE = "event_lightning";

const EVENT_LIGHTNING_TICKS = 5;

const EVENT_LIGHTNING_TICK = .1;

const EVENT_LIGHTNING_DAMAGE = 30;

const EVENT_LIGHTNING_BOSS_DAMAGE = 250;

const EVENT_LIGHTNING_PERP = 16;

const EVENT_LIGHTNING_START_UP = 16;

const SIGIL_TEMPLATE = "sigil_template";

const SIGIL_SPAWN_NAME = "sigil_spawn";

const EXPLOBOX_TEMPLATE = "explobox_template";

const EXPLOBOX_SPAWN = "explobox_spawn";

const EXPLOBOX_BIG_TEMPLATE = "explobox_big_template";

const EXPLOBOX_BIG_SPAWN = "explobox_big_spawn";

const EXPLOBOX_HEALTH = 20;

const EXPLOBOX_DAMAGE = 160;

const BOX_SPAWN_OFS = new Vec3(-16, -16, 0);

const GIB_HEALTH = -40;

const GIB_LIFETIME = 10;

const GIB_SPREAD = 200;

const GIB_UP_MIN = 200;

const GIB_UP_RND = 300;

const WEP_CS = {
    weapon_ak47: "shotgun",
    weapon_glock: "ssg",
    weapon_knife: "nailgun",
    weapon_smokegrenade: "snailgun",
    weapon_molotov: "glauncher",
    weapon_hegrenade: "rlauncher",
    weapon_flashbang: "lightning",
    weapon_decoy: "axe"
};

const WEP_CS_GRENADE = new Set([ "weapon_decoy", "weapon_molotov", "weapon_hegrenade", "weapon_flashbang", "weapon_smokegrenade" ]);

const ITEM_TOUCH_TEMPLATE = "item_touch_template";

const BACKPACK_TOUCH_TEMPLATE = "backpack_touch_template";

const BACKPACK_TEMPLATE_NAME = "backpack_template";

const BACKPACK_HULL_MIN = new Vec3(-16, -16, 0);

const BACKPACK_HULL_MAX = new Vec3(16, 16, 56);

const BACKPACK_MODEL_Z_OFS = 0;

const BACKPACK_DROP_Z = 24;

const BACKPACK_TOSS_UP = 300;

const BACKPACK_TOSS_SPREAD = 100;

const BACKPACK_LIFETIME = 120;

const SOLDIER_DROP_SHELLS = 5;

const DOG_DROP_SHELLS = 0;

const ITEM_HULL_MIN = new Vec3(-16, -16, 0);

const ITEM_HULL_MAX = new Vec3(16, 16, 56);

const ITEM_PLACE_RAISE = 6;

const ITEM_DROP_DIST = 256;

const ARMOR1_TYPE = .3;

const ARMOR1_VALUE = 100;

const ARMOR2_TYPE = .6;

const ARMOR2_VALUE = 150;

const ARMOR3_TYPE = .8;

const ARMOR3_VALUE = 200;

const HEALTH_ROTTEN = 15;

const HEALTH_BOX = 25;

const HEALTH_MEGA = 100;

const HEALTH_MEGA_MAX = 250;

const MEGA_ROT_DELAY = 5;

const SHELLS_SMALL = 20;

const SHELLS_BIG = 40;

const PLAYER_START_HEALTH = 100;

const PLAYER_MAX_HEALTH = 100;

const PLAYER_START_ARMOR = 0;

const KNOCKBACK_SCALE = 8;

const KNOCKBACK_LAUNCH_MIN = 150;

const SOLDIER_TEMPLATE_NAME = "soldier_template";

const SOLDIER_SPAWN_NAME = "soldier_spawn";

const SOLDIER_HULL_MIN = new Vec3(-16, -16, -24);

const SOLDIER_HULL_MAX = new Vec3(16, 16, 40);

const SOLDIER_VIEW_OFS_Z = 25;

const SOLDIER_YAW_SPEED = 20;

const SOLDIER_MODEL_Z_OFS = 0;

const SOLDIER_MODEL_YAW_OFS = -90;

const AI_THINK_INTERVAL = .1;

const AI_THINK_FULL_DIST = 750;

const AI_THINK_FAR_DIST = 1500;

const AI_THINK_MAX_INTERVAL = .5;

const AI_THINK_STAGGER = 8;

const AI_INTERP_INTERVAL = 1 / 32;

const AI_VIS_TTL = .15;

const MONSTER_STEPSIZE = 18;

const MONSTER_SPAWN_DROP = 256;

const MONSTER_UNSUPPORTED_DROP = 4096;

const MONSTER_EDGE_MARGIN = 20;

const MONSTER_LEDGE_DROP = 48;

const MONSTER_WALL_MARGIN = 6;

const CORPSE_SETTLE_TIMEOUT = 3;

const SOLDIER_SPAWN_ROAM_NAME = "soldier_spawn_roam";

const DOG_SPAWN_ROAM_NAME = "dog_spawn_roam";

const PATH_NODE_PREFIX = "path_node";

const PATH_REACH_DIST = 24;

const RANGE_MELEE = 120;

const RANGE_NEAR = 500;

const RANGE_MID = 1e3;

const SIGHT_RELAY_WINDOW = .1;

const SHOW_HOSTILE_TIME = 1;

const SOLDIER_RUN_SPEED = 120;

const SOLDIER_WALK_SPEED = 30;

const SOLDIER_INFRONT_DOT = .3;

const SOLDIER_GIVEUP = 5;

const SOLDIER_FIRST_ATTACK_DELAY = 1;

const SOLDIER_ATK_CHANCE_NEAR = .4;

const SOLDIER_ATK_CHANCE_MID = .1;

const SOLDIER_FIRE_AT = .35;

const SOLDIER_ATK_LEN = .9;

const SOLDIER_REFIRE_CHANCE = .4;

const SOLDIER_SHOTS = 4;

const SOLDIER_SPREAD = .1;

const SOLDIER_FIRE_DAMAGE = 4;

const SOLDIER_LEAD_TIME = .2;

const SOLDIER_HEALTH = 30;

const SOLDIER_GIB_HEALTH = -35;

const SOLDIER_PAIN1_TIME = .6;

const SOLDIER_PAIN1_LEN = .6;

const SOLDIER_PAINB_TIME = 1.1;

const SOLDIER_PAINB_LEN = 1.4;

const SOLDIER_PAINC_LEN = 1.3;

const SOLDIER_ANIM_PREFIX = "soldier_";

const SOLDIER_ANIM_STAND = "stand";

const SOLDIER_ANIM_WALK = "prowl";

const SOLDIER_ANIM_RUN = "run";

const SOLDIER_ANIM_SHOOT = "shoot";

const SOLDIER_ANIM_PAIN = "pain";

const SOLDIER_ANIM_PAINB = "painb";

const SOLDIER_ANIM_PAINC = "painc";

const SOLDIER_ANIM_DEATH = "death";

const SOLDIER_ANIM_DEATHC = "deathc";

const DOG_TEMPLATE_NAME = "dog_template";

const DOG_SPAWN_NAME = "dog_spawn";

const DOG_HULL_MIN = new Vec3(-32, -32, -24);

const DOG_HULL_MAX = new Vec3(32, 32, 40);

const DOG_VIEW_OFS_Z = 25;

const DOG_YAW_SPEED = 20;

const DOG_MODEL_Z_OFS = 0;

const DOG_MODEL_YAW_OFS = -90;

const DOG_HEALTH = 25;

const DOG_GIB_HEALTH = -35;

const DOG_RUN_SPEED = 327;

const DOG_WALK_SPEED = 80;

const DOG_CHARGE_SPEED = 100;

const DOG_GIVEUP = 5;

const DOG_FIRST_ATTACK_DELAY = 1;

const DOG_PAIN_LEN = .6;

const DOG_BITE_RANGE = 100;

const DOG_BITE_AT = .35;

const DOG_BITE_LEN = .8;

const DOG_ATK_CHANCE_NEAR = .2;

const DOG_ATK_CHANCE_MID = .05;

const DOG_LEAP_FWD = 300;

const DOG_LEAP_UP = 200;

const DOG_LEAP_DMG_MIN = 10;

const DOG_LEAP_DMG_RND = 10;

const DOG_LEAP_MIN_SPEED = 300;

const DOG_LEAP_MAX_TIME = 1.2;

const DOG_LEAP_SIM_STEPS = 18;

const DOG_LEAP_PROBE_DOWN = 220;

const DOG_ANIM_PREFIX = "dog_";

const DOG_ANIM_STAND = "stand";

const DOG_ANIM_WALK = "walk";

const DOG_ANIM_RUN = "run";

const DOG_ANIM_ATTACK = "attack";

const DOG_ANIM_LEAP = "leap";

const DOG_ANIM_PAIN = "pain";

const DOG_ANIM_DEATH = "death";

const DOG_ANIM_DEATHB = "deathb";

const OGRE_TEMPLATE_NAME = "ogre_template";

const OGRE_SPAWN_NAME = "ogre_spawn";

const OGRE_SPAWN_ROAM_NAME = "ogre_spawn_roam";

const OGRE_HULL_MIN = new Vec3(-32, -32, -24);

const OGRE_HULL_MAX = new Vec3(32, 32, 64);

const OGRE_VIEW_OFS_Z = 25;

const OGRE_YAW_SPEED = 20;

const OGRE_MODEL_Z_OFS = 0;

const OGRE_MODEL_YAW_OFS = -90;

const OGRE_HEALTH = 200;

const OGRE_RUN_SPEED = 135;

const OGRE_WALK_SPEED = 27;

const OGRE_CHARGE_SPEED = 100;

const OGRE_GIVEUP = 5;

const OGRE_FIRST_ATTACK_DELAY = 1;

const OGRE_GIB_HEALTH = -80;

const OGRE_DROP_SHELLS = 0;

const OGRE_GRENADE_SPEED = 600;

const OGRE_GRENADE_UP = 200;

const OGRE_GRENADE_FUSE = 2.5;

const OGRE_GRENADE_DAMAGE = 40;

const OGRE_SHOOT_AT = .35;

const OGRE_SHOOT_LEN = .7;

const OGRE_MELEE_RANGE = 100;

const OGRE_MELEE_DMG = 4;

const OGRE_SMASH_LEN = 1.4;

const OGRE_SMASH_HIT_FROM = .5;

const OGRE_SMASH_HIT_TO = 1.1;

const OGRE_SWING_LEN = 1.4;

const OGRE_SWING_HIT_FROM = .4;

const OGRE_SWING_HIT_TO = 1.1;

const OGRE_PAIN_DEBOUNCE_SHORT = 1;

const OGRE_PAIN_DEBOUNCE_LONG = 2;

const OGRE_PAIN_A_LEN = .5;

const OGRE_PAIN_B_LEN = .3;

const OGRE_PAIN_C_LEN = .6;

const OGRE_PAIN_D_LEN = 1.6;

const OGRE_PAIN_E_LEN = 1.5;

const OGRE_ANIM_PREFIX = "ogre_";

const OGRE_ANIM_STAND = "stand";

const OGRE_ANIM_WALK = "walk";

const OGRE_ANIM_RUN = "run";

const OGRE_ANIM_SWING = "swing";

const OGRE_ANIM_SMASH = "smash";

const OGRE_ANIM_SHOOT = "shoot";

const OGRE_ANIM_PAIN = "pain";

const OGRE_ANIM_PAINB = "painb";

const OGRE_ANIM_PAINC = "painc";

const OGRE_ANIM_PAIND = "paind";

const OGRE_ANIM_PAINE = "paine";

const OGRE_ANIM_DEATH = "death";

const OGRE_ANIM_BDEATH = "bdeath";

const SHAMBLER_TEMPLATE_NAME = "shambler_template";

const SHAMBLER_SPAWN_NAME = "shambler_spawn";

const SHAMBLER_SPAWN_ROAM_NAME = "shambler_spawn_roam";

const SHAMBLER_HULL_MIN = new Vec3(-32, -32, -24);

const SHAMBLER_HULL_MAX = new Vec3(32, 32, 64);

const SHAMBLER_VIEW_OFS_Z = 40;

const SHAMBLER_YAW_SPEED = 20;

const SHAMBLER_MODEL_Z_OFS = 0;

const SHAMBLER_MODEL_YAW_OFS = -90;

const SHAMBLER_HEALTH = 600;

const SHAMBLER_GIB_HEALTH = -60;

const SHAMBLER_RUN_SPEED = 213;

const SHAMBLER_WALK_SPEED = 82;

const SHAMBLER_CHARGE_SPEED = 100;

const SHAMBLER_GIVEUP = 5;

const SHAMBLER_FIRST_ATTACK_DELAY = 1;

const SHAMBLER_MELEE_RANGE = 100;

const SHAMBLER_SMASH_DMG = 40;

const SHAMBLER_CLAW_DMG = 20;

const SHAMBLER_SMASH_LEN = 1.2;

const SHAMBLER_SMASH_HIT_AT = .95;

const SHAMBLER_SWING_LEN = .9;

const SHAMBLER_SWING_HIT_AT = .65;

const SHAMBLER_MAGIC_LEN = 1.4;

const SHAMBLER_MAGIC_BOLT_AT = [ .7, 1, 1.1 ];

const SHAMBLER_LIGHTNING_DMG = 10;

const SHAMBLER_CHANCE_NEAR = .2;

const SHAMBLER_CHANCE_MID = .05;

const SHAMBLER_PAIN_LEN = .6;

const SHAMBLER_PAIN_DEBOUNCE = 2;

const SHAMBLER_PAIN_FLINCH_DIV = 400;

const SHAMBLER_ANIM_PREFIX = "shambler_";

const SHAMBLER_ANIM_STAND = "stand";

const SHAMBLER_ANIM_WALK = "walk";

const SHAMBLER_ANIM_RUN = "run";

const SHAMBLER_ANIM_SMASH = "smash";

const SHAMBLER_ANIM_SWINGR = "swingr";

const SHAMBLER_ANIM_SWINGL = "swingl";

const SHAMBLER_ANIM_MAGIC = "magic";

const SHAMBLER_ANIM_PAIN = "pain";

const SHAMBLER_ANIM_DEATH = "death";

const BOSS_TEMPLATE_NAME = "boss_template";

const BOSS_SPAWN_NAME = "boss_spawn";

const BOSS_HULL_MIN = new Vec3(-128, -128, -24);

const BOSS_HULL_MAX = new Vec3(128, 128, 224);

const BOSS_VIEW_OFS_Z = 150;

const BOSS_YAW_SPEED = 20;

const BOSS_MODEL_Z_OFS = 0;

const BOSS_MODEL_YAW_OFS = -90;

const BOSS_HEALTH = 2500;

const BOSS_HEALTH_SCALE = {
    easy: .5,
    normal: 1,
    hard: 1.6,
    nightmare: 2.2
};

const BOSS_WEAPON_DAMAGE_SCALE = .25;

const BOSS_GIB_HEALTH = -9999;

const BOSS_GIVEUP = 9999;

const BOSS_FIRST_ATTACK_DELAY = 1;

const BOSS_RISE_LEN = 2;

const BOSS_DEATH_LEN = 1.8;

const BOSS_ATTACK_LEN = 1.2;

const BOSS_ATTACK_HIT_AT = .6;

const BOSS_ATTACK_CD = 2.5;

const BOSS_MISSILE_SPEED = 300;

const BOSS_MISSILE_DAMAGE = 110;

const BOSS_MISSILE_FUSE = 5;

const BOSS_MUZZLE_FWD = 100;

const BOSS_MUZZLE_UP = 200;

const BOSS_SHOCK_LEN = .6;

const BOSS_PAIN_MIN_DAMAGE = 80;

const BOSS_ANIM_PREFIX = "boss_";

const BOSS_ANIM_IDLE = "walk";

const BOSS_ANIM_RISE = "rise";

const BOSS_ANIM_ATTACK = "attack";

const BOSS_ANIM_DEATH = "death";

const BOSS_ANIM_SHOCK = [ "shocka", "shockb", "shockc" ];

const KNIGHT_TEMPLATE_NAME = "knight_template";

const KNIGHT_SPAWN_NAME = "knight_spawn";

const KNIGHT_SPAWN_ROAM_NAME = "knight_spawn_roam";

const KNIGHT_HULL_MIN = new Vec3(-16, -16, -24);

const KNIGHT_HULL_MAX = new Vec3(16, 16, 40);

const KNIGHT_VIEW_OFS_Z = 25;

const KNIGHT_YAW_SPEED = 20;

const KNIGHT_MODEL_Z_OFS = 0;

const KNIGHT_MODEL_YAW_OFS = -180;

const KNIGHT_HEALTH = 75;

const KNIGHT_RUN_SPEED = 140;

const KNIGHT_WALK_SPEED = 33;

const KNIGHT_CHARGE_SPEED = 40;

const KNIGHT_LUNGE_SPEED = 200;

const KNIGHT_GIVEUP = 5;

const KNIGHT_FIRST_ATTACK_DELAY = 1;

const KNIGHT_GIB_HEALTH = -40;

const KNIGHT_MELEE_RANGE = 60;

const KNIGHT_MELEE_DMG = 3;

const KNIGHT_STANDATK_DIST = 80;

const KNIGHT_ATK_LEN = 1;

const KNIGHT_ATK_HIT_FROM = .5;

const KNIGHT_ATK_HIT_TO = .8;

const KNIGHT_RUNATK_LEN = 1.1;

const KNIGHT_RUNATK_HIT_FROM = .4;

const KNIGHT_RUNATK_HIT_TO = .9;

const KNIGHT_PAIN_DEBOUNCE = 1;

const KNIGHT_PAIN_A_LEN = .3;

const KNIGHT_PAIN_B_LEN = 1.1;

const KNIGHT_ANIM_PREFIX = "knight_";

const KNIGHT_ANIM_STAND = "stand";

const KNIGHT_ANIM_WALK = "walk";

const KNIGHT_ANIM_RUN = "runb";

const KNIGHT_ANIM_ATK = "attackb";

const KNIGHT_ANIM_RUNATK = "runattack";

const KNIGHT_ANIM_PAIN = "pain";

const KNIGHT_ANIM_PAINB = "painb";

const KNIGHT_ANIM_DEATH = "death";

const KNIGHT_ANIM_DEATHB = "deathb";

const DEMON_TEMPLATE_NAME = "demon_template";

const DEMON_SPAWN_NAME = "demon_spawn";

const DEMON_SPAWN_ROAM_NAME = "demon_spawn_roam";

const DEMON_HULL_MIN = new Vec3(-32, -32, -24);

const DEMON_HULL_MAX = new Vec3(32, 32, 64);

const DEMON_VIEW_OFS_Z = 25;

const DEMON_YAW_SPEED = 20;

const DEMON_MODEL_Z_OFS = 0;

const DEMON_MODEL_YAW_OFS = -90;

const DEMON_HEALTH = 300;

const DEMON_RUN_SPEED = 237;

const DEMON_WALK_SPEED = 71;

const DEMON_CHARGE_SPEED = 40;

const DEMON_GIVEUP = 5;

const DEMON_FIRST_ATTACK_DELAY = 1;

const DEMON_GIB_HEALTH = -80;

const DEMON_MELEE_RANGE = 100;

const DEMON_MELEE_DMG_MIN = 10;

const DEMON_MELEE_DMG_RND = 5;

const DEMON_ATTACK_LEN = 1.5;

const DEMON_MELEE_HIT_1 = .4;

const DEMON_MELEE_HIT_2 = 1;

const DEMON_LEAP_FWD = 600;

const DEMON_LEAP_UP = 250;

const DEMON_LEAP_DMG_MIN = 40;

const DEMON_LEAP_DMG_RND = 10;

const DEMON_LEAP_MIN_SPEED = 400;

const DEMON_LEAP_MIN_DIST = 100;

const DEMON_LEAP_FAR_DIST = 200;

const DEMON_LEAP_FAR_SKIP = .9;

const DEMON_LEAP_MAX_TIME = 1.5;

const DEMON_LEAP_SIM_STEPS = 15;

const DEMON_LEAP_PROBE_DOWN = 260;

const DEMON_PAIN_DEBOUNCE = 1;

const DEMON_PAIN_LEN = .6;

const DEMON_PAIN_FLINCH_DIV = 200;

const DEMON_ANIM_PREFIX = "demon_";

const DEMON_ANIM_STAND = "stand";

const DEMON_ANIM_WALK = "walk";

const DEMON_ANIM_RUN = "run";

const DEMON_ANIM_ATTACK = "attacka";

const DEMON_ANIM_LEAP = "leap";

const DEMON_ANIM_PAIN = "pain";

const DEMON_ANIM_DEATH = "death";

const ZOMBIE_TEMPLATE_NAME = "zombie_template";

const ZOMBIE_SPAWN_NAME = "zombie_spawn";

const ZOMBIE_SPAWN_ROAM_NAME = "zombie_spawn_roam";

const ZOMBIE_HULL_MIN = new Vec3(-16, -16, -24);

const ZOMBIE_HULL_MAX = new Vec3(16, 16, 40);

const ZOMBIE_DOWN_HULL_MAX = new Vec3(1, 1, 1);

const ZOMBIE_WAKE_PUSH_MARGIN = 8;

const ZOMBIE_VIEW_OFS_Z = 25;

const ZOMBIE_YAW_SPEED = 20;

const ZOMBIE_MODEL_Z_OFS = 0;

const ZOMBIE_MODEL_YAW_OFS = 90;

const ZOMBIE_HEALTH = 60;

const ZOMBIE_GIB_HEALTH = 99999;

const ZOMBIE_RUN_SPEED = 55;

const ZOMBIE_WALK_SPEED = 12;

const ZOMBIE_GIVEUP = 5;

const ZOMBIE_FIRST_ATTACK_DELAY = 1;

const ZOMBIE_ATK_LEN = 1.3;

const ZOMBIE_ATK_RELEASE = 1.2;

const ZOMBIE_ATK_CHANCE_NEAR = .4;

const ZOMBIE_ATK_CHANCE_MID = .1;

const ZOMBIE_GIB_SPEED = 600;

const ZOMBIE_GIB_UP = 200;

const ZOMBIE_GIB_DAMAGE = 10;

const ZOMBIE_GIB_FUSE = 2.5;

const ZOMBIE_PAIN_IGNORE = 9;

const ZOMBIE_PAIN_KNOCKDOWN = 25;

const ZOMBIE_PAIN_COMBO_WINDOW = 3;

const ZOMBIE_PAIN_A_LEN = 1.2;

const ZOMBIE_PAIN_B_LEN = 2.8;

const ZOMBIE_PAIN_C_LEN = 1.8;

const ZOMBIE_PAIN_D_LEN = 1.3;

const ZOMBIE_PAIN_DOWN_HOLD = 6.1;

const ZOMBIE_PAIN_UP_LEN = 1.9;

const ZOMBIE_ANIM_PREFIX = "zombie_";

const ZOMBIE_ANIM_STAND = "stand";

const ZOMBIE_ANIM_WALK = "walk";

const ZOMBIE_ANIM_RUN = "run";

const ZOMBIE_ANIM_ATTA = "atta";

const ZOMBIE_ANIM_ATTB = "attb";

const ZOMBIE_ANIM_ATTC = "attc";

const ZOMBIE_ANIM_PAINA = "paina";

const ZOMBIE_ANIM_PAINB = "painb";

const ZOMBIE_ANIM_PAINC = "painc";

const ZOMBIE_ANIM_PAIND = "paind";

const ZOMBIE_ANIM_PAINEDOWN = "painedown";

const ZOMBIE_ANIM_PAINEUP = "paineup";

const WIZARD_TEMPLATE_NAME = "wizard_template";

const WIZARD_SPAWN_NAME = "wizard_spawn";

const WIZARD_SPAWN_ROAM_NAME = "wizard_spawn_roam";

const WIZARD_HULL_MIN = new Vec3(-16, -16, -24);

const WIZARD_HULL_MAX = new Vec3(16, 16, 40);

const WIZARD_VIEW_OFS_Z = 25;

const WIZARD_YAW_SPEED = 20;

const WIZARD_MODEL_Z_OFS = 0;

const WIZARD_MODEL_YAW_OFS = 180;

const WIZARD_HEALTH = 80;

const WIZARD_GIB_HEALTH = -40;

const WIZARD_RUN_SPEED = 160;

const WIZARD_WALK_SPEED = 80;

const WIZARD_GIVEUP = 5;

const WIZARD_FIRST_ATTACK_DELAY = 1;

const WIZARD_ATK_LEN = 1;

const WIZARD_ATK_FINISH = 2;

const WIZARD_SHOT_A = .3;

const WIZARD_SHOT_B = .8;

const WIZARD_SHOT_SIDE = 14;

const WIZARD_SHOT_LEAD = 13;

const WIZARD_SPIKE_SPEED = 600;

const WIZARD_SPIKE_DAMAGE = 9;

const WIZARD_CHANCE_MELEE = .9;

const WIZARD_CHANCE_NEAR = .6;

const WIZARD_CHANCE_MID = .2;

const WIZARD_PAIN_LEN = .4;

const WIZARD_PAIN_FLINCH_DIV = 70;

const WIZARD_DEATH_TUMBLE_XY = 200;

const WIZARD_DEATH_TUMBLE_UP = 100;

const WIZARD_ANIM_PREFIX = "wizard_";

const WIZARD_ANIM_STAND = "hover";

const WIZARD_ANIM_WALK = "hover";

const WIZARD_ANIM_RUN = "fly";

const WIZARD_ANIM_ATTACK = "magatt";

const WIZARD_ANIM_PAIN = "pain";

const WIZARD_ANIM_DEATH = "death";

const DEG2RAD = Math.PI / 180;

function angleVectors(pitch, yaw, roll) {
    const sy = Math.sin(yaw * DEG2RAD);
    const cy = Math.cos(yaw * DEG2RAD);
    const sp = Math.sin(pitch * DEG2RAD);
    const cp = Math.cos(pitch * DEG2RAD);
    const sr = Math.sin(roll * DEG2RAD);
    const cr = Math.cos(roll * DEG2RAD);
    return {
        forward: new Vec3(cp * cy, cp * sy, -sp),
        right: new Vec3(-sr * sp * cy + cr * sy, -sr * sp * sy - cr * cy, -sr * cp),
        up: new Vec3(cr * sp * cy + sr * sy, cr * sp * sy - sr * cy, cr * cp)
    };
}

function clipVelocity(inVel, normal, overbounce) {
    const STOP_EPSILON = .1;
    let blocked = 0;
    if (normal.z > 0) blocked |= 1;
    if (Math.abs(normal.z) < .02) blocked |= 2;
    const backoff = inVel.dot(normal) * overbounce;
    const c = [ inVel.x, inVel.y, inVel.z ];
    const n = [ normal.x, normal.y, normal.z ];
    for (let i = 0; i < 3; i++) {
        c[i] -= n[i] * backoff;
        if (c[i] > -STOP_EPSILON && c[i] < STOP_EPSILON) c[i] = 0;
    }
    return {
        out: new Vec3(c[0], c[1], c[2]),
        blocked
    };
}

const DIST_EPSILON = .03125;

let ignore = [];

function setTraceIgnore(ents) {
    ignore = [];
    for (const e of ents) {
        if (e && !ignore.includes(e)) ignore.push(e);
    }
}

let solidBoxes = [];

function setSolidBoxes(list) {
    solidBoxes = list;
}

function clipToBox(start, mins, maxs, end, b) {
    const lo = [ b.center.x + b.mins.x - maxs.x, b.center.y + b.mins.y - maxs.y, b.center.z + b.mins.z - maxs.z ];
    const hi = [ b.center.x + b.maxs.x - mins.x, b.center.y + b.maxs.y - mins.y, b.center.z + b.maxs.z - mins.z ];
    const s = [ start.x, start.y, start.z ];
    const d = [ end.x - start.x, end.y - start.y, end.z - start.z ];
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
        if (t1 > t2) {
            const t = t1;
            t1 = t2;
            t2 = t;
            sgn = 1;
        }
        if (t1 > tenter) {
            tenter = t1;
            axis = i;
            sign = sgn;
        }
        if (t2 < texit) texit = t2;
        if (tenter > texit) return undefined;
    }
    if (axis < 0) {
        const inside = s[0] > lo[0] && s[0] < hi[0] && s[1] > lo[1] && s[1] < hi[1] && s[2] > lo[2] && s[2] < hi[2];
        return inside ? {
            fraction: 0,
            normal: new Vec3(0, 0, 0),
            startsolid: true
        } : undefined;
    }
    if (tenter >= 1) return undefined;
    const normal = new Vec3(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0);
    return {
        fraction: tenter < 0 ? 0 : tenter,
        normal,
        startsolid: tenter <= 0
    };
}

function traceHull(start, mins, maxs, end, extra, skipSolidBoxes) {
    let list = ignore;
    if (extra && extra.length) {
        list = ignore.slice();
        for (const e of extra) if (e) list.push(e);
    }
    const ignoreEntity = list.length ? list : undefined;
    const pointTrace = mins.x === 0 && mins.y === 0 && mins.z === 0 && maxs.x === 0 && maxs.y === 0 && maxs.z === 0;
    const r = pointTrace ? Instance.TraceLine({
        start,
        end,
        ignoreEntity,
        ignorePlayers: true
    }) : Instance.TraceBox({
        start,
        end,
        mins,
        maxs,
        ignoreEntity,
        ignorePlayers: true
    });
    let fraction = r.fraction;
    let normal = new Vec3(r.normal ?? {
        x: 0,
        y: 0,
        z: 0
    });
    let didHit = r.didHit;
    let hitEnt = r.hitEntity;
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
    if (didHit && !pointTrace && fraction < 1 && normal.lengthSquared > .5) {
        endpos = endpos.add(normal.scale(DIST_EPSILON));
    }
    return {
        fraction,
        endpos,
        normal,
        allsolid,
        startsolid,
        didHit,
        ent: hitEnt
    };
}

function testPosition(origin, mins, maxs, extra) {
    return traceHull(origin, mins, maxs, origin, extra).startsolid;
}

const ZERO$1 = new Vec3(0, 0, 0);

const MOVER_RE = /^func_(door|button|movelinear|plat)/;

const D$1 = .70710678;

const STUCK_NUDGE_DIRS = [ new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(D$1, D$1, 0), new Vec3(-D$1, D$1, 0), new Vec3(D$1, -D$1, 0), new Vec3(-D$1, -D$1, 0), new Vec3(0, 0, 1) ];

const STUCK_NUDGE_STEPS = [ 2, 6, 12, 20, 32, 48 ];

class QuakePlayerMove {
    origin=new Vec3(0, 0, 0);
    velocity=new Vec3(0, 0, 0);
    onGround=false;
    jumpReleased=true;
    noclip=false;
    noclipSpeed=NOCLIP_SPEED;
    autoHop=false;
    inWater=false;
    headUnder=false;
    swimUpSpeed=WATER_SWIM_UP;
    waterJumpUp=WATER_JUMP_UP;
    waterJump=false;
    waterJumpTimeLeft=0;
    waterJumpDir=new Vec3(0, 0, 0);
    justJumped=false;
    swamUp=false;
    landSpeed=0;
    groundEntity;
    crushed=false;
    stuckHurt=false;
    groundVel=new Vec3(0, 0, 0);
    gevEnt;
    gevPos=new Vec3(0, 0, 0);
    gevTime=-1;
    mins=HULL_MIN;
    maxs=HULL_MAX;
    frametime=TICK_INTERVAL;
    posHist=[];
    histAt=-1;
    stuckGraceUntil=0;
    selfIgnore;
    setSelf(pawn) {
        this.selfIgnore = [ pawn ];
    }
    wishdir=new Vec3(0, 0, 0);
    wishspeed=0;
    viewPitch=0;
    viewYaw=0;
    reset(origin, velocity, onGround) {
        this.origin = new Vec3(origin);
        this.velocity = new Vec3(velocity);
        this.onGround = onGround;
        this.jumpReleased = true;
        this.groundEntity = undefined;
        this.crushed = false;
        this.stuckHurt = false;
        this.waterJump = false;
        this.waterJumpTimeLeft = 0;
        this.clearGroundVel();
        this.posHist = [ new Vec3(origin) ];
        this.histAt = Instance.GetGameTime();
    }
    notifyTeleport() {
        this.posHist = [ new Vec3(this.origin) ];
        this.histAt = Instance.GetGameTime();
        this.stuckGraceUntil = Instance.GetGameTime() + STUCK_TP_GRACE_TICKS * TICK_INTERVAL;
    }
    recordPos() {
        const t = Instance.GetGameTime();
        if (t - this.histAt < STUCK_HIST_INTERVAL) return;
        if (testPosition(this.origin, this.mins, this.maxs, this.selfIgnore)) return;
        this.histAt = t;
        this.posHist.push(new Vec3(this.origin));
        if (this.posHist.length > STUCK_HIST_LEN) this.posHist.shift();
    }
    clearGroundVel() {
        this.groundVel = new Vec3(0, 0, 0);
        this.gevEnt = undefined;
        this.gevTime = -1;
    }
    probeGround() {
        const tr = traceHull(this.origin, this.mins, this.maxs, this.origin.withZ(this.origin.z - 2), this.selfIgnore);
        this.onGround = tr.fraction < 1 && tr.normal.z > .7;
        this.groundEntity = undefined;
        this.clearGroundVel();
    }
    captureGround() {
        this.groundEntity = undefined;
        if (!this.onGround) {
            this.clearGroundVel();
            this.dbgGround("air");
            return;
        }
        const tr = traceHull(this.origin, this.mins, this.maxs, this.origin.withZ(this.origin.z - 2), this.selfIgnore);
        const e = tr.ent;
        if (!e || !e.IsValid()) {
            this.clearGroundVel();
            this.dbgGround("world");
            return;
        }
        const cn = e.GetClassName();
        if (!cn.startsWith("func_")) {
            this.clearGroundVel();
            this.dbgGround(`on ${cn} (${e.GetEntityName() || "-"})`);
            return;
        }
        this.groundEntity = e;
        const v = e.GetAbsVelocity();
        let gv = new Vec3(v.x, v.y, v.z);
        const o = e.GetAbsOrigin();
        const t = Instance.GetGameTime();
        if (this.gevEnt === e && this.gevTime >= 0 && t - this.gevTime > 1e-5) {
            const dt = t - this.gevTime;
            const dv = new Vec3((o.x - this.gevPos.x) / dt, (o.y - this.gevPos.y) / dt, (o.z - this.gevPos.z) / dt);
            if (dv.length > gv.length) gv = dv;
            this.groundVel = gv;
            this.gevPos = new Vec3(o.x, o.y, o.z);
            this.gevTime = t;
        } else if (this.gevEnt !== e) {
            this.groundVel = gv;
            this.gevEnt = e;
            this.gevPos = new Vec3(o.x, o.y, o.z);
            this.gevTime = t;
        }
        this.dbgGround(`on ${cn} (${e.GetEntityName() || "-"})  gvel ` + `${this.groundVel.x.toFixed(1)} ${this.groundVel.y.toFixed(1)} ${this.groundVel.z.toFixed(1)}`);
    }
    unstuckUp() {
        if (!testPosition(this.origin, this.mins, this.maxs, this.selfIgnore)) return;
        const cap = STEPSIZE + Math.ceil(this.groundVel.z * this.frametime) + 2;
        for (let z = 1; z <= cap; z++) {
            const test = this.origin.withZ(this.origin.z + z);
            if (!testPosition(test, this.mins, this.maxs, this.selfIgnore)) {
                this.origin = test;
                this.onGround = true;
                if (this.velocity.z < 0) this.velocity = this.velocity.withZ(0);
                return;
            }
        }
        this.crushed = true;
    }
    stickToPlatform() {
        const reach = STEPSIZE + Math.max(0, -this.groundVel.z * this.frametime);
        const tr = traceHull(this.origin, this.mins, this.maxs, this.origin.withZ(this.origin.z - reach), this.selfIgnore);
        if (tr.startsolid) {
            this.onGround = true;
            if (this.velocity.z < 0) this.velocity = this.velocity.withZ(0);
            this.unstuckUp();
            return;
        }
        if (tr.fraction >= 1 || !tr.ent || !tr.ent.IsValid() || !tr.ent.GetClassName().startsWith("func_")) return;
        this.origin = new Vec3(tr.endpos);
        this.onGround = true;
        if (this.velocity.z < 0) this.velocity = this.velocity.withZ(0);
    }
    liftCatchUp(dt) {
        const e = this.groundEntity;
        if (dt <= 0 || !this.onGround || !e || !e.IsValid() || !e.GetClassName().startsWith("func_")) return;
        if (this.groundVel.length < .01) return;
        this.frametime = dt;
        this.pushEntity(this.groundVel.scale(dt));
        if (this.groundVel.z > 1) this.unstuckUp(); else if (!this.justJumped && this.velocity.z <= 8) this.stickToPlatform();
    }
    dbgGround(msg) {
        return;
    }
    runFrame(cmd, frametime) {
        this.frametime = Math.max(0, Math.min(frametime, .1));
        this.viewPitch = cmd.viewPitch;
        this.viewYaw = cmd.viewYaw;
        if (this.noclip) {
            this.noclipFrame(cmd);
            return;
        }
        const wasOnGround = this.onGround;
        const fallSpeed = -this.velocity.z;
        let rode = false;
        if (this.onGround && (this.groundVel.x !== 0 || this.groundVel.y !== 0 || this.groundVel.z !== 0)) {
            this.pushEntity(this.groundVel.scale(this.frametime));
            rode = true;
        }
        if (this.inWater && !this.headUnder && !this.waterJump) this.checkWaterJump(cmd);
        if (this.waterJump) {
            this.waterJumpTimeLeft -= this.frametime;
            if (this.waterJumpTimeLeft <= 0 || !this.inWater) this.waterJump = false;
            this.velocity = new Vec3(this.waterJumpDir.x, this.waterJumpDir.y, this.velocity.z);
            this.checkVelocity();
        } else {
            if (this.inWater) this.waterMove(cmd); else this.clientThink(cmd);
            if (cmd.jump) this.playerJump(); else this.jumpReleased = true;
            this.checkVelocity();
            if (!this.inWater) {
                this.velocity = this.velocity.withZ(this.velocity.z - SV_GRAVITY * this.frametime);
            }
            this.checkVelocity();
        }
        if (this.groundEntity) this.unstuckUp();
        this.checkStuck();
        this.walkMove();
        if (this.groundEntity && !this.justJumped && this.velocity.z <= 8) {
            this.stickToPlatform();
        }
        if (!this.inWater && !wasOnGround && this.onGround && fallSpeed > LAND_SOFT_SPEED && !rode) {
            this.landSpeed = Math.max(this.landSpeed, fallSpeed);
        }
        this.captureGround();
        if (this.onGround && this.groundEntity && this.groundEntity.IsValid() && Math.abs(this.groundVel.z) > .5) {
            this.posHist = [ new Vec3(this.origin) ];
            this.histAt = Instance.GetGameTime();
            this.stuckGraceUntil = Instance.GetGameTime() + STUCK_LIFT_GRACE_TICKS * TICK_INTERVAL;
        }
        this.recordPos();
    }
    pausedRide(dt) {
        if (dt <= 0 || this.noclip || !this.onGround) return false;
        this.frametime = dt;
        this.captureGround();
        const e = this.groundEntity;
        if (!e || !e.IsValid() || !e.GetClassName().startsWith("func_") || this.groundVel.length < .01) return false;
        const b = this.origin;
        this.pushEntity(this.groundVel.scale(dt));
        if (this.groundVel.z > 1) this.unstuckUp(); else if (this.velocity.z <= 8) this.stickToPlatform();
        return this.origin.x !== b.x || this.origin.y !== b.y || this.origin.z !== b.z;
    }
    waterMove(cmd) {
        const {forward, right} = angleVectors(cmd.viewPitch, cmd.viewYaw, 0);
        let wishvel = new Vec3(forward.x * cmd.forwardmove + right.x * cmd.sidemove, forward.y * cmd.forwardmove + right.y * cmd.sidemove, forward.z * cmd.forwardmove);
        if (cmd.forwardmove === 0 && cmd.sidemove === 0) {
            wishvel = wishvel.withZ(wishvel.z - WATER_SINK_SPEED);
        }
        let wishspeed = wishvel.length;
        if (wishspeed > SV_MAXSPEED) {
            wishvel = wishvel.scale(SV_MAXSPEED / wishspeed);
            wishspeed = SV_MAXSPEED;
        }
        wishspeed *= WATER_WISHSPEED_SCALE;
        const speed = this.velocity.length;
        let newspeed = 0;
        if (speed > 0) {
            newspeed = speed - this.frametime * speed * SV_FRICTION;
            if (newspeed < 0) newspeed = 0;
            this.velocity = this.velocity.scale(newspeed / speed);
        }
        if (wishspeed === 0) return;
        const addspeed = wishspeed - newspeed;
        if (addspeed <= 0) return;
        const wishdir = wishvel.scale(1 / wishvel.length);
        let accelspeed = SV_ACCELERATE * wishspeed * this.frametime;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(wishdir.scale(accelspeed));
    }
    noclipFrame(cmd) {
        const {forward, right} = angleVectors(cmd.viewPitch, cmd.viewYaw, 0);
        let wish = new Vec3(forward.x * cmd.forwardmove + right.x * cmd.sidemove, forward.y * cmd.forwardmove + right.y * cmd.sidemove, forward.z * cmd.forwardmove);
        if (cmd.jump) wish = wish.withZ(wish.z + CL_FORWARDSPEED);
        const len = wish.length;
        this.velocity = len > 1e-6 ? wish.scale(this.noclipSpeed / len) : new Vec3(0, 0, 0);
        this.origin = this.origin.add(this.velocity.scale(this.frametime));
        this.onGround = false;
        this.justJumped = false;
        this.landSpeed = 0;
    }
    clientThink(cmd) {
        const onground = this.onGround;
        const roll = this.calcRoll() * 4;
        const movePitch = -cmd.viewPitch / MOVE_PITCH_DIVISOR;
        const {forward, right} = angleVectors(movePitch, cmd.viewYaw, roll);
        let wishvel = new Vec3(forward.x * cmd.forwardmove + right.x * cmd.sidemove, forward.y * cmd.forwardmove + right.y * cmd.sidemove, 0);
        let wishspeed = wishvel.length;
        const wishdir = wishspeed > 0 ? wishvel.scale(1 / wishspeed) : new Vec3(0, 0, 0);
        if (wishspeed > SV_MAXSPEED) {
            wishvel = wishvel.scale(SV_MAXSPEED / wishspeed);
            wishspeed = SV_MAXSPEED;
        }
        this.wishdir = wishdir;
        this.wishspeed = wishspeed;
        if (onground) {
            this.userFriction();
            this.accelerate();
        } else {
            this.airAccelerate(wishvel);
        }
    }
    userFriction() {
        const vel = this.velocity;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (!speed) return;
        const s = 16 / speed;
        const start = new Vec3(this.origin.x + vel.x * s, this.origin.y + vel.y * s, this.origin.z + this.mins.z);
        const stop = start.withZ(start.z - 34);
        const tr = traceHull(start, ZERO$1, ZERO$1, stop, this.selfIgnore);
        let friction = SV_FRICTION;
        if (tr.fraction === 1) friction *= SV_EDGEFRICTION;
        const control = speed < SV_STOPSPEED ? SV_STOPSPEED : speed;
        let newspeed = speed - this.frametime * control * friction;
        if (newspeed < 0) newspeed = 0;
        newspeed /= speed;
        this.velocity = new Vec3(vel.x * newspeed, vel.y * newspeed, vel.z * newspeed);
    }
    accelerate() {
        const currentspeed = this.velocity.dot(this.wishdir);
        const addspeed = this.wishspeed - currentspeed;
        if (addspeed <= 0) return;
        let accelspeed = SV_ACCELERATE * this.frametime * this.wishspeed;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(this.wishdir.scale(accelspeed));
    }
    airAccelerate(wishveloc) {
        let wishspd = wishveloc.length;
        const wishdir = wishspd > 0 ? wishveloc.scale(1 / wishspd) : new Vec3(0, 0, 0);
        if (wishspd > AIR_ACCEL_CAP) wishspd = AIR_ACCEL_CAP;
        const currentspeed = this.velocity.dot(wishdir);
        const addspeed = wishspd - currentspeed;
        if (addspeed <= 0) return;
        let accelspeed = SV_ACCELERATE * this.wishspeed * this.frametime;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(wishdir.scale(accelspeed));
    }
    knockback(kick) {
        this.velocity = this.velocity.add(kick);
        if (this.onGround && kick.z > KNOCKBACK_LAUNCH_MIN) {
            this.onGround = false;
            this.groundEntity = undefined;
            this.clearGroundVel();
            const up = this.origin.withZ(this.origin.z + 1);
            if (!testPosition(up, this.mins, this.maxs, this.selfIgnore)) this.origin = up;
        }
    }
    checkWaterJump(cmd) {
        let fwd = angleVectors(0, cmd.viewYaw, 0).forward;
        const len = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y);
        if (len < 1e-6) return;
        fwd = new Vec3(fwd.x / len, fwd.y / len, 0);
        const start = this.origin.withZ(this.origin.z + WATER_JUMP_START_UP);
        let end = start.add(fwd.scale(WATER_JUMP_FWD_DIST));
        let tr = traceHull(start, ZERO$1, ZERO$1, end, this.selfIgnore, true);
        if (tr.fraction >= 1) return;
        const top = start.withZ(start.z + this.maxs.z - WATER_JUMP_START_UP);
        end = top.add(fwd.scale(WATER_JUMP_FWD_DIST));
        this.waterJumpDir = tr.normal.scale(-50);
        tr = traceHull(top, ZERO$1, ZERO$1, end, this.selfIgnore, true);
        if (tr.fraction < 1) return;
        this.waterJump = true;
        this.velocity = this.velocity.withZ(this.waterJumpUp);
        this.jumpReleased = false;
        this.waterJumpTimeLeft = WATER_JUMP_TIME;
    }
    playerJump() {
        if (this.inWater) {
            this.velocity = this.velocity.withZ(this.swimUpSpeed);
            this.swamUp = true;
            return;
        }
        if (!this.onGround) return;
        if (!this.autoHop && !this.jumpReleased) return;
        this.velocity = this.velocity.add(this.groundVel);
        this.velocity = this.velocity.withZ(this.velocity.z + SV_JUMP_VELOCITY);
        this.onGround = false;
        this.groundVel = new Vec3(0, 0, 0);
        this.jumpReleased = false;
        this.justJumped = true;
    }
    checkVelocity() {
        const clamp = n => {
            if (Number.isNaN(n)) return 0;
            if (n > SV_MAXVELOCITY) return SV_MAXVELOCITY;
            if (n < -2e3) return -2e3;
            return n;
        };
        this.velocity = new Vec3(clamp(this.velocity.x), clamp(this.velocity.y), clamp(this.velocity.z));
    }
    calcRoll() {
        const {right} = angleVectors(0, this.viewYaw, 0);
        let side = this.velocity.dot(right);
        const sign = side < 0 ? -1 : 1;
        side = Math.abs(side);
        if (side < SV_ROLLSPEED) side = side * SV_ROLLANGLE / SV_ROLLSPEED; else side = SV_ROLLANGLE;
        return side * sign;
    }
    get strafeRoll() {
        return this.calcRoll();
    }
    pushEntity(push) {
        const tr = traceHull(this.origin, this.mins, this.maxs, this.origin.add(push), this.selfIgnore);
        this.origin = new Vec3(tr.endpos);
        return tr;
    }
    flyMove() {
        let blocked = 0;
        let numplanes = 0;
        const planes = [];
        const primal_velocity = new Vec3(this.velocity);
        let original_velocity = new Vec3(this.velocity);
        let time_left = this.frametime;
        let steptrace = null;
        for (let bump = 0; bump < MOVE_BUMPS; bump++) {
            if (this.velocity.x === 0 && this.velocity.y === 0 && this.velocity.z === 0) break;
            const end = new Vec3(this.origin.x + time_left * this.velocity.x, this.origin.y + time_left * this.velocity.y, this.origin.z + time_left * this.velocity.z);
            const trace = traceHull(this.origin, this.mins, this.maxs, end, this.selfIgnore);
            if (trace.allsolid) {
                this.velocity = new Vec3(0, 0, 0);
                return {
                    blocked: 3,
                    steptrace
                };
            }
            if (trace.fraction > 0) {
                this.origin = new Vec3(trace.endpos);
                original_velocity = new Vec3(this.velocity);
                numplanes = 0;
            }
            if (trace.fraction === 1) break;
            if (trace.normal.z > .7) {
                blocked |= 1;
                this.onGround = true;
            }
            if (Math.abs(trace.normal.z) < .02) {
                blocked |= 2;
                steptrace = trace;
            }
            time_left -= time_left * trace.fraction;
            if (numplanes >= MAX_CLIP_PLANES) {
                this.velocity = new Vec3(0, 0, 0);
                return {
                    blocked: 3,
                    steptrace
                };
            }
            let dupPlane = false;
            for (let p = 0; p < numplanes; p++) {
                if (trace.normal.dot(planes[p]) > .99) {
                    this.velocity = this.velocity.add(trace.normal);
                    dupPlane = true;
                    break;
                }
            }
            if (dupPlane) continue;
            planes[numplanes] = new Vec3(trace.normal);
            numplanes++;
            let i = 0;
            let newVel = new Vec3(this.velocity);
            for (;i < numplanes; i++) {
                newVel = clipVelocity(original_velocity, planes[i], 1).out;
                let j = 0;
                for (;j < numplanes; j++) {
                    if (j !== i && newVel.dot(planes[j]) < 0) break;
                }
                if (j === numplanes) break;
            }
            if (i !== numplanes) {
                this.velocity = newVel;
            } else {
                if (numplanes !== 2) {
                    this.velocity = new Vec3(0, 0, 0);
                    return {
                        blocked: 7,
                        steptrace
                    };
                }
                const dir = planes[0].cross(planes[1]);
                this.velocity = dir.scale(dir.dot(this.velocity));
            }
            if (this.velocity.dot(primal_velocity) <= 0) {
                this.velocity = new Vec3(0, 0, 0);
                return {
                    blocked,
                    steptrace
                };
            }
        }
        return {
            blocked,
            steptrace
        };
    }
    walkMove() {
        const oldonground = this.onGround;
        this.onGround = false;
        const oldorg = new Vec3(this.origin);
        const oldvel = new Vec3(this.velocity);
        let clip = this.flyMove().blocked;
        if (!(clip & 2)) return;
        if (!oldonground) return;
        const nosteporg = new Vec3(this.origin);
        const nostepvel = new Vec3(this.velocity);
        this.origin = new Vec3(oldorg);
        this.pushEntity(new Vec3(0, 0, STEPSIZE));
        this.velocity = new Vec3(oldvel.x, oldvel.y, 0);
        const stepped = this.flyMove();
        clip = stepped.blocked;
        if (clip) {
            if (Math.abs(oldorg.y - this.origin.y) < .03125 && Math.abs(oldorg.x - this.origin.x) < .03125) {
                clip = this.tryUnstick(oldvel);
            }
        }
        if (clip & 2 && stepped.steptrace) this.wallFriction(stepped.steptrace);
        const downtrace = this.pushEntity(new Vec3(0, 0, -18 + oldvel.z * this.frametime));
        if (downtrace.normal.z > .7) {
            this.onGround = true;
        } else {
            this.origin = new Vec3(nosteporg);
            this.velocity = new Vec3(nostepvel);
        }
    }
    wallFriction(trace) {
        const {forward} = angleVectors(this.viewPitch, this.viewYaw, 0);
        let d = trace.normal.dot(forward) + .5;
        if (d >= 0) return;
        const into = trace.normal.scale(trace.normal.dot(this.velocity));
        const side = this.velocity.subtract(into);
        this.velocity = new Vec3(side.x * (1 + d), side.y * (1 + d), this.velocity.z);
    }
    tryUnstick(oldvel) {
        const oldorg = new Vec3(this.origin);
        const dirs = [ new Vec3(2, 0, 0), new Vec3(0, 2, 0), new Vec3(-2, 0, 0), new Vec3(0, -2, 0), new Vec3(2, 2, 0), new Vec3(-2, 2, 0), new Vec3(2, -2, 0), new Vec3(-2, -2, 0) ];
        const savedFt = this.frametime;
        for (let i = 0; i < 8; i++) {
            this.pushEntity(dirs[i]);
            this.velocity = new Vec3(oldvel.x, oldvel.y, 0);
            this.frametime = .1;
            const clip = this.flyMove().blocked;
            this.frametime = savedFt;
            if (Math.abs(oldorg.y - this.origin.y) > 4 || Math.abs(oldorg.x - this.origin.x) > 4) {
                return clip;
            }
            this.origin = new Vec3(oldorg);
        }
        this.velocity = new Vec3(0, 0, 0);
        return 7;
    }
    checkStuck() {
        if (Instance.GetGameTime() < this.stuckGraceUntil) return;
        if (this.onGround && this.groundEntity && this.groundEntity.IsValid() && Math.abs(this.groundVel.z) > .5) return;
        const t0 = traceHull(this.origin, this.mins, this.maxs, this.origin, this.selfIgnore);
        if (!t0.startsolid) return;
        const e = t0.ent;
        if (e && e.IsValid() && MOVER_RE.test(e.GetClassName())) {
            const ig = this.selfIgnore ? [ ...this.selfIgnore, e ] : [ e ];
            if (!testPosition(this.origin, this.mins, this.maxs, ig)) {
                for (const step of STUCK_NUDGE_STEPS) {
                    for (const dir of STUCK_NUDGE_DIRS) {
                        const test = this.origin.add(dir.scale(step));
                        if (!testPosition(test, this.mins, this.maxs, this.selfIgnore)) {
                            this.origin = test;
                            return;
                        }
                    }
                }
            }
        }
        for (let i = this.posHist.length - 1; i >= 0; i--) {
            const p = this.posHist[i];
            if (!testPosition(p, this.mins, this.maxs, this.selfIgnore)) {
                this.origin = new Vec3(p);
                this.velocity = new Vec3(0, 0, 0);
                this.stuckHurt = true;
                return;
            }
        }
        for (let z = 1; z <= 18; z++) {
            const test = this.origin.withZ(this.origin.z + z);
            if (!testPosition(test, this.mins, this.maxs, this.selfIgnore)) {
                this.origin = test;
                this.stuckHurt = true;
                return;
            }
        }
    }
}

const V0$5 = new Vec3(0, 0, 0);

const O = (fwd, right, up) => ({
    fwd,
    right,
    up
});

const A = (pitch, yaw, roll) => ({
    pitch,
    yaw,
    roll
});

const VIEWMODEL = {
    axe: {
        name: "v_axe",
        seq: "v_axe",
        rest: "v_axe_rest",
        muz: 0,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    shotgun: {
        name: "v_shot",
        seq: "v_shot",
        rest: "v_shot_rest",
        muz: 0,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    ssg: {
        name: "v_shot2",
        seq: "v_shot2",
        rest: "v_shot2_rest",
        muz: 0,
        off: O(3, 0, 0),
        ang: A(0, 0, 0)
    },
    nailgun: {
        name: "v_nail",
        seq: "v_nail",
        rest: "v_nail_rest",
        muz: 30,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    snailgun: {
        name: "v_nail2",
        seq: "v_nail2",
        rest: "v_nail2_rest",
        muz: 30,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    glauncher: {
        name: "v_rock",
        seq: "v_rock",
        rest: "v_rock_rest",
        muz: 28,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    rlauncher: {
        fireAnim: .5,
        name: "v_rock2",
        seq: "v_rock2",
        rest: "v_rock2_rest",
        muz: 32,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    },
    lightning: {
        name: "v_light",
        seq: "v_light",
        rest: "v_light_rest",
        muz: 28,
        off: O(0, 0, 0),
        ang: A(0, 0, 0)
    }
};

const PROJ_WEAPONS = new Set([ "nailgun", "snailgun", "glauncher", "rlauncher" ]);

const BARREL_OFS = {
    glauncher: {
        f: 5.4,
        r: 0,
        u: -12.04
    },
    rlauncher: {
        f: 4.08,
        r: 0,
        u: -11.49
    },
    nailgun: [ {
        f: 14.34,
        r: -3.81,
        u: -13.83
    }, {
        f: 14.34,
        r: 3.95,
        u: -13.83
    } ],
    snailgun: {
        f: 18.77,
        r: 0,
        u: -13.1
    },
    lightning: {
        f: 10,
        r: 0,
        u: -10.5
    }
};

const AUTO_ANIM = new Set([ "nailgun", "snailgun", "lightning" ]);

const VM_NAMES = Object.values(VIEWMODEL).map(v => v.name);

const VM_HIDDEN = new Vec3(0, 0, -16384);

const AMMO_FOR = {
    none: "",
    axe: "",
    shotgun: "shells",
    ssg: "shells",
    nailgun: "nails",
    snailgun: "nails",
    glauncher: "rockets",
    rlauncher: "rockets",
    lightning: "cells"
};

const SELECT_NEED = {
    ssg: 2,
    snailgun: 2
};

const CS_FOR = {};

for (const [cs, q] of Object.entries(WEP_CS)) CS_FOR[q] = cs;

function cr() {
    return Math.random() * 2 - 1;
}

function normalizeWeapon(name) {
    if (name.startsWith("weapon_knife") || name === "weapon_bayonet") return "weapon_knife";
    return name;
}

class QuakeWeapons {
    ammo={
        shells: WEAPON_START_SHELLS,
        nails: 0,
        rockets: 0,
        cells: 0
    };
    nextAttack=0;
    pendingSwitch="";
    pendingSwitchAt=0;
    infAmmo=false;
    lgActive=false;
    nailSide=-1;
    vmBusyUntil=0;
    vmFireClipOn=false;
    vmShownWeapon="none";
    lastShotAt=0;
    attackedAt=0;
    punchPitch=0;
    punchAt=0;
    current="none";
    owned=new Set([ "axe", "shotgun" ]);
    enemies;
    sounds;
    projectiles;
    barrels;
    particles;
    lgBeamAt=0;
    shootHook;
    noAmmoHook;
    dmgScale=() => 1;
    playerSrc="";
    vmPos="center";
    vmHidden=false;
    setViewmodelPos(pos) {
        this.vmPos = pos;
    }
    setViewmodelHidden(h) {
        this.vmHidden = h;
    }
    viewmodelHidden() {
        return this.vmHidden;
    }
    vmSideOfs() {
        return this.vmPos === "left" ? -8 : this.vmPos === "right" ? VM_SIDE_OFFSET : 0;
    }
    setInfiniteAmmo(on) {
        this.infAmmo = on;
    }
    setNoAmmoHook(fn) {
        this.noAmmoHook = fn;
    }
    setEnemies(enemies) {
        this.enemies = enemies;
    }
    setProjectiles(p) {
        this.projectiles = p;
    }
    setBarrels(b) {
        this.barrels = b;
    }
    setParticles(p) {
        this.particles = p;
    }
    setShootHook(fn) {
        this.shootHook = fn;
    }
    setDamageScale(fn) {
        this.dmgScale = fn;
    }
    setSounds(sounds, playerSrc) {
        this.sounds = sounds;
        this.playerSrc = playerSrc;
    }
    get viewPunchPitch() {
        return this.punchPitch;
    }
    get shellCount() {
        return this.ammo.shells;
    }
    get activeWeapon() {
        return this.current;
    }
    get activeAmmoKind() {
        return AMMO_FOR[this.current];
    }
    get activeAmmo() {
        const k = AMMO_FOR[this.current];
        return k ? this.ammo[k] : 0;
    }
    get activeIsShotgun() {
        return this.current === "shotgun" || this.current === "ssg";
    }
    get hasShotgun() {
        return true;
    }
    static SBAR_ORDER=[ "shotgun", "ssg", "nailgun", "snailgun", "glauncher", "rlauncher", "lightning" ];
    ownedRow() {
        return QuakeWeapons.SBAR_ORDER.map(w => this.owned.has(w));
    }
    activeIndex() {
        return QuakeWeapons.SBAR_ORDER.indexOf(this.current);
    }
    wheelSlots() {
        return WHEEL_ORDER.map(w => {
            const k = AMMO_FOR[w];
            return {
                owned: w === "axe" || this.owned.has(w),
                hasAmmo: this.hasAmmoFor(w),
                ammo: k ? this.ammo[k] : -1,
                ammoKind: k
            };
        });
    }
    wheelActiveIndex() {
        return WHEEL_ORDER.indexOf(this.current);
    }
    selectFromWheel(pawn, slot, now) {
        const w = WHEEL_ORDER[slot];
        if (!w || w !== "axe" && !this.owned.has(w)) return false;
        this.selectWeapon(pawn, w, now);
        if (!this.hasAmmoFor(w)) this.noAmmoHook?.();
        return true;
    }
    addShells(n) {
        return this.addAmmo("shells", n);
    }
    addAmmo(kind, n) {
        const cap = AMMO_MAX[kind];
        if (this.ammo[kind] >= cap) return false;
        this.ammo[kind] = Math.min(this.ammo[kind] + n, cap);
        return true;
    }
    setShells(n) {
        this.ammo.shells = Math.max(0, Math.min(Math.trunc(n), AMMO_MAX.shells));
    }
    snapshot() {
        return {
            ...this.ammo
        };
    }
    restore(a) {
        Object.assign(this.ammo, a);
    }
    ownedWeapons() {
        return [ ...this.owned ];
    }
    grantOwned(pawn, list) {
        if (list) for (const q of list) this.owned.add(q);
        this.reconcile(pawn);
    }
    restoreActive(pawn, w, now) {
        const q = w;
        if (q && q !== "none" && this.owned.has(q)) this.selectWeapon(pawn, q, now);
    }
    reconcile(pawn) {
        for (const [cs, q] of Object.entries(WEP_CS)) {
            const held = this.findCs(pawn, cs);
            if (this.owned.has(q)) {
                if (!held) pawn.GiveNamedItem(cs);
            } else if (held) {
                pawn.DestroyWeapon(held);
            }
        }
        const c4 = pawn.GetC4();
        if (c4) pawn.DestroyWeapon(c4);
    }
    onEnable(pawn, now) {
        this.ammo = {
            shells: WEAPON_START_SHELLS,
            nails: 0,
            rockets: 0,
            cells: 0
        };
        this.nextAttack = 0;
        this.lgActive = false;
        this.owned = new Set([ "axe", "shotgun" ]);
        this.current = "shotgun";
        this.pendingSwitch = "";
        this.reconcile(pawn);
        this.selectWeapon(pawn, "shotgun", now);
    }
    give(pawn, csName, now) {
        const q = WEP_CS[csName];
        const isNew = !!q && !this.owned.has(q);
        if (q) this.owned.add(q);
        this.reconcile(pawn);
        if (isNew && q && now !== undefined) this.selectWeapon(pawn, q, now);
    }
    giveAll(pawn) {
        this.owned = new Set([ "axe", ...Object.values(WEP_CS) ]);
        this.reconcile(pawn);
        this.ammo = {
            ...AMMO_MAX
        };
    }
    onDisable(pawn) {
        this.current = "none";
        for (const n of VM_NAMES) {
            const e = Instance.FindEntityByName(n);
            if (!e) continue;
            e.Move({
                position: VM_HIDDEN
            });
        }
        if (pawn && pawn.IsValid()) pawn.DestroyWeapons();
    }
    update(pawn, origin, viewPitch, viewYaw, alive, now, bob = 0, vel) {
        if (this.infAmmo) this.ammo = {
            ...AMMO_MAX
        };
        const active = pawn.GetActiveWeapon();
        const name = normalizeWeapon(active ? active.GetData()?.GetName() ?? "" : "");
        const mapped = WEP_CS[name];
        if (this.pendingSwitch) {
            if (mapped === this.pendingSwitch || now - this.pendingSwitchAt > 1) {
                this.pendingSwitch = "";
            } else {
                this.current = this.pendingSwitch;
            }
        }
        if (!this.pendingSwitch) {
            if (!mapped) this.current = "axe"; else if (this.owned.has(mapped)) {
                if (mapped === this.current || this.hasAmmoFor(mapped) || !this.denyEmpty(pawn, now)) {
                    this.current = mapped;
                }
            }
        }
        if (this.current !== this.vmShownWeapon) {
            for (const w of [ this.vmShownWeapon, this.current ]) {
                if (w === "none") continue;
                const d = VIEWMODEL[w];
                this.setVmAnim(d.name, d.rest ?? d.seq);
            }
            this.vmShownWeapon = this.current;
            this.vmFireClipOn = false;
            this.vmBusyUntil = 0;
        }
        if (active && name in WEP_CS && !WEP_CS_GRENADE.has(name)) {
            if (active.GetClipAmmo() !== 0) active.SetClipAmmo(0);
            if (active.GetReserveAmmo() !== 0) active.SetReserveAmmo(0);
        }
        const {forward, right, up} = angleVectors(viewPitch, viewYaw, 0);
        const eye = origin.withZ(origin.z + VIEW_OFS_Z);
        const held = alive && pawn.IsInputPressed(CSInputs.ATTACK);
        const pressed = alive && (held || pawn.WasInputJustPressed(CSInputs.ATTACK));
        const firedFrom = this.current;
        const poolK = AMMO_FOR[firedFrom];
        const hadAmmo = !!poolK && this.ammo[poolK] > 0;
        if (this.current === "lightning") {
            this.fireLightning(pawn, eye, forward, right, up, held, now);
        } else if (pressed && now >= this.nextAttack) {
            this.fire(pawn, origin, eye, forward, right, up, now);
        }
        if (this.current !== "lightning") this.lgActive = false;
        if (alive && hadAmmo && poolK && this.current === firedFrom && this.ammo[poolK] <= 0) {
            this.checkNoAmmo(pawn, now);
        }
        if (!held || this.current !== "nailgun") this.nailSide = -1;
        const pdt = this.punchAt ? Math.max(0, now - this.punchAt) : 0;
        this.punchAt = now;
        if (this.punchPitch !== 0 && pdt > 0) {
            const d = PUNCH_RETURN * pdt;
            this.punchPitch = this.punchPitch < 0 ? Math.min(0, this.punchPitch + d) : Math.max(0, this.punchPitch - d);
        }
        this.updateVmAnim(held, now);
        this.positionViewmodels(eye, viewPitch, viewYaw, forward, right, up, bob, vel);
    }
    muzzleOrigin(eye, fwd, right, up) {
        if (!PROJ_WEAPONS.has(this.current) && this.current !== "lightning") return eye;
        const vm = VIEWMODEL[this.current];
        const vmPos = eye.add(fwd.scale(vm.off.fwd)).add(right.scale(vm.off.right + this.vmSideOfs())).add(up.scale(vm.off.up));
        const bo = BARREL_OFS[this.current];
        const b = Array.isArray(bo) ? bo[this.nailSide > 0 ? 0 : 1] : bo;
        const f = vm.muz + (b?.f ?? 0);
        return vmPos.add(fwd.scale(f)).add(right.scale(b?.r ?? 0)).add(up.scale(b?.u ?? 0));
    }
    aimPoint(eye, fwd, pawn) {
        const end = eye.add(fwd.scale(8192));
        const tr = traceHull(eye, V0$5, V0$5, end, [ pawn ]);
        return tr.fraction < 1 ? new Vec3(tr.endpos) : end;
    }
    fire(pawn, origin, eye, fwd, right, up, now) {
        const a = this.ammo;
        const q = this.dmgScale();
        const muz = this.muzzleOrigin(eye, fwd, right, up);
        const pdir = PROJ_WEAPONS.has(this.current) ? muz.directionTowards(this.aimPoint(eye, fwd, pawn)) : fwd;
        switch (this.current) {
          case "axe":
            this.fireAxe(pawn, origin, fwd, now, q);
            this.nextAttack = now + AXE_REFIRE;
            return;

          case "shotgun":
            if (a.shells < 1) return this.outOfAmmo(now);
            a.shells -= 1;
            this.fireBullets(pawn, origin, fwd, right, up, SHOTGUN_PELLETS, SHOTGUN_SPREAD, SHOTGUN_SPREAD, SHOTGUN_PELLET_DAMAGE * q, now);
            this.anim("shotgun", now);
            this.sounds?.play(SND.shotgun, this.playerSrc);
            this.nextAttack = now + SHOTGUN_REFIRE;
            return;

          case "ssg":
            if (a.shells < SSG_SHELLS) return this.outOfAmmo(now);
            a.shells -= SSG_SHELLS;
            this.fireBullets(pawn, origin, fwd, right, up, SSG_PELLETS, SSG_SPREAD_X, SSG_SPREAD_Y, SSG_PELLET_DAMAGE * q, now);
            this.anim("ssg", now);
            this.sounds?.play(SND.ssg, this.playerSrc);
            this.nextAttack = now + SSG_REFIRE;
            return;

          case "nailgun":
            {
                if (a.nails < 1) return this.outOfAmmo(now);
                a.nails -= 1;
                this.projectiles?.spawn("nail", muz, pdir, now, NAIL_DAMAGE * q);
                this.nailSide = -this.nailSide;
                this.anim("nailgun", now);
                this.sounds?.play(SND.nailgun, this.playerSrc);
                this.nextAttack = now + NAIL_REFIRE;
                return;
            }

          case "snailgun":
            {
                if (a.nails < 1) return this.outOfAmmo(now);
                let snd = SND.nailgun;
                if (a.nails >= 2) {
                    a.nails -= 2;
                    this.projectiles?.spawn("snail", muz, pdir, now, SNAIL_DAMAGE * q);
                    snd = SND.snailgun;
                } else {
                    a.nails -= 1;
                    this.projectiles?.spawn("nail", muz, pdir, now, NAIL_DAMAGE * q);
                }
                this.anim("snailgun", now);
                this.sounds?.play(snd, this.playerSrc);
                this.nextAttack = now + NAIL_REFIRE;
                return;
            }

          case "glauncher":
            if (a.rockets < 1) return this.outOfAmmo(now);
            a.rockets -= 1;
            this.projectiles?.spawn("grenade", muz, pdir, now, 0);
            this.anim("glauncher", now);
            this.sounds?.play(SND.grenadeFire, this.playerSrc);
            this.nextAttack = now + GRENADE_REFIRE;
            return;

          case "rlauncher":
            if (a.rockets < 1) return this.outOfAmmo(now);
            a.rockets -= 1;
            this.projectiles?.spawn("rocket", muz, pdir, now, (ROCKET_DIRECT_MIN + Math.random() * ROCKET_DIRECT_RND) * q);
            this.anim("rlauncher", now);
            this.sounds?.play(SND.rocketFire, this.playerSrc);
            this.nextAttack = now + ROCKET_REFIRE;
            return;

          default:
            return;
        }
    }
    outOfAmmo(now) {
        this.nextAttack = now + .5;
    }
    hasAmmoFor(w) {
        const k = AMMO_FOR[w];
        if (!k) return true;
        return this.ammo[k] >= (SELECT_NEED[w] ?? 1);
    }
    bestWeapon() {
        const o = this.owned, a = this.ammo;
        if (a.cells >= 1 && o.has("lightning")) return "lightning";
        if (a.nails >= 2 && o.has("snailgun")) return "snailgun";
        if (a.shells >= 2 && o.has("ssg")) return "ssg";
        if (a.nails >= 1 && o.has("nailgun")) return "nailgun";
        if (a.shells >= 1 && o.has("shotgun")) return "shotgun";
        return "axe";
    }
    findCs(pawn, cs) {
        return pawn.FindWeapon(cs) ?? (cs === "weapon_knife" ? pawn.FindWeaponBySlot(CSGearSlot.KNIFE) : undefined);
    }
    selectWeapon(pawn, w, now) {
        const cs = CS_FOR[w];
        const wep = cs ? this.findCs(pawn, cs) : undefined;
        if (wep) pawn.SwitchToWeapon(wep);
        this.current = w;
        this.pendingSwitch = w;
        this.pendingSwitchAt = now;
    }
    checkNoAmmo(pawn, now) {
        const best = this.bestWeapon();
        if (best === this.current) return;
        this.selectWeapon(pawn, best, now);
        this.nextAttack = Math.max(this.nextAttack, now + .2);
    }
    noAmmoMsgAt=0;
    denyEmpty(pawn, now) {
        const cs = CS_FOR[this.current];
        const back = cs ? this.findCs(pawn, cs) : undefined;
        if (!back || pawn.GetActiveWeapon() === back) return false;
        pawn.SwitchToWeapon(back);
        if (now - this.noAmmoMsgAt > .3) {
            this.noAmmoHook?.();
            this.noAmmoMsgAt = now;
        }
        return true;
    }
    fireLightning(pawn, eye, fwd, right, up, held, now) {
        if (!held || this.ammo.cells < LG_CELLS_PER_SHOT) {
            if (!held) this.lgActive = false;
            if (held) this.outOfAmmo(now);
            return;
        }
        const eyeEnd = eye.add(fwd.scale(LG_RANGE));
        const tr = traceHull(eye, V0$5, V0$5, eyeEnd, [ pawn ]);
        const beamEnd = tr.fraction < 1 ? new Vec3(tr.endpos) : eyeEnd;
        if (now >= this.lgBeamAt) {
            const muz = this.muzzleOrigin(eye, fwd, right, up);
            this.particles?.zap("lightning", muz, beamEnd, now, LG_BEAM_TTL);
            this.lgBeamAt = now + LG_BEAM_REFRESH;
        }
        if (now < this.nextAttack) return;
        if (!this.lgActive) this.sounds?.play(SND.lightningStart, this.playerSrc);
        this.lgActive = true;
        this.ammo.cells -= LG_CELLS_PER_SHOT;
        this.sounds?.play(SND.lightningFire, this.playerSrc);
        this.anim("lightning", now);
        if (tr.fraction < 1) {
            const org = beamEnd.subtract(fwd.scale(2));
            this.hurt(tr.ent, LG_DAMAGE * this.dmgScale(), org, pawn, now, CSDamageTypes.SHOCK);
        }
        this.nextAttack = now + LG_REFIRE;
    }
    positionViewmodels(eye, viewPitch, viewYaw, fwd, right, up, bob, vel) {
        const cur = this.current === "none" ? null : VIEWMODEL[this.current];
        let pos = cur ? eye.add(fwd.scale(cur.off.fwd)).add(right.scale(cur.off.right + this.vmSideOfs())).add(up.scale(cur.off.up)) : eye;
        pos = pos.add(fwd.scale(bob * VM_BOB_FWD));
        pos = pos.withZ(pos.z + bob);
        const a = cur ? cur.ang : {
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        const angles = {
            pitch: viewPitch + a.pitch,
            yaw: viewYaw + a.yaw,
            roll: a.roll + this.strafeRoll(vel, viewYaw)
        };
        for (const n of VM_NAMES) {
            const e = Instance.FindEntityByName(n);
            if (!e || !e.IsValid()) continue;
            if (this.vmHidden || !cur || n !== cur.name) {
                e.Move({
                    position: VM_HIDDEN
                });
                continue;
            }
            e.Move({
                position: pos,
                angles
            });
        }
    }
    strafeRoll(vel, viewYaw) {
        return 0;
    }
    setVmAnim(name, seq) {
        Instance.EntFireAtName({
            name,
            input: "SetAnimation",
            value: seq
        });
    }
    anim(w, now) {
        if (w === "none") return;
        this.attackedAt = now;
        if (w !== "axe") this.lastShotAt = now;
        if (w in PUNCH_PITCH) this.punchPitch = PUNCH_PITCH[w] * VIEWKICK_SCALE;
        if (AUTO_ANIM.has(w)) {
            this.vmBusyUntil = now + (VIEWMODEL[w].fireAnim ?? NAIL_REFIRE + .06);
            return;
        }
        this.setVmAnim(VIEWMODEL[w].name, VIEWMODEL[w].seq);
        this.vmBusyUntil = now + (VIEWMODEL[w].fireAnim ?? VM_FIRE_ANIM_TIME);
        this.vmFireClipOn = true;
    }
    updateVmAnim(held, now) {
        if (this.current === "none") return;
        const vm = VIEWMODEL[this.current];
        const rest = vm.rest ?? vm.seq;
        const firing = AUTO_ANIM.has(this.current) ? held && now < this.vmBusyUntil : now < this.vmBusyUntil;
        if (firing && !this.vmFireClipOn) {
            this.setVmAnim(vm.name, vm.seq);
            this.vmFireClipOn = true;
        } else if (!firing && this.vmFireClipOn) {
            this.setVmAnim(vm.name, rest);
            this.vmFireClipOn = false;
        }
    }
    bulletSrc(origin, forward) {
        const z = origin.z + HULL_MIN.z + (HULL_MAX.z - HULL_MIN.z) * .7;
        return origin.withZ(z).add(forward.scale(10));
    }
    hurt(ent, dmg, pos, pawn, now, dt) {
        if (this.shootHook && this.shootHook(ent)) return true;
        if (this.enemies && this.enemies.damageFromPlayer(ent, dmg, pos, now)) return true;
        if (this.barrels && this.barrels.hit(ent, dmg, now)) return true;
        if (ent && ent.IsValid()) {
            ent.TakeDamage({
                damage: dmg,
                damageTypes: dt,
                attacker: pawn,
                inflictor: pawn
            });
            return true;
        }
        return false;
    }
    fireAxe(pawn, origin, forward, now, q) {
        this.anim("axe", now);
        this.sounds?.play(SND.axeSwing, this.playerSrc);
        const src = origin.withZ(origin.z + 16);
        const tr = traceHull(src, V0$5, V0$5, src.add(forward.scale(AXE_RANGE)), [ pawn ]);
        if (tr.fraction === 1) return;
        const org = new Vec3(tr.endpos).subtract(forward.scale(4));
        const ent = tr.ent && tr.ent.IsValid() ? tr.ent : undefined;
        const mon = ent ? this.enemies?.monsterByProp(ent) : undefined;
        this.hurt(ent, AXE_DAMAGE * q, org, pawn, now, CSDamageTypes.SLASH);
        this.sounds?.play(mon ? SND.axeHitFlesh : SND.axeHitWall, this.playerSrc);
        if (!mon) this.particles?.burst("wall_impact", org, new Vec3(tr.normal), now);
    }
    fireBullets(pawn, origin, fwd, right, up, n, spreadX, spreadY, dmgEach, now) {
        const src = this.bulletSrc(origin, fwd);
        const hits = new Map;
        for (let i = 0; i < n; i++) {
            const dir = fwd.add(right.scale(cr() * spreadX)).add(up.scale(cr() * spreadY));
            const tr = traceHull(src, V0$5, V0$5, src.add(dir.scale(SHOTGUN_RANGE)), [ pawn ]);
            if (tr.fraction === 1) continue;
            const org = new Vec3(tr.endpos).subtract(dir.scale(4));
            const ent = tr.ent && tr.ent.IsValid() ? tr.ent : undefined;
            const mon = ent ? this.enemies?.monsterByProp(ent) : undefined;
            if (mon) {
                const acc = hits.get(ent);
                if (acc) acc.dmg += dmgEach; else hits.set(ent, {
                    dmg: dmgEach,
                    pos: org
                });
            } else {
                this.hurt(ent, dmgEach, org, pawn, now, CSDamageTypes.BULLET);
                this.particles?.burst("wall_impact", org, new Vec3(tr.normal), now);
            }
        }
        for (const [ent, acc] of hits) this.hurt(ent, acc.dmg, acc.pos, pawn, now, CSDamageTypes.BULLET);
    }
    drawHud() {
        return;
    }
}

function entityTags(name) {
    const out = [];
    const re = /@([a-z]+)/gi;
    let m;
    while ((m = re.exec(name)) !== null) out.push(m[1].toLowerCase());
    return out;
}

function hasTag(name, tag) {
    return entityTags(name).includes(tag);
}

const SKILLS = [ "easy", "normal", "hard" ];

function spawnTagOf(diff) {
    return diff === "easy" ? "easy" : diff === "hard" || diff === "nightmare" ? "hard" : "normal";
}

function spawnVars(name) {
    const h = name.indexOf("#");
    return h < 0 ? [] : name.slice(h + 1).split("#");
}

function matchesSkill(name, tag) {
    const skills = spawnVars(name).filter(t => SKILLS.indexOf(t) >= 0);
    return skills.length === 0 || skills.indexOf(tag) >= 0;
}

function hasSpawnVar(name, v) {
    return spawnVars(name).indexOf(v) >= 0;
}

function spawnBaseMatches(name, base) {
    if (!name.startsWith(base)) return false;
    let rest = name.slice(base.length);
    const um = rest.match(/^_\d+/);
    if (um) rest = rest.slice(um[0].length);
    return rest === "" || rest.startsWith("#");
}

function findSpawnMarkers(base, tag) {
    const out = [];
    for (const e of Instance.FindEntitiesByClass("info_target")) {
        const n = e.GetEntityName();
        if (spawnBaseMatches(n, base) && matchesSkill(n, tag)) out.push(e);
    }
    return out;
}

function safeRemove(e) {
    try {
        if (e && e.IsValid()) e.Remove();
    } catch {}
}

const V0$4 = new Vec3(0, 0, 0);

const DEG$1 = 180 / Math.PI;

let nextProjSndId = 0;

class Projectiles {
    live=[];
    tmpl=new Map;
    enemies;
    sounds;
    particles;
    onExplode=() => {};
    onTrapHit=() => {};
    onImpact;
    barrels;
    spikeFxSeq=0;
    setOnImpact(fn) {
        this.onImpact = fn;
    }
    setBarrels(b) {
        this.barrels = b;
    }
    setParticles(p) {
        this.particles = p;
    }
    attachTrail(kind, prop) {
        const fx = kind === "rocket" || kind === "fireball" || kind === "bossball" ? "rock2_trail" : kind === "grenade" ? "rock_trail" : kind === "zomgib" ? "blood_trail" : undefined;
        return fx ? this.particles?.attachTrail(fx, prop) : undefined;
    }
    onEnable(enemies, sounds, onExplode, onTrapHit) {
        this.onDisable();
        this.enemies = enemies;
        this.sounds = sounds;
        this.onExplode = onExplode;
        this.onTrapHit = onTrapHit;
        for (const [k, name] of [ [ "nail", NAIL_TEMPLATE ], [ "snail", SNAIL_TEMPLATE ], [ "rocket", ROCKET_TEMPLATE ], [ "grenade", GRENADE_TEMPLATE ] ]) {
            const t = Instance.FindEntityByName(name);
            if (t instanceof PointTemplate) this.tmpl.set(k, t); else print(`[quake] no point_template "${name}", ${k} projectiles invisible`);
        }
        const zg = Instance.FindEntityByName(ZOMGIB_TEMPLATE);
        const zgt = zg instanceof PointTemplate ? zg : this.tmpl.get("grenade");
        if (zgt) this.tmpl.set("zomgib", zgt);
        const lb = Instance.FindEntityByName(LAVABALL_TEMPLATE);
        const lbt = lb instanceof PointTemplate ? lb : this.tmpl.get("rocket");
        if (lbt) {
            this.tmpl.set("fireball", lbt);
            this.tmpl.set("bossball", lbt);
        }
    }
    onDisable() {
        for (const p of this.live) {
            p.trail?.stop();
            safeRemove(p.prop);
        }
        this.live = [];
    }
    props() {
        return this.live.filter(p => p.prop.IsValid()).map(p => p.prop);
    }
    spawn(kind, muzzle, dir, now, damage) {
        const t = this.tmpl.get(kind);
        const speed = kind === "grenade" ? GRENADE_SPEED : kind === "rocket" ? ROCKET_SPEED : NAIL_SPEED;
        let vel = dir.scale(speed);
        if (kind === "grenade") vel = vel.withZ(vel.z + GRENADE_UP);
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop,
            kind,
            sndName,
            origin: new Vec3(pos),
            velocity: vel,
            angles: ang,
            dieAt: now + (kind === "grenade" ? GRENADE_FUSE : PROJ_LIFETIME),
            damage,
            atRest: false,
            dead: false,
            trail: this.attachTrail(kind, prop)
        });
    }
    monsterGrenade(muzzle, vel, now, owner) {
        const t = this.tmpl.get("grenade");
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop,
            kind: "grenade",
            sndName,
            origin: new Vec3(pos),
            velocity: new Vec3(vel),
            angles: ang,
            dieAt: now + OGRE_GRENADE_FUSE,
            damage: OGRE_GRENADE_DAMAGE,
            atRest: false,
            dead: false,
            owner,
            trail: this.attachTrail("grenade", prop)
        });
    }
    zombieGib(muzzle, vel, now, owner) {
        const t = this.tmpl.get("zomgib");
        const pos = new Vec3(muzzle);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop,
            kind: "zomgib",
            sndName,
            origin: new Vec3(pos),
            velocity: new Vec3(vel),
            angles: ang,
            dieAt: now + ZOMBIE_GIB_FUSE,
            damage: ZOMBIE_GIB_DAMAGE,
            atRest: false,
            dead: false,
            owner,
            trail: this.attachTrail("zomgib", prop)
        });
    }
    fireball(origin, speed, now) {
        const t = this.tmpl.get("fireball");
        const vel = new Vec3(Math.random() * 100 - 50, Math.random() * 100 - 50, speed + Math.random() * 200);
        const pos = new Vec3(origin);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        this.live.push({
            prop,
            kind: "fireball",
            sndName: this.nameProp(prop),
            origin: new Vec3(pos),
            velocity: vel,
            angles: ang,
            dieAt: now + FIREBALL_LIFETIME,
            damage: FIREBALL_DAMAGE,
            atRest: false,
            dead: false,
            trail: this.attachTrail("fireball", prop)
        });
    }
    bossball(origin, dir, owner, now) {
        const t = this.tmpl.get("bossball");
        const vel = dir.normal.scale(BOSS_MISSILE_SPEED);
        const pos = new Vec3(origin);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(pos, ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        this.live.push({
            prop,
            kind: "bossball",
            sndName: this.nameProp(prop),
            origin: new Vec3(pos),
            velocity: vel,
            angles: ang,
            dieAt: now + BOSS_MISSILE_FUSE,
            damage: BOSS_MISSILE_DAMAGE,
            atRest: false,
            dead: false,
            owner,
            trail: this.attachTrail("bossball", prop)
        });
    }
    spikeShot(owner, origin, dir, sup, now, speed = SPIKESHOOTER_SPEED, dmg = (sup ? SNAIL_DAMAGE : NAIL_DAMAGE)) {
        const kind = sup ? "snail" : "nail";
        const t = this.tmpl.get(kind);
        const vel = dir.normal.scale(speed);
        const ang = this.aim(vel);
        const sp = t ? t.ForceSpawn(new Vec3(origin), ang) : undefined;
        const prop = sp && sp.length ? sp[0] : undefined;
        if (!prop) return;
        const sndName = this.nameProp(prop);
        this.live.push({
            prop,
            kind,
            sndName,
            origin: new Vec3(origin),
            velocity: vel,
            angles: ang,
            dieAt: now + SPIKESHOOTER_FUSE,
            damage: dmg,
            atRest: false,
            dead: false,
            owner,
            trail: this.particles?.attachTrail("rock_trail", prop)
        });
    }
    update(now, dt) {
        if (this.live.length === 0 || !this.enemies) return;
        const props = this.props();
        const pawn = this.enemies.pawn;
        const steps = PROJ_SUBSTEPS;
        const sdt = dt / steps;
        for (const p of this.live) {
            if (!p.prop.IsValid() || p.dead) continue;
            const isGren = p.kind === "grenade";
            const ballistic = isGren || p.kind === "zomgib" || p.kind === "fireball";
            if (ballistic && p.atRest) continue;
            const mn = isGren ? GRENADE_HULL_MIN : V0$4;
            const mx = isGren ? GRENADE_HULL_MAX : V0$4;
            const ignore = p.owner ? [ p.owner, ...props ] : p.kind === "fireball" ? [ ...props ] : [ pawn, ...props ];
            for (let s = 0; s < steps && p.prop.IsValid() && !p.dead; s++) {
                if (ballistic) p.velocity = p.velocity.withZ(p.velocity.z - SV_GRAVITY * sdt);
                const tr = traceHull(p.origin, mn, mx, p.origin.add(p.velocity.scale(sdt)), [ p.prop, ...ignore ]);
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
                        if (shooter) this.enemies.hurtMonster(mon, p.damage, shooter, now); else this.enemies.damageFromPlayer(tr.ent, p.damage, p.origin, now);
                        p.prop.Remove();
                    } else if (this.barrels?.isBarrelProp(tr.ent)) {
                        this.barrels.hit(tr.ent, p.damage, now);
                        p.prop.Remove();
                    } else if (shot) {
                        p.prop.Remove();
                    } else {
                        const nm = `q_spikefx_${++this.spikeFxSeq}`;
                        p.prop.SetEntityName(nm);
                        p.prop.Move({
                            position: p.origin.subtract(tr.normal.scale(3))
                        });
                        this.particles?.burst("wall_impact", p.origin, tr.normal, now);
                        this.sounds?.play(this.pick(SND.spikeHitWall), nm);
                        Instance.EntFireAtTarget({
                            target: p.prop,
                            input: "Kill",
                            delay: SPIKE_FX_TTL
                        });
                    }
                } else if (p.kind === "zomgib") {
                    const shooter = p.owner ? this.enemies.monsterByProp(p.owner) : undefined;
                    if (p.owner && tr.ent === pawn) {
                        this.onTrapHit(p.damage, p.origin, now);
                        p.prop.Move({
                            position: p.origin
                        });
                        this.sounds?.play(SND.zombieHit, p.sndName);
                        p.dead = true;
                        p.prop.Remove();
                    } else if (mon && shooter) {
                        this.enemies.hurtMonster(mon, p.damage, shooter, now);
                        p.dead = true;
                        p.prop.Remove();
                    } else {
                        p.velocity = clipVelocity(p.velocity, tr.normal, 1).out;
                        p.prop.Move({
                            position: p.origin
                        });
                        this.sounds?.play(SND.zombieMiss, p.sndName);
                        if (tr.normal.z > .7 && p.velocity.z < 60) {
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
                    if (mon || this.barrels?.isBarrelProp(tr.ent) || p.owner && tr.ent === pawn) {
                        this.explode(p, now);
                    } else {
                        p.velocity = clipVelocity(p.velocity, tr.normal, 1.5).out;
                        p.prop.Move({
                            position: p.origin
                        });
                        this.sounds?.play(SND.grenadeBounce, p.sndName);
                        if (tr.normal.z > .7 && p.velocity.z < 60) {
                            p.velocity = new Vec3(0, 0, 0);
                            p.atRest = true;
                            break;
                        }
                    }
                } else {
                    const barrel = !mon && this.barrels?.isBarrelProp(tr.ent) ? tr.ent : undefined;
                    if (mon) this.enemies.damageFromPlayer(tr.ent, p.damage, p.origin, now); else if (barrel) this.barrels.hit(barrel, p.damage, now);
                    this.explode(p, now, mon ? tr.ent : barrel);
                }
                if (p.dead) break;
            }
            if ((isGren || p.kind === "zomgib" || p.kind === "bossball") && !p.atRest) {
                const d = GRENADE_AVELOCITY * dt;
                p.angles.pitch = (p.angles.pitch + d) % 360;
                p.angles.yaw = (p.angles.yaw + d) % 360;
                p.angles.roll = (p.angles.roll + d) % 360;
            }
            if (p.prop.IsValid() && !p.dead) this.pushProp(p);
        }
        for (const p of this.live) {
            if (!p.prop.IsValid() || p.dead) continue;
            if (p.kind === "grenade" && now >= p.dieAt) this.explode(p, now); else if (now >= p.dieAt) {
                p.dead = true;
                p.prop.Remove();
            }
        }
        this.live = this.live.filter(p => {
            if (p.prop.IsValid() && !p.dead) return true;
            p.trail?.stop();
            return false;
        });
    }
    explode(p, now, ignore) {
        if (p.dead) return;
        p.dead = true;
        const dmg = p.owner ? p.damage : EXPLOSION_DAMAGE;
        this.onExplode(p.origin, dmg, now, p.owner ?? ignore, !!p.owner);
        p.prop.Remove();
    }
    pushProp(p) {
        const tumbling = p.kind === "grenade" || p.kind === "zomgib" || p.kind === "bossball";
        p.prop.Move({
            position: p.origin,
            angles: tumbling ? p.angles : this.aim(p.velocity)
        });
    }
    aim(v) {
        return {
            pitch: -Math.atan2(v.z, Math.hypot(v.x, v.y)) * DEG$1,
            yaw: Math.atan2(v.y, v.x) * DEG$1,
            roll: 0
        };
    }
    pick(a) {
        return a[Math.floor(Math.random() * a.length)];
    }
    nameProp(prop) {
        const nm = `q_proj_${nextProjSndId++}`;
        prop.SetEntityName(nm);
        return nm;
    }
}

class Barrels {
    barrels=[];
    radiusDamage=() => {};
    onEnable(radiusDamage) {
        this.onDisable();
        this.radiusDamage = radiusDamage;
        let i = 0;
        for (const [tmpl, spawn] of [ [ EXPLOBOX_TEMPLATE, EXPLOBOX_SPAWN ], [ EXPLOBOX_BIG_TEMPLATE, EXPLOBOX_BIG_SPAWN ] ]) {
            const t = Instance.FindEntityByName(tmpl);
            if (!(t instanceof PointTemplate)) {
                if (Instance.FindEntitiesByName(spawn).length) {
                    print(`[quake] no point_template "${tmpl}", those barrels skipped`);
                }
                continue;
            }
            for (const mk of Instance.FindEntitiesByName(spawn)) {
                const pos = new Vec3(mk.GetAbsOrigin());
                const sp = t.ForceSpawn(pos.add(BOX_SPAWN_OFS), {
                    pitch: 0,
                    yaw: mk.GetAbsAngles().yaw,
                    roll: 0
                });
                if (!sp || !sp.length) continue;
                const name = `q_barrel_${i++}`;
                sp[0].SetEntityName(name);
                this.barrels.push({
                    prop: sp[0],
                    origin: pos,
                    health: EXPLOBOX_HEALTH,
                    name
                });
            }
        }
        if (this.barrels.length) print(`[quake] ${this.barrels.length} explosive barrel(s)`);
    }
    onDisable() {
        for (const b of this.barrels) safeRemove(b.prop);
        this.barrels = [];
    }
    isBarrelProp(ent) {
        return this.find(ent) !== undefined;
    }
    hit(ent, dmg, now) {
        const b = this.find(ent);
        if (!b) return false;
        this.damage(b, dmg, now);
        return true;
    }
    find(ent) {
        if (!ent) return undefined;
        const nm = ent.IsValid() ? ent.GetEntityName() : "";
        return this.barrels.find(x => x.prop === ent || nm !== "" && x.name === nm);
    }
    radiusHit(origin, dmg, now) {
        for (const b of [ ...this.barrels ]) {
            if (!b.prop.IsValid()) continue;
            const pts = dmg - .5 * b.origin.distance(origin);
            if (pts > 0) this.damage(b, pts, now);
        }
    }
    damage(b, dmg, now) {
        if (b.health <= 0) return;
        b.health -= dmg;
        if (b.health > 0) return;
        this.barrels = this.barrels.filter(x => x !== b);
        const center = b.origin.withZ(b.origin.z + 32);
        if (b.prop.IsValid()) b.prop.Remove();
        this.radiusDamage(center, EXPLOBOX_DAMAGE, now);
    }
}

const V0$3 = new Vec3(0, 0, 0);

let nextGibSndId = 0;

class Gibs {
    live=[];
    tmpl=new Map;
    sounds;
    particles;
    src="";
    onEnable(sounds, playerSrc, particles) {
        this.onDisable();
        this.sounds = sounds;
        this.particles = particles;
        this.src = playerSrc;
        for (const n of [ "gib1", "gib2", "gib3", "zom_gib", "head_player", "head_soldier", "head_dog", "head_ogre", "head_knight", "head_demon", "head_zombie", "head_wizard" ]) {
            const t = Instance.FindEntityByName(n + "_template");
            if (t instanceof PointTemplate) this.tmpl.set(n, t);
        }
    }
    onDisable() {
        for (const g of this.live) {
            g.trail?.stop();
            safeRemove(g.prop);
        }
        this.live = [];
    }
    props() {
        return this.live.filter(g => g.prop.IsValid()).map(g => g.prop);
    }
    burst(origin, head, now) {
        const at = origin.withZ(origin.z + 8);
        const kinds = [ "gib1", "gib2", "gib3", ...head ? [ head ] : [] ];
        let sndSrc = this.src;
        for (const k of kinds) {
            const t = this.tmpl.get(k) ?? this.tmpl.get("gib1");
            if (!t) continue;
            const sp = t.ForceSpawn(at, {
                pitch: Math.random() * 360,
                yaw: Math.random() * 360,
                roll: Math.random() * 360
            });
            if (!sp || !sp.length) continue;
            if (sndSrc === this.src) {
                sndSrc = `q_gibfx_${nextGibSndId++}`;
                sp[0].SetEntityName(sndSrc);
            }
            const trail = this.particles?.attachTrail("blood_trail", sp[0]);
            this.live.push({
                prop: sp[0],
                origin: new Vec3(at),
                dieAt: now + GIB_LIFETIME,
                trail,
                velocity: new Vec3((Math.random() - .5) * GIB_SPREAD, (Math.random() - .5) * GIB_SPREAD, GIB_UP_MIN + Math.random() * GIB_UP_RND)
            });
        }
        this.sounds?.play(head === "head_player" ? SND.gibSplatPlayer : SND.gibSplat, sndSrc);
    }
    update(now, dt) {
        if (this.live.length === 0) return;
        const all = this.props();
        for (const g of this.live) {
            if (!g.prop.IsValid()) continue;
            g.velocity = g.velocity.withZ(g.velocity.z - SV_GRAVITY * dt);
            const tr = traceHull(g.origin, V0$3, V0$3, g.origin.add(g.velocity.scale(dt)), [ g.prop, ...all ]);
            g.origin = new Vec3(tr.endpos);
            if (tr.fraction < 1) {
                g.velocity = clipVelocity(g.velocity, tr.normal, 1).out;
                if (g.velocity.length < 40) g.velocity = new Vec3(0, 0, 0);
            }
            g.prop.Move({
                position: g.origin
            });
        }
        for (const g of this.live) {
            if (g.prop.IsValid() && now >= g.dieAt) {
                g.trail?.stop();
                g.prop.Remove();
            }
        }
        this.live = this.live.filter(g => {
            if (g.prop.IsValid()) return true;
            g.trail?.stop();
            return false;
        });
    }
}

const TEMPLATE = {
    blood_impact: "q_fx_blood_impact_template",
    blood_trail: "q_fx_blood_trail_template",
    wall_impact: "q_fx_wall_impact_template",
    rock_trail: "q_fx_rock_trail_template",
    rock2_trail: "q_fx_rock2_trail_template",
    explosion: "q_fx_explosion_template",
    lightning: "q_fx_lightning_template",
    bubbles: "q_fx_bubbles_template"
};

const FAR = new Vec3(0, 0, -16384);

const BURST_TTL = {
    blood_impact: PARTICLE_BLOOD_TTL,
    wall_impact: PARTICLE_WALL_TTL,
    explosion: PARTICLE_EXPLOSION_TTL
};

const DEG = 180 / Math.PI;

const NULL_TRAIL = {
    stop() {}
};

class Particles {
    tmpl=new Map;
    live=[];
    trails=[];
    statics=[];
    seq=0;
    onEnable(now) {
        this.onDisable();
        for (const k of Object.keys(TEMPLATE)) {
            const e = Instance.FindEntityByName(TEMPLATE[k]);
            if (e instanceof PointTemplate) this.tmpl.set(k, e);
        }
        if (this.tmpl.size === 0) {
            print("[quake] no q_fx_* particle templates in this map, FX off");
            return;
        }
        for (const k of this.tmpl.keys()) {
            const p = this.spawn(k, FAR, undefined);
            if (p) this.live.push({
                prop: p,
                dieAt: now + .05
            });
        }
        if (this.tmpl.has("bubbles")) {
            for (const e of Instance.FindEntitiesByClass("info_target")) {
                if (!spawnBaseMatches(e.GetEntityName(), AIR_BUBBLES_BASE)) continue;
                const o = e.GetAbsOrigin();
                const p = this.spawn("bubbles", new Vec3(o.x, o.y, o.z), undefined);
                if (!p) continue;
                Instance.EntFireAtTarget({
                    target: p,
                    input: "Start"
                });
                this.statics.push(p);
            }
            if (this.statics.length) print(`[quake] ${this.statics.length} air_bubbles column(s)`);
        }
    }
    onDisable() {
        for (const l of this.live) safeRemove(l.prop);
        for (const t of this.trails) safeRemove(t);
        for (const s of this.statics) {
            if (s.IsValid()) Instance.EntFireAtTarget({
                target: s,
                input: "Stop"
            });
            safeRemove(s);
        }
        this.live = [];
        this.trails = [];
        this.statics = [];
    }
    props() {
        const out = [];
        for (const l of this.live) if (l.prop.IsValid()) out.push(l.prop);
        for (const t of this.trails) if (t.IsValid()) out.push(t);
        for (const s of this.statics) if (s.IsValid()) out.push(s);
        return out;
    }
    burst(fx, origin, dir, now) {
        const p = this.spawn(fx, origin, dir && dir.length > .001 ? this.aim(dir) : undefined);
        if (!p) return;
        Instance.EntFireAtTarget({
            target: p,
            input: "Start"
        });
        this.live.push({
            prop: p,
            dieAt: now + (BURST_TTL[fx] ?? PARTICLE_BURST_TTL_DEFAULT)
        });
    }
    zap(fx, start, end, now, ttl = PARTICLE_ZAP_TTL) {
        const p = this.spawn(fx, start, undefined);
        if (!p) return;
        Instance.EntFireAtTarget({
            target: p,
            input: "Start"
        });
        this.setCP(p, 1, end);
        Instance.EntFireAtTarget({
            target: p,
            input: "setcontrolpoint",
            value: `1: ${end.x} ${end.y} ${end.z}`,
            delay: TICK_INTERVAL
        });
        this.live.push({
            prop: p,
            dieAt: now + ttl
        });
    }
    attachTrail(fx, carrier) {
        if (!carrier.IsValid()) return NULL_TRAIL;
        const p = this.spawn(fx, new Vec3(carrier.GetAbsOrigin()), undefined);
        if (!p) return NULL_TRAIL;
        try {
            p.SetParent(carrier);
        } catch {}
        Instance.EntFireAtTarget({
            target: p,
            input: "Start"
        });
        this.trails.push(p);
        const trails = this.trails;
        let stopped = false;
        return {
            stop() {
                if (stopped) return;
                stopped = true;
                const i = trails.indexOf(p);
                if (i >= 0) trails.splice(i, 1);
                if (!p.IsValid()) return;
                Instance.EntFireAtTarget({
                    target: p,
                    input: "Stop"
                });
                try {
                    p.SetParent(undefined);
                } catch {}
                Instance.EntFireAtTarget({
                    target: p,
                    input: "DestroyImmediately",
                    delay: PARTICLE_TRAIL_LINGER
                });
            }
        };
    }
    update(now) {
        if (this.live.length === 0) return;
        for (const l of this.live) if (l.prop.IsValid() && now >= l.dieAt) safeRemove(l.prop);
        this.live = this.live.filter(l => l.prop.IsValid() && now < l.dieAt);
    }
    spawn(fx, origin, ang) {
        const t = this.tmpl.get(fx);
        if (!t) return undefined;
        const sp = t.ForceSpawn(new Vec3(origin), ang ?? {
            pitch: 0,
            yaw: 0,
            roll: 0
        });
        const p = sp && sp.length ? sp[0] : undefined;
        if (p) p.SetEntityName(`q_fx_${this.seq++}`);
        return p;
    }
    setCP=(p, i, v) => {
        Instance.EntFireAtTarget({
            target: p,
            input: "setcontrolpoint",
            value: `${i}: ${v.x} ${v.y} ${v.z}`
        });
    };
    aim(v) {
        return {
            pitch: -Math.atan2(v.z, Math.hypot(v.x, v.y)) * DEG,
            yaw: Math.atan2(v.y, v.x) * DEG,
            roll: 0
        };
    }
}

class Fireballs {
    emitters=[];
    projectiles;
    setProjectiles(p) {
        this.projectiles = p;
    }
    onEnable(now, difficulty) {
        this.emitters = [];
        const tag = spawnTagOf(difficulty);
        for (const e of Instance.FindEntitiesByClass("info_target")) {
            const n = e.GetEntityName();
            if (!spawnBaseMatches(n, FIREBALL_SPAWN_BASE) || !matchesSkill(n, tag)) continue;
            const o = e.GetAbsOrigin();
            this.emitters.push({
                origin: new Vec3(o.x, o.y, o.z),
                speed: speedOf(n),
                nextFire: now + Math.random() * FIREBALL_DELAY_RAND
            });
        }
        if (this.emitters.length) print(`[quake] ${this.emitters.length} misc_fireball fountain(s)`);
    }
    onDisable() {
        this.emitters = [];
    }
    update(now) {
        if (this.emitters.length === 0) return;
        for (const em of this.emitters) {
            if (now < em.nextFire) continue;
            this.projectiles?.fireball(em.origin, em.speed, now);
            em.nextFire = now + FIREBALL_DELAY_MIN + Math.random() * FIREBALL_DELAY_RAND;
        }
    }
}

function speedOf(name) {
    const h = name.indexOf("#");
    if (h < 0) return FIREBALL_SPEED_DEFAULT;
    for (const t of name.slice(h + 1).split("#")) {
        const m = t.match(/^s(\d+)$/);
        if (m) return parseInt(m[1], 10);
    }
    return FIREBALL_SPEED_DEFAULT;
}

const V0$2 = new Vec3(0, 0, 0);

class EventLightning {
    bolts=[];
    beam;
    hurtMonster;
    hurtPlayer;
    pawn;
    setSinks(beam, hurtMonster, hurtPlayer, pawn) {
        this.beam = beam;
        this.hurtMonster = hurtMonster;
        this.hurtPlayer = hurtPlayer;
        this.pawn = pawn;
    }
    onEnable() {
        this.onDisable();
        for (const e of Instance.FindEntitiesByClass("info_target")) {
            const n = e.GetEntityName();
            if (!n.startsWith(EVENT_LIGHTNING_BASE + "_") || n.endsWith("_end")) continue;
            const end = e.GetParent();
            if (!end || !end.IsValid()) {
                print(`[quake] "${n}" has no parent (bolt end), skipped`);
                continue;
            }
            const bolt = {
                start: e,
                end,
                active: false,
                count: 0,
                nextTick: 0,
                conn: -1
            };
            const id = Instance.ConnectOutput(e, "OnUser1", () => this.fire(bolt));
            if (id !== undefined) bolt.conn = id;
            this.bolts.push(bolt);
        }
        if (this.bolts.length) print(`[quake] ${this.bolts.length} event_lightning arc(s)`);
    }
    onDisable() {
        for (const b of this.bolts) if (b.conn !== -1) {
            try {
                Instance.DisconnectOutput(b.conn);
            } catch {}
        }
        this.bolts = [];
    }
    fire(b) {
        if (b.active) return;
        b.active = true;
        b.count = 0;
        b.nextTick = 0;
    }
    update(now) {
        for (const b of this.bolts) {
            if (!b.active) continue;
            if (b.nextTick === 0) b.nextTick = now;
            while (b.active && now >= b.nextTick && b.count < EVENT_LIGHTNING_TICKS) {
                this.bolt(b, now);
                b.count++;
                b.nextTick += EVENT_LIGHTNING_TICK;
            }
            if (b.active && b.count >= EVENT_LIGHTNING_TICKS) {
                b.active = false;
                if (b.start.IsValid()) Instance.EntFireAtTarget({
                    target: b.start,
                    input: "FireUser2"
                });
            }
        }
    }
    bolt(b, now) {
        if (!b.start.IsValid() || !b.end.IsValid()) {
            b.active = false;
            return;
        }
        const so = b.start.GetAbsOrigin();
        const p1 = new Vec3(so.x, so.y, so.z + EVENT_LIGHTNING_START_UP);
        const eo = b.end.GetAbsOrigin();
        const p2 = new Vec3(eo.x, eo.y, eo.z);
        this.beam?.(p1, p2, now);
        let dir = p2.subtract(p1);
        const len = dir.length;
        if (len < 1) return;
        dir = dir.scale(1 / len);
        const perp = new Vec3(-dir.y, dir.x, 0);
        const pl = perp.length;
        const f = pl > 1e-4 ? perp.scale(EVENT_LIGHTNING_PERP / pl) : new Vec3(0, 0, 0);
        const hit = [];
        for (const off of [ new Vec3(0, 0, 0), f, f.scale(-1) ]) {
            const a = p1.add(off);
            const c = p2.add(off);
            const tr = traceHull(a, V0$2, V0$2, c, []);
            const ent = tr.ent;
            if (!ent || !ent.IsValid()) continue;
            if (hit.indexOf(ent) !== -1) continue;
            hit.push(ent);
            if (this.hurtMonster?.(ent, now)) continue;
            if (ent === this.pawn?.()) this.hurtPlayer?.(EVENT_LIGHTNING_DAMAGE, new Vec3(tr.endpos), now);
        }
    }
}

function T_Damage(targ, d) {
    if (!targ.takeDamage) return;
    if (targ.getsKnockback && !d.noKnockback) {
        const dir = targ.origin.subtract(d.inflictorCenter).normal;
        const kick = dir.scale(d.damage * KNOCKBACK_SCALE);
        if (targ.knockback) targ.knockback(kick); else targ.velocity = targ.velocity.add(kick);
    }
    if (targ.godMode) return;
    if (targ.invincibleUntil !== undefined && targ.invincibleUntil >= d.time) return;
    let save = Math.ceil(targ.armorType * d.damage);
    if (save >= targ.armorValue) {
        save = targ.armorValue;
        targ.armorType = 0;
    }
    targ.armorValue -= save;
    const take = Math.ceil(d.damage - save);
    targ.health -= take;
    d.armorSave = save;
    d.healthTake = take;
    if (targ.health <= 0) {
        targ.die(d);
        return;
    }
    targ.pain(d);
}

const V0$1 = new Vec3(0, 0, 0);

const RAD = Math.PI / 180;

const NODIR = -1;

let nextSndId = 0;

function anglemod(a) {
    return (a % 360 + 360) % 360;
}

function yawDelta(to, from) {
    let d = anglemod(to) - anglemod(from);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
}

function vectoyaw(dx, dy) {
    if (dx === 0 && dy === 0) return 0;
    const y = Math.atan2(dy, dx) / RAD;
    return y < 0 ? y + 360 : y;
}

function crand() {
    return Math.random() * 2 - 1;
}

function keyOf$1(v) {
    return `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)}`;
}

function findByNamePrefix(prefix) {
    const out = [];
    for (const cls of [ "info_target", "path_track", "path_corner" ]) {
        for (const e of Instance.FindEntitiesByClass(cls)) {
            if (e.GetEntityName().startsWith(prefix)) out.push(e);
        }
    }
    return out;
}

function loadNodeRoutes() {
    const groups = new Map;
    for (const cls of [ "info_target", "path_track", "path_corner" ]) {
        for (const e of Instance.FindEntitiesByClass(cls)) {
            const name = e.GetEntityName();
            if (!name.startsWith(PATH_NODE_PREFIX)) continue;
            const parent = e.GetParent();
            if (!parent) continue;
            const key = keyOf$1(parent.GetAbsOrigin());
            const md = /(\d+)\s*$/.exec(name);
            const arr = groups.get(key) ?? [];
            arr.push({
                order: md ? parseInt(md[1], 10) : arr.length,
                pos: new Vec3(e.GetAbsOrigin())
            });
            groups.set(key, arr);
        }
    }
    const out = [];
    for (const [key, pts] of groups) {
        if (pts.length < 2) continue;
        pts.sort((a, b) => a.order - b.order);
        const [x, y, z] = key.split(",").map(Number);
        out.push({
            owner: new Vec3(x, y, z),
            points: pts.map(p => p.pos)
        });
    }
    return out;
}

function nearestWaypoint(route, origin) {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < route.length; i++) {
        const d = route[i].distance(origin);
        if (d < best) {
            best = d;
            idx = i;
        }
    }
    return idx;
}

class Monster {
    def;
    prop;
    origin;
    yaw;
    idealYaw;
    state="stand";
    nextThink=0;
    attackFinished=0;
    searchTime=0;
    painFinished=0;
    painEnd=0;
    anim="";
    enemy;
    oldEnemy;
    dropped=false;
    ambush=false;
    aware=false;
    flying=false;
    slide=false;
    lefty=false;
    spawnMarker;
    sndName;
    painSound="";
    route=[];
    routeIdx=0;
    health;
    armorValue=0;
    armorType=0;
    takeDamage=true;
    getsKnockback=false;
    velocity=new Vec3(0, 0, 0);
    settled=false;
    corpseSettleAt=0;
    groundEntity;
    groundVel=new Vec3(0, 0, 0);
    gevPos=new Vec3(0, 0, 0);
    gevTime=-1;
    posHist=[];
    histAt=-1;
    visCache=false;
    visAt=-1;
    moved=true;
    wasAirborne=false;
    thinkDt=AI_THINK_INTERVAL;
    hullOverride;
    prevOrigin;
    prevYaw;
    segStart=0;
    lastPush=0;
    constructor(def, prop, origin, yaw) {
        this.def = def;
        this.prop = prop;
        this.origin = new Vec3(origin);
        this.yaw = yaw;
        this.idealYaw = yaw;
        this.prevOrigin = new Vec3(origin);
        this.prevYaw = yaw;
        this.posHist = [ new Vec3(origin) ];
        this.health = def.health;
        this.sndName = `q_snd_m${nextSndId++}`;
        this.prop.SetEntityName(this.sndName);
        this.prop.Teleport({
            position: this.modelPos(),
            angles: {
                pitch: 0,
                yaw: yaw + def.modelYawOfs,
                roll: 0
            }
        });
    }
    eye() {
        return this.origin.withZ(this.origin.z + this.def.viewOfsZ);
    }
    box() {
        const h = this.hullOverride;
        return {
            id: this.prop,
            center: this.origin,
            mins: h ? h.min : this.def.hullMin,
            maxs: h ? h.max : this.def.hullMax
        };
    }
    bodyCenter() {
        return this.origin.withZ(this.origin.z + (this.def.hullMin.z + this.def.hullMax.z) * .5);
    }
    modelPos() {
        return this.origin.withZ(this.origin.z + this.def.modelZOfs);
    }
    airborne() {
        return false;
    }
    onPainTick(_now) {}
    consumeWokeUp() {
        return false;
    }
    play(seq, force = false) {
        if (!force && this.anim === seq) return;
        this.anim = seq;
        const a = this.def.anims;
        const loop = seq === a.stand || seq === a.walk || seq === a.run;
        const input = force ? loop ? "SetAnimationLooping" : "SetAnimationNotLooping" : loop ? "SetAnimationNoResetLooping" : "SetAnimationNoResetNotLooping";
        Instance.EntFireAtTarget({
            target: this.prop,
            input,
            value: this.def.animPrefix + seq
        });
    }
    painOver(now) {
        return now >= this.painEnd;
    }
    beginSegment(now) {
        this.prevOrigin = new Vec3(this.origin);
        this.prevYaw = this.yaw;
        this.segStart = now;
    }
    pushInterpolated(now) {
        let t = (now - this.segStart) / this.thinkDt;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const delta = this.origin.subtract(this.prevOrigin);
        const io = this.prevOrigin.add(delta.scale(t));
        const iy = this.prevYaw + yawDelta(this.yaw, this.prevYaw) * t;
        this.prop.Move({
            position: io.withZ(io.z + this.def.modelZOfs),
            angles: {
                pitch: 0,
                yaw: iy + this.def.modelYawOfs,
                roll: 0
            },
            velocity: delta.scale(1 / this.thinkDt)
        });
        this.lastPush = now;
    }
}

const V0 = new Vec3(0, 0, 0);

const SOLDIER_DEF = {
    className: "monster_army",
    hullMin: SOLDIER_HULL_MIN,
    hullMax: SOLDIER_HULL_MAX,
    viewOfsZ: SOLDIER_VIEW_OFS_Z,
    yawSpeed: SOLDIER_YAW_SPEED,
    modelZOfs: SOLDIER_MODEL_Z_OFS,
    modelYawOfs: SOLDIER_MODEL_YAW_OFS,
    animPrefix: SOLDIER_ANIM_PREFIX,
    health: SOLDIER_HEALTH,
    gibHealth: SOLDIER_GIB_HEALTH,
    runSpeed: SOLDIER_RUN_SPEED,
    walkSpeed: SOLDIER_WALK_SPEED,
    giveUp: SOLDIER_GIVEUP,
    firstAttackDelay: SOLDIER_FIRST_ATTACK_DELAY,
    dropShells: SOLDIER_DROP_SHELLS,
    anims: {
        stand: SOLDIER_ANIM_STAND,
        walk: SOLDIER_ANIM_WALK,
        run: SOLDIER_ANIM_RUN
    },
    snd: {
        sight: SND.soldierSight,
        idle: SND.soldierIdle,
        attack: SND.soldierFire,
        death: SND.soldierDeath,
        pain: SND.soldierPain
    }
};

class Soldier extends Monster {
    fired=false;
    fireAt=0;
    atkEnd=0;
    constructor(prop, origin, yaw) {
        super(SOLDIER_DEF, prop, origin, yaw);
    }
    pain(d) {
        if (d.time < this.painFinished) return;
        this.fired = false;
        this.state = "pain";
        const n = Math.random();
        this.painSound = n < .2 ? this.def.snd.pain[0] : this.def.snd.pain[1];
        if (n < .2) {
            this.painFinished = d.time + SOLDIER_PAIN1_TIME;
            this.painEnd = d.time + SOLDIER_PAIN1_LEN;
            this.play(SOLDIER_ANIM_PAIN, true);
        } else if (n < .6) {
            this.painFinished = d.time + SOLDIER_PAINB_TIME;
            this.painEnd = d.time + SOLDIER_PAINB_LEN;
            this.play(SOLDIER_ANIM_PAINB, true);
        } else {
            this.painFinished = d.time + SOLDIER_PAINB_TIME;
            this.painEnd = d.time + SOLDIER_PAINC_LEN;
            this.play(SOLDIER_ANIM_PAINC, true);
        }
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.fired = false;
        this.play(Math.random() < .5 ? SOLDIER_ANIM_DEATH : SOLDIER_ANIM_DEATHC, true);
    }
    checkAttack(ai, now) {
        if (now < this.attackFinished) return false;
        const r = ai.range(this);
        if (r === "far" || !ai.clearShot(this)) return false;
        const chance = r === "melee" ? .9 : r === "near" ? SOLDIER_ATK_CHANCE_NEAR : SOLDIER_ATK_CHANCE_MID;
        if (Math.random() >= chance) return false;
        this.state = "attack";
        this.fired = false;
        this.fireAt = now + SOLDIER_FIRE_AT;
        this.atkEnd = now + SOLDIER_ATK_LEN;
        this.attackFinished = now + 2 * Math.random();
        this.play(SOLDIER_ANIM_SHOOT, true);
        return true;
    }
    runAttack(ai, now) {
        ai.aiFace(this);
        if (!this.fired && now >= this.fireAt) {
            this.fire(ai, now);
            this.fired = true;
        }
        if (now < this.atkEnd) return;
        if (ai.visible(this) && ai.infront(this) && Math.random() < SOLDIER_REFIRE_CHANCE) {
            this.fired = false;
            this.fireAt = now + SOLDIER_FIRE_AT;
            this.atkEnd = now + SOLDIER_ATK_LEN;
            this.play(SOLDIER_ANIM_SHOOT, true);
        } else {
            this.state = "run";
            this.play(SOLDIER_ANIM_RUN);
        }
    }
    fire(ai, now) {
        ai.emit(this, this.def.snd.attack);
        const {forward, right, up} = angleVectors(0, this.yaw, 0);
        const zsrc = this.origin.z + SOLDIER_HULL_MIN.z + (SOLDIER_HULL_MAX.z - SOLDIER_HULL_MIN.z) * .7;
        const src = this.origin.withZ(zsrc).add(forward.scale(10));
        const lead = ai.tgtOrigin(this).subtract(ai.tgtVel(this).scale(SOLDIER_LEAD_TIME));
        const aim = lead.withZ(ai.tgtEye(this).z).subtract(src).normal;
        const enemyId = ai.tgtId(this);
        let dmgEnemy = 0;
        const collateral = new Map;
        for (let i = 0; i < SOLDIER_SHOTS; i++) {
            const dir = aim.add(right.scale(crand() * SOLDIER_SPREAD)).add(up.scale(crand() * SOLDIER_SPREAD)).normal;
            const endp = src.add(dir.scale(SHOTGUN_RANGE));
            const tr = traceHull(src, V0, V0, endp, [ this.prop ]);
            tr.fraction < 1 ? tr.endpos : endp;
            if (tr.fraction >= 1) continue;
            if (tr.ent === enemyId) {
                dmgEnemy += SOLDIER_FIRE_DAMAGE;
            } else {
                const other = ai.monsterByProp(tr.ent);
                if (other) collateral.set(other, (collateral.get(other) ?? 0) + SOLDIER_FIRE_DAMAGE);
            }
        }
        if (dmgEnemy > 0) ai.damageEnemyOf(this, dmgEnemy, now);
        for (const [victim, d] of collateral) ai.hurtMonster(victim, d, this, now);
    }
}

const DOG_DEF = {
    className: "monster_dog",
    hullMin: DOG_HULL_MIN,
    hullMax: DOG_HULL_MAX,
    viewOfsZ: DOG_VIEW_OFS_Z,
    yawSpeed: DOG_YAW_SPEED,
    modelZOfs: DOG_MODEL_Z_OFS,
    modelYawOfs: DOG_MODEL_YAW_OFS,
    animPrefix: DOG_ANIM_PREFIX,
    health: DOG_HEALTH,
    gibHealth: DOG_GIB_HEALTH,
    runSpeed: DOG_RUN_SPEED,
    walkSpeed: DOG_WALK_SPEED,
    giveUp: DOG_GIVEUP,
    firstAttackDelay: DOG_FIRST_ATTACK_DELAY,
    dropShells: DOG_DROP_SHELLS,
    anims: {
        stand: DOG_ANIM_STAND,
        walk: DOG_ANIM_WALK,
        run: DOG_ANIM_RUN
    },
    snd: {
        sight: SND.dogSight,
        idle: SND.dogIdle,
        attack: SND.dogAttack,
        death: SND.dogDeath,
        pain: [ SND.dogPain ]
    }
};

class Dog extends Monster {
    kind="bite";
    biteAt=0;
    atkEnd=0;
    bitDone=false;
    leapStart=0;
    leapHit=false;
    constructor(prop, origin, yaw) {
        super(DOG_DEF, prop, origin, yaw);
    }
    airborne() {
        return this.state === "attack" && this.kind === "leap";
    }
    pain(d) {
        this.state = "pain";
        this.painEnd = d.time + DOG_PAIN_LEN;
        this.velocity = new Vec3(0, 0, 0);
        this.painSound = this.def.snd.pain[0];
        this.play(DOG_ANIM_PAIN, true);
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < .5 ? DOG_ANIM_DEATH : DOG_ANIM_DEATHB, true);
    }
    checkAttack(ai, now) {
        if (!ai.clearShot(this)) return false;
        const r = ai.range(this);
        if (r === "melee") {
            this.startBite(now);
            ai.emit(this, this.def.snd.attack);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (r === "far") return false;
        const chance = r === "near" ? DOG_ATK_CHANCE_NEAR : DOG_ATK_CHANCE_MID;
        if (Math.random() >= chance) return false;
        if (!this.leapSafe()) return false;
        this.startLeap(now);
        ai.emit(this, this.def.snd.attack);
        return true;
    }
    leapSafe() {
        const dt = AI_THINK_INTERVAL;
        let pos = this.origin.withZ(this.origin.z + 1);
        let vel = angleVectors(0, this.yaw, 0).forward.scale(DOG_LEAP_FWD).withZ(DOG_LEAP_UP);
        for (let i = 0; i < DOG_LEAP_SIM_STEPS; i++) {
            vel = vel.withZ(vel.z - SV_GRAVITY * dt);
            const tr = traceHull(pos, this.def.hullMin, this.def.hullMax, pos.add(vel.scale(dt)), [ this.prop ]);
            pos = new Vec3(tr.endpos);
            if (tr.fraction < 1 && tr.normal.z > .7) return true;
            if (vel.z <= 0 && pos.z <= this.origin.z + MONSTER_STEPSIZE) {
                const down = traceHull(pos, this.def.hullMin, this.def.hullMax, pos.withZ(pos.z - DOG_LEAP_PROBE_DOWN), [ this.prop ]);
                return down.fraction < 1;
            }
        }
        return true;
    }
    runAttack(ai, now) {
        if (this.kind === "bite") this.runBite(ai, now); else this.runLeap(ai, now);
    }
    startBite(now) {
        this.kind = "bite";
        this.state = "attack";
        this.biteAt = now + DOG_BITE_AT;
        this.atkEnd = now + DOG_BITE_LEN;
        this.bitDone = false;
        this.play(DOG_ANIM_ATTACK, true);
    }
    runBite(ai, now) {
        ai.moveToGoal(this, DOG_CHARGE_SPEED * AI_THINK_INTERVAL);
        ai.aiFace(this);
        if (!this.bitDone && now >= this.biteAt) {
            this.bitDone = true;
            const dist = this.eye().distance(ai.tgtEye(this));
            if (dist <= DOG_BITE_RANGE && ai.clearShot(this)) {
                const ldmg = (Math.random() + Math.random() + Math.random()) * 8;
                ai.damageEnemyOf(this, ldmg, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(DOG_ANIM_RUN, true);
        }
    }
    startLeap(now) {
        this.kind = "leap";
        this.state = "attack";
        this.leapStart = now;
        this.leapHit = false;
        const fwd = angleVectors(0, this.yaw, 0).forward;
        this.velocity = fwd.scale(DOG_LEAP_FWD).withZ(DOG_LEAP_UP);
        this.origin = this.origin.withZ(this.origin.z + 1);
        this.play(DOG_ANIM_LEAP, true);
    }
    runLeap(ai, now) {
        ai.aiFace(this);
        const dt = AI_THINK_INTERVAL;
        this.velocity = this.velocity.withZ(this.velocity.z - SV_GRAVITY * dt);
        const move = this.velocity.scale(dt);
        const tr = traceHull(this.origin, this.def.hullMin, this.def.hullMax, this.origin.add(move), [ this.prop ]);
        if (tr.fraction < 1 && !this.leapHit && this.velocity.length > DOG_LEAP_MIN_SPEED) {
            const ldmg = DOG_LEAP_DMG_MIN + DOG_LEAP_DMG_RND * Math.random();
            if (tr.ent === ai.tgtId(this)) {
                ai.damageEnemyOf(this, ldmg, now);
                this.leapHit = true;
            } else {
                const other = ai.monsterByProp(tr.ent);
                if (other) {
                    ai.hurtMonster(other, ldmg, this, now);
                    this.leapHit = true;
                }
            }
        }
        this.origin = new Vec3(tr.endpos);
        const onFloor = tr.fraction < 1 && tr.normal.z > .7 && this.velocity.z <= 0;
        const landed = onFloor && ai.checkBottomAt(this, this.origin) || now - this.leapStart > DOG_LEAP_MAX_TIME;
        if (landed) {
            this.velocity = new Vec3(0, 0, 0);
            this.state = "run";
            this.attackFinished = now + 2 * Math.random();
            this.play(DOG_ANIM_RUN, true);
            return;
        }
        if (tr.fraction < 1 && tr.normal.z <= .7) {
            this.velocity = this.velocity.withX(0).withY(0);
        }
        this.play(DOG_ANIM_LEAP);
    }
}

const OGRE_DEF = {
    className: "monster_ogre",
    hullMin: OGRE_HULL_MIN,
    hullMax: OGRE_HULL_MAX,
    viewOfsZ: OGRE_VIEW_OFS_Z,
    yawSpeed: OGRE_YAW_SPEED,
    modelZOfs: OGRE_MODEL_Z_OFS,
    modelYawOfs: OGRE_MODEL_YAW_OFS,
    animPrefix: OGRE_ANIM_PREFIX,
    health: OGRE_HEALTH,
    gibHealth: OGRE_GIB_HEALTH,
    runSpeed: OGRE_RUN_SPEED,
    walkSpeed: OGRE_WALK_SPEED,
    giveUp: OGRE_GIVEUP,
    firstAttackDelay: OGRE_FIRST_ATTACK_DELAY,
    dropShells: OGRE_DROP_SHELLS,
    anims: {
        stand: OGRE_ANIM_STAND,
        walk: OGRE_ANIM_WALK,
        run: OGRE_ANIM_RUN
    },
    snd: {
        sight: SND.ogreSight,
        idle: SND.ogreIdle,
        attack: SND.ogreSaw,
        death: SND.ogreDeath,
        pain: SND.ogrePain
    }
};

function tri$2() {
    return Math.random() + Math.random() + Math.random();
}

class Ogre extends Monster {
    kind="smash";
    atkEnd=0;
    hitFrom=0;
    hitTo=0;
    fired=false;
    fireAt=0;
    constructor(prop, origin, yaw) {
        super(OGRE_DEF, prop, origin, yaw);
    }
    pain(d) {
        if (d.time < this.painFinished) return;
        this.state = "pain";
        this.painSound = this.def.snd.pain[0];
        const r = Math.random();
        if (r < .25) {
            this.painEnd = d.time + OGRE_PAIN_A_LEN;
            this.painFinished = d.time + OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(OGRE_ANIM_PAIN, true);
        } else if (r < .5) {
            this.painEnd = d.time + OGRE_PAIN_B_LEN;
            this.painFinished = d.time + OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(OGRE_ANIM_PAINB, true);
        } else if (r < .75) {
            this.painEnd = d.time + OGRE_PAIN_C_LEN;
            this.painFinished = d.time + OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(OGRE_ANIM_PAINC, true);
        } else if (r < .88) {
            this.painEnd = d.time + OGRE_PAIN_D_LEN;
            this.painFinished = d.time + OGRE_PAIN_DEBOUNCE_LONG;
            this.play(OGRE_ANIM_PAIND, true);
        } else {
            this.painEnd = d.time + OGRE_PAIN_E_LEN;
            this.painFinished = d.time + OGRE_PAIN_DEBOUNCE_LONG;
            this.play(OGRE_ANIM_PAINE, true);
        }
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < .5 ? OGRE_ANIM_DEATH : OGRE_ANIM_BDEATH, true);
    }
    checkAttack(ai, now) {
        const r = ai.range(this);
        if (r === "melee" && ai.clearShot(this)) {
            this.startMelee(ai, now);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (!ai.visible(this) || !ai.clearShot(this)) return false;
        if (r === "far") return false;
        this.kind = "shoot";
        this.state = "attack";
        this.fired = false;
        this.fireAt = now + OGRE_SHOOT_AT;
        this.atkEnd = now + OGRE_SHOOT_LEN;
        this.attackFinished = now + 1 + 2 * Math.random();
        this.play(OGRE_ANIM_SHOOT, true);
        return true;
    }
    startMelee(ai, now) {
        this.state = "attack";
        ai.emit(this, this.def.snd.attack);
        if (Math.random() > .5) {
            this.kind = "smash";
            this.atkEnd = now + OGRE_SMASH_LEN;
            this.hitFrom = now + OGRE_SMASH_HIT_FROM;
            this.hitTo = now + OGRE_SMASH_HIT_TO;
            this.play(OGRE_ANIM_SMASH, true);
        } else {
            this.kind = "swing";
            this.atkEnd = now + OGRE_SWING_LEN;
            this.hitFrom = now + OGRE_SWING_HIT_FROM;
            this.hitTo = now + OGRE_SWING_HIT_TO;
            this.play(OGRE_ANIM_SWING, true);
        }
    }
    runAttack(ai, now) {
        if (this.kind === "shoot") {
            ai.aiFace(this);
            if (!this.fired && now >= this.fireAt) {
                this.fired = true;
                ai.emit(this, SND.grenadeFireEnemy);
                ai.lobGrenade(this, OGRE_GRENADE_SPEED, OGRE_GRENADE_UP, now);
            }
            if (now >= this.atkEnd) {
                this.state = "run";
                this.play(this.def.anims.run, true);
            }
            return;
        }
        ai.moveToGoal(this, OGRE_CHARGE_SPEED * AI_THINK_INTERVAL);
        ai.aiFace(this);
        if (now >= this.hitFrom && now <= this.hitTo) {
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= OGRE_MELEE_RANGE && ai.clearShot(this)) {
                ai.damageEnemyOf(this, tri$2() * OGRE_MELEE_DMG, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.attackFinished = now + 2 * Math.random();
            this.play(this.def.anims.run, true);
        }
    }
}

const KNIGHT_DEF = {
    className: "monster_knight",
    hullMin: KNIGHT_HULL_MIN,
    hullMax: KNIGHT_HULL_MAX,
    viewOfsZ: KNIGHT_VIEW_OFS_Z,
    yawSpeed: KNIGHT_YAW_SPEED,
    modelZOfs: KNIGHT_MODEL_Z_OFS,
    modelYawOfs: KNIGHT_MODEL_YAW_OFS,
    animPrefix: KNIGHT_ANIM_PREFIX,
    health: KNIGHT_HEALTH,
    gibHealth: KNIGHT_GIB_HEALTH,
    runSpeed: KNIGHT_RUN_SPEED,
    walkSpeed: KNIGHT_WALK_SPEED,
    giveUp: KNIGHT_GIVEUP,
    firstAttackDelay: KNIGHT_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: KNIGHT_ANIM_STAND,
        walk: KNIGHT_ANIM_WALK,
        run: KNIGHT_ANIM_RUN
    },
    snd: {
        sight: SND.knightSight,
        idle: SND.knightIdle,
        attack: SND.knightSword[0],
        death: SND.knightDeath,
        pain: SND.knightPain
    }
};

const tri$1 = () => Math.random() + Math.random() + Math.random();

class Knight extends Monster {
    lunge=false;
    atkEnd=0;
    hitFrom=0;
    hitTo=0;
    constructor(prop, origin, yaw) {
        super(KNIGHT_DEF, prop, origin, yaw);
    }
    pain(d) {
        if (d.time < this.painFinished) return;
        this.state = "pain";
        this.painFinished = d.time + KNIGHT_PAIN_DEBOUNCE;
        this.painSound = this.def.snd.pain[0];
        if (Math.random() < .85) {
            this.painEnd = d.time + KNIGHT_PAIN_A_LEN;
            this.play(KNIGHT_ANIM_PAIN, true);
        } else {
            this.painEnd = d.time + KNIGHT_PAIN_B_LEN;
            this.play(KNIGHT_ANIM_PAINB, true);
        }
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < .5 ? KNIGHT_ANIM_DEATH : KNIGHT_ANIM_DEATHB, true);
    }
    checkAttack(ai, now) {
        if (ai.range(this) !== "melee" || !ai.clearShot(this)) return false;
        this.state = "attack";
        ai.emit(this, pick(SND.knightSword));
        if (this.eye().distance(ai.tgtEye(this)) < KNIGHT_STANDATK_DIST) {
            this.lunge = false;
            this.atkEnd = now + KNIGHT_ATK_LEN;
            this.hitFrom = now + KNIGHT_ATK_HIT_FROM;
            this.hitTo = now + KNIGHT_ATK_HIT_TO;
            this.play(KNIGHT_ANIM_ATK, true);
        } else {
            this.lunge = true;
            this.atkEnd = now + KNIGHT_RUNATK_LEN;
            this.hitFrom = now + KNIGHT_RUNATK_HIT_FROM;
            this.hitTo = now + KNIGHT_RUNATK_HIT_TO;
            this.play(KNIGHT_ANIM_RUNATK, true);
        }
        return true;
    }
    runAttack(ai, now) {
        ai.aiFace(this);
        const speed = this.lunge ? KNIGHT_LUNGE_SPEED : KNIGHT_CHARGE_SPEED;
        ai.moveToGoal(this, speed * AI_THINK_INTERVAL);
        if (now >= this.hitFrom && now <= this.hitTo) {
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= KNIGHT_MELEE_RANGE && ai.clearShot(this)) {
                ai.damageEnemyOf(this, tri$1() * KNIGHT_MELEE_DMG, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
}

const DEMON_DEF = {
    className: "monster_demon1",
    hullMin: DEMON_HULL_MIN,
    hullMax: DEMON_HULL_MAX,
    viewOfsZ: DEMON_VIEW_OFS_Z,
    yawSpeed: DEMON_YAW_SPEED,
    modelZOfs: DEMON_MODEL_Z_OFS,
    modelYawOfs: DEMON_MODEL_YAW_OFS,
    animPrefix: DEMON_ANIM_PREFIX,
    health: DEMON_HEALTH,
    gibHealth: DEMON_GIB_HEALTH,
    runSpeed: DEMON_RUN_SPEED,
    walkSpeed: DEMON_WALK_SPEED,
    giveUp: DEMON_GIVEUP,
    firstAttackDelay: DEMON_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: DEMON_ANIM_STAND,
        walk: DEMON_ANIM_WALK,
        run: DEMON_ANIM_RUN
    },
    snd: {
        sight: SND.demonSight,
        idle: SND.demonIdle,
        attack: SND.demonHit,
        death: SND.demonDeath,
        pain: SND.demonPain
    }
};

class Demon extends Monster {
    kind="melee";
    atkEnd=0;
    hit1=false;
    hit2=false;
    leapStart=0;
    leapHit=false;
    leapCount=0;
    constructor(prop, origin, yaw) {
        super(DEMON_DEF, prop, origin, yaw);
    }
    airborne() {
        return this.state === "attack" && this.kind === "leap";
    }
    pain(d) {
        if (this.airborne()) return;
        if (d.time < this.painFinished) return;
        this.painFinished = d.time + DEMON_PAIN_DEBOUNCE;
        if (Math.random() * DEMON_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.painEnd = d.time + DEMON_PAIN_LEN;
        this.painSound = this.def.snd.pain[0];
        this.play(DEMON_ANIM_PAIN, true);
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.play(DEMON_ANIM_DEATH, true);
    }
    checkAttack(ai, now) {
        if (ai.range(this) === "melee" && ai.clearShot(this)) {
            this.kind = "melee";
            this.state = "attack";
            this.atkEnd = now + DEMON_ATTACK_LEN;
            this.hit1 = this.hit2 = false;
            this.play(DEMON_ANIM_ATTACK, true);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (!ai.visible(this) || !ai.clearShot(this)) return false;
        const t = ai.tgtOrigin(this);
        const dz = t.z - this.origin.z;
        if (dz > 48 || dz < -80) return false;
        const d2 = Math.hypot(t.x - this.origin.x, t.y - this.origin.y);
        if (d2 < DEMON_LEAP_MIN_DIST) return false;
        if (d2 > DEMON_LEAP_FAR_DIST && Math.random() < DEMON_LEAP_FAR_SKIP) return false;
        if (!this.leapSafe()) return false;
        ai.aiFace(this);
        this.leapCount = 0;
        this.startLeap(now);
        ai.emit(this, SND.demonJump);
        this.attackFinished = now + 1 + Math.random();
        return true;
    }
    runAttack(ai, now) {
        if (this.kind === "melee") this.runMelee(ai, now); else this.runLeap(ai, now);
    }
    runMelee(ai, now) {
        ai.moveToGoal(this, DEMON_CHARGE_SPEED * AI_THINK_INTERVAL);
        ai.aiFace(this);
        const within = now - (this.atkEnd - DEMON_ATTACK_LEN);
        if (!this.hit1 && within >= DEMON_MELEE_HIT_1) {
            this.hit1 = true;
            this.claw(ai, now);
        }
        if (!this.hit2 && within >= DEMON_MELEE_HIT_2) {
            this.hit2 = true;
            this.claw(ai, now);
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
    claw(ai, now) {
        const dist = this.origin.distance(ai.tgtOrigin(this));
        if (dist > DEMON_MELEE_RANGE || !ai.clearShot(this)) return;
        ai.emit(this, SND.demonHit);
        ai.damageEnemyOf(this, DEMON_MELEE_DMG_MIN + DEMON_MELEE_DMG_RND * Math.random(), now);
    }
    startLeap(now) {
        this.kind = "leap";
        this.state = "attack";
        this.leapStart = now;
        this.leapHit = false;
        this.velocity = angleVectors(0, this.yaw, 0).forward.scale(DEMON_LEAP_FWD).withZ(DEMON_LEAP_UP);
        this.origin = this.origin.withZ(this.origin.z + 1);
        this.play(DEMON_ANIM_LEAP, true);
    }
    leapSafe() {
        const dt = AI_THINK_INTERVAL;
        let pos = this.origin.withZ(this.origin.z + 1);
        let vel = angleVectors(0, this.yaw, 0).forward.scale(DEMON_LEAP_FWD).withZ(DEMON_LEAP_UP);
        for (let i = 0; i < DEMON_LEAP_SIM_STEPS; i++) {
            vel = vel.withZ(vel.z - SV_GRAVITY * dt);
            const tr = traceHull(pos, this.def.hullMin, this.def.hullMax, pos.add(vel.scale(dt)), [ this.prop ]);
            pos = new Vec3(tr.endpos);
            if (tr.fraction < 1 && tr.normal.z > .7) return true;
            if (vel.z <= 0 && pos.z <= this.origin.z + MONSTER_STEPSIZE) {
                const down = traceHull(pos, this.def.hullMin, this.def.hullMax, pos.withZ(pos.z - DEMON_LEAP_PROBE_DOWN), [ this.prop ]);
                return down.fraction < 1;
            }
        }
        return true;
    }
    runLeap(ai, now) {
        ai.aiFace(this);
        const dt = AI_THINK_INTERVAL;
        this.velocity = this.velocity.withZ(this.velocity.z - SV_GRAVITY * dt);
        const tr = traceHull(this.origin, this.def.hullMin, this.def.hullMax, this.origin.add(this.velocity.scale(dt)), [ this.prop ]);
        if (tr.fraction < 1 && !this.leapHit && this.velocity.length > DEMON_LEAP_MIN_SPEED) {
            const ldmg = DEMON_LEAP_DMG_MIN + DEMON_LEAP_DMG_RND * Math.random();
            if (tr.ent === ai.tgtId(this)) {
                ai.damageEnemyOf(this, ldmg, now);
                this.leapHit = true;
            } else {
                const other = ai.monsterByProp(tr.ent);
                if (other) {
                    ai.hurtMonster(other, ldmg, this, now);
                    this.leapHit = true;
                }
            }
        }
        this.origin = new Vec3(tr.endpos);
        const onFloor = tr.fraction < 1 && tr.normal.z > .7 && this.velocity.z <= 0;
        if (onFloor) {
            if (ai.checkBottomAt(this, this.origin) || this.leapCount >= 3) {
                this.velocity = new Vec3(0, 0, 0);
                this.state = "run";
                this.attackFinished = now + 2 * Math.random();
                this.play(this.def.anims.run, true);
            } else {
                this.leapCount++;
                this.startLeap(now);
            }
            return;
        }
        if (now - this.leapStart > DEMON_LEAP_MAX_TIME) {
            this.velocity = new Vec3(0, 0, 0);
            this.state = "run";
            this.play(this.def.anims.run, true);
            return;
        }
        if (tr.fraction < 1 && tr.normal.z <= .7) {
            this.velocity = clipVelocity(this.velocity, tr.normal, 1).out;
        }
        this.play(DEMON_ANIM_LEAP);
    }
}

const ZOMBIE_DEF = {
    className: "monster_zombie",
    hullMin: ZOMBIE_HULL_MIN,
    hullMax: ZOMBIE_HULL_MAX,
    viewOfsZ: ZOMBIE_VIEW_OFS_Z,
    yawSpeed: ZOMBIE_YAW_SPEED,
    modelZOfs: ZOMBIE_MODEL_Z_OFS,
    modelYawOfs: ZOMBIE_MODEL_YAW_OFS,
    animPrefix: ZOMBIE_ANIM_PREFIX,
    health: ZOMBIE_HEALTH,
    gibHealth: ZOMBIE_GIB_HEALTH,
    runSpeed: ZOMBIE_RUN_SPEED,
    walkSpeed: ZOMBIE_WALK_SPEED,
    giveUp: ZOMBIE_GIVEUP,
    firstAttackDelay: ZOMBIE_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: ZOMBIE_ANIM_STAND,
        walk: ZOMBIE_ANIM_WALK,
        run: ZOMBIE_ANIM_RUN
    },
    snd: {
        sight: SND.zombieSight,
        idle: SND.zombieIdle,
        attack: SND.zombieShot,
        death: SND.zombieDeath,
        pain: SND.zombiePain
    }
};

const ATT_ANIMS = [ ZOMBIE_ANIM_ATTA, ZOMBIE_ANIM_ATTB, ZOMBIE_ANIM_ATTC ];

const FAST_PAIN = [ [ ZOMBIE_ANIM_PAINA, ZOMBIE_PAIN_A_LEN ], [ ZOMBIE_ANIM_PAINB, ZOMBIE_PAIN_B_LEN ], [ ZOMBIE_ANIM_PAINC, ZOMBIE_PAIN_C_LEN ], [ ZOMBIE_ANIM_PAIND, ZOMBIE_PAIN_D_LEN ] ];

class Zombie extends Monster {
    inpain=0;
    atkEnd=0;
    releaseAt=0;
    fired=false;
    downUntil=0;
    gettingUp=false;
    justWoke=false;
    constructor(prop, origin, yaw) {
        super(ZOMBIE_DEF, prop, origin, yaw);
    }
    pain(d) {
        this.health = ZOMBIE_HEALTH;
        if (d.damage < ZOMBIE_PAIN_IGNORE) return;
        if (this.inpain === 2) return;
        if (d.damage >= ZOMBIE_PAIN_KNOCKDOWN) {
            this.knockdown(d);
            return;
        }
        if (this.inpain === 1) {
            this.painFinished = d.time + ZOMBIE_PAIN_COMBO_WINDOW;
            return;
        }
        if (this.painFinished > d.time) {
            this.knockdown(d);
            return;
        }
        this.inpain = 1;
        this.state = "pain";
        this.fired = false;
        const [anim, len] = pick(FAST_PAIN);
        this.painEnd = d.time + len;
        this.painSound = pick(this.def.snd.pain);
        this.play(anim, true);
    }
    knockdown(d) {
        this.inpain = 2;
        this.state = "pain";
        this.fired = false;
        this.gettingUp = false;
        this.downUntil = d.time + ZOMBIE_PAIN_DOWN_HOLD;
        this.painEnd = this.downUntil + ZOMBIE_PAIN_UP_LEN;
        this.painSound = SND.zombieFall;
        this.play(ZOMBIE_ANIM_PAINEDOWN, true);
        this.hullOverride = {
            min: ZOMBIE_HULL_MIN,
            max: ZOMBIE_DOWN_HULL_MAX
        };
    }
    onPainTick(now) {
        if (this.inpain === 2 && !this.gettingUp && now >= this.downUntil) {
            this.gettingUp = true;
            this.play(ZOMBIE_ANIM_PAINEUP, true);
            this.hullOverride = undefined;
            this.justWoke = true;
        }
    }
    consumeWokeUp() {
        if (!this.justWoke) return false;
        this.justWoke = false;
        return true;
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
    }
    checkAttack(ai, now) {
        if (this.inpain) this.inpain = 0;
        if (now < this.attackFinished) return false;
        const r = ai.range(this);
        if (r === "far" || !ai.clearShot(this)) return false;
        const chance = r === "mid" ? ZOMBIE_ATK_CHANCE_MID : ZOMBIE_ATK_CHANCE_NEAR;
        if (Math.random() >= chance) return false;
        this.state = "attack";
        this.fired = false;
        this.atkEnd = now + ZOMBIE_ATK_LEN;
        this.releaseAt = now + ZOMBIE_ATK_RELEASE;
        this.attackFinished = now + 2 * Math.random();
        this.play(pick(ATT_ANIMS), true);
        return true;
    }
    runAttack(ai, now) {
        ai.aiFace(this);
        if (!this.fired && now >= this.releaseAt) {
            this.fired = true;
            ai.emit(this, SND.zombieShot);
            ai.lobZombieGib(this, ZOMBIE_GIB_SPEED, ZOMBIE_GIB_UP, now);
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
}

const WIZARD_DEF = {
    className: "monster_wizard",
    hullMin: WIZARD_HULL_MIN,
    hullMax: WIZARD_HULL_MAX,
    viewOfsZ: WIZARD_VIEW_OFS_Z,
    yawSpeed: WIZARD_YAW_SPEED,
    modelZOfs: WIZARD_MODEL_Z_OFS,
    modelYawOfs: WIZARD_MODEL_YAW_OFS,
    animPrefix: WIZARD_ANIM_PREFIX,
    health: WIZARD_HEALTH,
    gibHealth: WIZARD_GIB_HEALTH,
    runSpeed: WIZARD_RUN_SPEED,
    walkSpeed: WIZARD_WALK_SPEED,
    giveUp: WIZARD_GIVEUP,
    firstAttackDelay: WIZARD_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: WIZARD_ANIM_STAND,
        walk: WIZARD_ANIM_WALK,
        run: WIZARD_ANIM_RUN
    },
    snd: {
        sight: SND.wizardSight,
        idle: SND.wizardIdle,
        attack: SND.wizardAttack,
        death: SND.wizardDeath,
        pain: SND.wizardPain
    }
};

class Wizard extends Monster {
    atkEnd=0;
    shotAAt=0;
    shotBAt=0;
    firedA=false;
    firedB=false;
    muzzleFwd=new Vec3(1, 0, 0);
    muzzleRight=new Vec3(0, 1, 0);
    constructor(prop, origin, yaw) {
        super(WIZARD_DEF, prop, origin, yaw);
        this.flying = true;
    }
    airborne() {
        return true;
    }
    pain(d) {
        this.painSound = this.def.snd.pain[0];
        if (Math.random() * WIZARD_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.firedA = this.firedB = false;
        this.painEnd = d.time + WIZARD_PAIN_LEN;
        this.play(WIZARD_ANIM_PAIN, true);
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.velocity = new Vec3(crand() * WIZARD_DEATH_TUMBLE_XY, crand() * WIZARD_DEATH_TUMBLE_XY, WIZARD_DEATH_TUMBLE_UP + Math.random() * WIZARD_DEATH_TUMBLE_UP);
        this.play(WIZARD_ANIM_DEATH, true);
    }
    checkAttack(ai, now) {
        if (now < this.attackFinished || !ai.visible(this)) return false;
        if (ai.range(this) === "far" || !ai.clearShot(this)) {
            this.slide = false;
            return false;
        }
        const r = ai.range(this);
        const chance = r === "melee" ? WIZARD_CHANCE_MELEE : r === "near" ? WIZARD_CHANCE_NEAR : WIZARD_CHANCE_MID;
        if (Math.random() < chance) {
            this.startCast(ai, now);
            return true;
        }
        this.slide = r !== "mid";
        return false;
    }
    startCast(ai, now) {
        this.state = "attack";
        this.atkEnd = now + WIZARD_ATK_LEN;
        this.shotAAt = now + WIZARD_SHOT_A;
        this.shotBAt = now + WIZARD_SHOT_B;
        this.firedA = this.firedB = false;
        const v = angleVectors(0, this.yaw, 0);
        this.muzzleFwd = v.forward;
        this.muzzleRight = v.right;
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(WIZARD_ANIM_ATTACK, true);
    }
    runAttack(ai, now) {
        ai.aiFace(this);
        if (!this.firedA && now >= this.shotAAt) {
            this.firedA = true;
            this.spit(ai, 1, now);
        }
        if (!this.firedB && now >= this.shotBAt) {
            this.firedB = true;
            this.spit(ai, -1, now);
        }
        if (now < this.atkEnd) return;
        this.attackFinished = now + WIZARD_ATK_FINISH;
        this.slide = !(ai.range(this) === "far" || !ai.visible(this)) && ai.range(this) !== "mid";
        this.state = "run";
        this.play(this.def.anims.run, true);
    }
    spit(ai, side, now) {
        const muzzle = this.origin.withZ(this.origin.z + 30).add(this.muzzleFwd.scale(WIZARD_SHOT_SIDE)).add(this.muzzleRight.scale(side * WIZARD_SHOT_SIDE));
        const aimAt = ai.tgtEye(this).add(this.muzzleRight.scale(side * WIZARD_SHOT_LEAD));
        ai.fireSpike(this, muzzle, aimAt, now);
    }
}

const SHAMBLER_DEF = {
    className: "monster_shambler",
    hullMin: SHAMBLER_HULL_MIN,
    hullMax: SHAMBLER_HULL_MAX,
    viewOfsZ: SHAMBLER_VIEW_OFS_Z,
    yawSpeed: SHAMBLER_YAW_SPEED,
    modelZOfs: SHAMBLER_MODEL_Z_OFS,
    modelYawOfs: SHAMBLER_MODEL_YAW_OFS,
    animPrefix: SHAMBLER_ANIM_PREFIX,
    health: SHAMBLER_HEALTH,
    gibHealth: SHAMBLER_GIB_HEALTH,
    runSpeed: SHAMBLER_RUN_SPEED,
    walkSpeed: SHAMBLER_WALK_SPEED,
    giveUp: SHAMBLER_GIVEUP,
    firstAttackDelay: SHAMBLER_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: SHAMBLER_ANIM_STAND,
        walk: SHAMBLER_ANIM_WALK,
        run: SHAMBLER_ANIM_RUN
    },
    snd: {
        sight: SND.shamblerSight,
        idle: SND.shamblerIdle,
        attack: SND.shamblerAttack,
        death: SND.shamblerDeath,
        pain: SND.shamblerPain
    }
};

function tri() {
    return Math.random() + Math.random() + Math.random();
}

class Shambler extends Monster {
    kind="smash";
    atkEnd=0;
    hitAt=0;
    hitDone=false;
    boltAt=[];
    firedBolts=0;
    constructor(prop, origin, yaw) {
        super(SHAMBLER_DEF, prop, origin, yaw);
    }
    pain(d) {
        this.painSound = this.def.snd.pain[0];
        if (d.time < this.painFinished) return;
        if (Math.random() * SHAMBLER_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.painEnd = d.time + SHAMBLER_PAIN_LEN;
        this.painFinished = d.time + SHAMBLER_PAIN_DEBOUNCE;
        this.play(SHAMBLER_ANIM_PAIN, true);
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + CORPSE_SETTLE_TIMEOUT;
        this.play(SHAMBLER_ANIM_DEATH, true);
    }
    checkAttack(ai, now) {
        const r = ai.range(this);
        if (r === "melee" && ai.clearShot(this)) {
            this.startMelee(ai, now);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (!ai.visible(this) || !ai.clearShot(this) || r === "far") return false;
        const chance = r === "near" ? SHAMBLER_CHANCE_NEAR : SHAMBLER_CHANCE_MID;
        if (Math.random() < chance) {
            this.startMagic(ai, now);
            this.attackFinished = now + 2 * Math.random();
            return true;
        }
        return false;
    }
    startMelee(ai, now) {
        const c = Math.random();
        if (c > .6 || this.health === this.def.health) this.enterSmash(ai, now); else if (c > .3) this.enterSwing(ai, "swingr", now); else this.enterSwing(ai, "swingl", now);
    }
    enterSmash(ai, now) {
        this.kind = "smash";
        this.state = "attack";
        this.hitDone = false;
        this.atkEnd = now + SHAMBLER_SMASH_LEN;
        this.hitAt = now + SHAMBLER_SMASH_HIT_AT;
        ai.emit(this, SND.shamblerMelee1);
        this.play(SHAMBLER_ANIM_SMASH, true);
    }
    enterSwing(ai, side, now) {
        this.kind = side;
        this.state = "attack";
        this.hitDone = false;
        this.atkEnd = now + SHAMBLER_SWING_LEN;
        this.hitAt = now + SHAMBLER_SWING_HIT_AT;
        ai.emit(this, side === "swingr" ? SND.shamblerMelee1 : SND.shamblerMelee2);
        this.play(side === "swingr" ? SHAMBLER_ANIM_SWINGR : SHAMBLER_ANIM_SWINGL, true);
    }
    startMagic(ai, now) {
        this.kind = "magic";
        this.state = "attack";
        this.firedBolts = 0;
        this.atkEnd = now + SHAMBLER_MAGIC_LEN;
        this.boltAt = SHAMBLER_MAGIC_BOLT_AT.map(t => now + t);
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(SHAMBLER_ANIM_MAGIC, true);
    }
    runAttack(ai, now) {
        if (this.kind === "magic") {
            ai.aiFace(this);
            while (this.firedBolts < this.boltAt.length && now >= this.boltAt[this.firedBolts]) {
                this.firedBolts++;
                this.castLightning(ai, now);
            }
            if (now >= this.atkEnd) {
                this.state = "run";
                this.play(this.def.anims.run, true);
            }
            return;
        }
        ai.moveToGoal(this, SHAMBLER_CHARGE_SPEED * AI_THINK_INTERVAL);
        ai.aiFace(this);
        if (!this.hitDone && now >= this.hitAt) {
            this.hitDone = true;
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= SHAMBLER_MELEE_RANGE && ai.clearShot(this)) {
                const dmg = tri() * (this.kind === "smash" ? SHAMBLER_SMASH_DMG : SHAMBLER_CLAW_DMG);
                ai.damageEnemyOf(this, dmg, now);
                ai.emit(this, SND.shamblerSmack);
            }
        }
        if (now >= this.atkEnd) {
            if (this.kind !== "smash" && Math.random() < .5) {
                this.enterSwing(ai, this.kind === "swingr" ? "swingl" : "swingr", now);
                return;
            }
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
    castLightning(ai, now) {
        const from = this.origin.withZ(this.origin.z + 40);
        const to = ai.tgtEye(this);
        ai.emit(this, SND.shamblerBoom);
        ai.beamFx(from, to, now);
        if (ai.clearShot(this)) ai.damageEnemyOf(this, SHAMBLER_LIGHTNING_DMG, now);
    }
}

const BOSS_DEF = {
    className: "monster_boss",
    hullMin: BOSS_HULL_MIN,
    hullMax: BOSS_HULL_MAX,
    viewOfsZ: BOSS_VIEW_OFS_Z,
    yawSpeed: BOSS_YAW_SPEED,
    modelZOfs: BOSS_MODEL_Z_OFS,
    modelYawOfs: BOSS_MODEL_YAW_OFS,
    animPrefix: BOSS_ANIM_PREFIX,
    health: BOSS_HEALTH,
    gibHealth: BOSS_GIB_HEALTH,
    runSpeed: 0,
    walkSpeed: 0,
    giveUp: BOSS_GIVEUP,
    firstAttackDelay: BOSS_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: {
        stand: BOSS_ANIM_IDLE,
        walk: BOSS_ANIM_IDLE,
        run: BOSS_ANIM_IDLE
    },
    snd: {
        sight: SND.bossSight,
        idle: SND.bossRise,
        attack: SND.bossThrow,
        death: SND.bossDeath,
        pain: SND.bossPain
    }
};

class Boss extends Monster {
    dormant=true;
    phase="rise";
    phaseUntil=0;
    throwAt=0;
    fired=false;
    deathAt=0;
    maxHealth=BOSS_HEALTH;
    constructor(prop, origin, yaw) {
        super(BOSS_DEF, prop, origin, yaw);
        this.flying = true;
        this.ambush = true;
        this.takeDamage = false;
    }
    airborne() {
        return true;
    }
    wake(now) {
        if (!this.dormant) return;
        this.dormant = false;
        this.takeDamage = true;
        this.phase = "rise";
        this.phaseUntil = now + BOSS_RISE_LEN;
        this.aware = true;
        this.state = "run";
        this.searchTime = now + this.def.giveUp;
        this.attackFinished = now + BOSS_RISE_LEN + this.def.firstAttackDelay;
        this.play(BOSS_ANIM_RISE, true);
    }
    pain(d) {
        this.painSound = this.def.snd.pain[0];
        if (this.dormant || this.state === "dead" || this.phase === "rise") return;
        if (d.damage < BOSS_PAIN_MIN_DAMAGE) return;
        this.state = "pain";
        this.phase = "idle";
        this.painEnd = d.time + BOSS_SHOCK_LEN;
        this.play(pick(BOSS_ANIM_SHOCK), true);
    }
    die(d) {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = true;
        this.deathAt = d.time + BOSS_DEATH_LEN;
        this.play(BOSS_ANIM_DEATH, true);
    }
    checkAttack(ai, now) {
        if (this.dormant) return true;
        if (this.phase === "rise") {
            if (now < this.phaseUntil) return true;
            this.phase = "idle";
            ai.emit(this, this.def.snd.sight);
            this.play(this.def.anims.run, true);
            return false;
        }
        if (now < this.attackFinished || !ai.visible(this)) return false;
        this.state = "attack";
        this.phase = "throw";
        this.phaseUntil = now + BOSS_ATTACK_LEN;
        this.throwAt = now + BOSS_ATTACK_LEN * BOSS_ATTACK_HIT_AT;
        this.fired = false;
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(BOSS_ANIM_ATTACK, true);
        return true;
    }
    runAttack(ai, now) {
        ai.aiFace(this);
        if (!this.fired && now >= this.throwAt) {
            this.fired = true;
            ai.fireBossMissile(this, now);
        }
        if (now < this.phaseUntil) return;
        this.state = "run";
        this.phase = "idle";
        this.attackFinished = now + BOSS_ATTACK_CD;
        this.play(this.def.anims.run, true);
    }
}

const AI_ALIASES = {
    army: "monster_army",
    grunt: "monster_army",
    soldier: "monster_army",
    dog: "monster_dog",
    ogre: "monster_ogre",
    knight: "monster_knight",
    demon: "monster_demon1",
    demon1: "monster_demon1",
    fiend: "monster_demon1",
    zombie: "monster_zombie",
    wizard: "monster_wizard",
    scrag: "monster_wizard",
    shambler: "monster_shambler",
    sham: "monster_shambler"
};

const shortSpecies = className => className.replace(/^monster_/, "");

const PUSH_MOVER_RE = /^func_(door|button|movelinear|plat)/;

const PD = .70710678;

const PUSH_NUDGE_DIRS = [ new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(PD, PD, 0), new Vec3(-PD, PD, 0), new Vec3(PD, -PD, 0), new Vec3(-PD, -PD, 0), new Vec3(0, 0, 1) ];

const PUSH_NUDGE_STEPS = [ 2, 6, 12, 20, 32, 48 ];

const MAKE = {
    monster_army: {
        tmpl: SOLDIER_TEMPLATE_NAME,
        make: (p, o, y) => new Soldier(p, o, y)
    },
    monster_dog: {
        tmpl: DOG_TEMPLATE_NAME,
        make: (p, o, y) => new Dog(p, o, y)
    },
    monster_ogre: {
        tmpl: OGRE_TEMPLATE_NAME,
        make: (p, o, y) => new Ogre(p, o, y)
    },
    monster_knight: {
        tmpl: KNIGHT_TEMPLATE_NAME,
        make: (p, o, y) => new Knight(p, o, y)
    },
    monster_demon1: {
        tmpl: DEMON_TEMPLATE_NAME,
        make: (p, o, y) => new Demon(p, o, y)
    },
    monster_zombie: {
        tmpl: ZOMBIE_TEMPLATE_NAME,
        make: (p, o, y) => new Zombie(p, o, y)
    },
    monster_wizard: {
        tmpl: WIZARD_TEMPLATE_NAME,
        make: (p, o, y) => new Wizard(p, o, y)
    },
    monster_shambler: {
        tmpl: SHAMBLER_TEMPLATE_NAME,
        make: (p, o, y) => new Shambler(p, o, y)
    },
    monster_boss: {
        tmpl: BOSS_TEMPLATE_NAME,
        make: (p, o, y) => new Boss(p, o, y)
    }
};

class Enemies {
    monsters=[];
    playerOrigin=new Vec3(0, 0, 0);
    playerEye=new Vec3(0, 0, 0);
    playerVel=new Vec3(0, 0, 0);
    props=[];
    visIgnore=[];
    now=0;
    player;
    pawn;
    playerAlive=true;
    playerInvisible=false;
    killed=0;
    spawnTag="normal";
    difficulty="normal";
    triggerConns=[];
    aiDisabled=new Set;
    sightEntity;
    sightEntityTime=0;
    playerShowHostile=0;
    sounds;
    particles;
    dropSink;
    gibSink;
    static GIB_HEAD={
        monster_army: "head_soldier",
        monster_dog: "head_dog",
        monster_ogre: "head_ogre",
        monster_knight: "head_knight",
        monster_demon1: "head_demon",
        monster_zombie: "head_zombie",
        monster_wizard: "head_wizard",
        monster_shambler: "head_shambler"
    };
    grenadeSink;
    zombieGibSink;
    spikeSink;
    playerPushSink;
    bossMissileSink;
    bossDeathSink;
    bossSpawned=false;
    setPlayer(player, pawn) {
        this.player = player;
        this.pawn = pawn;
    }
    setPlayerAlive(v) {
        this.playerAlive = v;
    }
    setPlayerInvisible(v) {
        this.playerInvisible = v;
    }
    aiToggle(token, force) {
        const t = token.trim().toLowerCase();
        if (!t) {
            const off = [ ...this.aiDisabled ].map(shortSpecies).sort();
            return off.length ? `AI frozen: ${off.join(", ")}` : "AI running for every species";
        }
        const uniq = a => a.filter((v, i) => a.indexOf(v) === i);
        const targets = t === "all" ? uniq(Object.keys(AI_ALIASES).map(k => AI_ALIASES[k])) : [ t.startsWith("monster_") ? t : AI_ALIASES[t] ].filter(v => !!v);
        if (targets.length === 0) {
            return `unknown monster "${token}" - try: army dog ogre knight fiend zombie scrag shambler (or all)`;
        }
        const out = [];
        for (const cn of targets) {
            const freeze = force === undefined ? !this.aiDisabled.has(cn) : !force;
            if (freeze) this.aiDisabled.add(cn); else this.aiDisabled.delete(cn);
            out.push(`${shortSpecies(cn)} AI ${freeze ? "OFF" : "ON"}`);
        }
        return out.join(", ");
    }
    setSounds(sounds) {
        this.sounds = sounds;
    }
    setParticles(particles) {
        this.particles = particles;
    }
    hitHook;
    setHitHook(fn) {
        this.hitHook = fn;
    }
    bloodFx(at, from, now) {
        const dir = at.subtract(from);
        this.particles?.burst("blood_impact", at, dir.length > 1 ? dir.normal : undefined, now);
    }
    beamFx(from, to, now) {
        this.particles?.zap("lightning", from, to, now);
    }
    setDropSink(fn) {
        this.dropSink = fn;
    }
    setGibSink(fn) {
        this.gibSink = fn;
    }
    setGrenadeSink(fn) {
        this.grenadeSink = fn;
    }
    setZombieGibSink(fn) {
        this.zombieGibSink = fn;
    }
    setSpikeSink(fn) {
        this.spikeSink = fn;
    }
    setPlayerPushSink(fn) {
        this.playerPushSink = fn;
    }
    setBossMissileSink(fn) {
        this.bossMissileSink = fn;
    }
    setBossDeathSink(fn) {
        this.bossDeathSink = fn;
    }
    boss() {
        const b = this.monsters.find(m => m instanceof Boss);
        return b instanceof Boss && b.state !== "dead" && !b.dormant ? b : undefined;
    }
    fireBossMissile(m, now) {
        const tgt = this.tgtEye(m);
        const flat = new Vec3(tgt.x - m.origin.x, tgt.y - m.origin.y, 0);
        const fl = flat.length;
        const fwd = fl > .001 ? flat.scale(1 / fl) : new Vec3(1, 0, 0);
        const org = m.origin.add(fwd.scale(BOSS_MUZZLE_FWD)).withZ(m.origin.z + BOSS_MUZZLE_UP);
        let d = new Vec3(tgt);
        if (this.spawnTag === "hard") {
            const t = d.subtract(org).length / BOSS_MISSILE_SPEED;
            d = d.add(new Vec3(this.playerVel.x, this.playerVel.y, 0).scale(t));
        }
        this.bossMissileSink?.(org, d.subtract(org).normal, m.prop, now);
    }
    lobGrenade(m, speed, up, now) {
        const from = m.origin.withZ(m.origin.z + 16);
        const t = this.tgtOrigin(m);
        const vel = t.subtract(from).normal.scale(speed).withZ(up);
        this.grenadeSink?.(from, vel, m.prop, now);
    }
    lobZombieGib(m, speed, up, now) {
        const from = m.origin.withZ(m.origin.z + 6);
        const t = this.tgtOrigin(m);
        const vel = t.subtract(from).normal.scale(speed).withZ(up);
        this.zombieGibSink?.(from, vel, m.prop, now);
    }
    fireSpike(m, muzzle, aimAt, now) {
        this.spikeSink?.(muzzle, aimAt.subtract(muzzle).normal, m.prop, now);
    }
    emit(m, event) {
        this.sounds?.play(event, m.sndName);
    }
    afterDamage(m, wasAlive, now, byPlayer = false) {
        if (!wasAlive) return;
        if (m.state === "dead") {
            if (m.dropped) return;
            m.dropped = true;
            this.killed++;
            if (m instanceof Boss) this.bossDeathSink?.(m, now);
            if (byPlayer && m.spawnMarker && m.spawnMarker.IsValid()) {
                Instance.EntFireAtTarget({
                    target: m.spawnMarker,
                    input: m instanceof Boss ? "FireUser2" : "FireUser1"
                });
            }
            if (m.health < m.def.gibHealth && this.gibSink) {
                this.gibSink(m.origin, Enemies.GIB_HEAD[m.def.className] ?? null, now);
                m.settled = true;
                if (m.prop.IsValid()) m.prop.Teleport({
                    position: new Vec3(0, 0, -16384)
                });
            } else {
                this.emit(m, m.def.snd.death);
            }
            if (m.def.dropShells > 0 && this.dropSink) {
                this.dropSink(m.origin, {
                    shells: m.def.dropShells
                }, now);
            }
        } else if (m.state === "pain") {
            this.emit(m, m.painSound);
        }
    }
    killStats() {
        return {
            killed: this.killed,
            total: this.monsters.length
        };
    }
    spawnAll(now, diff = DIFFICULTY_DEFAULT) {
        this.despawnAll();
        this.killed = 0;
        this.sightEntity = undefined;
        this.sightEntityTime = 0;
        this.spawnTag = spawnTagOf(diff);
        this.difficulty = diff;
        const routes = loadNodeRoutes();
        this.spawnSpecies(SOLDIER_TEMPLATE_NAME, "Grunt", routes, SOLDIER_SPAWN_NAME, SOLDIER_SPAWN_ROAM_NAME, now, (p, o, y) => new Soldier(p, o, y));
        this.spawnSpecies(DOG_TEMPLATE_NAME, "Dog", routes, DOG_SPAWN_NAME, DOG_SPAWN_ROAM_NAME, now, (p, o, y) => new Dog(p, o, y));
        this.spawnSpecies(OGRE_TEMPLATE_NAME, "Ogre", routes, OGRE_SPAWN_NAME, OGRE_SPAWN_ROAM_NAME, now, (p, o, y) => new Ogre(p, o, y));
        this.spawnSpecies(KNIGHT_TEMPLATE_NAME, "Knight", routes, KNIGHT_SPAWN_NAME, KNIGHT_SPAWN_ROAM_NAME, now, (p, o, y) => new Knight(p, o, y));
        this.spawnSpecies(DEMON_TEMPLATE_NAME, "Fiend", routes, DEMON_SPAWN_NAME, DEMON_SPAWN_ROAM_NAME, now, (p, o, y) => new Demon(p, o, y));
        this.spawnSpecies(ZOMBIE_TEMPLATE_NAME, "Zombie", routes, ZOMBIE_SPAWN_NAME, ZOMBIE_SPAWN_ROAM_NAME, now, (p, o, y) => new Zombie(p, o, y));
        this.spawnSpecies(WIZARD_TEMPLATE_NAME, "Scrag", routes, WIZARD_SPAWN_NAME, WIZARD_SPAWN_ROAM_NAME, now, (p, o, y) => new Wizard(p, o, y));
        this.spawnSpecies(SHAMBLER_TEMPLATE_NAME, "Shambler", routes, SHAMBLER_SPAWN_NAME, SHAMBLER_SPAWN_ROAM_NAME, now, (p, o, y) => new Shambler(p, o, y));
        this.armBoss();
        print(`[quake] ${this.monsters.length} monster(s) active`);
    }
    armBoss() {
        this.bossSpawned = false;
        const mk = Instance.FindEntityByName(BOSS_SPAWN_NAME);
        if (!mk || !mk.IsValid()) return;
        const id = Instance.ConnectOutput(mk, "OnUser1", () => this.spawnBoss(mk, this.now));
        if (id !== undefined) this.triggerConns.push(id);
        print(`[quake] boss armed - FireUser1 "${BOSS_SPAWN_NAME}" to raise Chthon`);
    }
    spawnBoss(mk, now) {
        if (this.bossSpawned || !mk.IsValid()) return;
        const tmpl = Instance.FindEntityByName(BOSS_TEMPLATE_NAME);
        if (!(tmpl instanceof PointTemplate)) {
            print(`[quake] no point_template "${BOSS_TEMPLATE_NAME}" - Chthon can't spawn`);
            return;
        }
        const mo = new Vec3(mk.GetAbsOrigin());
        const yaw = mk.GetAbsAngles().yaw;
        const sp = tmpl.ForceSpawn(mo, {
            pitch: 0,
            yaw,
            roll: 0
        });
        if (!sp || sp.length === 0) return;
        const boss = new Boss(sp[0], mo, yaw);
        boss.spawnMarker = mk;
        boss.maxHealth = Math.round(BOSS_HEALTH * (BOSS_HEALTH_SCALE[this.difficulty] ?? 1));
        boss.health = boss.maxHealth;
        boss.nextThink = now;
        boss.wake(now);
        this.monsters.push(boss);
        this.bossSpawned = true;
        print("[quake] Chthon rises");
    }
    spawnSpecies(tmplName, label, routes, stationaryName, roamPrefix, now, make) {
        const tmpl = Instance.FindEntityByName(tmplName);
        if (!tmpl) return;
        if (!(tmpl instanceof PointTemplate)) {
            print(`[quake] "${tmplName}" is ${tmpl.GetClassName()}, not a point_template`);
            return;
        }
        const groups = [ [ findSpawnMarkers(stationaryName, this.spawnTag), false ], [ findByNamePrefix(roamPrefix).filter(e => matchesSkill(e.GetEntityName(), this.spawnTag)), true ] ];
        let n = 0;
        let deferred = 0;
        for (const [markers, isRoam] of groups) {
            for (const mk of markers) {
                const aid = Instance.ConnectOutput(mk, "OnUser3", () => this.angerFromMarker(mk));
                if (aid !== undefined) this.triggerConns.push(aid);
                if (hasSpawnVar(mk.GetEntityName(), "trigger")) {
                    const id = Instance.ConnectOutput(mk, "OnUser2", () => {
                        if (this.monsters.some(m => m.spawnMarker === mk && m.state !== "dead")) return;
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
            print(`[quake] spawned ${n} ${label}(s)` + (deferred ? ` (${deferred} armed for OnUser2)` : ""));
        }
    }
    spawnFromMarker(tmpl, mk, isRoam, label, tmplName, routes, make, now) {
        if (!mk.IsValid()) return false;
        const mo = new Vec3(mk.GetAbsOrigin());
        const pos = mo.withZ(mo.z + 8);
        const yaw = mk.GetAbsAngles().yaw;
        const sp = tmpl.ForceSpawn(pos, {
            pitch: 0,
            yaw,
            roll: 0
        });
        if (!sp || sp.length === 0) {
            print(`[quake] ${label} ForceSpawn returned nothing - check "${tmplName}" Template keyvalues`);
            return false;
        }
        const m = make(sp[0], pos, yaw);
        const seat = this.dropToFloor(m, new Vec3(m.origin), MONSTER_SPAWN_DROP);
        if (seat) m.origin = seat;
        m.spawnMarker = mk;
        m.nextThink = now + this.monsters.length % AI_THINK_STAGGER * (AI_THINK_INTERVAL / AI_THINK_STAGGER);
        const route = routes.find(r => keyOf$1(r.owner) === keyOf$1(mo));
        if (route) {
            m.route = route.points.map(p => new Vec3(p));
            m.routeIdx = nearestWaypoint(m.route, m.origin);
            this.aimAt(m, m.route[m.routeIdx].x, m.route[m.routeIdx].y);
            m.state = "walk";
            m.play(m.def.anims.walk, true);
        } else if (isRoam) {
            print(`[quake] "${mk.GetEntityName()}" at ${keyOf$1(mo)} has no parented "${PATH_NODE_PREFIX}*" nodes - standing`);
        }
        this.monsters.push(m);
        return true;
    }
    spawnOne(token, origin, yaw, now) {
        const t = token.trim().toLowerCase();
        if (!t) return "usage: qspawn <army|dog|ogre|knight|fiend|zombie|scrag|shambler>";
        const cn = t.startsWith("monster_") ? t : AI_ALIASES[t] ?? "";
        const spec = cn ? MAKE[cn] : undefined;
        if (!spec) return `unknown monster "${token}" - try: army dog ogre knight fiend zombie scrag shambler`;
        const tmpl = Instance.FindEntityByName(spec.tmpl);
        if (!(tmpl instanceof PointTemplate)) return `no point_template "${spec.tmpl}" in this map`;
        const pos = origin.withZ(origin.z + 24);
        const sp = tmpl.ForceSpawn(pos, {
            pitch: 0,
            yaw,
            roll: 0
        });
        if (!sp || sp.length === 0) return `${cn} ForceSpawn returned nothing`;
        const m = spec.make(sp[0], pos, yaw);
        const seat = this.dropToFloor(m, new Vec3(m.origin), 512);
        if (seat) m.origin = seat;
        m.idealYaw = yaw;
        m.nextThink = now + this.monsters.length % AI_THINK_STAGGER * (AI_THINK_INTERVAL / AI_THINK_STAGGER);
        m.prop.Teleport({
            position: m.origin.withZ(m.origin.z + m.def.modelZOfs),
            angles: {
                pitch: 0,
                yaw: yaw + m.def.modelYawOfs,
                roll: 0
            }
        });
        this.monsters.push(m);
        return `spawned ${shortSpecies(cn)} at ${keyOf$1(m.origin)}`;
    }
    despawnAll() {
        for (const id of this.triggerConns) Instance.DisconnectOutput(id);
        this.triggerConns = [];
        for (const m of this.monsters) safeRemove(m.prop);
        this.monsters = [];
    }
    allProps() {
        return this.monsters.filter(m => m.prop.IsValid()).map(m => m.prop);
    }
    solidBoxes() {
        return this.monsters.filter(m => m.prop.IsValid() && m.state !== "dead" && !m.hullOverride).map(m => m.box());
    }
    angerFromMarker(mk) {
        let woke = 0;
        for (const m of this.monsters) {
            if (m.spawnMarker !== mk || m.state === "dead") continue;
            m.enemy = undefined;
            m.oldEnemy = undefined;
            this.foundTarget(m, this.now);
            woke++;
        }
        if (woke) print(`[quake] FireUser3 angered ${woke} monster(s) from "${mk.GetEntityName()}"`);
    }
    calmDown() {
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
    forgetPlayer() {
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
    idle(m) {
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
    damageFromPlayer(hitEnt, damage, hitPos, now) {
        if (!hitEnt) return false;
        const m = this.monsters.find(x => x.prop === hitEnt);
        if (!m || !m.takeDamage) return false;
        const dmg = m instanceof Boss ? damage * BOSS_WEAPON_DAMAGE_SCALE : damage;
        T_Damage(m, {
            inflictorCenter: this.playerEye,
            damage: dmg,
            byPlayer: true,
            time: now
        });
        this.hitHook?.();
        m.enemy = undefined;
        m.oldEnemy = undefined;
        this.afterDamage(m, true, now, true);
        if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
        this.bloodFx(hitPos, this.playerEye, now);
        return true;
    }
    hurtByLightning(hitEnt, now) {
        if (!hitEnt) return false;
        const m = this.monsters.find(x => x.prop === hitEnt);
        if (!m || !m.takeDamage) return false;
        const dmg = m instanceof Boss ? EVENT_LIGHTNING_BOSS_DAMAGE : EVENT_LIGHTNING_DAMAGE;
        T_Damage(m, {
            inflictorCenter: m.bodyCenter(),
            damage: dmg,
            byPlayer: true,
            time: now
        });
        this.afterDamage(m, true, now, true);
        if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
        this.bloodFx(m.bodyCenter(), this.playerEye, now);
        return true;
    }
    update(now, playerOrigin, playerVel, playerAttackedAt) {
        this.now = now;
        if (this.monsters.length === 0) return;
        this.playerShowHostile = playerAttackedAt + SHOW_HOSTILE_TIME;
        this.playerOrigin = new Vec3(playerOrigin);
        this.playerEye = playerOrigin.withZ(playerOrigin.z + VIEW_OFS_Z);
        this.playerVel = new Vec3(playerVel);
        this.props = this.monsters.map(m => m.prop);
        this.visIgnore = this.pawn ? [ ...this.props, this.pawn ] : this.props;
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
            if (!m.settled && now - m.lastPush >= AI_INTERP_INTERVAL) m.pushInterpolated(now);
        }
        this.monsters = this.monsters.filter(m => m.prop.IsValid());
    }
    drawState(m) {
        return;
    }
    thinkInterval(m) {
        const d = m.origin.distance(this.playerOrigin);
        if (d <= AI_THINK_FULL_DIST) return AI_THINK_INTERVAL;
        const span = AI_THINK_FAR_DIST - AI_THINK_FULL_DIST;
        const t = Math.min(1, (d - AI_THINK_FULL_DIST) / span);
        return AI_THINK_INTERVAL + t * (AI_THINK_MAX_INTERVAL - AI_THINK_INTERVAL);
    }
    think(m, now) {
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
            } else if (!this.snapToGround(m, MONSTER_STEPSIZE * 2)) {
                this.snapToGround(m, MONSTER_UNSUPPORTED_DROP);
            }
        }
        const preOrigin = new Vec3(m.origin);
        if (m.state === "stand") this.aiStand(m, now); else if (m.state === "walk") this.aiWalk(m, now); else if (m.state === "run") this.aiRun(m, now); else m.runAttack(this, now);
        m.moved = m.airborne() || m.origin.distance(preOrigin) > .1;
        if (m.moved) this.checkMonsterStuck(m);
        if (!m.airborne() && (m.moved || m.groundEntity)) this.captureGround(m, now);
        if (m.moved) this.recordMonsterPos(m, now);
    }
    captureGround(m, now) {
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax, m.origin.withZ(m.origin.z - 2), [ m.prop ]);
        const e = tr.ent;
        if (!e || !e.IsValid() || tr.normal.z <= .7 || !e.GetClassName().startsWith("func_")) {
            m.groundEntity = undefined;
            m.groundVel = new Vec3(0, 0, 0);
            m.gevTime = -1;
            return;
        }
        const o = e.GetAbsOrigin();
        if (m.groundEntity === e && m.gevTime >= 0 && now - m.gevTime > 1e-5) {
            const dt = now - m.gevTime;
            m.groundVel = new Vec3((o.x - m.gevPos.x) / dt, (o.y - m.gevPos.y) / dt, (o.z - m.gevPos.z) / dt);
        } else if (m.groundEntity !== e) {
            m.groundVel = new Vec3(0, 0, 0);
        }
        m.groundEntity = e;
        m.gevPos = new Vec3(o.x, o.y, o.z);
        m.gevTime = now;
    }
    rideGround(m) {
        if (!m.groundEntity || !m.groundEntity.IsValid()) return;
        if (m.groundVel.x === 0 && m.groundVel.y === 0 && m.groundVel.z === 0) return;
        const push = m.groundVel.scale(m.thinkDt);
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax, m.origin.add(push), [ m.prop ]);
        m.origin = new Vec3(tr.endpos);
    }
    unstuckGround(m) {
        if (!m.groundEntity) return;
        if (!testPosition(m.origin, m.def.hullMin, m.def.hullMax, [ m.prop ])) return;
        const cap = MONSTER_STEPSIZE + Math.ceil(m.groundVel.z * m.thinkDt) + 2;
        for (let z = 1; z <= cap; z++) {
            const test = m.origin.withZ(m.origin.z + z);
            if (!testPosition(test, m.def.hullMin, m.def.hullMax, [ m.prop ])) {
                m.origin = test;
                return;
            }
        }
    }
    pushOut(m) {
        if (m.hullOverride) return false;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        if (!testPosition(m.origin, mn, mx, [ m.prop ])) return false;
        const e = traceHull(m.origin, mn, mx, m.origin, [ m.prop ]).ent;
        if (!e || !e.IsValid() || !PUSH_MOVER_RE.test(e.GetClassName()) || !hasTag(e.GetEntityName(), "push")) return false;
        if (testPosition(m.origin, mn, mx, [ m.prop, e ])) return false;
        for (const step of PUSH_NUDGE_STEPS) {
            for (const d of PUSH_NUDGE_DIRS) {
                const test = m.origin.add(d.scale(step));
                if (!testPosition(test, mn, mx, [ m.prop ])) {
                    m.origin = test;
                    m.velocity = new Vec3(0, 0, 0);
                    return true;
                }
            }
        }
        return false;
    }
    checkMonsterStuck(m) {
        if (m.hullOverride) return;
        if (this.pushOut(m)) return;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        if (!testPosition(m.origin, mn, mx, [ m.prop ])) return;
        for (let i = m.posHist.length - 1; i >= 0; i--) {
            const p = m.posHist[i];
            if (!testPosition(p, mn, mx, [ m.prop ])) {
                m.origin = new Vec3(p);
                m.velocity = new Vec3(0, 0, 0);
                return;
            }
        }
        for (let z = 1; z <= MONSTER_STEPSIZE; z++) {
            const test = m.origin.withZ(m.origin.z + z);
            if (!testPosition(test, mn, mx, [ m.prop ])) {
                m.origin = test;
                return;
            }
        }
    }
    recordMonsterPos(m, now) {
        if (m.hullOverride || now - m.histAt < STUCK_HIST_INTERVAL) return;
        if (testPosition(m.origin, m.def.hullMin, m.def.hullMax, [ m.prop ])) return;
        m.histAt = now;
        const last = m.posHist[m.posHist.length - 1];
        if (last && last.distance(m.origin) < 1) return;
        m.posHist.push(new Vec3(m.origin));
        if (m.posHist.length > STUCK_HIST_LEN) m.posHist.shift();
    }
    checkEnemy(m) {
        if (m.enemy && (!m.enemy.prop.IsValid() || m.enemy.state === "dead")) {
            m.enemy = m.oldEnemy;
            m.oldEnemy = undefined;
        }
        if (m.enemy === undefined && !this.playerAlive && (m.state === "run" || m.state === "attack")) {
            this.idle(m);
        }
    }
    snapToGround(m, maxDrop) {
        const tr = traceHull(m.origin.withZ(m.origin.z + MONSTER_STEPSIZE), m.def.hullMin, m.def.hullMax, m.origin.withZ(m.origin.z - maxDrop), [ m.prop ]);
        if (tr.fraction >= 1 || tr.normal.z <= .7) return false;
        if (tr.endpos.z <= m.origin.z + .1) m.origin = new Vec3(tr.endpos);
        return true;
    }
    corpseFall(m, now) {
        const dt = m.thinkDt;
        m.velocity = m.velocity.withZ(m.velocity.z - SV_GRAVITY * dt);
        const from = new Vec3(m.origin);
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax, m.origin.add(m.velocity.scale(dt)), [ m.prop ]);
        m.origin = new Vec3(tr.endpos);
        const stuck = tr.fraction < 1 && m.origin.distance(from) < .5;
        if (tr.fraction < 1 && tr.normal.z > .7 || stuck || now >= m.corpseSettleAt) {
            m.velocity = new Vec3(0, 0, 0);
            m.settled = true;
            m.prop.Teleport({
                position: m.origin.withZ(m.origin.z + m.def.modelZOfs),
                angles: {
                    pitch: 0,
                    yaw: m.yaw + m.def.modelYawOfs,
                    roll: 0
                }
            });
        } else if (tr.fraction < 1) {
            m.velocity = clipVelocity(m.velocity, tr.normal, 1).out;
        }
    }
    idleChatter(m) {
        if (Math.random() < MONSTER_IDLE_SOUND_CHANCE) this.emit(m, m.def.snd.idle);
    }
    aiStand(m, now) {
        if (this.findTarget(m, now)) return;
        this.idleChatter(m);
        m.play(m.def.anims.stand);
    }
    aiWalk(m, now) {
        if (this.findTarget(m, now)) return;
        this.idleChatter(m);
        if (m.route.length < 2) {
            this.idle(m);
            return;
        }
        const goal = m.route[m.routeIdx];
        const dx = goal.x - m.origin.x;
        const dy = goal.y - m.origin.y;
        if (Math.hypot(dx, dy) < PATH_REACH_DIST) {
            m.routeIdx = (m.routeIdx + 1) % m.route.length;
            const g2 = m.route[m.routeIdx];
            this.aimAt(m, g2.x, g2.y);
        } else if (m.flying) {
            this.flyMove(m, m.def.walkSpeed * AI_THINK_INTERVAL, goal, false);
        } else {
            this.chaseToward(m, m.def.walkSpeed * AI_THINK_INTERVAL, goal.x, goal.y);
        }
        m.play(m.def.anims.walk);
    }
    aiRun(m, now) {
        if (this.visible(m)) m.searchTime = now + m.def.giveUp; else if (now > m.searchTime) {
            this.idle(m);
            return;
        }
        if (m.checkAttack(this, now)) return;
        if (m.flying) {
            this.flyMove(m, m.def.runSpeed * AI_THINK_INTERVAL, this.tgtEye(m), m.slide);
            m.play(m.def.anims.run);
            return;
        }
        const t = this.tgtEye(m);
        this.chaseToward(m, m.def.runSpeed * AI_THINK_INTERVAL, t.x, t.y);
        m.play(m.def.anims.run);
    }
    flyMove(m, dist, goal, strafe) {
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
        const tr = traceHull(m.origin, m.def.hullMin, m.def.hullMax, m.origin.add(step), [ m.prop ]);
        m.origin = new Vec3(tr.fraction < 1 ? tr.endpos : m.origin.add(step));
        if (strafe && tr.fraction < 1) m.lefty = !m.lefty;
    }
    getMad(victim, attacker, now) {
        if (victim === attacker || victim.enemy === attacker || victim.state === "dead") return;
        if (victim instanceof Boss || attacker instanceof Boss) return;
        if (victim.def.className === attacker.def.className && victim.def.className !== "monster_army") return;
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
    hurtMonster(victim, dmg, attacker, now) {
        if (!victim.takeDamage || victim instanceof Boss) return;
        T_Damage(victim, {
            inflictorCenter: attacker.bodyCenter(),
            damage: dmg,
            byPlayer: false,
            time: now
        });
        this.getMad(victim, attacker, now);
        this.afterDamage(victim, true, now);
        this.bloodFx(victim.bodyCenter(), attacker.bodyCenter(), now);
    }
    radiusHurt(origin, damage, now, ignore, byPlayer = true) {
        const reach = damage + EXPLOSION_RADIUS_PAD;
        let hit = false;
        for (const m of this.monsters) {
            if (!m.takeDamage || m.prop === ignore) continue;
            if (m instanceof Boss && !byPlayer) continue;
            const dist = m.origin.distance(origin);
            if (dist > reach) continue;
            let pts = damage - .5 * dist;
            if (pts <= 0) continue;
            if (m instanceof Boss) pts *= BOSS_WEAPON_DAMAGE_SCALE;
            T_Damage(m, {
                inflictorCenter: origin,
                damage: pts,
                byPlayer: true,
                time: now
            });
            this.afterDamage(m, true, now, byPlayer);
            if (m.state !== "dead" && !(m instanceof Boss)) this.foundTarget(m, now);
            hit = true;
        }
        if (hit && byPlayer) this.hitHook?.();
    }
    damageEnemyOf(m, dmg, now) {
        if (m.enemy) {
            this.hurtMonster(m.enemy, dmg, m, now);
            return;
        }
        if (this.player && this.player.takeDamage) {
            T_Damage(this.player, {
                inflictorCenter: m.bodyCenter(),
                damage: dmg,
                byPlayer: false,
                time: now
            });
        }
    }
    tgtOrigin(m) {
        return m.enemy ? m.enemy.origin : this.playerOrigin;
    }
    tgtEye(m) {
        return m.enemy ? m.enemy.eye() : this.playerEye;
    }
    tgtVel(m) {
        return m.enemy ? m.enemy.velocity : this.playerVel;
    }
    tgtId(m) {
        return m.enemy ? m.enemy.prop : this.pawn;
    }
    monsterByProp(ent) {
        return ent ? this.monsters.find(x => x.prop === ent && x.state !== "dead") : undefined;
    }
    findTarget(m, now) {
        if (!this.playerAlive) return false;
        if (this.playerInvisible) return false;
        const beacon = this.sightEntity;
        if (beacon && beacon !== m && !m.ambush && beacon.prop.IsValid() && beacon.state !== "dead" && now - this.sightEntityTime <= SIGHT_RELAY_WINDOW) {
            const d = m.eye().distance(beacon.eye());
            if (d < RANGE_MID && this.visiblePoint(m, beacon.eye()) && (d < RANGE_NEAR || this.infrontPoint(m, beacon.origin))) {
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
    acquirePlayer(m, now) {
        this.foundTarget(m, now);
        return true;
    }
    foundTarget(m, now) {
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
    range(m) {
        const d = m.eye().distance(this.tgtEye(m));
        if (d < RANGE_MELEE) return "melee";
        if (d < RANGE_NEAR) return "near";
        if (d < RANGE_MID) return "mid";
        return "far";
    }
    visible(m) {
        if (this.now - m.visAt < AI_VIS_TTL) return m.visCache;
        m.visAt = this.now;
        m.visCache = this.visiblePoint(m, this.tgtEye(m));
        return m.visCache;
    }
    visiblePoint(m, targetEye) {
        return traceHull(m.eye(), V0$1, V0$1, targetEye, this.visIgnore, true).fraction === 1;
    }
    infront(m) {
        return this.infrontPoint(m, this.tgtOrigin(m));
    }
    infrontPoint(m, target) {
        const fwd = angleVectors(0, m.yaw, 0).forward;
        const to = new Vec3(target.x - m.origin.x, target.y - m.origin.y, target.z - m.origin.z).normal;
        return to.dot(fwd) > SOLDIER_INFRONT_DOT;
    }
    clearShot(m) {
        const tr = traceHull(m.eye(), V0$1, V0$1, this.tgtEye(m), [ m.prop ]);
        return tr.fraction >= 1 || tr.ent === this.tgtId(m);
    }
    aimAt(m, x, y) {
        m.idealYaw = vectoyaw(x - m.origin.x, y - m.origin.y);
    }
    aiFace(m) {
        const t = this.tgtEye(m);
        this.aimAt(m, t.x, t.y);
        this.changeYaw(m);
    }
    changeYaw(m) {
        let move = yawDelta(m.idealYaw, m.yaw);
        if (move > m.def.yawSpeed) move = m.def.yawSpeed;
        if (move < -m.def.yawSpeed) move = -m.def.yawSpeed;
        m.yaw = anglemod(m.yaw + move);
    }
    moveToGoal(m, dist) {
        const t = this.tgtEye(m);
        this.chaseToward(m, dist, t.x, t.y);
    }
    chaseToward(m, dist, gx, gy) {
        const dx = gx - m.origin.x;
        const dy = gy - m.origin.y;
        if (Math.hypot(dx, dy) < dist + 16) return;
        if (Math.random() < .25 || !this.stepDirection(m, m.idealYaw, dist)) {
            this.newChaseDir(m, dist, dx, dy);
        }
    }
    stepDirection(m, yaw, dist) {
        m.idealYaw = yaw;
        this.changeYaw(m);
        const mv = new Vec3(Math.cos(yaw * RAD) * dist, Math.sin(yaw * RAD) * dist, 0);
        const old = new Vec3(m.origin);
        if (!this.moveStep(m, mv)) return false;
        if (Math.abs(yawDelta(m.yaw, m.idealYaw)) > 45) m.origin = old;
        return true;
    }
    moveStep(m, move) {
        const step = MONSTER_STEPSIZE;
        const mn = m.def.hullMin, mx = m.def.hullMax;
        const oldorg = new Vec3(m.origin);
        const flat = traceHull(oldorg, mn.withZ(mn.z + 2), mx, oldorg.add(move), [ m.prop ]);
        const walled = flat.fraction < 1 && Math.abs(flat.normal.z) < .7;
        let best = walled ? undefined : this.dropToFloor(m, new Vec3(flat.endpos), step);
        if (!best) {
            const lift = traceHull(oldorg, mn, mx, oldorg.withZ(oldorg.z + step), [ m.prop ]);
            const upOrg = new Vec3(lift.endpos);
            if (upOrg.z - oldorg.z < 2) return false;
            const raised = traceHull(upOrg, mn, mx, upOrg.add(move), [ m.prop ]);
            if (new Vec3(raised.endpos).distance(upOrg) < 1) return false;
            best = this.dropToFloor(m, new Vec3(raised.endpos), step);
            if (!best || best.z < oldorg.z - 1) return false;
        }
        const rise = best.z - oldorg.z;
        if (rise <= 2) {
            if (!this.checkBottom(m, best)) return false;
            const len = move.length;
            if (len > .01) {
                const dir = move.scale(1 / len);
                {
                    const a = best.add(dir.scale(MONSTER_EDGE_MARGIN)).withZ(best.z + step);
                    const fl = traceHull(a, V0$1, V0$1, a.withZ(best.z - MONSTER_LEDGE_DROP - step), [ m.prop ]);
                    if (fl.fraction === 1 || best.z - fl.endpos.z > MONSTER_LEDGE_DROP) return false;
                }
                const nose = traceHull(best.withZ(best.z + step), mn.withZ(mn.z + step), mx, best.withZ(best.z + step).add(dir.scale(MONSTER_WALL_MARGIN)), [ m.prop ]);
                if (nose.fraction < 1 && Math.abs(nose.normal.z) < .7) return false;
            }
        }
        m.origin = best;
        return true;
    }
    dropToFloor(m, org, maxDrop) {
        const from = org.withZ(org.z + 2);
        const tr = traceHull(from, m.def.hullMin, m.def.hullMax, from.withZ(org.z - maxDrop), [ m.prop ]);
        if (tr.startsolid || tr.allsolid) return undefined;
        if (tr.fraction === 1) return undefined;
        if (tr.normal.z < .7) return undefined;
        return new Vec3(tr.endpos);
    }
    checkBottomAt(m, org) {
        return this.checkBottom(m, org);
    }
    checkBottom(m, org) {
        const mn = m.def.hullMin, mx = m.def.hullMax;
        const step = MONSTER_STEPSIZE;
        const corners = [ [ mn.x, mn.y ], [ mn.x, mx.y ], [ mx.x, mn.y ], [ mx.x, mx.y ] ];
        let easy = true;
        for (const [cx, cy] of corners) {
            const s = new Vec3(org.x + cx, org.y + cy, org.z + mn.z + 1);
            if (traceHull(s, V0$1, V0$1, s.withZ(s.z - 3), [ m.prop ]).fraction === 1) {
                easy = false;
                break;
            }
        }
        if (easy) return true;
        const c = new Vec3(org.x, org.y, org.z + mn.z);
        const mid = traceHull(c, V0$1, V0$1, c.withZ(c.z - 2 * step), [ m.prop ]);
        if (mid.fraction === 1) return false;
        const midZ = mid.endpos.z;
        for (const [cx, cy] of corners) {
            const s = new Vec3(org.x + cx, org.y + cy, org.z + mn.z);
            const t = traceHull(s, V0$1, V0$1, s.withZ(s.z - 2 * step), [ m.prop ]);
            if (t.fraction === 1 || midZ - t.endpos.z > step) return false;
        }
        return true;
    }
    newChaseDir(m, dist, dx, dy) {
        const olddir = anglemod(Math.floor(anglemod(m.idealYaw) / 45) * 45);
        const turn = anglemod(olddir - 180);
        const d1 = dx > 10 ? 0 : dx < -10 ? 180 : NODIR;
        const d2 = dy < -10 ? 270 : dy > 10 ? 90 : NODIR;
        if (d1 !== NODIR && d2 !== NODIR) {
            const tdir = d1 === 0 ? d2 === 90 ? 45 : 315 : d2 === 90 ? 135 : 215;
            if (tdir !== turn && this.stepDirection(m, tdir, dist)) return;
        }
        let a = d1, b = d2;
        if (Math.random() < .5 || Math.abs(dy) > Math.abs(dx)) {
            const tmp = a;
            a = b;
            b = tmp;
        }
        if (a !== NODIR && a !== turn && this.stepDirection(m, a, dist)) return;
        if (b !== NODIR && b !== turn && this.stepDirection(m, b, dist)) return;
        if (this.stepDirection(m, olddir, dist)) return;
        if (Math.random() < .5) {
            for (let tt = 0; tt <= 315; tt += 45) if (tt !== turn && this.stepDirection(m, tt, dist)) return;
        } else {
            for (let tt = 315; tt >= 0; tt -= 45) if (tt !== turn && this.stepDirection(m, tt, dist)) return;
        }
        if (this.stepDirection(m, turn, dist)) return;
        m.idealYaw = olddir;
    }
}

function playerTouches(itemOrigin, mins, maxs, playerOrigin) {
    if (Math.abs(itemOrigin.x - playerOrigin.x) >= -HULL_MIN.x + maxs.x) return false;
    if (Math.abs(itemOrigin.y - playerOrigin.y) >= -HULL_MIN.y + maxs.y) return false;
    const pLo = playerOrigin.z + HULL_MIN.z;
    const pHi = playerOrigin.z + HULL_MAX.z;
    return itemOrigin.z + mins.z < pHi && itemOrigin.z + maxs.z > pLo;
}

class Backpack {
    prop;
    origin;
    yaw;
    loot;
    velocity;
    onGround=false;
    removeAt;
    trigger;
    taken=false;
    constructor(prop, origin, yaw, loot, now) {
        this.prop = prop;
        this.origin = origin;
        this.yaw = yaw;
        this.loot = loot;
        this.velocity = new Vec3(-100 + Math.random() * 2 * BACKPACK_TOSS_SPREAD, -100 + Math.random() * 2 * BACKPACK_TOSS_SPREAD, BACKPACK_TOSS_UP);
        this.removeAt = now + BACKPACK_LIFETIME;
    }
    step(dt) {
        if (this.onGround) return;
        this.velocity = this.velocity.withZ(this.velocity.z - SV_GRAVITY * dt);
        const move = this.velocity.scale(dt);
        const tr = traceHull(this.origin, BACKPACK_HULL_MIN, BACKPACK_HULL_MAX, this.origin.add(move), [ this.prop ]);
        this.origin = new Vec3(tr.endpos);
        if (tr.fraction === 1) return;
        this.velocity = clipVelocity(this.velocity, tr.normal, 1).out;
        if (tr.normal.z > .7) {
            this.onGround = true;
            this.velocity = new Vec3(0, 0, 0);
        }
    }
    push() {
        this.prop.Move({
            position: this.origin.withZ(this.origin.z + BACKPACK_MODEL_Z_OFS),
            angles: {
                pitch: 0,
                yaw: this.yaw,
                roll: 0
            }
        });
    }
}

class Backpacks {
    packs=[];
    tmpl;
    touchTmpl;
    grant=() => "";
    onMessage=() => {};
    sounds;
    playerSrc="";
    isToucher=() => false;
    conns=[];
    setToucher(fn) {
        this.isToucher = fn;
    }
    onEnable(grant, sounds, playerSrc, onMessage = () => {}) {
        this.onDisable();
        this.grant = grant;
        this.onMessage = onMessage;
        this.sounds = sounds;
        this.playerSrc = playerSrc;
        const t = Instance.FindEntityByName(BACKPACK_TEMPLATE_NAME);
        this.tmpl = t instanceof PointTemplate ? t : undefined;
        if (!this.tmpl) {
            print(`[quake] no point_template "${BACKPACK_TEMPLATE_NAME}" - no ammo drops`);
        }
        const tt = Instance.FindEntityByName(BACKPACK_TOUCH_TEMPLATE);
        this.touchTmpl = tt instanceof PointTemplate ? tt : undefined;
        if (!this.touchTmpl) {
            print(`[quake] no "${BACKPACK_TOUCH_TEMPLATE}" - distance-check pickup`);
        }
    }
    onDisable() {
        for (const id of this.conns) {
            try {
                Instance.DisconnectOutput(id);
            } catch {}
        }
        this.conns = [];
        for (const p of this.packs) {
            safeRemove(p.prop);
            if (p.trigger) safeRemove(p.trigger);
        }
        this.packs = [];
    }
    props() {
        const out = [];
        for (const p of this.packs) {
            if (p.prop.IsValid()) out.push(p.prop);
            if (p.trigger?.IsValid()) out.push(p.trigger);
        }
        return out;
    }
    drop(origin, loot, now) {
        if (!this.tmpl) return;
        if (loot.shells <= 0) return;
        const pos = new Vec3(origin).withZ(origin.z - BACKPACK_DROP_Z);
        const yaw = Math.random() * 360;
        const sp = this.tmpl.ForceSpawn(pos, {
            pitch: 0,
            yaw,
            roll: 0
        });
        if (!sp || sp.length === 0) return;
        const pack = new Backpack(sp[0], pos, yaw, loot, now);
        this.packs.push(pack);
        if (this.touchTmpl) {
            const tsp = this.touchTmpl.ForceSpawn(pos, {
                pitch: 0,
                yaw: 0,
                roll: 0
            });
            const trig = tsp && tsp.length ? tsp[0] : undefined;
            if (trig) {
                pack.trigger = trig;
                const id = Instance.ConnectOutput(trig, "OnStartTouch", d => {
                    if (this.isToucher(d.activator)) this.collect(pack);
                });
                if (id !== undefined) this.conns.push(id);
            }
        }
    }
    update(now, dt, playerOrigin, playerAlive) {
        for (const p of this.packs) {
            if (!p.prop.IsValid()) continue;
            p.step(dt);
            p.push();
            if (p.trigger?.IsValid()) p.trigger.Move({
                position: p.origin
            });
            if (!p.trigger && playerAlive && this.touching(p, playerOrigin)) {
                this.collect(p);
                continue;
            }
            if (now >= p.removeAt) p.prop.Remove();
        }
        this.packs = this.packs.filter(p => p.prop.IsValid());
    }
    collect(p) {
        if (p.taken || !p.prop.IsValid()) return;
        p.taken = true;
        const msg = this.grant(p.loot);
        if (msg) this.onMessage(msg);
        this.sounds?.play(SND.itemAmmo, this.playerSrc);
        p.prop.Remove();
        if (p.trigger) safeRemove(p.trigger);
    }
    touching(p, playerOrigin) {
        return playerTouches(p.origin, BACKPACK_HULL_MIN, BACKPACK_HULL_MAX, playerOrigin);
    }
}

function ammoDef(t, s, kind, n) {
    return {
        templateName: t,
        spawnName: s,
        kind: "ammo",
        ammoKind: kind,
        ammoN: n,
        armorType: 0,
        armorValue: 0,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give: `You got the ${kind}`,
        sound: SND.itemAmmo
    };
}

function powerupDef(t, s, kind, give, sound) {
    return {
        templateName: t,
        spawnName: s,
        kind: "powerup",
        powerKind: kind,
        armorType: 0,
        armorValue: 0,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give,
        sound
    };
}

function weaponDef(t, s, cs, kind, n, label) {
    return {
        templateName: t,
        spawnName: s,
        kind: "weapon",
        csWeapon: cs,
        ammoKind: kind,
        ammoN: n,
        armorType: 0,
        armorValue: 0,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give: `You got the ${label}`,
        sound: SND.itemAmmo
    };
}

function keyDef(t, s, idx, label) {
    return {
        templateName: t,
        spawnName: s,
        kind: "key",
        keyIdx: idx,
        armorType: 0,
        armorValue: 0,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give: `You got the ${label}`,
        sound: SND.keyPickup
    };
}

function runeDef(t, s, idx, label) {
    return {
        templateName: t,
        spawnName: s,
        kind: "rune",
        runeIdx: idx,
        armorType: 0,
        armorValue: 0,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give: label,
        sound: SND.runePickup
    };
}

function armorDef(t, s, type, value, colour) {
    return {
        templateName: t,
        spawnName: s,
        kind: "armor",
        armorType: type,
        armorValue: value,
        heal: 0,
        healIgnoreMax: false,
        shells: 0,
        give: `You got the ${colour} armor`,
        sound: SND.itemArmor
    };
}

const ITEM_DEFS = [ armorDef("armor_template_1", "armor_spawn_1", ARMOR1_TYPE, ARMOR1_VALUE, "green"), armorDef("armor_template_2", "armor_spawn_2", ARMOR2_TYPE, ARMOR2_VALUE, "yellow"), armorDef("armor_template_3", "armor_spawn_3", ARMOR3_TYPE, ARMOR3_VALUE, "red"), {
    templateName: "bh10_template",
    spawnName: "bh10_spawn",
    kind: "health",
    armorType: 0,
    armorValue: 0,
    heal: HEALTH_ROTTEN,
    healIgnoreMax: false,
    shells: 0,
    give: `You receive ${HEALTH_ROTTEN} health`,
    sound: SND.itemHealthRotten
}, {
    templateName: "bh25_template",
    spawnName: "bh25_spawn",
    kind: "health",
    armorType: 0,
    armorValue: 0,
    heal: HEALTH_BOX,
    healIgnoreMax: false,
    shells: 0,
    give: `You receive ${HEALTH_BOX} health`,
    sound: SND.itemHealthBox
}, {
    templateName: "bh100_template",
    spawnName: "bh100_spawn",
    kind: "health",
    armorType: 0,
    armorValue: 0,
    heal: HEALTH_MEGA,
    healIgnoreMax: true,
    shells: 0,
    give: `You receive ${HEALTH_MEGA} health`,
    sound: SND.itemHealthMega
}, {
    templateName: "shell0_template",
    spawnName: "shell0_spawn",
    kind: "shells",
    armorType: 0,
    armorValue: 0,
    heal: 0,
    healIgnoreMax: false,
    shells: SHELLS_SMALL,
    give: "You got the shells",
    sound: SND.itemAmmo
}, {
    templateName: "shell1_template",
    spawnName: "shell1_spawn",
    kind: "shells",
    armorType: 0,
    armorValue: 0,
    heal: 0,
    healIgnoreMax: false,
    shells: SHELLS_BIG,
    give: "You got the shells",
    sound: SND.itemAmmo
}, {
    templateName: "suit_template",
    spawnName: "suit_spawn",
    kind: "suit",
    armorType: 0,
    armorValue: 0,
    heal: 0,
    healIgnoreMax: false,
    shells: 0,
    give: "You got the enviro-suit",
    sound: SND.itemSuit
}, powerupDef("quad_template", "quad_spawn", "quad", "You got the Quad Damage", SND.itemQuad), powerupDef("pent_template", "pent_spawn", "pent", "You got the Pentagram of Protection", SND.itemPent), powerupDef("ring_template", "ring_spawn", "ring", "You got the Ring of Shadows", SND.itemRing), ammoDef("nail0_template", "nail0_spawn", "nails", AMMO_NAILS_SMALL), ammoDef("nail1_template", "nail1_spawn", "nails", AMMO_NAILS_BIG), ammoDef("rocket0_template", "rocket0_spawn", "rockets", AMMO_ROCKETS_SMALL), ammoDef("rocket1_template", "rocket1_spawn", "rockets", AMMO_ROCKETS_BIG), ammoDef("cell0_template", "cell0_spawn", "cells", AMMO_CELLS_SMALL), ammoDef("cell1_template", "cell1_spawn", "cells", AMMO_CELLS_BIG), weaponDef("weapon_ssg_template", "weapon_ssg_spawn", "weapon_glock", "shells", 5, "Double-barrelled Shotgun"), weaponDef("weapon_ng_template", "weapon_ng_spawn", "weapon_knife", "nails", 30, "nailgun"), weaponDef("weapon_sng_template", "weapon_sng_spawn", "weapon_smokegrenade", "nails", 30, "Super Nailgun"), weaponDef("weapon_gl_template", "weapon_gl_spawn", "weapon_molotov", "rockets", 5, "Grenade Launcher"), weaponDef("weapon_rl_template", "weapon_rl_spawn", "weapon_hegrenade", "rockets", 5, "Rocket Launcher"), weaponDef("weapon_lg_template", "weapon_lg_spawn", "weapon_flashbang", "cells", 15, "Thunderbolt"), keyDef("silver_key_template", "silver_key_spawn", 0, "silver key"), keyDef("gold_key_template", "gold_key_spawn", 1, "gold key"), runeDef(SIGIL_TEMPLATE, SIGIL_SPAWN_NAME, 0, "You got the Rune of Earth Magic") ];

class WorldItem {
    prop;
    origin;
    def;
    marker;
    trigger;
    taken=false;
    parent;
    propOfs=new Vec3(0, 0, 0);
    trigOfs=new Vec3(0, 0, 0);
    constructor(prop, origin, def, marker) {
        this.prop = prop;
        this.origin = origin;
        this.def = def;
        this.marker = marker;
    }
}

const SPIN_KINDS = new Set([ "weapon", "powerup", "suit", "key", "rune" ]);

const IDLE_ANIM = "pickup_idle";

class LevelExit {
    exits=[];
    onExit=() => {};
    fired=false;
    onEnable(onExit) {
        this.onDisable();
        this.onExit = onExit;
        const t = Instance.FindEntityByName(LEVEL_END_TEMPLATE_NAME);
        if (!t) {
            print("[quake] no exit placed");
            return;
        }
        if (!(t instanceof PointTemplate)) {
            print(`[quake] "${LEVEL_END_TEMPLATE_NAME}" is ${t.GetClassName()}, not a point_template`);
            return;
        }
        for (const mk of Instance.FindEntitiesByName(LEVEL_END_SPAWN_NAME)) {
            const pos = new Vec3(mk.GetAbsOrigin());
            const yaw = mk.GetAbsAngles().yaw;
            const sp = t.ForceSpawn(pos, {
                pitch: 0,
                yaw,
                roll: 0
            });
            if (sp && sp.length) this.exits.push({
                prop: sp[0],
                origin: pos
            });
        }
        print(`[quake] ${this.exits.length} level exit(s) placed at "${LEVEL_END_SPAWN_NAME}"`);
    }
    onDisable() {
        for (const e of this.exits) safeRemove(e.prop);
        this.exits = [];
        this.fired = false;
    }
    props() {
        return this.exits.filter(e => e.prop.IsValid()).map(e => e.prop);
    }
    update(playerOrigin, playerAlive) {
        if (this.fired || !playerAlive) return;
        for (const e of this.exits) {
            if (!e.prop.IsValid()) continue;
            if (playerTouches(e.origin, LEVEL_END_HULL_MIN, LEVEL_END_HULL_MAX, playerOrigin)) {
                this.fired = true;
                this.onExit();
                return;
            }
        }
    }
}

class Items {
    items=[];
    fx;
    onMessage=() => {};
    sounds;
    playerSrc="";
    touchTmpl;
    isToucher=() => false;
    conns=[];
    spawnTag="normal";
    setToucher(fn) {
        this.isToucher = fn;
    }
    onEnable(fx, sounds, playerSrc, onMessage = () => {}, diff = DIFFICULTY_DEFAULT) {
        this.spawnTag = spawnTagOf(diff);
        this.onDisable();
        this.fx = fx;
        this.onMessage = onMessage;
        this.sounds = sounds;
        this.playerSrc = playerSrc;
        const tt = Instance.FindEntityByName(ITEM_TOUCH_TEMPLATE);
        this.touchTmpl = tt instanceof PointTemplate ? tt : undefined;
        if (!this.touchTmpl) print(`[quake] no "${ITEM_TOUCH_TEMPLATE}" - distance-check pickup`);
        for (const def of ITEM_DEFS) this.spawn(def);
    }
    onDisable() {
        for (const id of this.conns) {
            try {
                Instance.DisconnectOutput(id);
            } catch {}
        }
        this.conns = [];
        for (const it of this.items) {
            safeRemove(it.prop);
            if (it.trigger) safeRemove(it.trigger);
        }
        this.items = [];
    }
    props() {
        const out = [];
        for (const it of this.items) {
            if (it.prop.IsValid()) out.push(it.prop);
            if (it.trigger?.IsValid()) out.push(it.trigger);
        }
        return out;
    }
    spawn(def) {
        const t = Instance.FindEntityByName(def.templateName);
        if (!t) return;
        if (!(t instanceof PointTemplate)) {
            print(`[quake] "${def.templateName}" is ${t.GetClassName()}, not a point_template`);
            return;
        }
        let n = 0;
        let deferred = 0;
        for (const mk of findSpawnMarkers(def.spawnName, this.spawnTag)) {
            if (hasSpawnVar(mk.GetEntityName(), "trigger")) {
                const id = Instance.ConnectOutput(mk, "OnUser2", () => {
                    if (this.items.some(it => it.marker === mk && !it.taken)) return;
                    this.placeItem(t, def, mk);
                });
                if (id !== undefined) this.conns.push(id);
                deferred++;
                continue;
            }
            if (this.placeItem(t, def, mk)) n++;
        }
        if (n || deferred) {
            print(`[quake] placed ${n} "${def.spawnName}"` + (deferred ? ` (${deferred} armed for OnUser2)` : ""));
        }
    }
    placeItem(t, def, mk) {
        if (!mk.IsValid()) return false;
        const box = def.kind === "health" || def.kind === "shells" || def.kind === "ammo";
        const raised = new Vec3(mk.GetAbsOrigin()).withZ(mk.GetAbsOrigin().z + ITEM_PLACE_RAISE);
        const floor = box ? this.dropToFloor(raised) : raised;
        const yaw = mk.GetAbsAngles().yaw;
        const sp = t.ForceSpawn(box ? floor.add(BOX_SPAWN_OFS) : floor, {
            pitch: 0,
            yaw,
            roll: 0
        });
        if (!sp || sp.length === 0) {
            print(`[quake] "${def.templateName}" ForceSpawn returned nothing - check its Template keyvalues`);
            return false;
        }
        if (SPIN_KINDS.has(def.kind)) {
            Instance.EntFireAtTarget({
                target: sp[0],
                input: "SetAnimation",
                value: IDLE_ANIM
            });
        }
        const propPos = box ? floor.add(BOX_SPAWN_OFS) : floor;
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
    wireTouch(it, floor) {
        if (!this.touchTmpl) return;
        const tsp = this.touchTmpl.ForceSpawn(floor, {
            pitch: 0,
            yaw: 0,
            roll: 0
        });
        const trig = tsp && tsp.length ? tsp[0] : undefined;
        if (!trig) return;
        it.trigger = trig;
        for (const out of [ "OnStartTouch", "OnTrigger" ]) {
            const id = Instance.ConnectOutput(trig, out, d => {
                if (this.isToucher(d.activator)) this.collect(it);
            });
            if (id !== undefined) this.conns.push(id);
        }
    }
    dropToFloor(pos) {
        const z0 = new Vec3(0, 0, 0);
        const tr = traceHull(pos, z0, z0, pos.withZ(pos.z - ITEM_DROP_DIST));
        return tr.fraction < 1 && !tr.allsolid ? new Vec3(tr.endpos) : new Vec3(pos);
    }
    update(playerOrigin, playerAlive) {
        for (const it of this.items) {
            if (!it.parent?.IsValid() || !it.prop.IsValid()) continue;
            const o = new Vec3(it.parent.GetAbsOrigin());
            it.prop.Move({
                position: o.add(it.propOfs)
            });
            it.origin = o.add(it.trigOfs);
            it.trigger?.Move({
                position: it.origin
            });
        }
        if (!playerAlive || this.items.length === 0) return;
        for (const it of this.items) {
            if (!it.prop.IsValid() || it.trigger) continue;
            if (!playerTouches(it.origin, ITEM_HULL_MIN, ITEM_HULL_MAX, playerOrigin)) continue;
            this.collect(it);
        }
        this.items = this.items.filter(it => it.prop.IsValid());
    }
    collect(it) {
        if (it.taken || !it.prop.IsValid()) return;
        if (!this.apply(it.def)) return;
        it.taken = true;
        const k = it.def.kind;
        this.onMessage(it.def.give, k === "powerup" || k === "key" || k === "rune");
        this.sounds?.play(it.def.sound, this.playerSrc);
        if (it.marker.IsValid()) Instance.EntFireAtTarget({
            target: it.marker,
            input: "FireUser1"
        });
        it.prop.Remove();
        if (it.trigger) safeRemove(it.trigger);
    }
    apply(def) {
        if (!this.fx) return false;
        if (def.kind === "armor") return this.fx.armor(def.armorType, def.armorValue);
        if (def.kind === "health") return this.fx.heal(def.heal, def.healIgnoreMax);
        if (def.kind === "suit") return this.fx.suit();
        if (def.kind === "powerup") return this.fx.powerup(def.powerKind);
        if (def.kind === "ammo") return this.fx.ammo(def.ammoKind, def.ammoN);
        if (def.kind === "key") return this.fx.key(def.keyIdx);
        if (def.kind === "rune") return this.fx.rune(def.runeIdx);
        if (def.kind === "weapon") {
            this.fx.weapon(def.csWeapon);
            if (def.ammoKind) this.fx.ammo(def.ammoKind, def.ammoN ?? 0);
            return true;
        }
        return this.fx.shells(def.shells);
    }
}

const EMIT_NAME$1 = "emit_sound";

class Sounds {
    voice="f";
    setVoice(v) {
        this.voice = v;
    }
    onEnable() {
        if (!Instance.FindEntityByName(EMIT_NAME$1)) {
            print(`[quake] no "${EMIT_NAME$1}" entity, sounds off`);
        }
    }
    onDisable() {}
    play(event, srcName) {
        this.fire(event, srcName);
    }
    fire(event, srcName) {
        if (!event || !srcName) return;
        if (this.voice === "f" && event.startsWith("Quake.player_") && !event.startsWith("Quake.player_f_")) {
            event = "Quake.player_f_" + event.slice("Quake.player_".length);
        }
        Instance.EntFireAtName({
            name: EMIT_NAME$1,
            input: "SetSoundEventName",
            value: event
        });
        Instance.EntFireAtName({
            name: EMIT_NAME$1,
            input: "SetSourceEntity",
            value: srcName
        });
        Instance.EntFireAtName({
            name: EMIT_NAME$1,
            input: "StartSound"
        });
    }
}

const EMIT_NAME = "emit_music";

class Music {
    enabled=true;
    desired="";
    playing="";
    src="";
    setEnabled(on) {
        if (this.enabled === on) return;
        this.enabled = on;
        if (on) this.apply(); else this.stopEmitter();
    }
    onEnable() {
        if (!Instance.FindEntityByName(EMIT_NAME)) {
            print(`[quake] no "${EMIT_NAME}" entity, music off`);
        }
    }
    onDisable() {
        this.desired = "";
        this.stopEmitter();
    }
    play(event, srcName) {
        if (!event || event === this.desired) return;
        this.desired = event;
        this.src = srcName;
        if (this.enabled) this.apply();
    }
    stop() {
        if (!this.desired) return;
        this.desired = "";
        if (this.enabled) this.stopEmitter();
    }
    apply() {
        if (this.desired === this.playing) return;
        this.playing = this.desired;
        Instance.EntFireAtName({
            name: EMIT_NAME,
            input: "SetSoundEventName",
            value: this.desired
        });
        Instance.EntFireAtName({
            name: EMIT_NAME,
            input: "SetSourceEntity",
            value: this.src
        });
        Instance.EntFireAtName({
            name: EMIT_NAME,
            input: "StartSound"
        });
    }
    stopEmitter() {
        if (!this.playing) return;
        this.playing = "";
        Instance.EntFireAtName({
            name: EMIT_NAME,
            input: "StopSound"
        });
    }
}

const CHANGES_PER_TICK = 256;

let tickStamp = -1;

let committed = 0;

const queue = new Map;

let drainArmed = false;

function rollTick() {
    const t = Instance.GetGameTime();
    if (t === tickStamp) return;
    tickStamp = t;
    committed = 0;
}

function commit(op) {
    if (!op.layout.IsValid()) return;
    if (op.slot < 0) op.layout.SetHasClass(op.panel, op.cls, op.on); else op.layout.SetHasClassForPlayer(op.slot, op.panel, op.cls, op.on);
    committed++;
}

function armDrain() {
    if (drainArmed) return;
    drainArmed = true;
    Instance.Delay(TICK_INTERVAL).then(drain);
}

function drain() {
    drainArmed = false;
    rollTick();
    for (const [key, op] of queue) {
        if (committed >= CHANGES_PER_TICK) break;
        queue.delete(key);
        commit(op);
    }
    if (queue.size > 0) armDrain();
}

function keyOf(layout, slot, panel, cls) {
    return layout.GetEntityName() + "::" + slot + "::" + panel + "::" + cls;
}

function setLayoutClass(layout, slot, panel, cls, on) {
    if (!layout) return;
    rollTick();
    const key = keyOf(layout, slot, panel, cls);
    const pending = queue.get(key);
    if (pending) {
        pending.on = on;
        return;
    }
    if (queue.size === 0 && committed < CHANGES_PER_TICK) {
        commit({
            layout,
            slot,
            panel,
            cls,
            on
        });
        return;
    }
    queue.set(key, {
        layout,
        slot,
        panel,
        cls,
        on
    });
    armDrain();
}

const HUD_NAME = "quake_hud";

const SLOT = 0;

const HINT_SLOTS = 11;

const BOSS_BAR_SEGS = 30;

const FINALE_ROWS = 6;

const FINALE_COLS = 34;

const FINALE_CPS = 34;

const FINALE_BLIP_INTERVAL = .06;

const FINALE_PAGES = [ [ "As the corpse of the monstrous", "entity Chthon sinks back into the", "lava whence it rose, you grip the", "Rune of Earth Magic tightly.", "You have conquered the Dimension", "of the Doomed." ], [ "Three realms of Quake yet remain.", "Only with all four Runes of Power,", "and an understanding of the true", "nature of the beast, will you", "fare well against his forces." ], [ "The gate to the Realm of Black", "Magic shudders open before you.", "You step through, and the world", "falls away." ] ];

const STATS_SLOTS = 18;

const LOAD_STAT_SLOTS = 26;

const CTRL_HINTS = [ "Open Menu    [TAB]", "Weapon Wheel    [F]" ];

const CTRL_HINT_SLOTS = 19;

const NOAMMO_TEXT = "Not enough ammo";

const NOAMMO_SLOTS = 16;

const NOAMMO_HOLD = 2;

const CENTER_SLOTS = 32;

const CENTER_HOLD = 3;

const MSG_SLOTS = 128;

const MSG_HOLD = 4;

const MSG_FADE = 1.2;

const WHEEL_SLOTS = 8;

const WHEEL_AMMO_SLOTS = 4;

const WHEEL_NAMES = [ "Axe", "Shotgun", "Super Shotgun", "Nailgun", "Super Nailgun", "Grenade Launcher", "Rocket Launcher", "Thunderbolt" ];

const D = [ "q_d0", "q_d1", "q_d2", "q_d3", "q_d4", "q_d5", "q_d6", "q_d7", "q_d8", "q_d9", "q_dm", "q_alt" ];

const SM = [ "q_s0", "q_s1", "q_s2", "q_s3", "q_s4", "q_s5", "q_s6", "q_s7", "q_s8", "q_s9" ];

const FACE = [ "q_ff0", "q_ff1", "q_ff2", "q_ff3", "q_ff4", "q_fp0", "q_fp1", "q_fp2", "q_fp3", "q_fp4", "q_fquad", "q_finvis", "q_finvuln", "q_finvisinvuln" ];

const DIGITS = [ "hp_d0", "hp_d1", "hp_d2", "armor_d0", "armor_d1", "armor_d2", "ammo_d0", "ammo_d1", "ammo_d2" ];

const ICONS = [ [ "armor_icon", [ "q_ar1", "q_ar2", "q_ar3" ] ], [ "ammo_icon", [ "q_a_shells", "q_a_nails", "q_a_rocket", "q_a_cells" ] ], [ "face", FACE ] ];

const WSLOTS = [ 0, 1, 2, 3, 4, 5, 6 ];

const INV = [ ...[ "sm00", "sm01", "sm02", "sm10", "sm11", "sm12", "sm20", "sm21", "sm22", "sm30", "sm31", "sm32" ].map(p => [ p, SM ]), ...WSLOTS.map(s => [ `ws${s}`, [ "q_own", "q_sel" ] ]), ...[ "key0", "key1", "pow0", "pow1", "pow2", "pow3", "sig0", "sig1", "sig2", "sig3" ].map(p => [ p, [ "q_show" ] ]) ];

const ALL = (() => {
    const out = [];
    for (const d of DIGITS) out.push([ "q_" + d, D ]);
    for (const [p, cs] of ICONS) out.push([ "q_" + p, cs ]);
    for (const [p, cs] of INV) out.push([ "q_" + p, cs ]);
    out.push([ "qw_sigbg", [ "q_show" ] ]);
    for (let i = 0; i < 4; i++) out.push([ `q_spd${i}`, SM ]);
    return out;
})();

class QuakeHud {
    hud;
    last=new Map;
    forcedOff=false;
    interHint="";
    finalePage=0;
    finaleAt=0;
    finaleShown=0;
    finaleBlipAt=0;
    finaleFlat=[];
    levelTime="";
    saveTimeStr="";
    statsLine="";
    msgShownAt=0;
    noAmmoShownAt=0;
    centerShownAt=0;
    get bound() {
        return !!this.hud && this.hud.IsValid();
    }
    onEnable() {
        const e = Instance.FindEntityByName(HUD_NAME);
        this.hud = e instanceof CustomHudLayout ? e : undefined;
        if (!this.hud) {
            print(`[quake] no custom_hud_layout "${HUD_NAME}" - HUD off`);
            return;
        }
        this.resync();
    }
    stripLast() {
        if (this.hud) {
            for (const [key, val] of this.last) {
                const bar = key.indexOf("|");
                if (bar < 0) {
                    setLayoutClass(this.hud, SLOT, key, val, false);
                } else if (val === "1") {
                    setLayoutClass(this.hud, SLOT, key.slice(0, bar), key.slice(bar + 1), false);
                }
            }
        }
        this.last.clear();
    }
    resync() {
        if (!this.hud) return;
        this.stripLast();
        for (const [panel, classes] of ALL) {
            for (const c of classes) setLayoutClass(this.hud, SLOT, panel, c, false);
        }
        this.levelTime = "";
        this.saveTimeStr = "";
        this.statsLine = "";
        this.interHint = "";
        this.msgShownAt = 0;
        this.hideAllPopups();
        this.hideWheel();
        this.setWheelCapture(false);
        this.setDeathCapture(false);
        this.setInterCapture(false);
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", this.forcedOff);
        this.setGlyphStr("q_hint0_", CTRL_HINT_SLOTS, CTRL_HINTS[0]);
        this.setGlyphStr("q_hint1_", CTRL_HINT_SLOTS, CTRL_HINTS[1]);
    }
    onDisable() {
        this.stripLast();
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", true);
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", true);
        this.setWheelCapture(false);
        this.setDeathCapture(false);
        this.setInterCapture(false);
        this.noAmmoShownAt = 0;
        this.centerShownAt = 0;
        this.hud = undefined;
        this.interHint = "";
        this.levelTime = "";
        this.saveTimeStr = "";
        this.msgShownAt = 0;
    }
    setVisible(v) {
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", this.forcedOff || !v);
    }
    setForcedOff(off) {
        this.forcedOff = off;
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", off);
    }
    isForcedOff() {
        return this.forcedOff;
    }
    hideAllPopups() {
        if (!this.hud) return;
        for (const p of [ "q_deathpop", "q_inter", "q_finale", "q_noammo", "q_center" ]) {
            setLayoutClass(this.hud, SLOT, p, "QPopHidden", true);
        }
        this.noAmmoShownAt = 0;
        this.centerShownAt = 0;
    }
    showDeathStats(killed, total, secrets, secretsTotal) {
        if (!this.hud) return;
        this.setGlyphStr("q_dk", 3, this.clamp3(killed));
        this.setGlyphStr("q_dt", 3, this.clamp3(total));
        this.setGlyphStr("q_dsc", 3, this.clamp3(secrets));
        this.setGlyphStr("q_dst", 3, this.clamp3(secretsTotal));
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", false);
        this.setDeathCapture(true);
    }
    hideDeathStats() {
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", true);
        this.setDeathCapture(false);
    }
    setDeathCapture(on) {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }
    setMapTime(str) {
        if (!this.hud || str === this.levelTime) return;
        this.levelTime = str;
        this.setGlyphStr("q_lt", STATS_SLOTS, `MAP TIME`.padEnd(10) + str);
    }
    setSaveTime(str) {
        if (!this.hud || str === this.saveTimeStr) return;
        this.saveTimeStr = str;
        this.setGlyphStr("q_svt", STATS_SLOTS, `SAVE TIME`.padEnd(10) + str);
    }
    setSaveTimeShown(on) {
        this.setToggle("q_svt_row", "QGone", !on);
    }
    showMsg(text, now) {
        if (!this.hud || !text) return;
        this.setGlyphStr("q_log", MSG_SLOTS, text.slice(0, MSG_SLOTS));
        this.setToggle("q_log", "QLogFade", false);
        this.msgShownAt = now;
    }
    updateLog(now) {
        if (!this.hud || this.msgShownAt === 0) return;
        const age = now - this.msgShownAt;
        this.setToggle("q_log", "QLogFade", age > MSG_HOLD);
        if (age > MSG_HOLD + MSG_FADE + .3) {
            this.setGlyphStr("q_log", MSG_SLOTS, "");
            this.msgShownAt = 0;
        }
    }
    showNoAmmo(now) {
        if (!this.hud) return;
        this.noAmmoShownAt = now;
        this.setGlyphStr("q_na", NOAMMO_SLOTS, NOAMMO_TEXT);
        setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", false);
    }
    updateNoAmmo(now) {
        if (!this.hud || this.noAmmoShownAt === 0) return;
        if (now - this.noAmmoShownAt >= NOAMMO_HOLD) {
            setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", true);
            this.noAmmoShownAt = 0;
        }
    }
    showCenter(text, now) {
        if (!this.hud) return;
        this.centerShownAt = now;
        this.setGlyphStr("q_ce", CENTER_SLOTS, text);
        setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", false);
    }
    updateCenter(now) {
        if (!this.hud || this.centerShownAt === 0) return;
        if (now - this.centerShownAt >= CENTER_HOLD) {
            setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", true);
            this.centerShownAt = 0;
        }
    }
    setWheelCapture(on) {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }
    showWheel() {
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", false);
    }
    hideWheel() {
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", true);
    }
    setWheel(slots, activeIdx) {
        if (!this.hud) return;
        for (let i = 0; i < WHEEL_SLOTS; i++) {
            const s = slots[i];
            const owned = !!s && s.owned;
            this.setToggle(`q_ww_i${i}`, "QWwHave", owned);
            this.setToggle(`q_ww_i${i}`, "QWwLow", owned && !s.hasAmmo);
            this.setToggle(`q_ww_i${i}`, "QWwCur", i === activeIdx);
            this.setToggle(`q_ww_hov${i}`, "QWwOff", !owned);
            this.setGlyphStr(`q_wh${i}_n`, 18, WHEEL_NAMES[i] ?? "");
            const k = s && s.ammoKind ? s.ammoKind === "rockets" ? "rocket" : s.ammoKind : "";
            this.setOne(`q_wh${i}_ai`, k ? `QWwAi_${k}` : undefined);
            this.setGlyphStr(`q_wh${i}_a`, WHEEL_AMMO_SLOTS, s && s.ammo >= 0 ? String(s.ammo) : "");
        }
    }
    showIntermission(timeStr, killed, total, secrets = 0, secretsTotal = 0) {
        if (!this.hud) return;
        this.setGlyphStr("q_tm", 5, timeStr);
        this.setGlyphStr("q_kc", 3, this.clamp3(killed));
        this.setGlyphStr("q_tc", 3, this.clamp3(total));
        this.setGlyphStr("q_sc", 3, this.clamp3(secrets));
        this.setGlyphStr("q_stc", 3, this.clamp3(secretsTotal));
        this.interHint = "";
        this.hideAllPopups();
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", false);
        this.setInterCapture(true);
    }
    showFinale() {
        if (!this.hud) return;
        this.interHint = "";
        this.renderFinalePage(0);
        this.hideAllPopups();
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", false);
        this.setInterCapture(false);
    }
    setInterCapture(on) {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }
    renderFinalePage(p) {
        if (!this.hud) return;
        this.finalePage = p;
        this.finaleAt = 0;
        this.finaleShown = 0;
        this.finaleBlipAt = 0;
        this.finaleFlat = [];
        const lines = FINALE_PAGES[p] ?? [];
        for (let r = 0; r < FINALE_ROWS; r++) {
            this.setGlyphStr(`q_fl${r}_`, FINALE_COLS, lines[r] ?? "");
            for (let c = 0; c < FINALE_COLS; c++) {
                this.setToggle(`q_fl${r}_${c}`, "q_on", false);
                this.setToggle(`q_fl${r}_${c}`, "q_typed", false);
            }
        }
        for (let r = 0; r < lines.length; r++) {
            for (let c = 0; c < lines[r].length; c++) this.finaleFlat.push([ r, c ]);
        }
    }
    updateFinale(now) {
        if (!this.hud) return;
        if (this.finaleAt === 0) this.finaleAt = now;
        const lines = FINALE_PAGES[this.finalePage] ?? [];
        const target = Math.min(this.finaleFlat.length, Math.floor((now - this.finaleAt) * FINALE_CPS));
        for (let i = this.finaleShown; i < target; i++) {
            const [r, c] = this.finaleFlat[i];
            this.setToggle(`q_fl${r}_${c}`, "q_on", true);
            if (lines[r] && lines[r][c] !== " " && now - this.finaleBlipAt >= FINALE_BLIP_INTERVAL) {
                this.setToggle(`q_fl${r}_${c}`, "q_typed", true);
                this.finaleBlipAt = now;
            }
        }
        this.finaleShown = target;
    }
    finaleAdvance() {
        if (!this.hud) return false;
        if (this.finaleShown < this.finaleFlat.length) {
            for (let i = this.finaleShown; i < this.finaleFlat.length; i++) {
                const [r, c] = this.finaleFlat[i];
                this.setToggle(`q_fl${r}_${c}`, "q_on", true);
            }
            this.finaleShown = this.finaleFlat.length;
            return true;
        }
        if (this.finalePage + 1 < FINALE_PAGES.length) {
            this.renderFinalePage(this.finalePage + 1);
            return true;
        }
        return false;
    }
    hideIntermission() {
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", true);
        this.setInterCapture(false);
    }
    showLoading() {
        if (!this.hud || !this.hud.IsValid()) {
            const e = Instance.FindEntityByName(HUD_NAME);
            this.hud = e instanceof CustomHudLayout ? e : undefined;
        }
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", false);
    }
    hideLoading() {
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", true);
        this.setGlyphStr("q_lstat_", LOAD_STAT_SLOTS, "");
    }
    setLoadStatus(text) {
        this.setGlyphStr("q_lstat_", LOAD_STAT_SLOTS, text.toUpperCase().slice(0, LOAD_STAT_SLOTS));
    }
    setInterHint(text) {
        if (!this.hud || text === this.interHint) return;
        this.interHint = text;
        this.setGlyphStr("q_fh", HINT_SLOTS, text);
    }
    clamp3(n) {
        const s = String(Math.max(0, Math.trunc(n)));
        return s.length > 3 ? "999" : s;
    }
    setGlyphStr(prefix, slots, str) {
        for (let i = 0; i < slots; i++) {
            const has = i < str.length;
            this.setOne(`${prefix}${i}`, has ? `g${str.charCodeAt(i)}` : undefined);
            this.setToggle(`${prefix}${i}`, "GlBlank", !has);
        }
    }
    setOne(panel, cls) {
        const prev = this.last.get(panel);
        if (prev === cls) return;
        if (prev) setLayoutClass(this.hud, SLOT, panel, prev, false);
        if (cls) {
            setLayoutClass(this.hud, SLOT, panel, cls, true);
            this.last.set(panel, cls);
        } else {
            this.last.delete(panel);
        }
    }
    setToggle(panel, cls, on) {
        const key = panel + "|" + cls;
        const want = on ? "1" : "0";
        if (this.last.get(key) === want) return;
        this.last.set(key, want);
        setLayoutClass(this.hud, SLOT, panel, cls, on);
    }
    setNum(prefix, n, alt) {
        let s = String(Math.trunc(n));
        if (s.length > 3) s = s.slice(-3);
        s = s.padStart(3, " ");
        for (let i = 0; i < 3; i++) {
            const ch = s[i];
            const p = `${prefix}_d${i}`;
            this.setOne(p, ch === " " ? undefined : ch === "-" ? "q_dm" : `q_d${ch}`);
            this.setToggle(p, "q_alt", alt);
        }
    }
    setSmall(prefix, group, n) {
        let s = String(Math.max(0, Math.trunc(n)));
        if (s.length > 3) s = s.slice(-3);
        s = s.padStart(3, " ");
        for (let i = 0; i < 3; i++) {
            const ch = s[i];
            this.setOne(`${prefix}sm${group}${i}`, ch === " " ? undefined : `q_s${ch}`);
        }
    }
    setSpeed(n) {
        let s = String(Math.max(0, Math.trunc(n)));
        if (s.length > 4) s = "9999";
        for (let i = 0; i < 4; i++) {
            this.setOne(`q_spd${i}`, i < s.length ? `q_s${s[i]}` : undefined);
        }
    }
    update(st) {
        if (!this.hud) return;
        const p = "q_";
        this.setSpeed(st.speed);
        this.setNum(`${p}armor`, st.armor, st.armor <= 25);
        this.setOne(`${p}armor_icon`, st.armor > 0 && st.armorType ? `q_ar${st.armorType}` : undefined);
        this.setNum(`${p}hp`, st.health, st.health <= 25);
        let face;
        if (st.face === "invisinvuln") face = "q_finvisinvuln"; else if (st.face === "quad") face = "q_fquad"; else if (st.face === "invis") face = "q_finvis"; else if (st.face === "invuln") face = "q_finvuln"; else {
            const f = st.health >= 100 ? 4 : Math.max(0, Math.trunc(st.health / 20));
            face = `${st.painFlash ? "q_fp" : "q_ff"}${f}`;
        }
        this.setOne(`${p}face`, face);
        this.setNum(`${p}ammo`, st.ammo, st.ammo <= 10);
        this.setOne(`${p}ammo_icon`, st.ammoType === "none" ? undefined : `q_a_${st.ammoType}`);
        this.setSmall(p, 0, st.shells);
        this.setSmall(p, 1, st.nails);
        this.setSmall(p, 2, st.rockets);
        this.setSmall(p, 3, st.cells);
        for (let i = 0; i < 7; i++) {
            const own = st.weapons[i];
            this.setToggle(`${p}ws${i}`, "q_own", own);
            this.setToggle(`${p}ws${i}`, "q_sel", own && st.activeWeapon === i);
        }
        this.setToggle(`${p}key0`, "q_show", st.keys[0]);
        this.setToggle(`${p}key1`, "q_show", st.keys[1]);
        for (let i = 0; i < 4; i++) this.setToggle(`${p}pow${i}`, "q_show", st.powerups[i]);
        for (let i = 0; i < 4; i++) this.setToggle(`${p}sig${i}`, "q_show", st.sigils[i]);
        this.setToggle("qw_sigbg", "q_show", st.sigils.some(Boolean));
        const bshow = st.bossHp > 0;
        this.setToggle("q_bossbar", "QBossOn", bshow);
        const lit = bshow ? Math.max(1, Math.ceil(Math.min(1, st.bossHp) * BOSS_BAR_SEGS)) : 0;
        for (let i = 0; i < BOSS_BAR_SEGS; i++) this.setToggle(`q_bseg${i}`, "q_dim", i >= lit);
        const kill = `KILLS`.padEnd(10) + `${st.kills}/${st.killsTotal}`;
        const secr = `SECRETS`.padEnd(10) + `${st.secrets}/${st.secretsTotal}`;
        const line = `${kill}|${secr}`;
        if (line !== this.statsLine) {
            this.statsLine = line;
            this.setGlyphStr("q_ks", STATS_SLOTS, kill);
            this.setGlyphStr("q_scs", STATS_SLOTS, secr);
        }
    }
}

const MENU_NAME = "quake_hud";

class QuakeMenu {
    layout;
    open=false;
    screen="main";
    mode="overlay";
    saveAvailable=false;
    slot=0;
    last=new Map;
    pendingSlot=0;
    slotOccupied=[];
    newDiffIdx=1;
    nmUnlocked=false;
    onEnable(slot) {
        this.slot = slot;
        const e = Instance.FindEntityByName(MENU_NAME);
        this.layout = e instanceof CustomHudLayout ? e : undefined;
        if (!this.layout) print(`[quake] no custom_hud_layout "${MENU_NAME}", menu off`);
    }
    isOpen() {
        return this.open;
    }
    chosenSlot() {
        return this.pendingSlot;
    }
    chosenDifficulty() {
        return DIFFICULTIES[this.newDiffIdx];
    }
    newDiffLocked() {
        return this.newDiffIdx === 3 && !this.nmUnlocked;
    }
    show(mode = "overlay", hasSave = false) {
        if (!this.layout) return false;
        this.open = true;
        this.mode = mode;
        this.saveAvailable = hasSave;
        this.screen = "main";
        this.applyScreen();
        setLayoutClass(this.layout, this.slot, "qm_root", "QmMain", mode === "main");
        setLayoutClass(this.layout, this.slot, "qm_continue", "QmDisabled", !hasSave);
        setLayoutClass(this.layout, this.slot, "qm_newgame", "QmDisabled", false);
        setLayoutClass(this.layout, this.slot, "qm_root", "QmHidden", false);
        this.layout.SetInputCaptureEnabled(this.slot, true);
        Instance.ServerCommand("cl_draw_only_deathnotices 1");
        return true;
    }
    hide() {
        this.open = false;
        if (!this.layout) return;
        setLayoutClass(this.layout, this.slot, "qm_root", "QmHidden", true);
        this.layout.SetInputCaptureEnabled(this.slot, false);
    }
    onClick(buttonId) {
        if (!this.open) return undefined;
        switch (buttonId) {
          case "qm_continue":
            return this.saveAvailable ? "opencontslots" : "disabled";

          case "qm_newgame":
            if (this.mode === "overlay") return "resume";
            return "opennewslots";

          case "qm_quit":
            return "quit";

          case "qm_exit":
            return "exit";

          case "qm_options":
            this.screen = "options";
            this.applyScreen();
            return undefined;

          case "qm_cheats":
            this.screen = "cheats";
            this.applyScreen();
            return undefined;

          case "qm_help":
            this.screen = "help";
            this.applyScreen();
            return undefined;

          case "qm_back_c":
            this.screen = "options";
            this.applyScreen();
            return undefined;

          case "qm_back":
          case "qm_hlp_back":
          case "qm_ns_back":
          case "qm_cs_back":
            this.screen = "main";
            this.applyScreen();
            return undefined;

          case "qm_st_back":
            return "opencontslots";

          case "qm_ns0":
          case "qm_ns1":
          case "qm_ns2":
            this.pendingSlot = +buttonId.slice(-1);
            this.openDiff();
            return undefined;

          case "qm_df_back":
            this.screen = "newslots";
            this.applyScreen();
            return undefined;

          case "qm_df_prev":
          case "qm_df_next":
            {
                const d = buttonId.endsWith("next") ? 1 : -1;
                this.newDiffIdx = Math.min(3, Math.max(0, this.newDiffIdx + d));
                this.renderDiff();
                return undefined;
            }

          case "qm_df_start":
            {
                if (this.newDiffLocked()) return "disabled";
                if (this.slotOccupied[this.pendingSlot]) {
                    this.openConfirm(this.pendingSlot);
                    return undefined;
                }
                return "newgame";
            }

          case "qm_cf_yes":
            return "newgame";

          case "qm_cf_no":
            this.screen = "diff";
            this.applyScreen();
            return undefined;

          case "qm_cs0":
          case "qm_cs1":
          case "qm_cs2":
            {
                const n = +buttonId.slice(-1);
                if (!this.slotOccupied[n]) return "disabled";
                this.pendingSlot = n;
                return "continue";
            }

          case "qm_cs0s":
          case "qm_cs1s":
          case "qm_cs2s":
            {
                const n = +buttonId.charAt(5);
                if (!this.slotOccupied[n]) return "disabled";
                this.pendingSlot = n;
                return "openstats";
            }

          case "qm_opt_bob":
            return "toggleBob";

          case "qm_opt_hit":
            return "toggleHitmarker";

          case "qm_opt_svt":
            return "toggleSaveTime";

          case "qm_opt_music":
            return "toggleMusic";

          case "qm_opt_crt":
            return "toggleCrt";

          case "qm_opt_8bit":
            return "toggle8bit";

          case "qm_opt_voice":
            return "toggleVoice";

          case "qm_opt_vmpos":
            return "toggleVmPos";

          case "qm_opt_sprint":
            return "toggleAlwaysSprint";

          case "qm_opt_step":
            return "toggleStepSmooth";

          case "qm_opt_fov_dn":
            return "fovDown";

          case "qm_opt_fov_up":
            return "fovUp";

          case "qm_cht_hop":
            return "toggleAutohop";

          case "qm_cht_all":
            return "toggleGiveAll";

          case "qm_cht_god":
            return "toggleGod";

          case "qm_cht_ammo":
            return "toggleInfAmmo";
        }
        return undefined;
    }
    openNewSlots(sums, nmUnlocked = false) {
        this.slotOccupied = sums.map(s => s.occupied);
        this.nmUnlocked = nmUnlocked;
        for (let i = 0; i < SAVE_SLOTS; i++) this.setGlyphs(`qm_ns_v${i}_`, 6, sums[i]?.label ?? "EMPTY");
        this.screen = "newslots";
        this.applyScreen();
    }
    openDiff() {
        this.renderDiff();
        this.screen = "diff";
        this.applyScreen();
    }
    renderDiff() {
        const locked = this.newDiffLocked();
        this.setGlyphs("qm_df_v_", 9, this.chosenDifficulty().toUpperCase());
        this.setDim("qm_df_v", locked);
        this.setGlyphs("qm_df_hint_", 17, locked ? "FINISH HARD FIRST" : "");
    }
    openContSlots(sums) {
        this.slotOccupied = sums.map(s => s.occupied);
        for (let i = 0; i < SAVE_SLOTS; i++) {
            const s = sums[i];
            this.setGlyphs(`qm_cs_v${i}_`, 16, s?.occupied ? `${s.label} ${s.difficulty}` : "----");
            this.setDim(`qm_cs${i}`, !s?.occupied);
            this.setDim(`qm_cs${i}s`, !s?.occupied);
        }
        this.screen = "contslots";
        this.applyScreen();
    }
    openConfirm(slot) {
        this.setGlyphs("qm_cf_slot_", 6, `SLOT ${slot + 1}`);
        this.screen = "confirm";
        this.applyScreen();
    }
    openStats(slot, lines, saveTimeStr) {
        this.screen = "stats";
        this.applyScreen();
        this.setGlyphs("qm_st_slot_", 6, `SLOT ${slot + 1}`);
        this.setGlyphs("qm_st_time_", 9, saveTimeStr);
        this.setGlyphs("qm_st_hdr_", STATS_ROW_COLS, "LEVEL SCRT   KILLS  TIME");
        for (let r = 0; r < STATS_MAX_ROWS; r++) {
            const on = r < lines.length;
            this.setRowHidden(`qm_st${r}`, !on);
            if (on) this.setGlyphs(`qm_st${r}_`, STATS_ROW_COLS, lines[r]);
        }
    }
    setOptionValues(viewBob, crt, eightbit, voice, vmPos, alwaysSprint, stepSmooth, fov, hitmarker, showSaveTime, music, autoHop, giveAll, god, infAmmo) {
        this.setGlyphs("qm_bob_v", 3, viewBob ? "ON" : "OFF");
        this.setGlyphs("qm_hit_v", 3, hitmarker ? "ON" : "OFF");
        this.setGlyphs("qm_svt_v", 3, showSaveTime ? "ON" : "OFF");
        this.setGlyphs("qm_music_v", 3, music ? "ON" : "OFF");
        this.setGlyphs("qm_crt_v", 3, crt ? "ON" : "OFF");
        this.setGlyphs("qm_8bit_v", 3, eightbit ? "ON" : "OFF");
        this.setGlyphs("qm_voice_v", 4, voice === "f" ? "FEM" : "MASC");
        this.setGlyphs("qm_vmpos_v", 6, vmPos.toUpperCase());
        this.setGlyphs("qm_sprint_v", 3, alwaysSprint ? "ON" : "OFF");
        this.setGlyphs("qm_step_v", 3, stepSmooth ? "ON" : "OFF");
        this.setGlyphs("qm_fov_v", 3, String(fov));
        this.setGlyphs("qm_hop_v", 3, autoHop ? "ON" : "OFF");
        this.setGlyphs("qm_all_v", 3, giveAll ? "ON" : "OFF");
        this.setGlyphs("qm_god_v", 3, god ? "ON" : "OFF");
        this.setGlyphs("qm_ammo_v", 3, infAmmo ? "ON" : "OFF");
    }
    applyScreen() {
        if (!this.layout) return;
        const map = [ [ "qm_main", "main" ], [ "qm_opts", "options" ], [ "qm_chts", "cheats" ], [ "qm_hlp", "help" ], [ "qm_ns", "newslots" ], [ "qm_df", "diff" ], [ "qm_cs", "contslots" ], [ "qm_cf", "confirm" ], [ "qm_st", "stats" ] ];
        for (const [panel, scr] of map) {
            setLayoutClass(this.layout, this.slot, panel, "QmScreenHidden", this.screen !== scr);
        }
        setLayoutClass(this.layout, this.slot, "qm_plaque", "QmPlaqueHidden", this.screen !== "main");
    }
    setGlyphs(prefix, slots, text) {
        if (!this.layout) return;
        const t = text.toUpperCase();
        for (let i = 0; i < slots; i++) {
            const code = i < t.length ? t.charCodeAt(i) : 32;
            this.setOne(`${prefix}${i}`, `g${code}`);
        }
    }
    setOne(panel, cls) {
        const prev = this.last.get(panel);
        if (prev === cls) return;
        if (prev) setLayoutClass(this.layout, this.slot, panel, prev, false);
        setLayoutClass(this.layout, this.slot, panel, cls, true);
        this.last.set(panel, cls);
    }
    setDim(panel, on) {
        setLayoutClass(this.layout, this.slot, panel, "QmDisabled", on);
    }
    setRowHidden(panel, on) {
        setLayoutClass(this.layout, this.slot, panel, "QGone", on);
    }
}

const CRT_NAME = "8bit";

const PU_CLASSES = [ "QpuQuad", "QpuSuit", "QpuRing", "QpuPent" ];

class Crt {
    layout;
    waterKind="none";
    flashPing=false;
    bonusPing=false;
    puTint="";
    onEnable(_slot, crtOn, eightbitOn) {
        this.layout = this.findLayout();
        if (!this.layout) print(`[quake] no custom_hud_layout "${CRT_NAME}", CRT overlay won't toggle`);
        this.waterKind = "none";
        setLayoutClass(this.layout, -1, "q_water", "QWaterOn", false);
        setLayoutClass(this.layout, -1, "q_water", "QWaterPoison", false);
        setLayoutClass(this.layout, -1, "q_water", "QWaterLava", false);
        this.puTint = "";
        for (const c of [ "QDmgLo", "QDmgMid", "QDmgHi", "QDmgArmor", "QFlashPing", "QFlashPong", "QBonusPing", "QBonusPong" ]) {
            setLayoutClass(this.layout, -1, "q_flash", c, false);
        }
        for (const c of PU_CLASSES) setLayoutClass(this.layout, -1, "q_powerup", c, false);
        this.applyOverlay(crtOn);
        this.apply8bit(eightbitOn);
    }
    damageFlash(count, armorAbsorbedMost) {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        if (!this.layout) return;
        const pct = Math.min(150, 3 * Math.max(10, count));
        setLayoutClass(this.layout, -1, "q_flash", "QDmgHi", pct >= 100);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgMid", pct >= 55 && pct < 100);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgLo", pct < 55);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgArmor", armorAbsorbedMost);
        this.flashPing = !this.flashPing;
        setLayoutClass(this.layout, -1, "q_flash", "QFlashPing", this.flashPing);
        setLayoutClass(this.layout, -1, "q_flash", "QFlashPong", !this.flashPing);
    }
    bonusFlash() {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        if (!this.layout) return;
        this.bonusPing = !this.bonusPing;
        setLayoutClass(this.layout, -1, "q_flash", "QBonusPing", this.bonusPing);
        setLayoutClass(this.layout, -1, "q_flash", "QBonusPong", !this.bonusPing);
    }
    setPowerupTint(quad, suit, ring, pent) {
        const want = quad ? "QpuQuad" : suit ? "QpuSuit" : ring ? "QpuRing" : pent ? "QpuPent" : "";
        if (want === this.puTint) return;
        this.puTint = want;
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        for (const c of PU_CLASSES) setLayoutClass(this.layout, -1, "q_powerup", c, c === want);
    }
    applyOverlay(on) {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        setLayoutClass(this.layout, -1, "crt_root", "CrtHidden", !on);
    }
    apply8bit(on) {
        Instance.EntFireAtName({
            name: CRT_NAME,
            input: on ? "Enable" : "Disable"
        });
    }
    setWater(kind) {
        if (kind === this.waterKind) return;
        this.waterKind = kind;
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        setLayoutClass(this.layout, -1, "q_water", "QWaterOn", kind !== "none");
        setLayoutClass(this.layout, -1, "q_water", "QWaterPoison", kind === "poison");
        setLayoutClass(this.layout, -1, "q_water", "QWaterLava", kind === "lava");
    }
    findLayout() {
        for (const e of Instance.FindEntitiesByName(CRT_NAME)) {
            if (e instanceof CustomHudLayout) return e;
        }
        for (const e of Instance.FindEntitiesByClass("custom_hud_layout")) {
            if (e instanceof CustomHudLayout && e.GetEntityName() === CRT_NAME) return e;
        }
        return undefined;
    }
}

class Profiler {
    prev=0;
    winStart=0;
    ticks=0;
    order=[];
    acc=new Map;
    lines=[];
    frame() {
        return;
    }
    mark(label) {
        return;
    }
    done() {
        return;
    }
}

const TRIGGER_CLASSES = [ "trigger_multiple", "trigger_once" ];

class MapTriggers {
    isToucher=() => false;
    handlers=new Map;
    prefixHandlers=[];
    touching=new Map;
    connections=[];
    setToucher(fn) {
        this.isToucher = fn;
    }
    bind(triggerName, h) {
        this.handlers.set(triggerName, h);
    }
    unbind(triggerName) {
        this.handlers.delete(triggerName);
    }
    bindPrefix(prefix, h) {
        this.prefixHandlers.push([ prefix, h ]);
    }
    countPrefix(prefix) {
        let n = 0;
        for (const cls of TRIGGER_CLASSES) {
            for (const trig of Instance.FindEntitiesByClass(cls)) {
                if (trig.GetEntityName().startsWith(prefix)) n++;
            }
        }
        return n;
    }
    resolve(name) {
        const h = this.handlers.get(name);
        if (h) return h;
        for (const [p, ph] of this.prefixHandlers) if (name.startsWith(p)) return ph;
        return undefined;
    }
    wire() {
        for (const id of this.connections) Instance.DisconnectOutput(id);
        this.connections = [];
        this.touching.clear();
        let n = 0;
        for (const cls of TRIGGER_CLASSES) {
            for (const trig of Instance.FindEntitiesByClass(cls)) {
                const name = trig.GetEntityName();
                if (!name) continue;
                this.hook(trig, name, "OnStartTouch", "start");
                this.hook(trig, name, "OnTrigger", "touching");
                this.hook(trig, name, "OnEndTouch", "end");
                n++;
            }
        }
        if (n) print(`[quake] wired ${n} brush trigger(s)`);
    }
    reset() {
        this.touching.clear();
    }
    isTouching(name) {
        for (const v of this.touching.values()) if (v === name) return true;
        return false;
    }
    isTouchingPrefix(prefix) {
        for (const v of this.touching.values()) if (v.startsWith(prefix)) return true;
        return false;
    }
    hook(trig, name, output, phase) {
        const id = Instance.ConnectOutput(trig, output, d => {
            if (!this.isToucher(d.activator)) return;
            if (phase === "start") this.touching.set(trig, name); else if (phase === "end") this.touching.delete(trig); else if (!this.touching.has(trig)) return;
            const h = this.resolve(name);
            if (!h) {
                return;
            }
            if (phase === "start") h.onStart?.(name, d.activator, trig); else if (phase === "touching") h.onTouching?.(name, d.activator, trig); else h.onEnd?.(name, d.activator, trig);
        });
        if (id !== undefined) this.connections.push(id);
    }
}

const ZERO = new Vec3(0, 0, 0);

const KINDS = [ {
    base: "door_prox",
    openInput: "open",
    closeInput: "close",
    sndOpen: SND.doorMove,
    sndClose: SND.doorStop,
    stay: false,
    crush: true,
    close: true,
    shoot: false,
    lift: false,
    hr: DOOR_PROX_RADIUS,
    zr: DOOR_PROX_Z,
    front: false,
    trace: true,
    act: DOOR_ACTIVATE_DIST
}, {
    base: "door_prox_stay",
    openInput: "open",
    closeInput: "close",
    sndOpen: SND.doorMove,
    sndClose: "",
    stay: true,
    crush: false,
    close: true,
    shoot: false,
    lift: false,
    hr: DOOR_PROX_RADIUS,
    zr: DOOR_PROX_Z,
    front: false,
    trace: true,
    act: DOOR_ACTIVATE_DIST
}, {
    base: "door_shoot",
    openInput: "open",
    closeInput: "close",
    sndOpen: SND.doorMove,
    sndClose: "",
    stay: false,
    crush: false,
    close: false,
    shoot: true,
    lift: false,
    hr: 0,
    zr: 0,
    front: false,
    trace: false,
    act: 0
}, {
    base: "door_shoot_stay",
    openInput: "open",
    closeInput: "close",
    sndOpen: SND.doorMove,
    sndClose: "",
    stay: true,
    crush: false,
    close: false,
    shoot: true,
    lift: false,
    hr: 0,
    zr: 0,
    front: false,
    trace: false,
    act: 0
}, {
    base: "lift_prox",
    openInput: "open",
    closeInput: "close",
    sndOpen: SND.doorMove,
    sndClose: SND.doorStop,
    stay: false,
    crush: false,
    close: true,
    shoot: false,
    lift: true,
    hr: 0,
    zr: 0,
    front: false,
    trace: false,
    act: 0
}, {
    base: "button_prox",
    openInput: "press",
    closeInput: "pressout",
    sndOpen: SND.buttonPress,
    sndClose: "",
    stay: false,
    crush: false,
    close: false,
    shoot: false,
    lift: false,
    hr: BUTTON_PROX_RADIUS,
    zr: BUTTON_PROX_Z,
    front: true,
    trace: false,
    act: 0
}, {
    base: "button_prox_stay",
    openInput: "pressin",
    closeInput: "pressout",
    sndOpen: SND.buttonPress,
    sndClose: "",
    stay: true,
    crush: false,
    close: false,
    shoot: false,
    lift: false,
    hr: BUTTON_PROX_RADIUS,
    zr: BUTTON_PROX_Z,
    front: true,
    trace: false,
    act: 0
}, {
    base: "button_shoot",
    openInput: "press",
    closeInput: "pressout",
    sndOpen: SND.buttonPress,
    sndClose: "",
    stay: false,
    crush: false,
    close: false,
    shoot: true,
    lift: false,
    hr: 0,
    zr: 0,
    front: true,
    trace: false,
    act: 0
}, {
    base: "button_shoot_stay",
    openInput: "pressin",
    closeInput: "pressout",
    sndOpen: SND.buttonPress,
    sndClose: "",
    stay: true,
    crush: false,
    close: false,
    shoot: true,
    lift: false,
    hr: 0,
    zr: 0,
    front: true,
    trace: false,
    act: 0
} ];

class ProxActuators {
    markers=new Map;
    enemies;
    setEnemies(e) {
        this.enemies = e;
    }
    rearm() {
        const prevPos = new Map;
        for (const list of this.markers.values()) {
            for (const m of list) prevPos.set(m.ent, m.pos);
        }
        this.markers.clear();
        for (const k of KINDS) {
            const nested = KINDS.filter(o => o !== k && o.base.startsWith(k.base)).map(o => o.base);
            let found = Instance.FindEntitiesByName(`${k.base}*`).filter(e => !nested.some(b => e.GetEntityName().startsWith(b)));
            if (found.length === 0) found = Instance.FindEntitiesByName(k.base);
            const list = [];
            for (let i = 0; i < found.length; i++) {
                const e = found[i];
                if (!e.IsValid()) continue;
                const tags = entityTags(e.GetEntityName()).map(t => `@${t}`).join("");
                e.SetEntityName(`${k.base}${tags}_${i}`);
                const name = e.GetEntityName();
                let pos = prevPos.get(e);
                if (!pos) {
                    const o = e.GetAbsOrigin();
                    pos = new Vec3(o.x, o.y, o.z);
                }
                list.push({
                    name,
                    ent: e,
                    pos,
                    open: false,
                    fired: false,
                    offAt: 0,
                    holdUntil: 0
                });
                if (k.front) Instance.ServerCommand(`ent_fire ${name} Unlock`);
                Instance.ServerCommand(`ent_fire ${name} ${k.closeInput}`);
            }
            this.markers.set(k.base, list);
            print(`[quake] ${k.base}: ${list.length} ` + `[${list.map(m => `${m.name} @ ${m.pos.x.toFixed(0)} ${m.pos.y.toFixed(0)} ${m.pos.z.toFixed(0)}`).join(", ")}]`);
        }
    }
    crushLift(name, now) {
        const k = KINDS.find(x => x.lift);
        const m = k && this.markers.get(k.base)?.find(x => x.name === name);
        if (!m) return;
        Instance.ServerCommand(`ent_fire ${name} close`);
        m.open = false;
        m.offAt = 0;
        m.holdUntil = now + LIFT_CRUSH_HOLD;
    }
    onShot(ent) {
        if (!ent || !ent.IsValid()) return false;
        const name = ent.GetEntityName();
        for (const k of KINDS) {
            if (!k.shoot) continue;
            const m = this.markers.get(k.base)?.find(x => x.name === name);
            if (!m) continue;
            if (k.stay) {
                if (m.fired) return true;
                m.fired = true;
            }
            Instance.ServerCommand(`ent_fire ${name} ${k.openInput}`);
            return true;
        }
        return false;
    }
    update(playerOrigin, now, groundName) {
        for (const k of KINDS) {
            if (k.shoot) continue;
            const list = this.markers.get(k.base);
            if (!list) continue;
            for (const m of list) {
                if (k.lift) {
                    if (now < m.holdUntil) {
                        this.drive(k, m, false);
                        continue;
                    }
                    const on = m.name === groundName && groundName !== "";
                    if (on) m.offAt = 0; else if (m.open && m.offAt === 0) m.offAt = now;
                    const want = on || m.open && m.offAt > 0 && now - m.offAt < LIFT_DEBOUNCE;
                    this.drive(k, m, want);
                    continue;
                }
                const hit = this.playerHits(k, m, playerOrigin);
                if (k.stay) {
                    if (hit && !m.fired) {
                        m.fired = true;
                        Instance.ServerCommand(`ent_fire ${m.name} ${k.openInput}`);
                    }
                    continue;
                }
                this.drive(k, m, hit || k.crush && m.open && this.monsterInRange(m.pos));
            }
        }
    }
    drive(k, m, want) {
        if (want === m.open) return;
        m.open = want;
        if (!want && !k.close) return;
        Instance.ServerCommand(`ent_fire ${m.name} ${want ? k.openInput : k.closeInput}`);
    }
    playerHits(k, m, player) {
        if (!this.within(m.pos, player, k.hr, k.zr)) return false;
        if (k.trace) {
            if (!k.stay && m.open) return true;
            return this.traceReaches(m.pos, player, k.act);
        }
        return true;
    }
    traceReaches(target, player, act) {
        const from = player.withZ(player.z + VIEW_OFS_Z);
        const dx = target.x - from.x, dy = target.y - from.y, dz = target.z - from.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= act) return true;
        const tr = traceHull(from, ZERO, ZERO, target);
        return tr.fraction * dist >= dist - act;
    }
    within(a, b, hr, zr) {
        const dx = a.x - b.x, dy = a.y - b.y;
        return dx * dx + dy * dy <= hr * hr && Math.abs(a.z - b.z) <= zr;
    }
    monsterInRange(pos) {
        const mons = this.enemies?.monsters;
        if (!mons) return false;
        for (const mon of mons) {
            if (mon.state === "dead") continue;
            if (this.within(pos, mon.origin, PROX_RADIUS, PROX_Z)) return true;
        }
        return false;
    }
}

const HOOKS = {
    func_door: [ [ "OnOpen", "move" ], [ "OnClose", "move" ], [ "OnFullyOpen", "stop" ], [ "OnFullyClosed", "stop" ] ],
    func_door_rotating: [ [ "OnOpen", "move" ], [ "OnClose", "move" ], [ "OnFullyOpen", "stop" ], [ "OnFullyClosed", "stop" ] ],
    func_movelinear: [ [ "OnOpen", "move" ], [ "OnClose", "move" ], [ "OnFullyOpen", "stop" ], [ "OnFullyClosed", "stop" ] ],
    func_button: [ [ "OnPressed", "btn" ] ]
};

function tagTheme(name) {
    for (const t of entityTags(name)) {
        const th = PROX_THEMES[t] ?? PROX_THEMES[PROX_THEME_ALIAS[t] ?? ""];
        if (th) return th;
    }
    return undefined;
}

class MoveSounds {
    sounds;
    conns=[];
    n=0;
    muted=false;
    fallback={
        move: SND.doorMove,
        stop: SND.doorStop,
        btn: SND.buttonPress
    };
    setSounds(s) {
        this.sounds = s;
    }
    mute(v) {
        this.muted = v;
    }
    theme(name) {
        return tagTheme(name) ?? this.fallback;
    }
    wire() {
        this.drop();
        this.n = 0;
        let hooked = 0;
        this.fallback = {
            move: SND.doorMove,
            stop: SND.doorStop,
            btn: SND.buttonPress
        };
        for (const e of Instance.FindEntitiesByName(`${DEFAULT_SOUNDS_NAME}*`)) {
            if (!e.IsValid()) continue;
            const th = tagTheme(e.GetEntityName());
            if (th) {
                this.fallback = th;
                print(`[quake] default door/button sound theme: ${e.GetEntityName()}`);
            }
            break;
        }
        for (const cls of Object.keys(HOOKS)) {
            for (const e of Instance.FindEntitiesByClass(cls)) {
                if (!e.IsValid()) continue;
                if (!e.GetEntityName()) e.SetEntityName(`qmv_${this.n++}`);
                for (const [out, kind] of HOOKS[cls]) {
                    const id = Instance.ConnectOutput(e, out, d => {
                        if (this.muted) return;
                        const src = d.caller && d.caller.IsValid() ? d.caller : e;
                        if (!src.IsValid()) return;
                        const nm = src.GetEntityName();
                        if (hasTag(nm, NOSOUND_TAG)) return;
                        const th = this.theme(nm);
                        const s = kind === "move" ? th.move : kind === "stop" ? th.stop : th.btn;
                        if (s) this.sounds?.play(s, nm);
                    });
                    if (id !== undefined) {
                        this.conns.push(id);
                        hooked++;
                    }
                }
            }
        }
        print(`[quake] move-sounds: ${hooked} door/button/lift output hooks`);
    }
    onDisable() {
        this.drop();
    }
    drop() {
        for (const id of this.conns) {
            try {
                Instance.DisconnectOutput(id);
            } catch {}
        }
        this.conns = [];
    }
}

const PREFIX = "load_";

const MAX_EPISODES = 8;

const MAX_MAPS = 12;

class LevelStream {
    ids=[];
    loadedCb=() => {};
    unloadedCb=() => {};
    registered=false;
    discover() {
        if (this.registered) return;
        const ids = [];
        for (let e = 1; e <= MAX_EPISODES; e++) {
            for (let m = 1; m <= MAX_MAPS; m++) {
                if (Instance.FindEntityByName(`${PREFIX}e${e}m${m}`)) ids.push(`e${e}m${m}`);
            }
        }
        if (ids.length === 0) return;
        this.ids = ids;
        for (const id of ids) {
            Instance.OnScriptInput(`level_loaded@${id}`, () => this.loadedCb(id));
            Instance.OnScriptInput(`level_unloaded@${id}`, () => this.unloadedCb(id));
        }
        this.registered = true;
        print(`[quake] level stream: ${ids.join(" ")}`);
    }
    onLoaded(cb) {
        this.loadedCb = cb;
    }
    onUnloaded(cb) {
        this.unloadedCb = cb;
    }
    count() {
        return this.ids.length;
    }
    list() {
        return this.ids;
    }
    first() {
        return this.ids[0];
    }
    idAt(level) {
        return this.ids[level - 1];
    }
    levelOf(id) {
        return this.ids.indexOf(id) + 1;
    }
    load(id) {
        Instance.EntFireAtName({
            name: `${PREFIX}${id}`,
            input: "StartSpawnGroupLoad"
        });
    }
    unload(id) {
        Instance.EntFireAtName({
            name: `${PREFIX}${id}`,
            input: "StartSpawnGroupUnload"
        });
    }
}

const BODY_NAME = "quake_player_controller";

const MUZZ_LIGHT_NAME = "muzz_light";

const MUZZ_LIGHT_ON = "Enable";

const MUZZ_LIGHT_OFF = "Disable";

const MUZZ_LIGHT_TIME = .1;

const EXPLOSION_TEMPLATE_NAME = "explosion_template";

const EXPLOSION_FX_TTL = 5;

const SPAWN_PREFIX = "ranger_spawn_";

const PLAYER_SRC = BODY_NAME;

const TOUCH_PARKED = new Vec3(0, 0, -16384);

class PlayerCombatant {
    pm;
    onDie;
    onPain;
    health=PLAYER_START_HEALTH;
    armorValue=PLAYER_START_ARMOR;
    armorType=0;
    takeDamage=true;
    getsKnockback=true;
    godMode=false;
    invincibleUntil=0;
    constructor(pm, onDie, onPain) {
        this.pm = pm;
        this.onDie = onDie;
        this.onPain = onPain;
    }
    get origin() {
        return this.pm.origin;
    }
    get velocity() {
        return this.pm.velocity;
    }
    set velocity(v) {
        this.pm.velocity = v;
    }
    knockback(delta) {
        this.pm.knockback(delta);
    }
    pain(d) {
        this.onPain(d);
    }
    die(d) {
        this.onDie(d);
    }
}

class QuakeController {
    pm=new QuakePlayerMove;
    weapons=new QuakeWeapons;
    projectiles=new Projectiles;
    fireballs=new Fireballs;
    eventLightning=new EventLightning;
    barrels=new Barrels;
    gibs=new Gibs;
    particles=new Particles;
    enemies=new Enemies;
    backpacks=new Backpacks;
    items=new Items;
    levelExit=new LevelExit;
    sounds=new Sounds;
    music=new Music;
    hud=new QuakeHud;
    prof=new Profiler;
    showPos=false;
    painFlashUntil=0;
    player=new PlayerCombatant(this.pm, d => this.onPlayerDeath(d), d => this.onPlayerPain(d));
    enabled=false;
    csControl=false;
    pendingSpawn=false;
    spawnDueAt=0;
    dead=false;
    megaRotAt=0;
    crushHurtAt=0;
    slot=0;
    jumpEdge=false;
    accum=0;
    body;
    touchBody;
    muzzLight;
    muzzLit=false;
    muzzOffAt=0;
    muzzShotSeen=0;
    explosionTmpl;
    explosionFx=[];
    expFxSeq=0;
    mapTriggers=new MapTriggers;
    prox=new ProxActuators;
    moveSounds=new MoveSounds;
    stream=new LevelStream;
    pendingComplete;
    loadShownAt=0;
    pendingLoadId="";
    pendingUnloadId="";
    loadedId="";
    spawnPoint=new Vec3(0, 0, 0);
    spawnAngle={
        pitch: 0,
        yaw: 0,
        roll: 0
    };
    viewCtl="play";
    spawnHoldUntil=0;
    deathYaw=0;
    deathViewOfs=VIEW_OFS_Z;
    wheelOpen=false;
    wheelLawHeld=false;
    levelStartTime=0;
    secretsFound=new Set;
    secretsTotal=0;
    pendingRestore;
    activeSlot=-1;
    activeDifficulty=DIFFICULTY_DEFAULT;
    interFinale=false;
    interReleased=false;
    interCamPos=new Vec3(0, 0, 0);
    interCamAng={
        pitch: 0,
        yaw: 0,
        roll: 0
    };
    viewBob=true;
    pawnAngleForced=false;
    injectedPitch=0;
    liquid="none";
    airFinished=0;
    nextDrown=0;
    drownDmg=0;
    nextSlime=0;
    waterSurfaceZ=0;
    waterEntryZ=0;
    liquidSurfaceTag=null;
    headUnder=false;
    nextSwimSnd=0;
    shownHints=new Set;
    radsuitUntil=0;
    quadUntil=0;
    pentUntil=0;
    ringUntil=0;
    quadWarnAt=0;
    pentTickAt=0;
    pentWarnAt=0;
    ringTickAt=0;
    ringWarnAt=0;
    lastKillCount=0;
    keys=[ false, false ];
    runes=[ false, false, false, false ];
    levelIndex=0;
    menu=new QuakeMenu;
    crt=new Crt;
    scoresHeld=false;
    pauseAccum=0;
    pauseStart=0;
    playTimeBanked=0;
    playTimeSpanStart=0;
    settings={
        viewBob: true,
        crt: false,
        eightbit: true,
        voice: "f",
        vmPos: "center",
        alwaysSprint: true,
        stepSmooth: true,
        fov: FOV_DEFAULT,
        hitmarker: true,
        showSaveTime: false,
        music: true,
        autoHop: false,
        giveAll: false,
        god: false,
        infAmmo: false
    };
    lastHitMark=0;
    settingsLoaded=false;
    isEnabled() {
        return this.enabled;
    }
    getLevelIndex() {
        return this.levelIndex;
    }
    discoverLevels() {
        this.stream.discover();
    }
    installTriggers() {
        this.stream.onLoaded(id => this.onLevelLoaded(id));
        this.stream.onUnloaded(id => this.onLevelUnloaded(id));
        this.stream.discover();
        this.moveSounds.setSounds(this.sounds);
        this.prox.setEnemies(this.enemies);
        this.mapTriggers.setToucher(e => !!e && e === this.touchBody);
        this.items.setToucher(e => !!e && e === this.touchBody);
        this.backpacks.setToucher(e => !!e && e === this.touchBody);
        this.mapTriggers.bind("level_end", {
            onStart: () => this.endLevel()
        });
        this.mapTriggers.bindPrefix("secret", {
            onStart: name => this.foundSecret(name)
        });
        this.mapTriggers.bindPrefix(TELEPORT_TRIGGER_PREFIX, {
            onStart: (_n, _a, trig) => this.teleportPlayer(trig)
        });
        this.mapTriggers.bindPrefix(KEY_DOOR_TRIGGER_PREFIX, {
            onStart: (name, _a, trig) => this.onKeyDoor(name, trig)
        });
        this.mapTriggers.bindPrefix(OPENS_ELSEWHERE_TRIGGER_PREFIX, {
            onStart: () => this.onOpensElsewhere()
        });
        this.mapTriggers.bindPrefix(DEATH_TRIGGER_PREFIX, {
            onStart: () => this.onDeathTrigger()
        });
        this.mapTriggers.bindPrefix(HURT_TRIGGER_PREFIX, {
            onStart: name => this.onHurtTrigger(name),
            onTouching: name => this.onHurtTrigger(name)
        });
        this.mapTriggers.bindPrefix("msg_center#", {
            onStart: name => this.onMsgTrigger(name, true)
        });
        this.mapTriggers.bindPrefix("msg#", {
            onStart: name => this.onMsgTrigger(name, false)
        });
        for (const p of [ WATER_TRIGGER_PREFIX, POISON_TRIGGER_PREFIX, LAVA_TRIGGER_PREFIX ]) {
            this.mapTriggers.bindPrefix(p, {
                onStart: name => this.onLiquidEnter(name)
            });
        }
        Instance.OnScriptInput(SPIKESHOOTER_INPUT, d => this.onSpikeShooterFire(d.caller));
    }
    onKeyDoor(name, trig) {
        if (this.dead || this.viewCtl !== "play") return;
        const colour = name.slice(KEY_DOOR_TRIGGER_PREFIX.length).split(/[_@]/)[0] || "silver";
        const idx = colour.toLowerCase() === "gold" ? 1 : 0;
        if (this.keys[idx]) {
            Instance.EntFireAtTarget({
                target: trig,
                input: "FireUser1"
            });
        } else {
            this.hud.showCenter(`You need the ${colour} key`, this.gameNow());
            this.sounds.play(SND.doorLocked, trig.GetEntityName());
        }
    }
    onOpensElsewhere() {
        if (this.dead || this.viewCtl !== "play") return;
        this.hud.showCenter("This door opens elsewhere", this.gameNow());
        this.sounds.play(SND.doorTalk, PLAYER_SRC);
    }
    onMsgTrigger(name, center) {
        if (this.dead || this.viewCtl !== "play") return;
        const msg = name.slice(name.indexOf("#") + 1).replace(/_/g, " ");
        if (!msg) return;
        if (center) {
            if (this.shownHints.has(name)) return;
            this.shownHints.add(name);
            this.hud.showCenter(msg, this.gameNow());
        } else {
            this.hud.showMsg(msg, this.gameNow());
        }
    }
    onDeathTrigger() {
        if (this.dead) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin,
            damage: TOUCHDEATH_DAMAGE,
            byPlayer: false,
            time: this.gameNow(),
            noKnockback: true
        });
    }
    onHurtTrigger(name) {
        if (this.dead || this.pm.noclip) return;
        const mm = name.match(/#(\d+)/);
        const dmg = mm ? parseInt(mm[1], 10) : HURT_TRIGGER_DAMAGE;
        if (dmg <= 0) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin,
            damage: dmg,
            byPlayer: false,
            time: this.gameNow(),
            noKnockback: true
        });
    }
    onLiquidEnter(name) {
        const m = name.match(/@surface_(-?\d+)/);
        this.liquidSurfaceTag = m ? parseInt(m[1], 10) : null;
    }
    onSpikeShooterFire(caller) {
        if (!this.enabled || this.dead || this.viewCtl !== "play") return;
        if (!caller || !caller.IsValid()) return;
        const o = caller.GetAbsOrigin();
        const a = caller.GetAbsAngles();
        const dir = angleVectors(a.pitch, a.yaw, 0).forward;
        const sup = caller.GetEntityName().startsWith(SPIKESHOOTER_SUPER_PREFIX);
        this.projectiles.spikeShot(caller, new Vec3(o.x, o.y, o.z), dir, sup, this.gameNow());
        this.sounds.play(SND.spikeShooterFire, caller.GetEntityName());
    }
    hurtPlayer(dmg, origin, now) {
        if (this.dead || !this.player.takeDamage) return;
        T_Damage(this.player, {
            inflictorCenter: origin,
            damage: dmg,
            byPlayer: false,
            time: now
        });
    }
    teleportPlayer(trig) {
        if (this.dead) return;
        const dest = trig.GetParent();
        if (!dest || !dest.IsValid()) {
            return;
        }
        const o = dest.GetAbsOrigin();
        const yaw = dest.GetAbsAngles().yaw;
        const {forward} = angleVectors(0, yaw, 0);
        this.pm.reset(new Vec3(o.x, o.y, o.z + TELEPORT_DEST_Z_OFS), forward.scale(TELEPORT_EXIT_SPEED), false);
        this.pm.notifyTeleport();
        this.pm.inWater = false;
        this.liquid = "none";
        this.waterSurfaceZ = 0;
        this.waterEntryZ = 0;
        this.liquidSurfaceTag = null;
        this.headUnder = false;
        this.stepSmoothZ = o.z;
        this.mapTriggers.reset();
        this.sounds.play(pick(SND.teleport), PLAYER_SRC);
        const pawn = this.pawn();
        if (pawn && pawn.IsValid()) pawn.Teleport({
            angles: {
                pitch: 0,
                yaw,
                roll: 0
            }
        });
        this.spawnAngle = {
            pitch: 0,
            yaw,
            roll: 0
        };
    }
    foundSecret(name) {
        if (this.secretsFound.has(name)) return;
        this.secretsFound.add(name);
        this.hud.showCenter("You found a secret!", this.gameNow());
        this.sounds?.play(SND.secret, PLAYER_SRC);
    }
    bindTrigger(name, h) {
        this.mapTriggers.bind(name, h);
    }
    unbindTrigger(name) {
        this.mapTriggers.unbind(name);
    }
    isTouchingTrigger(name) {
        return this.mapTriggers.isTouching(name);
    }
    isTouchingTriggerPrefix(prefix) {
        return this.mapTriggers.isTouchingPrefix(prefix);
    }
    toggle() {
        if (this.enabled) this.disable(); else this.enable();
    }
    gameNow() {
        return Instance.GetGameTime() - this.pauseAccum;
    }
    pauseGame() {
        this.menu.onEnable(this.slot);
        this.syncMenuOptions();
        this.menu.show("overlay", this.hasAnySave());
        this.pauseStart = Instance.GetGameTime();
        this.accum = 0;
        this.bankPlayTime();
    }
    resumeGame() {
        this.menu.hide();
        this.pauseAccum += Instance.GetGameTime() - this.pauseStart;
        this.accum = 0;
        this.resumePlayTime();
    }
    bankPlayTime() {
        if (this.playTimeSpanStart > 0) {
            this.playTimeBanked += Instance.GetGameTime() - this.playTimeSpanStart;
            this.playTimeSpanStart = 0;
        }
    }
    resumePlayTime() {
        if (this.playTimeSpanStart === 0) this.playTimeSpanStart = Instance.GetGameTime();
    }
    totalPlayTime() {
        return this.playTimeBanked + (this.playTimeSpanStart > 0 ? Instance.GetGameTime() - this.playTimeSpanStart : 0);
    }
    loadSettings() {
        if (this.settingsLoaded) return;
        this.settingsLoaded = true;
        try {
            const raw = Instance.GetSaveData();
            const s = (raw ? JSON.parse(raw) : {}).quake ?? {};
            if (typeof s.viewBob === "boolean") this.settings.viewBob = s.viewBob;
            if (typeof s.crt === "boolean") this.settings.crt = s.crt;
            if (typeof s.eightbit === "boolean") this.settings.eightbit = s.eightbit;
            if (s.voice === "m" || s.voice === "f") this.settings.voice = s.voice;
            if (s.vmPos === "center" || s.vmPos === "left" || s.vmPos === "right") {
                this.settings.vmPos = s.vmPos;
            }
            if (typeof s.alwaysSprint === "boolean") this.settings.alwaysSprint = s.alwaysSprint;
            if (typeof s.stepSmooth === "boolean") this.settings.stepSmooth = s.stepSmooth;
            if (typeof s.hitmarker === "boolean") this.settings.hitmarker = s.hitmarker;
            if (typeof s.showSaveTime === "boolean") this.settings.showSaveTime = s.showSaveTime;
            if (typeof s.music === "boolean") this.settings.music = s.music;
            if (typeof s.fov === "number" && Number.isFinite(s.fov)) {
                this.settings.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, Math.round(s.fov)));
            }
            if (typeof s.autoHop === "boolean") this.settings.autoHop = s.autoHop;
            if (typeof s.giveAll === "boolean") this.settings.giveAll = s.giveAll;
            if (typeof s.god === "boolean") this.settings.god = s.god;
            if (typeof s.infAmmo === "boolean") this.settings.infAmmo = s.infAmmo;
        } catch {}
        this.viewBob = this.settings.viewBob;
        this.pm.autoHop = this.settings.autoHop;
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);
        this.weapons.setViewmodelPos(this.settings.vmPos);
        this.sounds.setVoice(this.settings.voice);
        this.music.setEnabled(this.settings.music);
        this.applyFov();
    }
    saveSettings() {
        let d = {};
        try {
            const raw = Instance.GetSaveData();
            if (raw) d = JSON.parse(raw);
        } catch {
            d = {};
        }
        d.quake = {
            viewBob: this.settings.viewBob,
            crt: this.settings.crt,
            eightbit: this.settings.eightbit,
            voice: this.settings.voice,
            vmPos: this.settings.vmPos,
            alwaysSprint: this.settings.alwaysSprint,
            stepSmooth: this.settings.stepSmooth,
            fov: this.settings.fov,
            hitmarker: this.settings.hitmarker,
            showSaveTime: this.settings.showSaveTime,
            music: this.settings.music,
            autoHop: this.settings.autoHop,
            giveAll: this.settings.giveAll,
            god: this.settings.god,
            infAmmo: this.settings.infAmmo
        };
        try {
            Instance.SetSaveData(JSON.stringify(d));
        } catch {}
    }
    syncMenuOptions() {
        const s = this.settings;
        this.menu.setOptionValues(s.viewBob, s.crt, s.eightbit, s.voice, s.vmPos, s.alwaysSprint, s.stepSmooth, s.fov, s.hitmarker, s.showSaveTime, s.music, s.autoHop, s.giveAll, s.god, s.infAmmo);
    }
    onPlayerSpawned() {
        this.loadSettings();
        this.crt.onEnable(this.slot, this.settings.crt, this.settings.eightbit);
        if (this.levelIndex === 0) {
            if (this.enabled) this.disable();
            this.menu.onEnable(this.slot);
            this.syncMenuOptions();
            this.music.play(MUSIC_TITLE_EVENT, PLAYER_SRC);
            if (this.menu.show("main", this.hasAnySave())) return;
            this.levelIndex = 1;
        }
        this.pendingSpawn = true;
        this.spawnDueAt = Instance.GetGameTime() + SPAWN_ENTER_DELAY;
        Instance.SetThink(() => this.tick());
        Instance.SetNextThink(Instance.GetGameTime() + TICK_INTERVAL);
    }
    startNewGame() {
        this.menu.openNewSlots(this.slotSummaries(), this.nightmareUnlocked());
    }
    beginNewGame(slot, diff = DIFFICULTY_DEFAULT) {
        this.activeSlot = slot;
        this.activeDifficulty = diff;
        this.runes = [ false, false, false, false ];
        this.playTimeBanked = 0;
        this.playTimeSpanStart = 0;
        const slots = this.readSlots();
        slots[slot] = {
            save: {
                levelIndex: 1,
                health: PLAYER_START_HEALTH,
                armorValue: PLAYER_START_ARMOR,
                armorType: 0,
                shells: WEAPON_START_SHELLS,
                ammo: {
                    shells: WEAPON_START_SHELLS,
                    nails: 0,
                    rockets: 0,
                    cells: 0
                },
                weapons: [ "axe", "shotgun" ],
                weapon: "shotgun"
            },
            levels: {},
            difficulty: diff,
            playTime: 0
        };
        this.writeSlots(slots);
        this.menu.hide();
        this.streamEnter(1, () => {
            this.levelIndex = 1;
            this.pendingRestore = undefined;
            this.resetMapEntities();
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
    }
    startMap(mapId, diff) {
        const d = DIFFICULTIES.indexOf((diff ?? "").toLowerCase()) >= 0 ? diff.toLowerCase() : "easy";
        let target;
        if (this.stream.count() === 0) {
            target = 1;
        } else {
            const id = mapId.trim().toLowerCase() || (this.stream.first() ?? "");
            target = this.stream.levelOf(id);
            if (target < 1) {
                print(`[quake] no such level "${id}" - have: ${this.stream.list().join(" ")}`);
                return;
            }
        }
        this.menu.hide();
        this.activeSlot = -1;
        this.activeDifficulty = d;
        this.playTimeBanked = 0;
        this.playTimeSpanStart = 0;
        this.streamEnter(target, () => {
            this.levelIndex = target;
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
        print(`[quake] qmap ${this.stream.idAt(target) ?? `m${target}`} (${d})`);
    }
    openMenu() {
        this.levelIndex = 0;
        this.activeSlot = -1;
        this.activeDifficulty = DIFFICULTY_DEFAULT;
        this.onPlayerSpawned();
    }
    endLevel() {
        if (!this.enabled || this.dead || this.viewCtl === "intermission" || this.viewCtl === "loading") return;
        this.viewCtl = "intermission";
        this.interFinale = false;
        this.interReleased = false;
        this.enemies.setPlayerAlive(false);
        this.bankPlayTime();
        this.music.play(MUSIC_INTER_EVENT, PLAYER_SRC);
        const marker = Instance.FindEntityByName(LEVEL_END_CAM);
        const pawn = this.pawn();
        if (marker) {
            const o = marker.GetAbsOrigin();
            const a = marker.GetAbsAngles();
            this.interCamPos = new Vec3(o.x, o.y, o.z);
            this.interCamAng = {
                pitch: a.pitch,
                yaw: a.yaw,
                roll: 0
            };
        } else {
            this.interCamPos = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z);
            const a = pawn ? pawn.GetEyeAngles() : {
                pitch: 0,
                yaw: 0
            };
            this.interCamAng = {
                pitch: a.pitch,
                yaw: a.yaw,
                roll: 0
            };
        }
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.CONTROLLED);
        this.hud.setVisible(false);
        const k = this.enemies.killStats();
        const secs = Math.floor(this.gameNow() - this.levelStartTime);
        this.hud.showIntermission(this.formatTime(secs), k.killed, k.total, this.secretsFound.size, this.secretsTotal);
        this.writeSlotLevel(this.activeSlot, this.currentLevelId(), {
            secrets: this.secretsFound.size,
            secretsTotal: this.secretsTotal,
            kills: k.killed,
            killsTotal: k.total,
            time: secs
        });
        print(`[quake] level ${this.levelIndex} complete - ${k.killed}/${k.total} kills, ` + `${this.secretsFound.size}/${this.secretsTotal} secrets`);
    }
    onBossDefeated(boss, now) {
        this.particles.burst("explosion", boss.origin.withZ(boss.origin.z + 48), undefined, now);
        const delay = Math.max(.1, boss.deathAt - now);
        Instance.Delay(delay).then(() => {
            if (boss.prop.IsValid()) boss.prop.Teleport({
                position: new Vec3(0, 0, -16384)
            });
        });
    }
    levelCount() {
        return this.stream.count() || LEVEL_COUNT;
    }
    streamEnter(target, complete) {
        if (this.stream.count() === 0) {
            complete();
            return;
        }
        const id = this.stream.idAt(Math.max(1, Math.min(target, this.stream.count())));
        if (!id || id === this.loadedId) {
            complete();
            return;
        }
        const from = this.loadedId;
        this.pendingComplete = complete;
        this.pendingLoadId = id;
        this.pendingUnloadId = from && from !== id ? from : "";
        this.beginLoadScreen();
        this.loadedId = id;
        print(`[quake] streaming ${id}${this.pendingUnloadId ? ` <-> unload ${from}` : ""}...`);
        this.stream.load(id);
        if (this.pendingUnloadId) this.stream.unload(this.pendingUnloadId);
        Instance.Delay(LEVEL_STREAM_TIMEOUT).then(() => {
            if (this.pendingLoadId === id) {
                print(`[quake] level_loaded@${id} timed out - continuing`);
                this.onLevelLoaded(id);
            }
        });
        if (this.pendingUnloadId) {
            const un = this.pendingUnloadId;
            Instance.Delay(LEVEL_UNLOAD_TIMEOUT).then(() => {
                if (this.pendingUnloadId === un) {
                    print(`[quake] level_unloaded@${un} timed out - continuing`);
                    this.onLevelUnloaded(un);
                }
            });
        }
    }
    beginLoadScreen() {
        this.viewCtl = "loading";
        this.loadShownAt = Instance.GetGameTime();
        this.hud.hideIntermission();
        this.hud.showLoading();
        this.hud.setLoadStatus(this.pendingLoadId ? `LOADING ${this.pendingLoadId.toUpperCase()}` : "LOADING");
        const pawn = this.pawn();
        if (pawn && pawn.IsValid()) {
            pawn.SetMoveType(CSMoveType.NONE);
            const at = new Vec3(pawn.GetAbsOrigin());
            const eye = at.withZ(at.z + VIEW_OFS_Z);
            if (this.body && this.body.IsValid()) {
                this.body.Teleport({
                    position: eye
                });
            }
            this.touchBody?.Teleport({
                position: eye
            });
        }
        this.mapTriggers.reset();
    }
    onLevelLoaded(id) {
        if (id !== this.pendingLoadId) return;
        this.pendingLoadId = "";
        print(`[quake] ${id} loaded`);
        if (this.pendingUnloadId) this.hud.setLoadStatus(`UNLOADING ${this.pendingUnloadId.toUpperCase()}`);
        this.maybeFinishStream();
    }
    onLevelUnloaded(id) {
        if (id !== this.pendingUnloadId) {
            return;
        }
        this.pendingUnloadId = "";
        print(`[quake] ${id} unloaded`);
        this.maybeFinishStream();
    }
    maybeFinishStream() {
        if (!this.pendingComplete || this.pendingLoadId || this.pendingUnloadId) return;
        const complete = this.pendingComplete;
        this.pendingComplete = undefined;
        this.hud.setLoadStatus(`SPAWNING ${this.loadedId.toUpperCase()}`);
        const held = Instance.GetGameTime() - this.loadShownAt;
        const wait = Math.max(LEVEL_SETTLE_DELAY, LOAD_SCREEN_MIN - held);
        Instance.Delay(wait).then(() => complete());
    }
    advanceLevel() {
        if (this.interFinale) {
            this.hud.hideIntermission();
            this.viewCtl = "play";
            this.openMenu();
            return;
        }
        if (this.levelIndex >= this.levelCount()) {
            this.interFinale = true;
            this.interReleased = false;
            if (this.activeDifficulty === "hard" || this.activeDifficulty === "nightmare") {
                this.unlockNightmare();
            }
            this.music.play(MUSIC_TITLE_EVENT, PLAYER_SRC);
            this.hud.showFinale();
            this.hud.setInterHint("PRESS JUMP");
            return;
        }
        this.streamEnter(this.levelIndex + 1, () => {
            this.levelIndex++;
            this.viewCtl = "play";
            const carry = this.snapshotPlayer();
            this.pendingRestore = carry;
            this.writeSlotSave(this.activeSlot, carry);
            this.writeSlotPlayTime(this.activeSlot, this.totalPlayTime());
            const pawn = this.pawn();
            const body = this.body;
            if (pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            }
        });
    }
    snapshotPlayer() {
        const p = this.player;
        return {
            levelIndex: this.levelIndex,
            health: Math.ceil(p.health),
            armorValue: Math.ceil(p.armorValue),
            armorType: p.armorType,
            shells: this.weapons.shellCount,
            ammo: this.weapons.snapshot(),
            weapons: this.weapons.ownedWeapons(),
            weapon: this.weapons.activeWeapon
        };
    }
    readSlots() {
        const out = new Array(SAVE_SLOTS).fill(null);
        try {
            const raw = JSON.parse(Instance.GetSaveData() || "{}").quakeSaves;
            if (Array.isArray(raw)) {
                for (let i = 0; i < SAVE_SLOTS; i++) {
                    const s = raw[i];
                    if (s && s.save && typeof s.save.levelIndex === "number") {
                        out[i] = {
                            save: s.save,
                            levels: s.levels ?? {},
                            difficulty: s.difficulty ?? DIFFICULTY_DEFAULT,
                            playTime: typeof s.playTime === "number" ? s.playTime : 0
                        };
                    }
                }
            }
        } catch {}
        return out;
    }
    readSlot(i) {
        return this.readSlots()[i] ?? undefined;
    }
    hasAnySave() {
        return this.readSlots().some(s => s !== null);
    }
    writeSlots(slots) {
        let d = {};
        try {
            d = JSON.parse(Instance.GetSaveData() || "{}");
        } catch {
            d = {};
        }
        d.quakeSaves = slots;
        try {
            Instance.SetSaveData(JSON.stringify(d));
        } catch {}
    }
    writeSlotSave(i, save) {
        if (i < 0) return;
        const slots = this.readSlots();
        slots[i] = {
            save,
            levels: slots[i]?.levels ?? {},
            difficulty: slots[i]?.difficulty ?? this.activeDifficulty,
            playTime: slots[i]?.playTime ?? 0
        };
        this.writeSlots(slots);
    }
    writeSlotPlayTime(i, seconds) {
        if (i < 0) return;
        const slots = this.readSlots();
        const cur = slots[i];
        if (!cur) return;
        cur.playTime = seconds;
        this.writeSlots(slots);
    }
    nightmareUnlocked() {
        try {
            return !!JSON.parse(Instance.GetSaveData() || "{}").quakeNightmare;
        } catch {
            return false;
        }
    }
    unlockNightmare() {
        let d = {};
        try {
            d = JSON.parse(Instance.GetSaveData() || "{}");
        } catch {
            d = {};
        }
        if (d.quakeNightmare) return;
        d.quakeNightmare = true;
        try {
            Instance.SetSaveData(JSON.stringify(d));
        } catch {}
    }
    writeSlotLevel(i, id, stat) {
        if (i < 0) return;
        const slots = this.readSlots();
        const cur = slots[i];
        if (!cur) return;
        cur.levels[id] = stat;
        this.writeSlots(slots);
    }
    clearSlot(i) {
        const slots = this.readSlots();
        slots[i] = null;
        this.writeSlots(slots);
    }
    currentLevelId() {
        return this.loadedId || this.stream.idAt(this.levelIndex) || `m${this.levelIndex}`;
    }
    slotSummaries() {
        return this.readSlots().map(s => ({
            occupied: !!s,
            label: s ? (this.stream.idAt(s.save.levelIndex) || `m${s.save.levelIndex}`).toUpperCase() : "EMPTY",
            difficulty: s ? (s.difficulty ?? DIFFICULTY_DEFAULT).toUpperCase() : ""
        }));
    }
    slotLevelRows(i) {
        const slot = this.readSlot(i);
        const ids = this.stream.list().length ? [ ...this.stream.list() ] : [ "m1" ];
        return ids.slice(0, STATS_MAX_ROWS).map(id => {
            const st = slot?.levels[id];
            const head = id.toUpperCase().padEnd(6);
            if (!st) return head + "----";
            const c3 = n => String(Math.min(999, Math.max(0, Math.trunc(n))));
            const secr = `${c3(st.secrets)}/${c3(st.secretsTotal)}`.padEnd(6);
            const kill = `${c3(st.kills)}/${c3(st.killsTotal)}`.padEnd(7);
            return (head + secr + " " + kill + " " + this.formatTime(st.time)).slice(0, STATS_ROW_COLS);
        });
    }
    slotSaveTimeStr(i) {
        const seconds = i === this.activeSlot ? this.totalPlayTime() : this.readSlot(i)?.playTime ?? 0;
        return this.formatPlayTime(seconds);
    }
    resumeSlot(slot) {
        const rec = this.readSlot(slot);
        const s = rec?.save;
        if (!s) return;
        this.activeSlot = slot;
        this.activeDifficulty = rec.difficulty ?? DIFFICULTY_DEFAULT;
        this.playTimeBanked = rec.playTime ?? 0;
        this.playTimeSpanStart = 0;
        this.menu.hide();
        this.streamEnter(s.levelIndex, () => {
            this.levelIndex = s.levelIndex;
            this.pendingRestore = s;
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
    }
    exitToMenu() {
        this.levelIndex = 0;
        this.menu.hide();
        this.openMenu();
    }
    formatTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
    }
    formatPlayTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        const hh = Math.floor(s / 3600);
        const mm = Math.floor(s % 3600 / 60);
        const ss = s % 60;
        return `${hh}:${mm < 10 ? "0" : ""}${mm}:${ss < 10 ? "0" : ""}${ss}`;
    }
    interTick(pawn) {
        const camera = pawn.GetCustomCamera();
        const t = this.gameNow();
        const sin = Math.sin;
        const a = this.interCamAng;
        camera.Move({
            position: this.interCamPos.add(new Vec3(sin(t * INTER_SWAY_POS_CYCLE) * INTER_SWAY_POS, sin(t * INTER_SWAY_POS_CYCLE * .83) * INTER_SWAY_POS, sin(t * INTER_SWAY_POS_CYCLE * 1.37) * INTER_SWAY_POS * .5)),
            angles: {
                pitch: a.pitch + sin(t * INTER_SWAY_PITCH_CYCLE) * INTER_SWAY_PITCH,
                yaw: a.yaw + sin(t * INTER_SWAY_YAW_CYCLE) * INTER_SWAY_YAW,
                roll: sin(t * INTER_SWAY_ROLL_CYCLE) * INTER_SWAY_ROLL
            }
        });
        if (!this.interFinale) return;
        this.hud.updateFinale(t);
        const jump = pawn.WasInputJustPressed(CSInputs.JUMP) || pawn.IsInputPressed(CSInputs.JUMP);
        if (!this.interReleased) {
            if (!jump) this.interReleased = true;
        } else if (jump) {
            this.interReleased = false;
            if (this.hud.finaleAdvance()) return;
            this.advanceLevel();
        }
    }
    onMenuClick(buttonId) {
        if (buttonId.startsWith("q_ww_s")) {
            this.wheelClick(+buttonId.slice(6));
            return;
        }
        if (buttonId === "q_death_retry" || buttonId === "q_inter_retry") {
            this.replayLevel();
            return;
        }
        if (buttonId === "q_inter_continue") {
            this.advanceLevel();
            return;
        }
        const action = this.menu.onClick(buttonId);
        if (action === "disabled") return;
        if (action === "opennewslots") this.startNewGame(); else if (action === "opencontslots") this.menu.openContSlots(this.slotSummaries()); else if (action === "openstats") {
            const s = this.menu.chosenSlot();
            this.menu.openStats(s, this.slotLevelRows(s), this.slotSaveTimeStr(s));
        } else if (action === "newgame") this.beginNewGame(this.menu.chosenSlot(), this.menu.chosenDifficulty()); else if (action === "continue") this.resumeSlot(this.menu.chosenSlot()); else if (action === "resume") this.resumeGame(); else if (action === "exit") this.exitToMenu(); else if (action === "quit") Instance.ServerCommand("disconnect"); else if (action === "toggleBob") this.setViewBob(); else if (action === "toggleHitmarker") this.setHitmarker(); else if (action === "toggleSaveTime") this.setShowSaveTime(); else if (action === "toggleMusic") this.setMusic(); else if (action === "toggleCrt") this.setCrt(); else if (action === "toggle8bit") this.set8bit(); else if (action === "toggleVoice") this.setVoice(); else if (action === "toggleVmPos") this.setViewmodelPos(); else if (action === "toggleAlwaysSprint") this.setAlwaysSprint(); else if (action === "toggleStepSmooth") this.setStepSmooth(); else if (action === "fovDown") this.setFov(-1); else if (action === "fovUp") this.setFov(1); else if (action === "toggleAutohop") this.setAutoHop(); else if (action === "toggleGiveAll") this.setGiveAll(); else if (action === "toggleGod") this.setGod(); else if (action === "toggleInfAmmo") this.setInfAmmo();
    }
    tick() {
        const now = Instance.GetGameTime();
        if (this.pendingSpawn && now >= this.spawnDueAt) {
            this.pendingSpawn = false;
            if (this.enabled) this.resetLevel(); else this.enable();
        }
        if (this.pendingSpawn) {
            Instance.SetNextThink(now + TICK_INTERVAL);
        } else if (this.enabled) {
            this.frame();
            Instance.SetNextThink(Instance.GetGameTime() + TICK_INTERVAL);
        }
    }
    grabBody() {
        const body = Instance.FindEntityByName(BODY_NAME);
        if (!body) print(`[quake] no info_target "${BODY_NAME}" - quake mode can't run`);
        this.body = body ?? undefined;
        this.touchBody = Instance.FindEntityByName(TOUCH_BODY_NAME) ?? undefined;
        this.muzzLight = Instance.FindEntityByName(MUZZ_LIGHT_NAME) ?? undefined;
        if (this.muzzLight) {
            Instance.EntFireAtTarget({
                target: this.muzzLight,
                input: MUZZ_LIGHT_OFF
            });
            this.muzzLit = false;
            this.muzzOffAt = 0;
            this.muzzShotSeen = this.weapons.lastShotAt;
        }
    }
    enable() {
        if (this.enabled) return;
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) {
            print("[quake] no player pawn in slot 0");
            return;
        }
        this.loadSettings();
        if (this.levelIndex < 1) this.levelIndex = 1;
        this.menu.hide();
        const camera = pawn.GetCustomCamera();
        this.grabBody();
        const body = this.body;
        if (!body || !body.IsValid()) {
            print("[quake] no body - can't enable");
            return;
        }
        this.sounds.onEnable();
        this.music.onEnable();
        this.hud.onEnable();
        this.captureSpawn(pawn, body);
        this.rebuild(pawn, body, camera);
        pawn.SetMoveType(CSMoveType.NONE);
        Instance.ServerCommand("cl_draw_only_deathnotices 1");
        Instance.ServerCommand("sv_infinite_ammo 1");
        const eye = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z);
        body.Teleport({
            position: eye
        });
        this.touchBody?.Teleport({
            position: this.touchPos()
        });
        camera.Teleport({
            position: eye,
            angles: this.spawnAngle
        });
        this.beginSpawnView(camera);
        this.enabled = true;
        this.accum = 0;
        this.hud.hideLoading();
        Instance.SetThink(() => this.tick());
        Instance.SetNextThink(Instance.GetGameTime() + TICK_INTERVAL);
        print("[quake] ENABLED");
    }
    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.csControl = false;
        this.pendingSpawn = false;
        this.pauseAccum = 0;
        this.wheelOpen = false;
        this.wheelLawHeld = false;
        this.hud.setWheelCapture(false);
        this.hud.hideWheel();
        const pawn = this.pawn();
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.DISABLED);
        this.viewCtl = "play";
        this.pendingComplete = undefined;
        this.pendingLoadId = "";
        this.pendingUnloadId = "";
        if (pawn && pawn.IsValid()) pawn.SetMoveType(CSMoveType.WALK);
        this.weapons.onDisable(pawn);
        this.projectiles.onDisable();
        this.fireballs.onDisable();
        this.eventLightning.onDisable();
        this.barrels.onDisable();
        for (const fx of this.explosionFx) safeRemove(fx.prop);
        this.explosionFx = [];
        this.explosionTmpl = undefined;
        this.gibs.onDisable();
        this.particles.onDisable();
        this.enemies.despawnAll();
        this.backpacks.onDisable();
        this.items.onDisable();
        this.levelExit.onDisable();
        this.moveSounds.onDisable();
        this.sounds.onDisable();
        this.music.onDisable();
        this.hud.onDisable();
        this.crt.setWater("none");
        if (this.fovSent !== 0) {
            this.fovSent = 0;
            Instance.ServerCommand("fov_cs_debug 0");
        }
        Instance.ServerCommand("cl_draw_only_deathnotices 0");
        Instance.ServerCommand("sv_infinite_ammo 0");
        setSolidBoxes([]);
        this.dead = false;
        this.pm.noclip = false;
        this.mapTriggers.reset();
        this.body = undefined;
        this.touchBody?.Teleport({
            position: TOUCH_PARKED
        });
        this.touchBody = undefined;
        if (this.muzzLight) Instance.EntFireAtTarget({
            target: this.muzzLight,
            input: MUZZ_LIGHT_OFF
        });
        this.muzzLight = undefined;
        this.muzzLit = false;
        print("[quake] DISABLED");
    }
    resetMapEntities() {
        this.moveSounds.mute(true);
        this.doResetMapEntities();
        Instance.Delay(LEVEL_SETTLE_DELAY).then(() => {
            if (this.enabled) this.doResetMapEntities();
            this.moveSounds.mute(false);
        });
    }
    doResetMapEntities() {
        Instance.EntFireAtName({
            name: "doResetMapEntities",
            input: "Trigger"
        });
    }
    rebuild(pawn, body, camera) {
        this.csControl = false;
        this.pm.reset(new Vec3(this.spawnPoint), new Vec3(0, 0, 0), false);
        this.pm.setSelf(pawn);
        this.pm.probeGround();
        this.player.health = PLAYER_START_HEALTH;
        this.player.armorValue = PLAYER_START_ARMOR;
        this.player.armorType = 0;
        this.player.takeDamage = true;
        this.player.godMode = this.settings.god;
        this.megaRotAt = 0;
        this.painFlashUntil = 0;
        this.stepSmoothZ = this.pm.origin.z;
        this.dead = false;
        this.liquid = "none";
        this.waterSurfaceZ = 0;
        this.waterEntryZ = 0;
        this.liquidSurfaceTag = null;
        this.headUnder = false;
        this.pm.inWater = false;
        this.pm.headUnder = false;
        this.radsuitUntil = 0;
        this.keys = [ false, false ];
        this.shownHints.clear();
        this.quadUntil = this.pentUntil = this.ringUntil = 0;
        this.quadWarnAt = this.pentTickAt = this.pentWarnAt = this.ringTickAt = this.ringWarnAt = 0;
        this.lastKillCount = this.enemies.killStats().killed;
        this.player.invincibleUntil = 0;
        this.levelStartTime = this.gameNow();
        this.hud.resync();
        this.hud.hideDeathStats();
        this.resetMapEntities();
        this.mapTriggers.wire();
        this.prox.rearm();
        this.moveSounds.wire();
        this.secretsFound.clear();
        this.secretsTotal = this.mapTriggers.countPrefix("secret");
        setTraceIgnore([ pawn, body, camera, this.touchBody ]);
        this.weapons.onEnable(pawn, this.gameNow());
        this.weapons.setEnemies(this.enemies);
        this.weapons.setSounds(this.sounds, PLAYER_SRC);
        this.weapons.setProjectiles(this.projectiles);
        this.weapons.setBarrels(this.barrels);
        this.weapons.setParticles(this.particles);
        this.weapons.setShootHook(e => this.prox.onShot(e));
        this.weapons.setNoAmmoHook(() => this.hud.showNoAmmo(this.gameNow()));
        this.weapons.setDamageScale(() => this.gameNow() < this.quadUntil ? QUAD_DAMAGE_MUL : 1);
        for (const fx of this.explosionFx) safeRemove(fx.prop);
        this.explosionFx = [];
        const et = Instance.FindEntityByName(EXPLOSION_TEMPLATE_NAME);
        this.explosionTmpl = et instanceof PointTemplate ? et : undefined;
        this.projectiles.onEnable(this.enemies, this.sounds, (o, d, n, ig, fromMon) => this.radiusDamage(o, d, n, !fromMon, ig), (d, o, n) => this.hurtPlayer(d, o, n));
        this.projectiles.setOnImpact(e => this.prox.onShot(e));
        this.projectiles.setBarrels(this.barrels);
        this.projectiles.setParticles(this.particles);
        this.fireballs.setProjectiles(this.projectiles);
        this.fireballs.onEnable(this.gameNow(), this.activeDifficulty);
        this.barrels.onEnable((o, d, n) => this.radiusDamage(o, d, n, false));
        this.particles.onEnable(this.gameNow());
        this.gibs.onEnable(this.sounds, PLAYER_SRC, this.particles);
        this.enemies.spawnAll(this.gameNow(), this.activeDifficulty);
        this.enemies.setPlayer(this.player, pawn);
        this.enemies.setPlayerAlive(true);
        this.enemies.setSounds(this.sounds);
        this.enemies.setParticles(this.particles);
        this.enemies.setHitHook(() => this.onEnemyHit());
        this.enemies.setDropSink((o, loot, now) => this.backpacks.drop(o, loot, now));
        this.enemies.setGibSink((o, head, now) => this.gibs.burst(o, head, now));
        this.enemies.setGrenadeSink((muzzle, vel, owner, now) => this.projectiles.monsterGrenade(muzzle, vel, now, owner));
        this.enemies.setZombieGibSink((muzzle, vel, owner, now) => this.projectiles.zombieGib(muzzle, vel, now, owner));
        this.enemies.setSpikeSink((origin, dir, owner, now) => this.projectiles.spikeShot(owner, origin, dir, false, now, WIZARD_SPIKE_SPEED, WIZARD_SPIKE_DAMAGE));
        this.enemies.setPlayerPushSink(box => this.pushPlayerFromMonster(box));
        this.enemies.setBossMissileSink((muzzle, dir, owner, now) => this.projectiles.bossball(muzzle, dir, owner, now));
        this.enemies.setBossDeathSink((boss, now) => this.onBossDefeated(boss, now));
        this.eventLightning.onDisable();
        this.eventLightning.setSinks((a, b, n) => this.enemies.beamFx(a, b, n), (ent, n) => this.enemies.hurtByLightning(ent, n), (dmg, at, n) => this.hurtPlayer(dmg, at, n), () => this.pawn());
        this.eventLightning.onEnable();
        this.backpacks.onDisable();
        this.backpacks.onEnable(loot => {
            this.weapons.addShells(loot.shells);
            return `You get ${loot.shells} shells`;
        }, this.sounds, PLAYER_SRC, m => this.onPickupMsg(m));
        this.items.onEnable(this.makeItemEffects(), this.sounds, PLAYER_SRC, (m, center) => this.onPickupMsg(m, center), this.activeDifficulty);
        this.levelExit.onEnable(() => this.endLevel());
        if (this.pendingRestore) {
            const r = this.pendingRestore;
            this.pendingRestore = undefined;
            this.player.health = r.health;
            this.player.armorValue = r.armorValue;
            this.player.armorType = r.armorType;
            if (r.ammo) this.weapons.restore(r.ammo); else this.weapons.setShells(r.shells);
            this.weapons.grantOwned(pawn, r.weapons);
            this.weapons.restoreActive(pawn, r.weapon, this.gameNow());
        }
        if (this.settings.giveAll) this.weapons.giveAll(pawn);
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);
        this.refreshTraceIgnore();
        setSolidBoxes([ ...this.enemies.solidBoxes(), this.playerBox(pawn) ]);
    }
    refreshTraceIgnore() {
        const pawn = this.pawn();
        setTraceIgnore([ pawn, this.body, pawn?.GetCustomCamera(), this.touchBody, ...this.enemies.allProps(), ...this.levelExit.props(), ...this.gibs.props(), ...this.projectiles.props(), ...this.items.props(), ...this.backpacks.props(), ...this.particles.props() ]);
    }
    replayLevel() {
        const slot = this.activeSlot >= 0 ? this.readSlot(this.activeSlot) : undefined;
        if (slot && slot.save.levelIndex === this.levelIndex) this.pendingRestore = slot.save;
        this.resetLevel();
    }
    resetLevel() {
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return;
        this.grabBody();
        this.hud.onEnable();
        const body = this.body;
        if (!body || !body.IsValid()) {
            this.disable();
            return;
        }
        const camera = pawn.GetCustomCamera();
        this.rebuild(pawn, body, camera);
        pawn.SetMoveType(CSMoveType.NONE);
        const eye = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z);
        body.Teleport({
            position: eye
        });
        camera.Teleport({
            position: eye,
            angles: this.spawnAngle
        });
        this.touchBody?.Teleport({
            position: this.touchPos()
        });
        this.beginSpawnView(camera);
        this.accum = 0;
        this.hud.hideLoading();
        print("[quake] level reset");
    }
    captureSpawn(pawn, body) {
        const mapNum = this.loadedId ? (this.loadedId.match(/(\d+)$/) ?? [])[1] : undefined;
        const marker = (this.loadedId ? Instance.FindEntityByName(`${SPAWN_PREFIX.slice(0, -1)}@${this.loadedId}`) : undefined) ?? (mapNum ? Instance.FindEntityByName(SPAWN_PREFIX + mapNum) : undefined) ?? Instance.FindEntityByName(SPAWN_PREFIX + this.levelIndex) ?? Instance.FindEntityByName(SPAWN_PREFIX.slice(0, -1)) ?? Instance.FindEntityByName(`${SPAWN_PREFIX}1`) ?? body;
        if (marker) {
            const o = marker.GetAbsOrigin();
            const a = marker.GetAbsAngles();
            this.spawnPoint = new Vec3(o.x, o.y, o.z + 1);
            this.spawnAngle = {
                pitch: a.pitch,
                yaw: a.yaw,
                roll: 0
            };
        } else {
            const feet = new Vec3(pawn.GetAbsOrigin());
            const a = pawn.GetEyeAngles();
            this.spawnPoint = feet.withZ(feet.z - HULL_MIN.z);
            this.spawnAngle = {
                pitch: a.pitch,
                yaw: a.yaw,
                roll: 0
            };
        }
    }
    beginSpawnView(camera) {
        this.viewCtl = "spawn";
        this.spawnHoldUntil = this.gameNow() + SPAWN_VIEW_HOLD;
        this.resumePlayTime();
        const musicEvent = levelMusicEvent(this.currentLevelId());
        if (musicEvent) this.music.play(musicEvent, PLAYER_SRC); else this.music.stop();
        camera.SetMode(CustomCameraMode.CONTROLLED);
    }
    calcViewBob(now) {
        let cycle = now - Math.floor(now / CL_BOBCYCLE) * CL_BOBCYCLE;
        cycle /= CL_BOBCYCLE;
        if (cycle < CL_BOBUP) cycle = Math.PI * cycle / CL_BOBUP; else cycle = Math.PI + Math.PI * (cycle - CL_BOBUP) / (1 - CL_BOBUP);
        const v = this.pm.velocity;
        let bob = Math.sqrt(v.x * v.x + v.y * v.y) * CL_BOB;
        bob = bob * .3 + bob * .7 * Math.sin(cycle);
        return bob > V_BOB_UP_MAX ? V_BOB_UP_MAX : bob < -7 ? -7 : bob;
    }
    stepSmoothZ=0;
    stepSmoothAt=0;
    calcStepSmooth(now) {
        const oz = this.pm.origin.z;
        const dt = Math.max(0, Math.min(now - this.stepSmoothAt, .1));
        this.stepSmoothAt = now;
        if (!this.settings.stepSmooth || !this.pm.onGround || oz - this.stepSmoothZ <= 0) {
            this.stepSmoothZ = oz;
            return 0;
        }
        this.stepSmoothZ += dt * STEP_SMOOTH_SPEED;
        if (this.stepSmoothZ > oz) this.stepSmoothZ = oz;
        if (oz - this.stepSmoothZ > STEP_SMOOTH_MAX) this.stepSmoothZ = oz - STEP_SMOOTH_MAX;
        return this.stepSmoothZ - oz;
    }
    applyPlayCam(body, camera, bob) {
        const eye = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z + bob);
        body.Move({
            position: eye
        });
        camera.Move({
            position: eye
        });
    }
    openWheel() {
        if (this.wheelOpen || this.dead || this.viewCtl !== "play" || this.menu.isOpen()) return;
        this.wheelOpen = true;
        this.accum = 0;
        this.hud.showWheel();
        this.hud.setWheelCapture(true);
        this.hud.setWheel(this.weapons.wheelSlots(), this.weapons.wheelActiveIndex());
    }
    closeWheel() {
        if (!this.wheelOpen) return;
        this.wheelOpen = false;
        this.hud.setWheelCapture(false);
        this.hud.hideWheel();
        this.accum = 0;
    }
    wheelClick(slot) {
        if (!this.wheelOpen) return;
        const pawn = this.pawn();
        if (pawn) this.weapons.selectFromWheel(pawn, slot, this.gameNow());
        this.closeWheel();
    }
    touchPos() {
        return this.pm.origin.withZ(this.pm.origin.z + TOUCH_GROUND_LIFT);
    }
    updateLiquid() {
        const now = this.gameNow();
        const cur = this.dead || this.pm.noclip ? "none" : this.mapTriggers.isTouchingPrefix(LAVA_TRIGGER_PREFIX) ? "lava" : this.mapTriggers.isTouchingPrefix(POISON_TRIGGER_PREFIX) ? "poison" : this.mapTriggers.isTouchingPrefix(WATER_TRIGGER_PREFIX) ? "water" : "none";
        const eyeZ = this.pm.origin.z + VIEW_OFS_Z;
        if (cur !== "none" && this.liquid === "none") {
            this.sounds.play(cur === "water" ? SND.waterIn : cur === "lava" ? SND.lavaIn : SND.slimeIn, PLAYER_SRC);
            this.airFinished = now + AIR_TIME;
            this.drownDmg = 0;
            this.nextDrown = 0;
            this.nextSlime = 0;
            this.waterEntryZ = this.pm.origin.z + HULL_MIN.z;
            this.headUnder = false;
        } else if (cur === "none" && this.liquid !== "none") {
            this.sounds.play(SND.waterOut, PLAYER_SRC);
            if (this.headUnder) {
                if (now > this.airFinished) this.sounds.play(SND.gaspEmpty, PLAYER_SRC); else if (now > this.airFinished - 9) this.sounds.play(SND.gaspRecover, PLAYER_SRC);
            }
            this.waterSurfaceZ = 0;
            this.waterEntryZ = 0;
            this.liquidSurfaceTag = null;
            this.headUnder = false;
        }
        this.liquid = cur;
        this.pm.inWater = cur !== "none";
        if (cur === "none") {
            this.pm.headUnder = false;
            this.pm.swimUpSpeed = WATER_SWIM_UP;
            this.pm.waterJumpUp = WATER_JUMP_UP;
            return;
        }
        this.waterSurfaceZ = this.liquidSurfaceTag ?? this.waterEntryZ;
        const waistZ = this.pm.origin.z + (HULL_MIN.z + HULL_MAX.z) / 2;
        const waterLevel = eyeZ < this.waterSurfaceZ ? 3 : waistZ < this.waterSurfaceZ ? 2 : 1;
        if (waterLevel < 3) {
            if (this.headUnder) {
                if (now > this.airFinished) this.sounds.play(SND.gaspEmpty, PLAYER_SRC); else if (now > this.airFinished - 9) this.sounds.play(SND.gaspRecover, PLAYER_SRC);
            }
            this.headUnder = false;
            this.airFinished = now + AIR_TIME;
            this.drownDmg = DROWN_DMG_STEP;
            this.nextDrown = 0;
        } else {
            this.headUnder = true;
            if (now > this.airFinished && now >= this.nextDrown) {
                this.nextDrown = now + DROWN_INTERVAL;
                this.drownDmg = Math.min(this.drownDmg + DROWN_DMG_STEP, DROWN_DMG_MAX);
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: this.drownDmg,
                    byPlayer: false,
                    time: now,
                    noKnockback: true
                });
            }
        }
        if ((cur === "poison" || cur === "lava") && now >= this.nextSlime) {
            const suited = now < this.radsuitUntil;
            if (cur === "lava") {
                this.nextSlime = now + (suited ? LAVA_INTERVAL_SUITED : LAVA_INTERVAL);
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: waterLevel * LAVA_DMG_PER_LEVEL,
                    byPlayer: false,
                    time: now,
                    noKnockback: true
                });
            } else if (!suited) {
                this.nextSlime = now + SLIME_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: waterLevel * SLIME_DMG_PER_LEVEL,
                    byPlayer: false,
                    time: now,
                    noKnockback: true
                });
            }
        }
        this.pm.swimUpSpeed = cur === "lava" ? LAVA_SWIM_UP : cur === "poison" ? SLIME_SWIM_UP : WATER_SWIM_UP;
        this.pm.waterJumpUp = cur === "lava" ? LAVA_WATER_JUMP_UP : WATER_JUMP_UP;
        this.pm.headUnder = this.headUnder;
    }
    setNoclip(on) {
        if (!this.enabled) return false;
        const want = on === undefined ? !this.pm.noclip : on;
        this.pm.noclip = want;
        this.player.takeDamage = !want;
        this.enemies.setPlayerInvisible(want || this.gameNow() < this.ringUntil);
        if (want) this.enemies.forgetPlayer();
        if (!want) {
            this.pm.velocity = new Vec3(0, 0, 0);
            this.pm.probeGround();
        }
        return want;
    }
    togglePlayerControl() {
        if (!this.enabled) return "quake mode is off (`quake on` first)";
        if (this.menu.isOpen()) return "close the menu first";
        if (this.dead) return "can't - the Quake player is dead";
        if (!this.csControl && this.viewCtl !== "play") return `busy (${this.viewCtl})`;
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return "no player pawn";
        const camera = pawn.GetCustomCamera();
        const pawnPos = new Vec3(pawn.GetAbsOrigin());
        const bodyPos = new Vec3(this.pm.origin);
        pawn.Teleport({
            position: bodyPos
        });
        this.pm.reset(pawnPos, new Vec3(0, 0, 0), false);
        this.pm.notifyTeleport();
        this.pm.probeGround();
        this.csControl = !this.csControl;
        this.accum = 0;
        if (this.csControl) {
            this.pauseStart = Instance.GetGameTime();
            camera.SetMode(CustomCameraMode.DISABLED);
            pawn.SetMoveType(CSMoveType.WALK);
            this.hud.setVisible(false);
            Instance.ServerCommand("cl_draw_only_deathnotices 0");
            return "control -> CS player (walk around; `quaketoggleplayer` to return)";
        }
        this.pauseAccum += Instance.GetGameTime() - this.pauseStart;
        const eye = pawnPos.withZ(pawnPos.z + VIEW_OFS_Z);
        pawn.SetMoveType(CSMoveType.NONE);
        if (this.body?.IsValid()) this.body.Teleport({
            position: eye
        });
        camera.Teleport({
            position: eye
        });
        camera.SetMode(CustomCameraMode.CONTROLLED_POSITION);
        this.viewCtl = "play";
        this.hud.setVisible(true);
        Instance.ServerCommand("cl_draw_only_deathnotices 1");
        return "control -> Quake player";
    }
    giveAll() {
        const p = this.pawn();
        if (this.enabled && p) this.weapons.giveAll(p);
    }
    setShowPos(on) {
        this.showPos = on === undefined ? !this.showPos : on;
        return this.showPos;
    }
    setHudShown(on) {
        const show = on === undefined ? this.hud.isForcedOff() : on;
        this.hud.setForcedOff(!show);
        return show;
    }
    setViewmodelShown(on) {
        const show = on === undefined ? this.weapons.viewmodelHidden() : on;
        this.weapons.setViewmodelHidden(!show);
        return show;
    }
    setNoclipSpeed(v) {
        if (v !== undefined && isFinite(v) && v > 0) this.pm.noclipSpeed = v;
        return this.pm.noclipSpeed;
    }
    toggleMonsterAi(args) {
        const parts = args.trim().split(/\s+/);
        const f = (parts[1] ?? "").toLowerCase();
        const force = f === "on" || f === "1" ? true : f === "off" || f === "0" ? false : undefined;
        return this.enemies.aiToggle(parts[0] ?? "", force);
    }
    spawnMonster(args) {
        if (!this.enabled) return "quake mode is off";
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return "no pawn";
        const eye = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z);
        const ang = pawn.GetEyeAngles();
        const fwd = angleVectors(ang.pitch, ang.yaw, 0).forward;
        const Z = new Vec3(0, 0, 0);
        const tr = traceHull(eye, Z, Z, eye.add(fwd.scale(4096)), [ pawn, this.body ]);
        const at = (tr.fraction < 1 ? new Vec3(tr.endpos) : eye.add(fwd.scale(160))).subtract(fwd.scale(28));
        return this.enemies.spawnOne(args.trim().split(/\s+/)[0] ?? "", at, ang.yaw + 180, this.gameNow());
    }
    setViewBob(on) {
        this.viewBob = on === undefined ? !this.viewBob : on;
        this.settings.viewBob = this.viewBob;
        this.saveSettings();
        this.syncMenuOptions();
        return this.viewBob;
    }
    setAlwaysSprint(on) {
        this.settings.alwaysSprint = on === undefined ? !this.settings.alwaysSprint : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.alwaysSprint;
    }
    setStepSmooth(on) {
        this.settings.stepSmooth = on === undefined ? !this.settings.stepSmooth : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.stepSmooth;
    }
    setFov(d) {
        const cur = this.settings.fov;
        const want = Math.abs(d) <= 1 ? cur + d * FOV_STEP : Math.round(d);
        this.settings.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, want));
        this.applyFov();
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.fov;
    }
    fovSent=0;
    applyFov(fov = this.settings.fov) {
        if (fov === this.fovSent) return;
        this.fovSent = fov;
        Instance.ServerCommand(`fov_cs_debug ${fov}`);
    }
    setAutoHop(on) {
        this.settings.autoHop = on === undefined ? !this.settings.autoHop : on;
        this.pm.autoHop = this.settings.autoHop;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.autoHop;
    }
    setGiveAll(on) {
        this.settings.giveAll = on === undefined ? !this.settings.giveAll : on;
        this.saveSettings();
        this.syncMenuOptions();
        const p = this.pawn();
        if (this.settings.giveAll && this.enabled && p) this.weapons.giveAll(p);
        return this.settings.giveAll;
    }
    setCrt(on) {
        this.settings.crt = on === undefined ? !this.settings.crt : on;
        this.crt.applyOverlay(this.settings.crt);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.crt;
    }
    set8bit(on) {
        this.settings.eightbit = on === undefined ? !this.settings.eightbit : on;
        this.crt.apply8bit(this.settings.eightbit);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.eightbit;
    }
    setHitmarker(on) {
        this.settings.hitmarker = on === undefined ? !this.settings.hitmarker : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.hitmarker;
    }
    setShowSaveTime(on) {
        this.settings.showSaveTime = on === undefined ? !this.settings.showSaveTime : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.showSaveTime;
    }
    setMusic(on) {
        this.settings.music = on === undefined ? !this.settings.music : on;
        this.music.setEnabled(this.settings.music);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.music;
    }
    onEnemyHit() {
        if (!this.settings.hitmarker) return;
        const now = this.gameNow();
        if (now - this.lastHitMark < HITMARK_DEBOUNCE) return;
        this.lastHitMark = now;
        this.sounds.play(SND.hitmarker, PLAYER_SRC);
    }
    setVoice(v) {
        this.settings.voice = v ?? (this.settings.voice === "m" ? "f" : "m");
        this.sounds.setVoice(this.settings.voice);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.voice;
    }
    static VM_POS_ORDER=[ "center", "left", "right" ];
    setViewmodelPos(v) {
        this.settings.vmPos = v ?? QuakeController.VM_POS_ORDER[(QuakeController.VM_POS_ORDER.indexOf(this.settings.vmPos) + 1) % QuakeController.VM_POS_ORDER.length];
        this.weapons.setViewmodelPos(this.settings.vmPos);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.vmPos;
    }
    setGod(on) {
        this.settings.god = on === undefined ? !this.settings.god : on;
        this.player.godMode = this.settings.god;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.god;
    }
    setInfAmmo(on) {
        this.settings.infAmmo = on === undefined ? !this.settings.infAmmo : on;
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.infAmmo;
    }
    makeItemEffects() {
        return {
            armor: (type, value) => {
                const p = this.player;
                if (p.armorType * p.armorValue >= type * value) return false;
                p.armorType = type;
                p.armorValue = value;
                return true;
            },
            heal: (amount, ignoreMax) => {
                const p = this.player;
                if (p.health <= 0) return false;
                if (!ignoreMax && p.health >= PLAYER_MAX_HEALTH) return false;
                p.health = Math.ceil(p.health + amount);
                if (!ignoreMax && p.health >= PLAYER_MAX_HEALTH) p.health = PLAYER_MAX_HEALTH;
                if (p.health > HEALTH_MEGA_MAX) p.health = HEALTH_MEGA_MAX;
                if (ignoreMax) this.megaRotAt = this.gameNow() + MEGA_ROT_DELAY;
                return true;
            },
            shells: n => this.weapons.addShells(n),
            suit: () => {
                this.radsuitUntil = this.gameNow() + RADSUIT_TIME;
                return true;
            },
            powerup: kind => {
                const t = this.gameNow();
                if (kind === "quad") {
                    this.quadUntil = t + QUAD_TIME;
                    this.quadWarnAt = 0;
                } else if (kind === "pent") {
                    this.pentUntil = t + PENT_TIME;
                    this.player.invincibleUntil = this.pentUntil;
                    this.pentTickAt = t + 1 + Math.random() * 3;
                    this.pentWarnAt = 0;
                } else {
                    this.ringUntil = t + RING_TIME;
                    this.ringTickAt = t + 1 + Math.random() * 3;
                    this.ringWarnAt = 0;
                }
                return true;
            },
            ammo: (kind, n) => this.weapons.addAmmo(kind, n),
            weapon: csName => {
                const p = this.pawn();
                if (p) this.weapons.give(p, csName, this.gameNow());
                return true;
            },
            key: idx => {
                this.keys[idx] = true;
                return true;
            },
            rune: idx => {
                this.runes[idx] = true;
                return true;
            }
        };
    }
    radiusDamage(origin, damage, now, selfAttacker = true, ignore) {
        const dmg = damage * (this.gameNow() < this.quadUntil ? QUAD_DAMAGE_MUL : 1);
        let sndSrc = PLAYER_SRC;
        if (this.explosionTmpl) {
            const sp = this.explosionTmpl.ForceSpawn(origin, {
                pitch: 0,
                yaw: 0,
                roll: 0
            });
            if (sp && sp.length) {
                sndSrc = `q_expfx_${this.expFxSeq++}`;
                sp[0].SetEntityName(sndSrc);
                this.explosionFx.push({
                    prop: sp[0],
                    dieAt: now + EXPLOSION_FX_TTL
                });
            }
        }
        this.particles.burst("explosion", origin, undefined, now);
        this.sounds.play(SND.explosion, sndSrc);
        this.enemies.radiusHurt(origin, dmg, now, ignore, selfAttacker);
        this.barrels.radiusHit(origin, dmg, now);
        if (!this.dead && this.player.takeDamage) {
            const dist = this.pm.origin.distance(origin);
            let pts = dist > damage + EXPLOSION_RADIUS_PAD ? 0 : damage - .5 * dist;
            if (selfAttacker) pts *= .5;
            if (pts > 0) {
                T_Damage(this.player, {
                    inflictorCenter: origin,
                    damage: pts,
                    byPlayer: false,
                    time: now
                });
            }
        }
    }
    tickPowerups(now) {
        if (this.dead) return;
        if (now < this.ringUntil) {
            if (now >= this.ringTickAt) {
                this.sounds.play(SND.ringTick, PLAYER_SRC);
                this.ringTickAt = now + 1 + Math.random() * 3;
            }
            if (this.ringUntil - now < 3 && now >= this.ringWarnAt) {
                this.sounds.play(SND.ringWarn, PLAYER_SRC);
                this.ringWarnAt = now + 1;
            }
        }
        if (now < this.pentUntil) {
            if (now >= this.pentTickAt) {
                this.sounds.play(SND.pentTick, PLAYER_SRC);
                this.pentTickAt = now + 1 + Math.random() * 3;
            }
            if (this.pentUntil - now < 3 && now >= this.pentWarnAt) {
                this.sounds.play(SND.pentWarn, PLAYER_SRC);
                this.pentWarnAt = now + 1;
            }
        }
        if (now < this.quadUntil && this.quadUntil - now < 3 && now >= this.quadWarnAt) {
            this.sounds.play(SND.quadWarn, PLAYER_SRC);
            this.quadWarnAt = now + 1;
        }
        const killed = this.enemies.killStats().killed;
        if (killed !== this.lastKillCount) {
            if (killed > this.lastKillCount && now < this.quadUntil) {
                this.sounds.play(SND.quadKill, PLAYER_SRC);
            }
            this.lastKillCount = killed;
        }
    }
    pawn() {
        return Instance.GetPlayerController(this.slot)?.GetPlayerPawn();
    }
    playerBox(pawn) {
        return {
            id: pawn,
            center: this.pm.origin,
            mins: HULL_MIN,
            maxs: HULL_MAX
        };
    }
    megaRot(now) {
        if (this.dead || this.player.health <= PLAYER_MAX_HEALTH) return;
        if (now < this.megaRotAt) return;
        this.player.health -= 1;
        this.megaRotAt = now + 1;
    }
    onPlayerPain(d) {
        this.sounds.play(SND.playerPain, PLAYER_SRC);
        this.painFlashUntil = this.gameNow() + .2;
        this.damageCshift(d);
        this.playerBlood(d);
    }
    onPickupMsg(m, center = false) {
        if (center) this.hud.showCenter(m, this.gameNow()); else this.hud.showMsg(m, this.gameNow());
        this.crt.bonusFlash();
    }
    damageCshift(d) {
        const blood = d.healthTake ?? d.damage;
        const armor = d.armorSave ?? 0;
        this.crt.damageFlash(Math.max(10, blood * .5 + armor * .5), armor > blood);
    }
    playerBlood(d) {
        if (d.noKnockback) return;
        const chest = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z * .5);
        const away = chest.subtract(d.inflictorCenter);
        if (away.length < 1) return;
        this.particles.burst("blood_impact", chest, away.normal, this.gameNow());
    }
    onPlayerDeath(d) {
        if (this.dead) return;
        this.damageCshift(d);
        this.playerBlood(d);
        this.dead = true;
        this.closeWheel();
        this.pm.inWater = false;
        this.mapTriggers.reset();
        this.enemies.setPlayerAlive(false);
        this.enemies.calmDown();
        this.hud.setVisible(false);
        const k = this.enemies.killStats();
        this.hud.showDeathStats(k.killed, k.total, this.secretsFound.size, this.secretsTotal);
        this.writeSlotPlayTime(this.activeSlot, this.totalPlayTime());
        if (this.player.health < GIB_HEALTH) {
            this.gibs.burst(this.pm.origin, "head_player", this.gameNow());
        }
        if (this.pm.velocity.z < 10) {
            this.pm.velocity = this.pm.velocity.withZ(this.pm.velocity.z + Math.random() * DEATH_TOSS_UP);
        }
        const pawn = this.pawn();
        this.deathYaw = pawn ? pawn.GetEyeAngles().yaw : this.deathYaw;
        this.deathViewOfs = VIEW_OFS_Z;
        this.viewCtl = "death";
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.CONTROLLED);
        this.sounds.play(SND.playerDeath, PLAYER_SRC);
        print("[quake] player died");
    }
    checkTouchDeath(now) {
        const margin = new Vec3(TOUCHDEATH_MARGIN, TOUCHDEATH_MARGIN, TOUCHDEATH_MARGIN);
        const tr = traceHull(this.pm.origin, HULL_MIN.subtract(margin), HULL_MAX.add(margin), this.pm.origin, [], true);
        if (!tr.startsolid || !tr.ent || !tr.ent.IsValid()) return;
        const name = tr.ent.GetEntityName();
        if (!name || !hasTag(name, TOUCHDEATH_TAG)) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin,
            damage: TOUCHDEATH_DAMAGE,
            byPlayer: false,
            time: now,
            noKnockback: true
        });
    }
    pushPlayerFromMonster(box) {
        if (this.pm.noclip) return;
        const p = this.pm.origin;
        const pMin = p.add(HULL_MIN), pMax = p.add(HULL_MAX);
        const mMin = box.center.add(box.mins), mMax = box.center.add(box.maxs);
        const overlap = pMin.x < mMax.x && pMax.x > mMin.x && pMin.y < mMax.y && pMax.y > mMin.y && pMin.z < mMax.z && pMax.z > mMin.z;
        if (!overlap) return;
        let dx = p.x - box.center.x, dy = p.y - box.center.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) {
            dx = 1;
            dy = 0;
        } else {
            dx /= len;
            dy /= len;
        }
        const dist = (box.maxs.x - box.mins.x) * .5 + (HULL_MAX.x - HULL_MIN.x) * .5 + ZOMBIE_WAKE_PUSH_MARGIN;
        const target = p.add(new Vec3(dx * dist, dy * dist, 0));
        const tr = traceHull(p, HULL_MIN, HULL_MAX, target, [ box.id ]);
        this.pm.origin = new Vec3(tr.endpos);
    }
    frame() {
        const pawn = this.pawn();
        const body = this.body;
        if (!pawn || !pawn.IsValid() || !body || !body.IsValid()) {
            this.disable();
            return;
        }
        if (this.viewCtl === "intermission") {
            this.interTick(pawn);
            return;
        }
        if (this.viewCtl === "loading") return;
        if (this.csControl) return;
        const scores = pawn.IsInputPressed(CSInputs.SHOW_SCORES);
        if (scores && !this.scoresHeld) {
            if (this.menu.isOpen()) this.resumeGame(); else this.pauseGame();
        }
        this.scoresHeld = scores;
        if (this.menu.isOpen()) {
            const body = this.body;
            if (!this.dead && this.viewCtl === "play" && body && this.pm.pausedRide(TICK_INTERVAL)) {
                this.applyPlayCam(body, pawn.GetCustomCamera(), 0);
                if (this.touchBody) {
                    this.touchBody.Teleport({
                        position: this.touchPos(),
                        angles: {
                            pitch: 0,
                            yaw: 0,
                            roll: 0
                        }
                    });
                }
            }
            this.updateHud();
            return;
        }
        const law = !this.dead && this.viewCtl === "play" && pawn.IsInputPressed(CSInputs.LOOK_AT_WEAPON);
        if (law && !this.wheelLawHeld) this.openWheel(); else if (this.wheelOpen && !law) this.closeWheel();
        this.wheelLawHeld = law;
        const timeScale = this.wheelOpen ? WHEEL_TIME_SCALE : 1;
        this.pauseAccum += TICK_INTERVAL * (1 - timeScale);
        const wheelFrame = this.wheelOpen;
        if (this.wheelOpen) this.hud.setWheel(this.weapons.wheelSlots(), this.weapons.wheelActiveIndex());
        this.prof.frame();
        const obs = this.pm.noclip;
        this.player.takeDamage = !obs;
        const cmd = this.readInput(pawn);
        if (this.dead) {
            cmd.forwardmove = 0;
            cmd.sidemove = 0;
            cmd.jump = false;
        }
        this.updateLiquid();
        this.refreshTraceIgnore();
        this.prof.mark("input");
        if (timeScale < 1) {
            this.pm.runFrame(cmd, TICK_INTERVAL * timeScale);
            this.accum = 0;
        } else {
            this.accum = Math.min(this.accum + TICK_INTERVAL * timeScale, .1);
            let guard = 0;
            while (this.accum >= SUB_FRAMETIME && guard++ < 64) {
                this.pm.runFrame(cmd, SUB_FRAMETIME);
                this.accum -= SUB_FRAMETIME;
            }
        }
        if (timeScale < 1) {
            this.pm.liftCatchUp(TICK_INTERVAL * (1 - timeScale));
        }
        this.prof.mark("physics");
        if (this.pm.justJumped) {
            this.sounds.play(SND.playerJump, PLAYER_SRC);
            this.pm.justJumped = false;
        }
        if (this.pm.crushed) {
            this.pm.crushed = false;
            const lift = this.pm.groundEntity;
            const nm = lift && lift.IsValid() ? lift.GetEntityName() : "";
            if (nm.startsWith("lift_prox")) {
                this.prox.crushLift(nm, this.gameNow());
            } else if (nm.startsWith("lift_manual")) {
                Instance.ServerCommand(`ent_fire ${nm} Close`);
            }
            if (nm.startsWith("lift") && !this.dead && this.gameNow() >= this.crushHurtAt) {
                this.crushHurtAt = this.gameNow() + LIFT_CRUSH_HURT_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: LIFT_CRUSH_DAMAGE,
                    byPlayer: false,
                    time: this.gameNow(),
                    noKnockback: true
                });
            }
        }
        if (this.pm.stuckHurt) {
            this.pm.stuckHurt = false;
            if (!this.dead && !obs && this.gameNow() >= this.crushHurtAt) {
                this.crushHurtAt = this.gameNow() + LIFT_CRUSH_HURT_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: LIFT_CRUSH_DAMAGE,
                    byPlayer: false,
                    time: this.gameNow(),
                    noKnockback: true
                });
            }
        }
        if (!this.dead && !obs) this.checkTouchDeath(this.gameNow());
        if (this.pm.landSpeed > 0) {
            const hard = this.pm.landSpeed > LAND_HARD_SPEED;
            this.sounds.play(hard ? SND.playerLandHard : SND.playerLand, PLAYER_SRC);
            if (hard && !this.dead) {
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin,
                    damage: FALL_DAMAGE,
                    byPlayer: false,
                    time: this.gameNow(),
                    noKnockback: true
                });
            }
            this.pm.landSpeed = 0;
        }
        if (this.pm.swamUp) {
            this.pm.swamUp = false;
            const t = this.gameNow();
            if (t >= this.nextSwimSnd) {
                this.nextSwimSnd = t + 1;
                this.sounds.play(pick(SND.swim), PLAYER_SRC);
            }
        }
        this.prof.mark("move-post");
        const camera = pawn.GetCustomCamera();
        const now = this.gameNow();
        const bob = this.viewBob && this.viewCtl === "play" ? this.calcViewBob(now) : 0;
        const stepOfs = this.viewCtl === "play" ? this.calcStepSmooth(now) : 0;
        if (this.viewCtl === "death") {
            this.deathViewOfs += (DEATH_VIEW_OFS - this.deathViewOfs) * DEATH_VIEW_LERP;
            const p = this.pm.origin.withZ(this.pm.origin.z + this.deathViewOfs);
            body.Move({
                position: p
            });
            camera.Move({
                position: p,
                angles: {
                    pitch: 0,
                    yaw: this.deathYaw,
                    roll: 0
                }
            });
        } else if (this.viewCtl === "spawn") {
            const eye = this.pm.origin.withZ(this.pm.origin.z + VIEW_OFS_Z);
            body.Move({
                position: eye
            });
            camera.Move({
                position: eye,
                angles: this.spawnAngle
            });
            if (now >= this.spawnHoldUntil) {
                this.viewCtl = "play";
                camera.SetMode(CustomCameraMode.CONTROLLED_POSITION);
                pawn.Teleport({
                    angles: this.spawnAngle
                });
                this.injectedPitch = 0;
                this.pawnAngleForced = false;
            }
        } else {
            this.applyPlayCam(body, camera, bob + stepOfs);
            if (!this.wheelOpen) {
                const roll = this.viewBob && STRAFE_ROLL_TARGET === "pawn" ? this.pm.strafeRoll * STRAFE_ROLL_SCALE : 0;
                const kick = this.weapons.viewPunchPitch;
                const forced = Math.abs(roll) > .02 || Math.abs(kick) > .02;
                if (forced || this.pawnAngleForced) {
                    const pk = forced ? kick : 0;
                    pawn.Teleport({
                        angles: {
                            pitch: cmd.viewPitch + pk,
                            yaw: cmd.viewYaw,
                            roll: forced ? roll : 0
                        }
                    });
                    this.pawnAngleForced = forced;
                    this.injectedPitch = pk;
                }
            }
        }
        if (this.touchBody) {
            if (this.dead || obs) this.touchBody.Teleport({
                position: TOUCH_PARKED
            }); else this.touchBody.Teleport({
                position: this.touchPos(),
                angles: {
                    pitch: 0,
                    yaw: 0,
                    roll: 0
                }
            });
        }
        if (this.muzzLight) {
            this.muzzLight.Teleport({
                position: this.pm.origin
            });
            const shot = this.weapons.lastShotAt;
            if (shot > this.muzzShotSeen) {
                this.muzzShotSeen = shot;
                this.muzzOffAt = shot + MUZZ_LIGHT_TIME;
                if (!this.muzzLit) {
                    Instance.EntFireAtTarget({
                        target: this.muzzLight,
                        input: MUZZ_LIGHT_ON
                    });
                    this.muzzLit = true;
                }
            }
            if (this.muzzLit && (this.dead || this.gameNow() >= this.muzzOffAt)) {
                Instance.EntFireAtTarget({
                    target: this.muzzLight,
                    input: MUZZ_LIGHT_OFF
                });
                this.muzzLit = false;
            }
        }
        this.prof.mark("view");
        this.enemies.update(now, this.pm.origin, this.pm.velocity, this.weapons.attackedAt);
        setSolidBoxes([ ...this.enemies.solidBoxes(), this.playerBox(pawn) ]);
        this.prof.mark("enemies");
        this.weapons.update(pawn, stepOfs ? this.pm.origin.withZ(this.pm.origin.z + stepOfs) : this.pm.origin, cmd.viewPitch, cmd.viewYaw, !this.dead && !wheelFrame, now, bob, this.viewCtl === "play" ? this.pm.velocity : undefined);
        this.prof.mark("weapons");
        this.projectiles.update(now, TICK_INTERVAL * timeScale);
        this.fireballs.update(now);
        this.eventLightning.update(now);
        if (this.explosionFx.length) {
            this.explosionFx = this.explosionFx.filter(fx => {
                if (fx.prop.IsValid() && now < fx.dieAt) return true;
                safeRemove(fx.prop);
                return false;
            });
        }
        this.prof.mark("projectiles");
        this.gibs.update(now, TICK_INTERVAL * timeScale);
        this.particles.update(now);
        this.backpacks.update(now, TICK_INTERVAL * timeScale, this.pm.origin, !this.dead && !obs);
        this.items.update(this.pm.origin, !this.dead && !obs);
        this.levelExit.update(this.pm.origin, !this.dead && !obs);
        this.prof.mark("entities");
        if (!this.dead && !obs) {
            const ge = this.pm.groundEntity;
            const groundName = ge && ge.IsValid() ? ge.GetEntityName() : "";
            this.prox.update(this.pm.origin, now, groundName);
        }
        this.megaRot(now);
        this.tickPowerups(now);
        this.enemies.setPlayerInvisible(now < this.ringUntil || obs);
        this.prof.mark("prox");
        this.updateHud();
        this.hud.updateNoAmmo(now);
        this.hud.updateCenter(now);
        if (this.showPos) this.drawShowPos(pawn);
        this.prof.mark("hud");
        this.prof.done();
    }
    drawShowPos(pawn) {
        const o = this.pm.origin;
        const v = this.pm.velocity;
        const a = pawn.GetEyeAngles();
        const spd = Math.sqrt(v.x * v.x + v.y * v.y);
        const st = this.pm.noclip ? "noclip" : this.pm.headUnder ? "submerged" : this.pm.inWater ? "water" : this.pm.onGround ? "ground" : "air";
        const f = n => n.toFixed(1);
        const rows = [ `pos  ${f(o.x)}  ${f(o.y)}  ${f(o.z)}`, `ang  ${f(a.pitch)}  ${f(a.yaw)}`, `vel  ${f(spd)}   z ${f(v.z)}`, `spd  ${Math.round(spd)}   ${st}` ];
        let y = 250;
        for (const r of rows) {
            Instance.DebugScreenText({
                text: r,
                x: 40,
                y,
                duration: TICK_INTERVAL,
                color: {
                    r: 235,
                    g: 235,
                    b: 235
                }
            });
            y += 13;
        }
    }
    updateHud() {
        if (this.dead) {
            this.hud.setVisible(false);
            return;
        }
        this.hud.updateLog(this.gameNow());
        this.hud.setMapTime(this.formatTime(this.gameNow() - this.levelStartTime));
        this.hud.setSaveTimeShown(this.settings.showSaveTime);
        if (this.settings.showSaveTime) this.hud.setSaveTime(this.formatPlayTime(this.totalPlayTime()));
        const p = this.player;
        const at = p.armorType >= .75 ? 3 : p.armorType >= .5 ? 2 : p.armorType > 0 ? 1 : 0;
        const now = this.gameNow();
        const am = this.weapons.snapshot();
        const ak = this.weapons.activeAmmoKind;
        const ammoType = ak === "rockets" ? "rocket" : ak === "" ? "none" : ak;
        const health = Math.ceil(p.health);
        const armor = Math.ceil(p.armorValue);
        const pain = now < this.painFlashUntil;
        const v = this.pm.velocity;
        const quad = now < this.quadUntil;
        const invuln = now < this.pentUntil;
        const invis = now < this.ringUntil;
        const face = invis && invuln ? "invisinvuln" : quad ? "quad" : invis ? "invis" : invuln ? "invuln" : "normal";
        const ks = this.enemies.killStats();
        this.crt.setWater(this.headUnder ? this.liquid : "none");
        this.crt.setPowerupTint(quad, now < this.radsuitUntil, invis, invuln);
        this.hud.update({
            speed: Math.sqrt(v.x * v.x + v.y * v.y),
            health,
            armor,
            armorType: at,
            ammo: this.weapons.activeAmmo,
            ammoType,
            shells: am.shells,
            nails: am.nails,
            rockets: am.rockets,
            cells: am.cells,
            weapons: this.weapons.ownedRow(),
            activeWeapon: this.weapons.activeIndex(),
            painFlash: pain,
            face,
            keys: [ this.keys[0], this.keys[1] ],
            powerups: [ invis, invuln, now < this.radsuitUntil, quad ],
            sigils: [ this.runes[0], this.runes[1], this.runes[2], this.runes[3] ],
            kills: ks.killed,
            killsTotal: ks.total,
            secrets: this.secretsFound.size,
            secretsTotal: this.secretsTotal,
            bossHp: (() => {
                const b = this.enemies.boss();
                return b ? Math.max(0, b.health) / b.maxHealth : 0;
            })()
        });
    }
    readInput(pawn) {
        const f = pawn.IsInputPressed(CSInputs.FORWARD) ? 1 : 0;
        const b = pawn.IsInputPressed(CSInputs.BACK) ? 1 : 0;
        const l = pawn.IsInputPressed(CSInputs.LEFT) ? 1 : 0;
        const r = pawn.IsInputPressed(CSInputs.RIGHT) ? 1 : 0;
        const ang = pawn.GetEyeAngles();
        if (pawn.WasInputJustPressed(CSInputs.JUMP)) this.jumpEdge = true;
        const jump = pawn.IsInputPressed(CSInputs.JUMP) || this.jumpEdge;
        this.jumpEdge = false;
        const sprint = this.settings.alwaysSprint || pawn.IsInputPressed(CSInputs.WALK);
        const fwdSpeed = sprint ? CL_FORWARDSPEED : CL_FORWARDSPEED_WALK;
        const sideSpeed = sprint ? CL_SIDESPEED : CL_SIDESPEED_WALK;
        return {
            forwardmove: (f - b) * fwdSpeed,
            sidemove: (r - l) * sideSpeed,
            jump,
            viewPitch: ang.pitch - this.injectedPitch,
            viewYaw: ang.yaw
        };
    }
}

const quake = new QuakeController;

let commandsRegistered = false;

function registerCommands() {
    if (commandsRegistered) return;
    commandsRegistered = true;
    Instance.RegisterCheatCommand("quake", args => {
        const a = args.trim().toLowerCase();
        const want = a === "on" || a === "1" ? true : a === "off" || a === "0" ? false : !quake.isEnabled();
        if (want !== quake.isEnabled()) quake.toggle();
    });
    Instance.RegisterCheatCommand("qmap", args => {
        const [id, diff] = args.trim().split(/\s+/);
        quake.startMap(id ?? "", diff);
    });
    Instance.RegisterCheatCommand("quakeend", () => quake.endLevel());
    Instance.RegisterCheatCommand("quaketoggleplayer", () => {
        print(`[quake] ${quake.togglePlayerControl()}`);
    });
    Instance.RegisterCheatCommand("qnoclip", args => {
        const a = args.trim().toLowerCase();
        const force = a === "on" || a === "1" ? true : a === "off" || a === "0" ? false : undefined;
        print(`[quake] noclip: ${quake.setNoclip(force) ? "on" : "off"}`);
    });
    Instance.RegisterCheatCommand("qgiveall", () => {
        quake.giveAll();
        print("[quake] all weapons");
    });
    Instance.RegisterCheatCommand("qtoggle_ai", args => {
        print(`[quake] ${quake.toggleMonsterAi(args)}`);
    });
    Instance.RegisterCheatCommand("qspawn", args => {
        print(`[quake] ${quake.spawnMonster(args)}`);
    });
    Instance.RegisterCheatCommand("qcl_showpos", args => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true : a === "0" || a === "off" ? false : undefined;
        print(`[quake] showpos: ${quake.setShowPos(force) ? "on" : "off"}`);
    });
    Instance.RegisterCheatCommand("q_hud", args => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true : a === "0" || a === "off" ? false : undefined;
        print(`[quake] hud: ${quake.setHudShown(force) ? "on" : "off"}`);
    });
    Instance.RegisterCheatCommand("q_viewmodel", args => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true : a === "0" || a === "off" ? false : undefined;
        print(`[quake] viewmodel: ${quake.setViewmodelShown(force) ? "on" : "off"}`);
    });
    Instance.RegisterCheatCommand("q_noclipspeed", args => {
        const n = parseFloat(args.trim());
        print(`[quake] noclipspeed: ${quake.setNoclipSpeed(isNaN(n) ? undefined : n)}`);
    });
    print("[quake] loaded, `sv_cheats 1`, main menu on spawn");
}

Instance.OnScriptReload({
    before: () => {
        const wasEnabled = quake.isEnabled();
        if (wasEnabled) quake.disable();
        return {
            wasEnabled
        };
    },
    after: memory => {
        registerCommands();
        if (memory?.wasEnabled) quake.enable();
    }
});

Instance.OnCustomHudClicked(event => {
    if (event.player.GetPlayerSlot() === 0) quake.onMenuClick(event.buttonId);
});

quake.installTriggers();

Instance.OnActivate(() => {
    registerCommands();
    if (Instance.IsWarmupPeriod()) Instance.ServerCommand("mp_warmup_end");
    quake.discoverLevels();
    const pawn = Instance.GetPlayerController(0)?.GetPlayerPawn();
    if (pawn && pawn.IsValid() && !quake.isEnabled()) quake.onPlayerSpawned();
});

Instance.OnPlayerActivate(() => {
    Instance.ServerCommand("cl_draw_only_deathnotices 1");
});

Instance.OnPlayerReset(event => {
    if (event.player.GetPlayerController()?.GetPlayerSlot() === 0) {
        quake.onPlayerSpawned();
    }
});

Instance.OnRoundStart(() => quake.onPlayerSpawned());
