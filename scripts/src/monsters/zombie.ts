import { Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef } from "./monster";
import type { Enemies } from "./enemies";

const ZOMBIE_DEF: MonsterDef = {
    className: "monster_zombie",
    hullMin: C.ZOMBIE_HULL_MIN, hullMax: C.ZOMBIE_HULL_MAX,
    viewOfsZ: C.ZOMBIE_VIEW_OFS_Z,
    yawSpeed: C.ZOMBIE_YAW_SPEED,
    modelZOfs: C.ZOMBIE_MODEL_Z_OFS, modelYawOfs: C.ZOMBIE_MODEL_YAW_OFS,
    animPrefix: C.ZOMBIE_ANIM_PREFIX,
    health: C.ZOMBIE_HEALTH,
    gibHealth: C.ZOMBIE_GIB_HEALTH,
    runSpeed: C.ZOMBIE_RUN_SPEED,
    walkSpeed: C.ZOMBIE_WALK_SPEED,
    giveUp: C.ZOMBIE_GIVEUP,
    firstAttackDelay: C.ZOMBIE_FIRST_ATTACK_DELAY,
    dropShells: 0,
    anims: { stand: C.ZOMBIE_ANIM_STAND, walk: C.ZOMBIE_ANIM_WALK, run: C.ZOMBIE_ANIM_RUN },
    snd: {
        sight: C.SND.zombieSight, idle: C.SND.zombieIdle, attack: C.SND.zombieShot,
        death: C.SND.zombieDeath, pain: C.SND.zombiePain,
    },
};

const ATT_ANIMS = [C.ZOMBIE_ANIM_ATTA, C.ZOMBIE_ANIM_ATTB, C.ZOMBIE_ANIM_ATTC];
const FAST_PAIN: readonly [string, number][] = [
    [C.ZOMBIE_ANIM_PAINA, C.ZOMBIE_PAIN_A_LEN],
    [C.ZOMBIE_ANIM_PAINB, C.ZOMBIE_PAIN_B_LEN],
    [C.ZOMBIE_ANIM_PAINC, C.ZOMBIE_PAIN_C_LEN],
    [C.ZOMBIE_ANIM_PAIND, C.ZOMBIE_PAIN_D_LEN],
];

export class Zombie extends Monster {
    private inpain = 0;
    private atkEnd = 0;
    private releaseAt = 0;
    private fired = false;
    private downUntil = 0;
    private gettingUp = false;
    private justWoke = false;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(ZOMBIE_DEF, prop, origin, yaw);
    }

    pain(d: DamageInfo): void {
        this.health = C.ZOMBIE_HEALTH;
        if (d.damage < C.ZOMBIE_PAIN_IGNORE) return;
        if (this.inpain === 2) return;

        if (d.damage >= C.ZOMBIE_PAIN_KNOCKDOWN) { this.knockdown(d); return; }
        if (this.inpain === 1) {
            this.painFinished = d.time + C.ZOMBIE_PAIN_COMBO_WINDOW;
            return;
        }
        if (this.painFinished > d.time) { this.knockdown(d); return; }

        this.inpain = 1;
        this.state = "pain";
        this.fired = false;
        const [anim, len] = C.pick(FAST_PAIN);
        this.painEnd = d.time + len;
        this.painSound = C.pick(this.def.snd.pain);
        this.play(anim, true);
    }

    private knockdown(d: DamageInfo): void {
        this.inpain = 2;
        this.state = "pain";
        this.fired = false;
        this.gettingUp = false;
        this.downUntil = d.time + C.ZOMBIE_PAIN_DOWN_HOLD;
        this.painEnd = this.downUntil + C.ZOMBIE_PAIN_UP_LEN;
        this.painSound = C.SND.zombieFall;
        this.play(C.ZOMBIE_ANIM_PAINEDOWN, true);
        this.hullOverride = { min: C.ZOMBIE_HULL_MIN, max: C.ZOMBIE_DOWN_HULL_MAX };
    }

    onPainTick(now: number): void {
        if (this.inpain === 2 && !this.gettingUp && now >= this.downUntil) {
            this.gettingUp = true;
            this.play(C.ZOMBIE_ANIM_PAINEUP, true);
            this.hullOverride = undefined;
            this.justWoke = true;
        }
    }

    consumeWokeUp(): boolean {
        if (!this.justWoke) return false;
        this.justWoke = false;
        return true;
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (this.inpain) this.inpain = 0;
        if (now < this.attackFinished) return false;
        const r = ai.range(this);
        if (r === "far" || !ai.clearShot(this)) return false;
        const chance = r === "mid" ? C.ZOMBIE_ATK_CHANCE_MID : C.ZOMBIE_ATK_CHANCE_NEAR;
        if (Math.random() >= chance) return false;

        this.state = "attack";
        this.fired = false;
        this.atkEnd = now + C.ZOMBIE_ATK_LEN;
        this.releaseAt = now + C.ZOMBIE_ATK_RELEASE;
        this.attackFinished = now + 2 * Math.random();
        this.play(C.pick(ATT_ANIMS), true);
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        ai.aiFace(this);
        if (!this.fired && now >= this.releaseAt) {
            this.fired = true;
            ai.emit(this, C.SND.zombieShot);
            ai.lobZombieGib(this, C.ZOMBIE_GIB_SPEED, C.ZOMBIE_GIB_UP, now);
        }
        if (now >= this.atkEnd) {
            this.state = "run";
            this.play(this.def.anims.run, true);
        }
    }
}
