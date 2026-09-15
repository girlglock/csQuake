import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors, clipVelocity } from "../physics/qmath";
import { traceHull } from "../physics/trace";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const DEMON_DEF: MonsterDef = {
    className: "monster_demon1",
    hullMin: C.DEMON_HULL_MIN, hullMax: C.DEMON_HULL_MAX,
    viewOfsZ: C.DEMON_VIEW_OFS_Z,
    yawSpeed: C.DEMON_YAW_SPEED,
    modelZOfs: C.DEMON_MODEL_Z_OFS, modelYawOfs: C.DEMON_MODEL_YAW_OFS,
    animPrefix: C.DEMON_ANIM_PREFIX,
    health: C.DEMON_HEALTH,
    gibHealth: C.DEMON_GIB_HEALTH,
    runSpeed: C.DEMON_RUN_SPEED,
    walkSpeed: C.DEMON_WALK_SPEED,
    giveUp: C.DEMON_GIVEUP,
    firstAttackDelay: C.DEMON_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.DEMON_ANIM_STAND, walk: C.DEMON_ANIM_WALK, run: C.DEMON_ANIM_RUN },
    snd: {
        sight: C.SND.demonSight, idle: C.SND.demonIdle, attack: C.SND.demonHit,
        death: C.SND.demonDeath, pain: C.SND.demonPain,
    },
};

export class Demon extends Monster {
    private kind: "melee" | "leap" = "melee";
    private atkEnd = 0;
    private hit1 = false;
    private hit2 = false;
    private leapStart = 0;
    private leapHit = false;
    private leapCount = 0;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(DEMON_DEF, prop, origin, yaw);
    }

    airborne(): boolean {
        return this.state === "attack" && this.kind === "leap";
    }

    pain(d: DamageInfo): void {
        if (this.airborne()) return;
        if (d.time < this.painFinished) return;
        this.painFinished = d.time + C.DEMON_PAIN_DEBOUNCE;
        if (Math.random() * C.DEMON_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.painEnd = d.time + C.DEMON_PAIN_LEN;
        this.painSound = this.def.snd.pain[0];
        this.play(C.DEMON_ANIM_PAIN, true);
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.play(C.DEMON_ANIM_DEATH, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (ai.range(this) === "melee" && ai.clearShot(this)) {
            this.kind = "melee";
            this.state = "attack";
            this.atkEnd = now + C.DEMON_ATTACK_LEN;
            this.hit1 = this.hit2 = false;
            this.play(C.DEMON_ANIM_ATTACK, true);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (!ai.visible(this) || !ai.clearShot(this)) return false;

        const t = ai.tgtOrigin(this);
        const dz = t.z - this.origin.z;
        if (dz > 48 || dz < -80) return false;
        const d2 = Math.hypot(t.x - this.origin.x, t.y - this.origin.y);
        if (d2 < C.DEMON_LEAP_MIN_DIST) return false;
        if (d2 > C.DEMON_LEAP_FAR_DIST && Math.random() < C.DEMON_LEAP_FAR_SKIP) return false;
        if (!this.leapSafe()) return false;

        ai.aiFace(this);
        this.leapCount = 0;
        this.startLeap(now);
        ai.emit(this, C.SND.demonJump);
        this.attackFinished = now + 1 + Math.random();
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        if (this.kind === "melee") this.runMelee(ai, now);
        else this.runLeap(ai, now);
    }

    private runMelee(ai: Enemies, now: number): void {
        ai.moveToGoal(this, C.DEMON_CHARGE_SPEED * C.AI_THINK_INTERVAL);
        ai.aiFace(this);
        const within = now - (this.atkEnd - C.DEMON_ATTACK_LEN);
        if (!this.hit1 && within >= C.DEMON_MELEE_HIT_1) { this.hit1 = true; this.claw(ai, now); }
        if (!this.hit2 && within >= C.DEMON_MELEE_HIT_2) { this.hit2 = true; this.claw(ai, now); }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }

    private claw(ai: Enemies, now: number): void {
        const dist = this.origin.distance(ai.tgtOrigin(this));
        if (dist > C.DEMON_MELEE_RANGE || !ai.clearShot(this)) return;
        ai.emit(this, C.SND.demonHit);
        ai.damageEnemyOf(this, C.DEMON_MELEE_DMG_MIN + C.DEMON_MELEE_DMG_RND * Math.random(), now);
    }

    private startLeap(now: number): void {
        this.kind = "leap";
        this.state = "attack";
        this.leapStart = now;
        this.leapHit = false;
        this.velocity = angleVectors(0, this.yaw, 0).forward
            .scale(C.DEMON_LEAP_FWD).withZ(C.DEMON_LEAP_UP);
        this.origin = this.origin.withZ(this.origin.z + 1);
        this.play(C.DEMON_ANIM_LEAP, true);
    }

    private leapSafe(): boolean {
        const dt = C.AI_THINK_INTERVAL;
        let pos = this.origin.withZ(this.origin.z + 1);
        let vel = angleVectors(0, this.yaw, 0).forward
            .scale(C.DEMON_LEAP_FWD).withZ(C.DEMON_LEAP_UP);
        for (let i = 0; i < C.DEMON_LEAP_SIM_STEPS; i++) {
            vel = vel.withZ(vel.z - C.SV_GRAVITY * dt);
            const tr = traceHull(pos, this.def.hullMin, this.def.hullMax,
                pos.add(vel.scale(dt)), [this.prop]);
            pos = new Vec3(tr.endpos);
            if (tr.fraction < 1 && tr.normal.z > 0.7) return true;
            if (vel.z <= 0 && pos.z <= this.origin.z + C.MONSTER_STEPSIZE) {
                const down = traceHull(pos, this.def.hullMin, this.def.hullMax,
                    pos.withZ(pos.z - C.DEMON_LEAP_PROBE_DOWN), [this.prop]);
                return down.fraction < 1;
            }
        }
        return true;
    }

    private runLeap(ai: Enemies, now: number): void {
        ai.aiFace(this);
        const dt = C.AI_THINK_INTERVAL;
        this.velocity = this.velocity.withZ(this.velocity.z - C.SV_GRAVITY * dt);
        const tr = traceHull(this.origin, this.def.hullMin, this.def.hullMax,
            this.origin.add(this.velocity.scale(dt)), [this.prop]);

        if (tr.fraction < 1 && !this.leapHit && this.velocity.length > C.DEMON_LEAP_MIN_SPEED) {
            const ldmg = C.DEMON_LEAP_DMG_MIN + C.DEMON_LEAP_DMG_RND * Math.random();
            if (tr.ent === ai.tgtId(this)) {
                ai.damageEnemyOf(this, ldmg, now);
                this.leapHit = true;
            } else {
                const other = ai.monsterByProp(tr.ent);
                if (other) { ai.hurtMonster(other, ldmg, this, now); this.leapHit = true; }
            }
        }

        this.origin = new Vec3(tr.endpos);

        const onFloor = tr.fraction < 1 && tr.normal.z > 0.7 && this.velocity.z <= 0;
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
        if (now - this.leapStart > C.DEMON_LEAP_MAX_TIME) {
            this.velocity = new Vec3(0, 0, 0);
            this.state = "run";
            this.play(this.def.anims.run, true);
            return;
        }
        if (tr.fraction < 1 && tr.normal.z <= 0.7) {
            this.velocity = clipVelocity(this.velocity, tr.normal, 1.0).out;
        }
        this.play(C.DEMON_ANIM_LEAP);
    }
}
