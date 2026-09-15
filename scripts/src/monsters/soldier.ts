import { Instance as css, Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors } from "../physics/qmath";
import { traceHull } from "../physics/trace";
import { DamageInfo } from "../combat/combat";
import { Monster, MonsterDef, crand } from "./monster";
import type { Enemies } from "./enemies";

const V0 = new Vec3(0, 0, 0);

const SOLDIER_DEF: MonsterDef = {
    className: "monster_army",
    hullMin: C.SOLDIER_HULL_MIN, hullMax: C.SOLDIER_HULL_MAX,
    viewOfsZ: C.SOLDIER_VIEW_OFS_Z,
    yawSpeed: C.SOLDIER_YAW_SPEED,
    modelZOfs: C.SOLDIER_MODEL_Z_OFS, modelYawOfs: C.SOLDIER_MODEL_YAW_OFS,
    animPrefix: C.SOLDIER_ANIM_PREFIX,
    health: C.SOLDIER_HEALTH,
    gibHealth: C.SOLDIER_GIB_HEALTH,
    runSpeed: C.SOLDIER_RUN_SPEED,
    walkSpeed: C.SOLDIER_WALK_SPEED,
    giveUp: C.SOLDIER_GIVEUP,
    firstAttackDelay: C.SOLDIER_FIRST_ATTACK_DELAY,
    dropShells: C.SOLDIER_DROP_SHELLS,
    anims: { stand: C.SOLDIER_ANIM_STAND, walk: C.SOLDIER_ANIM_WALK, run: C.SOLDIER_ANIM_RUN },
    snd: {
        sight: C.SND.soldierSight, idle: C.SND.soldierIdle, attack: C.SND.soldierFire,
        death: C.SND.soldierDeath, pain: C.SND.soldierPain,
    },
};

export class Soldier extends Monster {
    private fired = false;
    private fireAt = 0;
    private atkEnd = 0;

    constructor(prop: Entity, origin: Vec3, yaw: number) {
        super(SOLDIER_DEF, prop, origin, yaw);
    }

    pain(d: DamageInfo): void {
        if (d.time < this.painFinished) return;
        this.fired = false;
        this.state = "pain";
        const n = Math.random();
        this.painSound = n < 0.2 ? this.def.snd.pain[0] : this.def.snd.pain[1];
        if (n < 0.2) {
            this.painFinished = d.time + C.SOLDIER_PAIN1_TIME;
            this.painEnd = d.time + C.SOLDIER_PAIN1_LEN;
            this.play(C.SOLDIER_ANIM_PAIN, true);
        } else if (n < 0.6) {
            this.painFinished = d.time + C.SOLDIER_PAINB_TIME;
            this.painEnd = d.time + C.SOLDIER_PAINB_LEN;
            this.play(C.SOLDIER_ANIM_PAINB, true);
        } else {
            this.painFinished = d.time + C.SOLDIER_PAINB_TIME;
            this.painEnd = d.time + C.SOLDIER_PAINC_LEN;
            this.play(C.SOLDIER_ANIM_PAINC, true);
        }
    }

    die(d: DamageInfo): void {
        this.takeDamage = false;
        this.state = "dead";
        this.settled = false;
        this.corpseSettleAt = d.time + C.CORPSE_SETTLE_TIMEOUT;
        this.fired = false;
        this.play(Math.random() < 0.5 ? C.SOLDIER_ANIM_DEATH : C.SOLDIER_ANIM_DEATHC, true);
    }

    checkAttack(ai: Enemies, now: number): boolean {
        if (now < this.attackFinished) return false;
        const r = ai.range(this);
        if (r === "far" || !ai.clearShot(this)) return false;
        const chance = r === "melee" ? 0.9
            : r === "near" ? C.SOLDIER_ATK_CHANCE_NEAR : C.SOLDIER_ATK_CHANCE_MID;
        if (Math.random() >= chance) return false;

        this.state = "attack";
        this.fired = false;
        this.fireAt = now + C.SOLDIER_FIRE_AT;
        this.atkEnd = now + C.SOLDIER_ATK_LEN;
        this.attackFinished = now + 2 * Math.random();
        this.play(C.SOLDIER_ANIM_SHOOT, true);
        return true;
    }

    runAttack(ai: Enemies, now: number): void {
        ai.aiFace(this);
        if (!this.fired && now >= this.fireAt) {
            this.fire(ai, now);
            this.fired = true;
        }
        if (now < this.atkEnd) return;

        if (ai.visible(this) && ai.infront(this) && Math.random() < C.SOLDIER_REFIRE_CHANCE) {
            this.fired = false;
            this.fireAt = now + C.SOLDIER_FIRE_AT;
            this.atkEnd = now + C.SOLDIER_ATK_LEN;
            this.play(C.SOLDIER_ANIM_SHOOT, true);
        } else {
            this.state = "run";
            this.play(C.SOLDIER_ANIM_RUN);
        }
    }

    private fire(ai: Enemies, now: number): void {
        ai.emit(this, this.def.snd.attack);
        const { forward, right, up } = angleVectors(0, this.yaw, 0);
        const zsrc = this.origin.z + C.SOLDIER_HULL_MIN.z
            + (C.SOLDIER_HULL_MAX.z - C.SOLDIER_HULL_MIN.z) * 0.7;
        const src = this.origin.withZ(zsrc).add(forward.scale(10));

        const lead = ai.tgtOrigin(this).subtract(ai.tgtVel(this).scale(C.SOLDIER_LEAD_TIME));
        const aim = lead.withZ(ai.tgtEye(this).z).subtract(src).normal;

        const enemyId = ai.tgtId(this);
        let dmgEnemy = 0;
        const collateral = new Map<Monster, number>();

        for (let i = 0; i < C.SOLDIER_SHOTS; i++) {
            const dir = aim
                .add(right.scale(crand() * C.SOLDIER_SPREAD))
                .add(up.scale(crand() * C.SOLDIER_SPREAD)).normal;
            const endp = src.add(dir.scale(C.SHOTGUN_RANGE));
            const tr = traceHull(src, V0, V0, endp, [this.prop]);
            const hit = tr.fraction < 1 ? tr.endpos : endp;
            if (C.DEBUG) css.DebugLine({ start: src, end: hit, duration: 0.1, color: { r: 255, g: 220, b: 120 } });
            if (tr.fraction >= 1) continue;

            if (tr.ent === enemyId) {
                dmgEnemy += C.SOLDIER_FIRE_DAMAGE;
            } else {
                const other = ai.monsterByProp(tr.ent);
                if (other) collateral.set(other, (collateral.get(other) ?? 0) + C.SOLDIER_FIRE_DAMAGE);
            }
        }
        if (C.DEBUG) css.DebugSphere({ center: src, radius: 4, duration: 0.08, color: { r: 255, g: 255, b: 180 } });

        if (dmgEnemy > 0) ai.damageEnemyOf(this, dmgEnemy, now);
        for (const [victim, d] of collateral) ai.hurtMonster(victim, d, this, now);
    }
}
