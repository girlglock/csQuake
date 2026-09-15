import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const OGRE_DEF: MonsterDef = {
    className: "monster_ogre",
    hullMin: C.OGRE_HULL_MIN, hullMax: C.OGRE_HULL_MAX,
    viewOfsZ: C.OGRE_VIEW_OFS_Z,
    yawSpeed: C.OGRE_YAW_SPEED,
    modelZOfs: C.OGRE_MODEL_Z_OFS, modelYawOfs: C.OGRE_MODEL_YAW_OFS,
    animPrefix: C.OGRE_ANIM_PREFIX,
    health: C.OGRE_HEALTH,
    gibHealth: C.OGRE_GIB_HEALTH,
    runSpeed: C.OGRE_RUN_SPEED,
    walkSpeed: C.OGRE_WALK_SPEED,
    giveUp: C.OGRE_GIVEUP,
    firstAttackDelay: C.OGRE_FIRST_ATTACK_DELAY,
    dropShells: C.OGRE_DROP_SHELLS,
    anims: { stand: C.OGRE_ANIM_STAND, walk: C.OGRE_ANIM_WALK, run: C.OGRE_ANIM_RUN },
    snd: {
        sight: C.SND.ogreSight, idle: C.SND.ogreIdle, attack: C.SND.ogreSaw,
        death: C.SND.ogreDeath, pain: C.SND.ogrePain,
    },
};

function tri(): number {
    return Math.random() + Math.random() + Math.random();
}

export class Ogre extends Monster {
    private kind: "smash" | "swing" | "shoot" = "smash";
    private atkEnd = 0;
    private hitFrom = 0;
    private hitTo = 0;
    private fired = false;
    private fireAt = 0;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(OGRE_DEF, prop, origin, yaw);
    }

    pain(d: DamageInfo): void {
        if (d.time < this.painFinished) return;
        this.state = "pain";
        this.painSound = this.def.snd.pain[0];
        const r = Math.random();
        if (r < 0.25) {
            this.painEnd = d.time + C.OGRE_PAIN_A_LEN;
            this.painFinished = d.time + C.OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(C.OGRE_ANIM_PAIN, true);
        } else if (r < 0.5) {
            this.painEnd = d.time + C.OGRE_PAIN_B_LEN;
            this.painFinished = d.time + C.OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(C.OGRE_ANIM_PAINB, true);
        } else if (r < 0.75) {
            this.painEnd = d.time + C.OGRE_PAIN_C_LEN;
            this.painFinished = d.time + C.OGRE_PAIN_DEBOUNCE_SHORT;
            this.play(C.OGRE_ANIM_PAINC, true);
        } else if (r < 0.88) {
            this.painEnd = d.time + C.OGRE_PAIN_D_LEN;
            this.painFinished = d.time + C.OGRE_PAIN_DEBOUNCE_LONG;
            this.play(C.OGRE_ANIM_PAIND, true);
        } else {
            this.painEnd = d.time + C.OGRE_PAIN_E_LEN;
            this.painFinished = d.time + C.OGRE_PAIN_DEBOUNCE_LONG;
            this.play(C.OGRE_ANIM_PAINE, true);
        }
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.play(Math.random() < 0.5 ? C.OGRE_ANIM_DEATH : C.OGRE_ANIM_BDEATH, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
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
        this.fireAt = now + C.OGRE_SHOOT_AT;
        this.atkEnd = now + C.OGRE_SHOOT_LEN;
        this.attackFinished = now + 1 + 2 * Math.random();
        this.play(C.OGRE_ANIM_SHOOT, true);
        return true;
    }

    private startMelee(ai: Enemies, now: number): void {
        this.state = "attack";
        ai.emit(this, this.def.snd.attack);
        if (Math.random() > 0.5) {
            this.kind = "smash";
            this.atkEnd = now + C.OGRE_SMASH_LEN;
            this.hitFrom = now + C.OGRE_SMASH_HIT_FROM;
            this.hitTo = now + C.OGRE_SMASH_HIT_TO;
            this.play(C.OGRE_ANIM_SMASH, true);
        } else {
            this.kind = "swing";
            this.atkEnd = now + C.OGRE_SWING_LEN;
            this.hitFrom = now + C.OGRE_SWING_HIT_FROM;
            this.hitTo = now + C.OGRE_SWING_HIT_TO;
            this.play(C.OGRE_ANIM_SWING, true);
        }
    }

    runAttack(ai: Enemies, now: number): void {
        if (this.kind === "shoot") {
            ai.aiFace(this);
            if (!this.fired && now >= this.fireAt) {
                this.fired = true;
                ai.emit(this, C.SND.grenadeFireEnemy);
                ai.lobGrenade(this, C.OGRE_GRENADE_SPEED, C.OGRE_GRENADE_UP, now);
            }
            if (now >= this.atkEnd) { this.state = "run"; this.play(this.def.anims.run, true); }
            return;
        }

        ai.moveToGoal(this, C.OGRE_CHARGE_SPEED * C.AI_THINK_INTERVAL);
        ai.aiFace(this);
        if (now >= this.hitFrom && now <= this.hitTo) {
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= C.OGRE_MELEE_RANGE && ai.clearShot(this)) {
                ai.damageEnemyOf(this, tri() * C.OGRE_MELEE_DMG, now);
            }
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.attackFinished = now + 2 * Math.random();
            this.play(this.def.anims.run, true);
        }
    }
}
