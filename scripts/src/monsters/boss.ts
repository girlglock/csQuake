import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const BOSS_DEF: MonsterDef = {
    className: "monster_boss",
    hullMin: C.BOSS_HULL_MIN, hullMax: C.BOSS_HULL_MAX,
    viewOfsZ: C.BOSS_VIEW_OFS_Z,
    yawSpeed: C.BOSS_YAW_SPEED,
    modelZOfs: C.BOSS_MODEL_Z_OFS, modelYawOfs: C.BOSS_MODEL_YAW_OFS,
    animPrefix: C.BOSS_ANIM_PREFIX,
    health: C.BOSS_HEALTH,
    gibHealth: C.BOSS_GIB_HEALTH,
    runSpeed: 0, walkSpeed: 0,
    giveUp: C.BOSS_GIVEUP,
    firstAttackDelay: C.BOSS_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.BOSS_ANIM_IDLE, walk: C.BOSS_ANIM_IDLE, run: C.BOSS_ANIM_IDLE },
    snd: {
        sight: C.SND.bossSight, idle: C.SND.bossRise, attack: C.SND.bossThrow,
        death: C.SND.bossDeath, pain: C.SND.bossPain,
    },
};

export class Boss extends Monster {
    dormant = true;
    private phase: "rise" | "idle" | "throw" = "rise";
    private phaseUntil = 0;
    private throwAt = 0;
    private fired = false;
    deathAt = 0;
    maxHealth = C.BOSS_HEALTH;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(BOSS_DEF, prop, origin, yaw);
        this.flying = true;
        this.ambush = true;
        this.takeDamage = false;
    }

    airborne(): boolean {
        return true;
    }

    wake(now: number): void {
        if (!this.dormant) return;
        this.dormant = false;
        this.takeDamage = true;
        this.phase = "rise";
        this.phaseUntil = now + C.BOSS_RISE_LEN;
        this.aware = true;
        this.state = "run";
        this.searchTime = now + this.def.giveUp;
        this.attackFinished = now + C.BOSS_RISE_LEN + this.def.firstAttackDelay;
        this.play(C.BOSS_ANIM_RISE, true);
    }

    pain(d: DamageInfo): void {
        this.painSound = this.def.snd.pain[0];
        if (this.dormant || this.state === "dead" || this.phase === "rise") return;
        if (d.damage < C.BOSS_PAIN_MIN_DAMAGE) return;
        this.state = "pain";
        this.phase = "idle";
        this.painEnd = d.time + C.BOSS_SHOCK_LEN;
        this.play(C.pick(C.BOSS_ANIM_SHOCK), true);
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = true;
        this.deathAt = d.time + C.BOSS_DEATH_LEN;
        this.play(C.BOSS_ANIM_DEATH, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
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
        this.phaseUntil = now + C.BOSS_ATTACK_LEN;
        this.throwAt = now + C.BOSS_ATTACK_LEN * C.BOSS_ATTACK_HIT_AT;
        this.fired = false;
        ai.aiFace(this);
        ai.emit(this, this.def.snd.attack);
        this.play(C.BOSS_ANIM_ATTACK, true);
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        ai.aiFace(this);
        if (!this.fired && now >= this.throwAt) {
            this.fired = true;
            ai.fireBossMissile(this, now);
        }
        if (now < this.phaseUntil) return;
        this.state = "run";
        this.phase = "idle";
        this.attackFinished = now + C.BOSS_ATTACK_CD;
        this.play(this.def.anims.run, true);
    }
}
