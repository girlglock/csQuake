import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors } from "../physics/qmath";
import { traceHull } from "../physics/trace";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const DOG_DEF: MonsterDef = {
    className: "monster_dog",
    hullMin: C.DOG_HULL_MIN, hullMax: C.DOG_HULL_MAX,
    viewOfsZ: C.DOG_VIEW_OFS_Z,
    yawSpeed: C.DOG_YAW_SPEED,
    modelZOfs: C.DOG_MODEL_Z_OFS, modelYawOfs: C.DOG_MODEL_YAW_OFS,
    animPrefix: C.DOG_ANIM_PREFIX,
    health: C.DOG_HEALTH,
    gibHealth: C.DOG_GIB_HEALTH,
    runSpeed: C.DOG_RUN_SPEED,
    walkSpeed: C.DOG_WALK_SPEED,
    giveUp: C.DOG_GIVEUP,
    firstAttackDelay: C.DOG_FIRST_ATTACK_DELAY,
    dropShells: C.DOG_DROP_SHELLS,
    anims: { stand: C.DOG_ANIM_STAND, walk: C.DOG_ANIM_WALK, run: C.DOG_ANIM_RUN },
    snd: {
        sight: C.SND.dogSight, idle: C.SND.dogIdle, attack: C.SND.dogAttack,
        death: C.SND.dogDeath, pain: [C.SND.dogPain],
    },
};

export class Dog extends Monster {
    private kind: "bite" | "leap" = "bite";
    private biteAt = 0;
    private atkEnd = 0;
    private bitDone = false;
    private leapStart = 0;
    private leapHit = false;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(DOG_DEF, prop, origin, yaw);
    }

    airborne(): boolean {
        return this.state === "attack" && this.kind === "leap";
    }

    pain(d: DamageInfo): void {
        this.state = "pain";
        this.painEnd = d.time + C.DOG_PAIN_LEN;
        this.velocity = new Vec3(0, 0, 0);
        this.painSound = this.def.snd.pain[0];
        this.play(C.DOG_ANIM_PAIN, true);
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < 0.5 ? C.DOG_ANIM_DEATH : C.DOG_ANIM_DEATHB, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (!ai.clearShot(this)) return false;
        const r = ai.range(this);

        if (r === "melee") {
            this.startBite(now);
            ai.emit(this, this.def.snd.attack);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (r === "far") return false;

        const chance = r === "near" ? C.DOG_ATK_CHANCE_NEAR : C.DOG_ATK_CHANCE_MID;
        if (Math.random() >= chance) return false;
        if (!this.leapSafe()) return false;

        this.startLeap(now);
        ai.emit(this, this.def.snd.attack);
        return true;
    }

    private leapSafe(): boolean {
        const dt = C.AI_THINK_INTERVAL;
        let pos = this.origin.withZ(this.origin.z + 1);
        let vel = angleVectors(0, this.yaw, 0).forward
            .scale(C.DOG_LEAP_FWD).withZ(C.DOG_LEAP_UP);
        for (let i = 0; i < C.DOG_LEAP_SIM_STEPS; i++) {
            vel = vel.withZ(vel.z - C.SV_GRAVITY * dt);
            const tr = traceHull(pos, this.def.hullMin, this.def.hullMax,
                pos.add(vel.scale(dt)), [this.prop]);
            pos = new Vec3(tr.endpos);
            if (tr.fraction < 1 && tr.normal.z > 0.7) return true;
            if (vel.z <= 0 && pos.z <= this.origin.z + C.MONSTER_STEPSIZE) {
                const down = traceHull(pos, this.def.hullMin, this.def.hullMax,
                    pos.withZ(pos.z - C.DOG_LEAP_PROBE_DOWN), [this.prop]);
                return down.fraction < 1;
            }
        }
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        if (this.kind === "bite") this.runBite(ai, now);
        else this.runLeap(ai, now);
    }

    private startBite(now: number): void {
        this.kind = "bite";
        this.state = "attack";
        this.biteAt = now + C.DOG_BITE_AT;
        this.atkEnd = now + C.DOG_BITE_LEN;
        this.bitDone = false;
        this.play(C.DOG_ANIM_ATTACK, true);
    }

    private runBite(ai: Enemies, now: number): void {
        ai.moveToGoal(this, C.DOG_CHARGE_SPEED * C.AI_THINK_INTERVAL);
        ai.aiFace(this);

        if (!this.bitDone && now >= this.biteAt) {
            this.bitDone = true;
            const dist = this.eye().distance(ai.tgtEye(this));
            if (dist <= C.DOG_BITE_RANGE && ai.clearShot(this)) {
                const ldmg = (Math.random() + Math.random() + Math.random()) * 8;
                ai.damageEnemyOf(this, ldmg, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(C.DOG_ANIM_RUN, true);
        }
    }

    private startLeap(now: number): void {
        this.kind = "leap";
        this.state = "attack";
        this.leapStart = now;
        this.leapHit = false;
        const fwd = angleVectors(0, this.yaw, 0).forward;
        this.velocity = fwd.scale(C.DOG_LEAP_FWD).withZ(C.DOG_LEAP_UP);
        this.origin = this.origin.withZ(this.origin.z + 1);
        this.play(C.DOG_ANIM_LEAP, true);
    }

    private runLeap(ai: Enemies, now: number): void {
        ai.aiFace(this);

        const dt = C.AI_THINK_INTERVAL;
        this.velocity = this.velocity.withZ(this.velocity.z - C.SV_GRAVITY * dt);
        const move = this.velocity.scale(dt);
        const tr = traceHull(
            this.origin, this.def.hullMin, this.def.hullMax,
            this.origin.add(move), [this.prop]);

        if (tr.fraction < 1 && !this.leapHit && this.velocity.length > C.DOG_LEAP_MIN_SPEED) {
            const ldmg = C.DOG_LEAP_DMG_MIN + C.DOG_LEAP_DMG_RND * Math.random();
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
        const landed = (onFloor && ai.checkBottomAt(this, this.origin))
            || now - this.leapStart > C.DOG_LEAP_MAX_TIME;
        if (landed) {
            this.velocity = new Vec3(0, 0, 0);
            this.state = "run";
            this.attackFinished = now + 2 * Math.random();
            this.play(C.DOG_ANIM_RUN, true);
            return;
        }
        if (tr.fraction < 1 && tr.normal.z <= 0.7) {
            this.velocity = this.velocity.withX(0).withY(0);
        }
        this.play(C.DOG_ANIM_LEAP);
    }
}
