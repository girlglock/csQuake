import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors } from "../physics/qmath";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef, crand } from "./monster";
import type { Enemies } from "./enemies";

const WIZARD_DEF: MonsterDef = {
    className: "monster_wizard",
    hullMin: C.WIZARD_HULL_MIN, hullMax: C.WIZARD_HULL_MAX,
    viewOfsZ: C.WIZARD_VIEW_OFS_Z,
    yawSpeed: C.WIZARD_YAW_SPEED,
    modelZOfs: C.WIZARD_MODEL_Z_OFS, modelYawOfs: C.WIZARD_MODEL_YAW_OFS,
    animPrefix: C.WIZARD_ANIM_PREFIX,
    health: C.WIZARD_HEALTH,
    gibHealth: C.WIZARD_GIB_HEALTH,
    runSpeed: C.WIZARD_RUN_SPEED,
    walkSpeed: C.WIZARD_WALK_SPEED,
    giveUp: C.WIZARD_GIVEUP,
    firstAttackDelay: C.WIZARD_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.WIZARD_ANIM_STAND, walk: C.WIZARD_ANIM_WALK, run: C.WIZARD_ANIM_RUN },
    snd: {
        sight: C.SND.wizardSight, idle: C.SND.wizardIdle, attack: C.SND.wizardAttack,
        death: C.SND.wizardDeath, pain: C.SND.wizardPain,
    },
};

export class Wizard extends Monster {
    private atkEnd = 0;
    private shotAAt = 0;
    private shotBAt = 0;
    private firedA = false;
    private firedB = false;
    private muzzleFwd = new Vec3(1, 0, 0);
    private muzzleRight = new Vec3(0, 1, 0);

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(WIZARD_DEF, prop, origin, yaw);
        this.flying = true;
    }

    airborne(): boolean {
        return true;
    }

    pain(d: DamageInfo): void {
        this.painSound = this.def.snd.pain[0];
        if (Math.random() * C.WIZARD_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.firedA = this.firedB = false;
        this.painEnd = d.time + C.WIZARD_PAIN_LEN;
        this.play(C.WIZARD_ANIM_PAIN, true);
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.velocity = new Vec3(
            crand() * C.WIZARD_DEATH_TUMBLE_XY,
            crand() * C.WIZARD_DEATH_TUMBLE_XY,
            C.WIZARD_DEATH_TUMBLE_UP + Math.random() * C.WIZARD_DEATH_TUMBLE_UP);
        this.play(C.WIZARD_ANIM_DEATH, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (now < this.attackFinished || !ai.visible(this)) return false;
        if (ai.range(this) === "far" || !ai.clearShot(this)) {
            this.slide = false;
            return false;
        }
        const r = ai.range(this);
        const chance = r === "melee" ? C.WIZARD_CHANCE_MELEE
            : r === "near" ? C.WIZARD_CHANCE_NEAR : C.WIZARD_CHANCE_MID;
        if (Math.random() < chance) {
            this.startCast(ai, now);
            return true;
        }
        this.slide = r !== "mid";
        return false;
    }

    private startCast(ai: Enemies, now: number): void {
        this.state = "attack";
        this.atkEnd = now + C.WIZARD_ATK_LEN;
        this.shotAAt = now + C.WIZARD_SHOT_A;
        this.shotBAt = now + C.WIZARD_SHOT_B;
        this.firedA = this.firedB = false;
        const v = angleVectors(0, this.yaw, 0);
        this.muzzleFwd = v.forward;
        this.muzzleRight = v.right;
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(C.WIZARD_ANIM_ATTACK, true);
    }

    runAttack(ai: Enemies, now: number): void {
        ai.aiFace(this);
        if (!this.firedA && now >= this.shotAAt) { this.firedA = true; this.spit(ai, 1, now); }
        if (!this.firedB && now >= this.shotBAt) { this.firedB = true; this.spit(ai, -1, now); }
        if (now < this.atkEnd) return;

        this.attackFinished = now + C.WIZARD_ATK_FINISH;
        this.slide = !(ai.range(this) === "far" || !ai.visible(this))
            && ai.range(this) !== "mid";
        this.state = "run";
        this.play(this.def.anims.run, true);
    }

    private spit(ai: Enemies, side: number, now: number): void {
        const muzzle = this.origin
            .withZ(this.origin.z + 30)
            .add(this.muzzleFwd.scale(C.WIZARD_SHOT_SIDE))
            .add(this.muzzleRight.scale(side * C.WIZARD_SHOT_SIDE));
        const aimAt = ai.tgtEye(this).add(this.muzzleRight.scale(side * C.WIZARD_SHOT_LEAD));
        ai.fireSpike(this, muzzle, aimAt, now);
    }
}
