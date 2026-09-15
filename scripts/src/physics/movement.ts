import { Entity, Instance as css } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors, clipVelocity } from "./qmath";
import { QTrace, traceHull, testPosition } from "./trace";

export interface UserCmd {
    forwardmove: number;
    sidemove: number;
    jump: boolean;
    viewPitch: number;
    viewYaw: number;
}

const ZERO = new Vec3(0, 0, 0);

const MOVER_RE = /^func_(door|button|movelinear|plat)/;
const D = 0.70710678;
const STUCK_NUDGE_DIRS = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0),
    new Vec3(D, D, 0), new Vec3(-D, D, 0), new Vec3(D, -D, 0), new Vec3(-D, -D, 0),
    new Vec3(0, 0, 1),
];
const STUCK_NUDGE_STEPS = [2, 6, 12, 20, 32, 48];

export class QuakePlayerMove {
    origin = new Vec3(0, 0, 0);
    velocity = new Vec3(0, 0, 0);
    onGround = false;
    jumpReleased = true;
    noclip = false;
    noclipSpeed = C.NOCLIP_SPEED;
    autoHop = false;
    inWater = false;
    headUnder = false;
    swimUpSpeed = C.WATER_SWIM_UP;
    waterJumpUp = C.WATER_JUMP_UP;

    private waterJump = false;
    private waterJumpTimeLeft = 0;
    private waterJumpDir = new Vec3(0, 0, 0);

    justJumped = false;
    swamUp = false;
    landSpeed = 0;

    groundEntity: Entity | undefined;
    crushed = false;
    stuckHurt = false;
    private groundVel = new Vec3(0, 0, 0);
    private gevEnt: Entity | undefined;
    private gevPos = new Vec3(0, 0, 0);
    private gevTime = -1;

    private mins = C.HULL_MIN;
    private maxs = C.HULL_MAX;
    private frametime = C.TICK_INTERVAL;

    private posHist: Vec3[] = [];
    private histAt = -1;
    private stuckGraceUntil = 0;

    private selfIgnore: (Entity | undefined)[] | undefined;

    setSelf(pawn: Entity): void {
        this.selfIgnore = [pawn];
    }

    private wishdir = new Vec3(0, 0, 0);
    private wishspeed = 0;

    private viewPitch = 0;
    private viewYaw = 0;

    reset(origin: Vec3, velocity: Vec3, onGround: boolean): void {
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
        this.posHist = [new Vec3(origin)];
        this.histAt = css.GetGameTime();
    }

    notifyTeleport(): void {
        this.posHist = [new Vec3(this.origin)];
        this.histAt = css.GetGameTime();
        this.stuckGraceUntil = css.GetGameTime() + C.STUCK_TP_GRACE_TICKS * C.TICK_INTERVAL;
    }

    private recordPos(): void {
        const t = css.GetGameTime();
        if (t - this.histAt < C.STUCK_HIST_INTERVAL) return;
        if (testPosition(this.origin, this.mins, this.maxs, this.selfIgnore)) return;
        this.histAt = t;
        this.posHist.push(new Vec3(this.origin));
        if (this.posHist.length > C.STUCK_HIST_LEN) this.posHist.shift();
    }

    private clearGroundVel(): void {
        this.groundVel = new Vec3(0, 0, 0);
        this.gevEnt = undefined;
        this.gevTime = -1;
    }

    probeGround(): void {
        const tr = traceHull(
            this.origin, this.mins, this.maxs,
            this.origin.withZ(this.origin.z - 2), this.selfIgnore);
        this.onGround = tr.fraction < 1 && tr.normal.z > 0.7;
        this.groundEntity = undefined;
        this.clearGroundVel();
    }

