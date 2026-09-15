import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const SHAMBLER_DEF: MonsterDef = {
    className: "monster_shambler",
    hullMin: C.SHAMBLER_HULL_MIN, hullMax: C.SHAMBLER_HULL_MAX,
    viewOfsZ: C.SHAMBLER_VIEW_OFS_Z,
    yawSpeed: C.SHAMBLER_YAW_SPEED,
    modelZOfs: C.SHAMBLER_MODEL_Z_OFS, modelYawOfs: C.SHAMBLER_MODEL_YAW_OFS,
    animPrefix: C.SHAMBLER_ANIM_PREFIX,
    health: C.SHAMBLER_HEALTH,
    gibHealth: C.SHAMBLER_GIB_HEALTH,
    runSpeed: C.SHAMBLER_RUN_SPEED,
    walkSpeed: C.SHAMBLER_WALK_SPEED,
    giveUp: C.SHAMBLER_GIVEUP,
    firstAttackDelay: C.SHAMBLER_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.SHAMBLER_ANIM_STAND, walk: C.SHAMBLER_ANIM_WALK, run: C.SHAMBLER_ANIM_RUN },
    snd: {
        sight: C.SND.shamblerSight, idle: C.SND.shamblerIdle, attack: C.SND.shamblerAttack,
        death: C.SND.shamblerDeath, pain: C.SND.shamblerPain,
    },
};

function tri(): number {
    return Math.random() + Math.random() + Math.random();
}

export class Shambler extends Monster {
    private kind: "smash" | "swingr" | "swingl" | "magic" = "smash";
    private atkEnd = 0;
    private hitAt = 0;
    private hitDone = false;
    private boltAt: number[] = [];
    private firedBolts = 0;
    everCastLightning = false;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(SHAMBLER_DEF, prop, origin, yaw);
    }

    pain(d: DamageInfo): void {
        this.painSound = this.def.snd.pain[0];
        if (d.time < this.painFinished) return;
        if (Math.random() * C.SHAMBLER_PAIN_FLINCH_DIV > d.damage) return;
        this.state = "pain";
        this.painEnd = d.time + C.SHAMBLER_PAIN_LEN;
        this.painFinished = d.time + C.SHAMBLER_PAIN_DEBOUNCE;
        this.play(C.SHAMBLER_ANIM_PAIN, true);
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.play(C.SHAMBLER_ANIM_DEATH, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        const r = ai.range(this);
        if (r === "melee" && ai.clearShot(this)) {
            this.startMelee(ai, now);
            return true;
        }
        if (now < this.attackFinished) return false;
        if (!ai.visible(this) || !ai.clearShot(this) || r === "far") return false;

        const chance = r === "near" ? C.SHAMBLER_CHANCE_NEAR : C.SHAMBLER_CHANCE_MID;
        if (Math.random() < chance) {
            this.startMagic(ai, now);
            this.attackFinished = now + 2 * Math.random();
            return true;
        }
        return false;
    }

    private startMelee(ai: Enemies, now: number): void {
        const c = Math.random();
        if (c > 0.6 || this.health === this.def.health) this.enterSmash(ai, now);
        else if (c > 0.3) this.enterSwing(ai, "swingr", now);
        else this.enterSwing(ai, "swingl", now);
    }

    private enterSmash(ai: Enemies, now: number): void {
        this.kind = "smash";
        this.state = "attack";
        this.hitDone = false;
        this.atkEnd = now + C.SHAMBLER_SMASH_LEN;
        this.hitAt = now + C.SHAMBLER_SMASH_HIT_AT;
        ai.emit(this, C.SND.shamblerMelee1);
        this.play(C.SHAMBLER_ANIM_SMASH, true);
    }

    private enterSwing(ai: Enemies, side: "swingr" | "swingl", now: number): void {
        this.kind = side;
        this.state = "attack";
        this.hitDone = false;
        this.atkEnd = now + C.SHAMBLER_SWING_LEN;
        this.hitAt = now + C.SHAMBLER_SWING_HIT_AT;
        ai.emit(this, side === "swingr" ? C.SND.shamblerMelee1 : C.SND.shamblerMelee2);
        this.play(side === "swingr" ? C.SHAMBLER_ANIM_SWINGR : C.SHAMBLER_ANIM_SWINGL, true);
    }

    private startMagic(ai: Enemies, now: number): void {
        this.kind = "magic";
        this.state = "attack";
        this.firedBolts = 0;
        this.atkEnd = now + C.SHAMBLER_MAGIC_LEN;
        this.boltAt = C.SHAMBLER_MAGIC_BOLT_AT.map((t) => now + t);
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(C.SHAMBLER_ANIM_MAGIC, true);
    }

    runAttack(ai: Enemies, now: number): void {
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

        ai.moveToGoal(this, C.SHAMBLER_CHARGE_SPEED * C.AI_THINK_INTERVAL);
        ai.aiFace(this);
        if (!this.hitDone && now >= this.hitAt) {
            this.hitDone = true;
            const dist = this.origin.distance(ai.tgtOrigin(this));
            if (dist <= C.SHAMBLER_MELEE_RANGE && ai.clearShot(this)) {
                const dmg = tri() * (this.kind === "smash" ? C.SHAMBLER_SMASH_DMG : C.SHAMBLER_CLAW_DMG);
                ai.damageEnemyOf(this, dmg, now);
                ai.emit(this, C.SND.shamblerSmack);
            }
        }
        if (now >= this.atkEnd) {
            if (this.kind !== "smash" && Math.random() < 0.5) {
                this.enterSwing(ai, this.kind === "swingr" ? "swingl" : "swingr", now);
                return;
            }
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }

    private castLightning(ai: Enemies, now: number): void {
        this.everCastLightning = true;
        const from = this.origin.withZ(this.origin.z + 40);
        const to = ai.tgtEye(this);
        ai.emit(this, C.SND.shamblerBoom);
        ai.beamFx(from, to, now);
        if (ai.clearShot(this)) ai.damageEnemyOf(this, C.SHAMBLER_LIGHTNING_DMG, now);
    }
}
