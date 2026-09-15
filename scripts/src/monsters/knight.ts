import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const KNIGHT_DEF: MonsterDef = {
    className: "monster_knight",
    hullMin: C.KNIGHT_HULL_MIN, hullMax: C.KNIGHT_HULL_MAX,
    viewOfsZ: C.KNIGHT_VIEW_OFS_Z,
    yawSpeed: C.KNIGHT_YAW_SPEED,
    modelZOfs: C.KNIGHT_MODEL_Z_OFS, modelYawOfs: C.KNIGHT_MODEL_YAW_OFS,
    animPrefix: C.KNIGHT_ANIM_PREFIX,
    health: C.KNIGHT_HEALTH,
    gibHealth: C.KNIGHT_GIB_HEALTH,
    runSpeed: C.KNIGHT_RUN_SPEED,
    walkSpeed: C.KNIGHT_WALK_SPEED,
    giveUp: C.KNIGHT_GIVEUP,
    firstAttackDelay: C.KNIGHT_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.KNIGHT_ANIM_STAND, walk: C.KNIGHT_ANIM_WALK, run: C.KNIGHT_ANIM_RUN },
    snd: {
        sight: C.SND.knightSight, idle: C.SND.knightIdle, attack: C.SND.knightSword[0],
        death: C.SND.knightDeath, pain: C.SND.knightPain,
    },
};

const tri = (): number => Math.random() + Math.random() + Math.random();

export class Knight extends Monster {
    private lunge = false;
    private atkEnd = 0;
    private hitFrom = 0;
    private hitTo = 0;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(KNIGHT_DEF, prop, origin, yaw);
    }

    pain(d: DamageInfo): void {
        if (d.time < this.painFinished) return;
        this.state = "pain";
        this.painFinished = d.time + C.KNIGHT_PAIN_DEBOUNCE;
        this.painSound = this.def.snd.pain[0];
        if (Math.random() < 0.85) {
            this.painEnd = d.time + C.KNIGHT_PAIN_A_LEN;
            this.play(C.KNIGHT_ANIM_PAIN, true);
        } else {
            this.painEnd = d.time + C.KNIGHT_PAIN_B_LEN;
            this.play(C.KNIGHT_ANIM_PAINB, true);
        }
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < 0.5 ? C.KNIGHT_ANIM_DEATH : C.KNIGHT_ANIM_DEATHB, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (ai.range(this) !== "melee" || !ai.clearShot(this)) return false;

        this.state = "attack";
        ai.emit(this, C.pick(C.SND.knightSword));
        if (this.eye().distance(ai.tgtEye(this)) < C.KNIGHT_STANDATK_DIST) {
            this.lunge = false;
            this.atkEnd = now + C.KNIGHT_ATK_LEN;
            this.hitFrom = now + C.KNIGHT_ATK_HIT_FROM;
            this.hitTo = now + C.KNIGHT_ATK_HIT_TO;
            this.play(C.KNIGHT_ANIM_ATK, true);
        } else {
            this.lunge = true;
            this.atkEnd = now + C.KNIGHT_RUNATK_LEN;
            this.hitFrom = now + C.KNIGHT_RUNATK_HIT_FROM;
            this.hitTo = now + C.KNIGHT_RUNATK_HIT_TO;
            this.play(C.KNIGHT_ANIM_RUNATK, true);
        }
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        ai.aiFace(this);
        const speed = this.lunge ? C.KNIGHT_LUNGE_SPEED : C.KNIGHT_CHARGE_SPEED;
        ai.moveToGoal(this, speed * C.AI_THINK_INTERVAL);

        if (now >= this.hitFrom && now <= this.hitTo) {
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= C.KNIGHT_MELEE_RANGE && ai.clearShot(this)) {
                ai.damageEnemyOf(this, tri() * C.KNIGHT_MELEE_DMG, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
}