    private captureGround(): void {
        this.groundEntity = undefined;
        if (!this.onGround) { this.clearGroundVel(); this.dbgGround("air"); return; }
        const tr = traceHull(
            this.origin, this.mins, this.maxs,
            this.origin.withZ(this.origin.z - 2), this.selfIgnore);
        const e = tr.ent;
        if (!e || !e.IsValid()) { this.clearGroundVel(); this.dbgGround("world"); return; }
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
        const t = css.GetGameTime();
        if (this.gevEnt === e && this.gevTime >= 0 && t - this.gevTime > 1e-5) {
            const dt = t - this.gevTime;
            const dv = new Vec3((o.x - this.gevPos.x) / dt,
                                (o.y - this.gevPos.y) / dt,
                                (o.z - this.gevPos.z) / dt);
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
        this.dbgGround(`on ${cn} (${e.GetEntityName() || "-"})  gvel `
            + `${this.groundVel.x.toFixed(1)} ${this.groundVel.y.toFixed(1)} ${this.groundVel.z.toFixed(1)}`);
    }

    private unstuckUp(): void {
        if (!testPosition(this.origin, this.mins, this.maxs, this.selfIgnore)) return;
        const cap = C.STEPSIZE + Math.ceil(this.groundVel.z * this.frametime) + 2;
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

    private stickToPlatform(): void {
        const reach = C.STEPSIZE + Math.max(0, -this.groundVel.z * this.frametime);
        const tr = traceHull(
            this.origin, this.mins, this.maxs,
            this.origin.withZ(this.origin.z - reach), this.selfIgnore);
        if (tr.startsolid) {
            this.onGround = true;
            if (this.velocity.z < 0) this.velocity = this.velocity.withZ(0);
            this.unstuckUp();
            return;
        }
        if (tr.fraction >= 1 || !tr.ent || !tr.ent.IsValid()
            || !tr.ent.GetClassName().startsWith("func_")) return;
        this.origin = new Vec3(tr.endpos);
        this.onGround = true;
        if (this.velocity.z < 0) this.velocity = this.velocity.withZ(0);
    }

    liftCatchUp(dt: number): void {
        const e = this.groundEntity;
        if (dt <= 0 || !this.onGround || !e || !e.IsValid()
            || !e.GetClassName().startsWith("func_")) return;
        if (this.groundVel.length < 0.01) return;
        this.frametime = dt;
        this.pushEntity(this.groundVel.scale(dt));
        if (this.groundVel.z > 1) this.unstuckUp();
        else if (!this.justJumped && this.velocity.z <= 8) this.stickToPlatform();
    }

    private dbgGround(msg: string): void {
        if (!C.DEBUG) return;
        css.DebugScreenText({
            text: `[ground] ${msg}`,
            x: 40, y: 400, duration: C.TICK_INTERVAL,
            color: { r: 120, g: 220, b: 255 },
        });
    }

    runFrame(cmd: UserCmd, frametime: number): void {
        this.frametime = Math.max(0, Math.min(frametime, 0.1));
        this.viewPitch = cmd.viewPitch;
        this.viewYaw = cmd.viewYaw;

        if (this.noclip) { this.noclipFrame(cmd); return; }

        const wasOnGround = this.onGround;
        const fallSpeed = -this.velocity.z;

        let rode = false;
        if (this.onGround &&
            (this.groundVel.x !== 0 || this.groundVel.y !== 0 || this.groundVel.z !== 0)) {
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
            if (this.inWater) this.waterMove(cmd);
            else this.clientThink(cmd);

            if (cmd.jump) this.playerJump();
            else this.jumpReleased = true;

            this.checkVelocity();
            if (!this.inWater) {
                this.velocity = this.velocity.withZ(this.velocity.z - C.SV_GRAVITY * this.frametime);
            }
            this.checkVelocity();
        }

        if (this.groundEntity) this.unstuckUp();

        this.checkStuck();
        this.walkMove();

        if (this.groundEntity && !this.justJumped && this.velocity.z <= 8) {
            this.stickToPlatform();
        }

        if (!this.inWater && !wasOnGround && this.onGround && fallSpeed > C.LAND_SOFT_SPEED
            && !rode) {
            this.landSpeed = Math.max(this.landSpeed, fallSpeed);
        }

        this.captureGround();

        if (this.onGround && this.groundEntity && this.groundEntity.IsValid()
            && Math.abs(this.groundVel.z) > 0.5) {
            this.posHist = [new Vec3(this.origin)];
            this.histAt = css.GetGameTime();
            this.stuckGraceUntil = css.GetGameTime() + C.STUCK_LIFT_GRACE_TICKS * C.TICK_INTERVAL;
        }
        this.recordPos();
    }

    pausedRide(dt: number): boolean {
        if (dt <= 0 || this.noclip || !this.onGround) return false;
        this.frametime = dt;
        this.captureGround();
        const e = this.groundEntity;
        if (!e || !e.IsValid() || !e.GetClassName().startsWith("func_")
            || this.groundVel.length < 0.01) return false;
        const b = this.origin;
        this.pushEntity(this.groundVel.scale(dt));
        if (this.groundVel.z > 1) this.unstuckUp();
        else if (this.velocity.z <= 8) this.stickToPlatform();
        return this.origin.x !== b.x || this.origin.y !== b.y || this.origin.z !== b.z;
    }

    private waterMove(cmd: UserCmd): void {
        const { forward, right } = angleVectors(cmd.viewPitch, cmd.viewYaw, 0);
        let wishvel = new Vec3(
            forward.x * cmd.forwardmove + right.x * cmd.sidemove,
            forward.y * cmd.forwardmove + right.y * cmd.sidemove,
            forward.z * cmd.forwardmove,
        );
        if (cmd.forwardmove === 0 && cmd.sidemove === 0) {
            wishvel = wishvel.withZ(wishvel.z - C.WATER_SINK_SPEED);
        }

        let wishspeed = wishvel.length;
        if (wishspeed > C.SV_MAXSPEED) {
            wishvel = wishvel.scale(C.SV_MAXSPEED / wishspeed);
            wishspeed = C.SV_MAXSPEED;
        }
        wishspeed *= C.WATER_WISHSPEED_SCALE;

        const speed = this.velocity.length;
        let newspeed = 0;
        if (speed > 0) {
            newspeed = speed - this.frametime * speed * C.SV_FRICTION;
            if (newspeed < 0) newspeed = 0;
            this.velocity = this.velocity.scale(newspeed / speed);
        }

        if (wishspeed === 0) return;
        const addspeed = wishspeed - newspeed;
        if (addspeed <= 0) return;
        const wishdir = wishvel.scale(1 / wishvel.length);
        let accelspeed = C.SV_ACCELERATE * wishspeed * this.frametime;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(wishdir.scale(accelspeed));
    }

    private noclipFrame(cmd: UserCmd): void {
        const { forward, right } = angleVectors(cmd.viewPitch, cmd.viewYaw, 0);
        let wish = new Vec3(
            forward.x * cmd.forwardmove + right.x * cmd.sidemove,
            forward.y * cmd.forwardmove + right.y * cmd.sidemove,
            forward.z * cmd.forwardmove,
        );
        if (cmd.jump) wish = wish.withZ(wish.z + C.CL_FORWARDSPEED);
        const len = wish.length;
        this.velocity = len > 1e-6 ? wish.scale(this.noclipSpeed / len) : new Vec3(0, 0, 0);
        this.origin = this.origin.add(this.velocity.scale(this.frametime));
        this.onGround = false;
        this.justJumped = false;
        this.landSpeed = 0;
    }

    private clientThink(cmd: UserCmd): void {
        const onground = this.onGround;

        const roll = this.calcRoll() * 4;
        const movePitch = -cmd.viewPitch / C.MOVE_PITCH_DIVISOR;
        const { forward, right } = angleVectors(movePitch, cmd.viewYaw, roll);

        let wishvel = new Vec3(
            forward.x * cmd.forwardmove + right.x * cmd.sidemove,
            forward.y * cmd.forwardmove + right.y * cmd.sidemove,
            0,
        );

        let wishspeed = wishvel.length;
        const wishdir = wishspeed > 0 ? wishvel.scale(1 / wishspeed) : new Vec3(0, 0, 0);
        if (wishspeed > C.SV_MAXSPEED) {
            wishvel = wishvel.scale(C.SV_MAXSPEED / wishspeed);
            wishspeed = C.SV_MAXSPEED;
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

    private userFriction(): void {
        const vel = this.velocity;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (!speed) return;

        const s = 16 / speed;
        const start = new Vec3(
            this.origin.x + vel.x * s,
            this.origin.y + vel.y * s,
            this.origin.z + this.mins.z,
        );
        const stop = start.withZ(start.z - 34);
        const tr = traceHull(start, ZERO, ZERO, stop, this.selfIgnore);

        let friction = C.SV_FRICTION;
        if (tr.fraction === 1.0) friction *= C.SV_EDGEFRICTION;

        const control = speed < C.SV_STOPSPEED ? C.SV_STOPSPEED : speed;
        let newspeed = speed - this.frametime * control * friction;
        if (newspeed < 0) newspeed = 0;
        newspeed /= speed;

        this.velocity = new Vec3(vel.x * newspeed, vel.y * newspeed, vel.z * newspeed);
    }

    private accelerate(): void {
        const currentspeed = this.velocity.dot(this.wishdir);
        const addspeed = this.wishspeed - currentspeed;
        if (addspeed <= 0) return;
        let accelspeed = C.SV_ACCELERATE * this.frametime * this.wishspeed;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(this.wishdir.scale(accelspeed));
    }

    private airAccelerate(wishveloc: Vec3): void {
        let wishspd = wishveloc.length;
        const wishdir = wishspd > 0 ? wishveloc.scale(1 / wishspd) : new Vec3(0, 0, 0);
        if (wishspd > C.AIR_ACCEL_CAP) wishspd = C.AIR_ACCEL_CAP;

        const currentspeed = this.velocity.dot(wishdir);
        const addspeed = wishspd - currentspeed;
        if (addspeed <= 0) return;
        let accelspeed = C.SV_ACCELERATE * this.wishspeed * this.frametime;
        if (accelspeed > addspeed) accelspeed = addspeed;
        this.velocity = this.velocity.add(wishdir.scale(accelspeed));
    }

    knockback(kick: Vec3): void {
        this.velocity = this.velocity.add(kick);
        if (this.onGround && kick.z > C.KNOCKBACK_LAUNCH_MIN) {
            this.onGround = false;
            this.groundEntity = undefined;
            this.clearGroundVel();
            const up = this.origin.withZ(this.origin.z + 1);
            if (!testPosition(up, this.mins, this.maxs, this.selfIgnore)) this.origin = up;
        }
    }

    private checkWaterJump(cmd: UserCmd): void {
        let fwd = angleVectors(0, cmd.viewYaw, 0).forward;
        const len = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y);
        if (len < 1e-6) return;
        fwd = new Vec3(fwd.x / len, fwd.y / len, 0);

        const start = this.origin.withZ(this.origin.z + C.WATER_JUMP_START_UP);
        let end = start.add(fwd.scale(C.WATER_JUMP_FWD_DIST));
        let tr = traceHull(start, ZERO, ZERO, end, this.selfIgnore, true);
        if (tr.fraction >= 1) return;

        const top = start.withZ(start.z + this.maxs.z - C.WATER_JUMP_START_UP);
        end = top.add(fwd.scale(C.WATER_JUMP_FWD_DIST));
        this.waterJumpDir = tr.normal.scale(-C.WATER_JUMP_PUSH);
        tr = traceHull(top, ZERO, ZERO, end, this.selfIgnore, true);
        if (tr.fraction < 1) return;

        this.waterJump = true;
        this.velocity = this.velocity.withZ(this.waterJumpUp);
        this.jumpReleased = false;
        this.waterJumpTimeLeft = C.WATER_JUMP_TIME;
    }

    private playerJump(): void {
        if (this.inWater) {
            this.velocity = this.velocity.withZ(this.swimUpSpeed);
            this.swamUp = true;
            return;
        }
        if (!this.onGround) return;
        if (!this.autoHop && !this.jumpReleased) return;
        this.velocity = this.velocity.add(this.groundVel);
        this.velocity = this.velocity.withZ(this.velocity.z + C.SV_JUMP_VELOCITY);
        this.onGround = false;
        this.groundVel = new Vec3(0, 0, 0);
        this.jumpReleased = false;
        this.justJumped = true;
    }

    private checkVelocity(): void {
        const clamp = (n: number) => {
            if (Number.isNaN(n)) return 0;
            if (n > C.SV_MAXVELOCITY) return C.SV_MAXVELOCITY;
            if (n < -C.SV_MAXVELOCITY) return -C.SV_MAXVELOCITY;
            return n;
        };
        this.velocity = new Vec3(clamp(this.velocity.x), clamp(this.velocity.y), clamp(this.velocity.z));
    }

    private calcRoll(): number {
        const { right } = angleVectors(0, this.viewYaw, 0);
        let side = this.velocity.dot(right);
        const sign = side < 0 ? -1 : 1;
        side = Math.abs(side);
        if (side < C.SV_ROLLSPEED) side = (side * C.SV_ROLLANGLE) / C.SV_ROLLSPEED;
        else side = C.SV_ROLLANGLE;
        return side * sign;
    }

    get strafeRoll(): number { return this.calcRoll(); }

    private pushEntity(push: Vec3): QTrace {
        const tr = traceHull(
            this.origin, this.mins, this.maxs, this.origin.add(push), this.selfIgnore);
        this.origin = new Vec3(tr.endpos);
        return tr;
    }

    private flyMove(): { blocked: number; steptrace: QTrace | null } {
        let blocked = 0;
        let numplanes = 0;
        const planes: Vec3[] = [];
        const primal_velocity = new Vec3(this.velocity);
        let original_velocity = new Vec3(this.velocity);
        let time_left = this.frametime;
        let steptrace: QTrace | null = null;

        for (let bump = 0; bump < C.MOVE_BUMPS; bump++) {
            if (this.velocity.x === 0 && this.velocity.y === 0 && this.velocity.z === 0) break;

            const end = new Vec3(
                this.origin.x + time_left * this.velocity.x,
                this.origin.y + time_left * this.velocity.y,
                this.origin.z + time_left * this.velocity.z,
            );
            const trace = traceHull(this.origin, this.mins, this.maxs, end, this.selfIgnore);

            if (trace.allsolid) {
                this.velocity = new Vec3(0, 0, 0);
                return { blocked: 3, steptrace };
            }

            if (trace.fraction > 0) {
                this.origin = new Vec3(trace.endpos);
                original_velocity = new Vec3(this.velocity);
                numplanes = 0;
            }

            if (trace.fraction === 1) break;

            if (trace.normal.z > 0.7) {
                blocked |= 1;
                this.onGround = true;
            }
            if (Math.abs(trace.normal.z) < 0.02) {
                blocked |= 2;
                steptrace = trace;
            }

            time_left -= time_left * trace.fraction;

            if (numplanes >= C.MAX_CLIP_PLANES) {
                this.velocity = new Vec3(0, 0, 0);
                return { blocked: 3, steptrace };
            }

            let dupPlane = false;
            for (let p = 0; p < numplanes; p++) {
                if (trace.normal.dot(planes[p]) > 0.99) {
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
            for (; i < numplanes; i++) {
                newVel = clipVelocity(original_velocity, planes[i], 1).out;
                let j = 0;
                for (; j < numplanes; j++) {
                    if (j !== i && newVel.dot(planes[j]) < 0) break;
                }
                if (j === numplanes) break;
            }

            if (i !== numplanes) {
                this.velocity = newVel;
            } else {
                if (numplanes !== 2) {
                    this.velocity = new Vec3(0, 0, 0);
                    return { blocked: 7, steptrace };
                }
                const dir = planes[0].cross(planes[1]);
                this.velocity = dir.scale(dir.dot(this.velocity));
            }

            if (this.velocity.dot(primal_velocity) <= 0) {
                this.velocity = new Vec3(0, 0, 0);
                return { blocked, steptrace };
            }
        }

        return { blocked, steptrace };
    }

    private walkMove(): void {
        const oldonground = this.onGround;
        this.onGround = false;

        const oldorg = new Vec3(this.origin);
        const oldvel = new Vec3(this.velocity);

        let clip = this.flyMove().blocked;

        if (!(clip & 2)) return;
        if (!oldonground) return;
        if (C.SV_NOSTEP) return;

        const nosteporg = new Vec3(this.origin);
        const nostepvel = new Vec3(this.velocity);

        this.origin = new Vec3(oldorg);
        this.pushEntity(new Vec3(0, 0, C.STEPSIZE));

        this.velocity = new Vec3(oldvel.x, oldvel.y, 0);
        const stepped = this.flyMove();
        clip = stepped.blocked;

        if (clip) {
            if (Math.abs(oldorg.y - this.origin.y) < 0.03125 && Math.abs(oldorg.x - this.origin.x) < 0.03125) {
                clip = this.tryUnstick(oldvel);
            }
        }

        if ((clip & 2) && stepped.steptrace) this.wallFriction(stepped.steptrace);

        const downtrace = this.pushEntity(new Vec3(0, 0, -C.STEPSIZE + oldvel.z * this.frametime));

        if (downtrace.normal.z > 0.7) {
            this.onGround = true;
        } else {
            this.origin = new Vec3(nosteporg);
            this.velocity = new Vec3(nostepvel);
        }
    }

    private wallFriction(trace: QTrace): void {
        const { forward } = angleVectors(this.viewPitch, this.viewYaw, 0);
        let d = trace.normal.dot(forward) + 0.5;
        if (d >= 0) return;

        const into = trace.normal.scale(trace.normal.dot(this.velocity));
        const side = this.velocity.subtract(into);
        this.velocity = new Vec3(side.x * (1 + d), side.y * (1 + d), this.velocity.z);
    }

    private tryUnstick(oldvel: Vec3): number {
        const oldorg = new Vec3(this.origin);
        const dirs = [
            new Vec3(2, 0, 0), new Vec3(0, 2, 0), new Vec3(-2, 0, 0), new Vec3(0, -2, 0),
            new Vec3(2, 2, 0), new Vec3(-2, 2, 0), new Vec3(2, -2, 0), new Vec3(-2, -2, 0),
        ];
        const savedFt = this.frametime;
        for (let i = 0; i < 8; i++) {
            this.pushEntity(dirs[i]);
            this.velocity = new Vec3(oldvel.x, oldvel.y, 0);
            this.frametime = 0.1;
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

    private checkStuck(): void {
        if (css.GetGameTime() < this.stuckGraceUntil) return;
        if (this.onGround && this.groundEntity && this.groundEntity.IsValid()
            && Math.abs(this.groundVel.z) > 0.5) return;

        const t0 = traceHull(this.origin, this.mins, this.maxs, this.origin, this.selfIgnore);
        if (!t0.startsolid) return;

        const e = t0.ent;
        if (e && e.IsValid() && MOVER_RE.test(e.GetClassName())) {
            const ig = this.selfIgnore ? [...this.selfIgnore, e] : [e];
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
