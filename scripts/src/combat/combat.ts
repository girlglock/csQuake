import { Vec3 } from "@s2ze/math";
import * as C from "../constants";

export interface DamageInfo {
    inflictorCenter: Vec3;
    damage: number;
    byPlayer: boolean;
    time: number;
    noKnockback?: boolean;
    armorSave?: number;
    healthTake?: number;
}

export interface Combatant {
    health: number;
    armorValue: number;
    armorType: number;
    takeDamage: boolean;
    getsKnockback: boolean;
    godMode?: boolean;
    invincibleUntil?: number;
    readonly origin: Vec3;
    velocity: Vec3;
    knockback?(delta: Vec3): void;
    pain(d: DamageInfo): void;
    die(d: DamageInfo): void;
}

export function T_Damage(targ: Combatant, d: DamageInfo): void {
    if (!targ.takeDamage) return;

    if (targ.getsKnockback && !d.noKnockback) {
        const dir = targ.origin.subtract(d.inflictorCenter).normal;
        const kick = dir.scale(d.damage * C.KNOCKBACK_SCALE);
        if (targ.knockback) targ.knockback(kick);
        else targ.velocity = targ.velocity.add(kick);
    }

    if (targ.godMode) return;
    if (targ.invincibleUntil !== undefined && targ.invincibleUntil >= d.time) return;

    let save = Math.ceil(targ.armorType * d.damage);
    if (save >= targ.armorValue) {
        save = targ.armorValue;
        targ.armorType = 0;
    }
    targ.armorValue -= save;
    const take = Math.ceil(d.damage - save);

    targ.health -= take;

    d.armorSave = save;
    d.healthTake = take;

    if (targ.health <= 0) {
        targ.die(d);
        return;
    }
    targ.pain(d);
}

export function T_RadiusDamage(
    targets: Combatant[], inflictorOrigin: Vec3, damage: number, now: number,
    self?: Combatant, los?: (t: Combatant) => boolean,
): void {
    for (const t of targets) {
        if (!t.takeDamage) continue;
        let points = damage - 0.5 * t.origin.distance(inflictorOrigin);
        if (t === self) points *= 0.5;
        if (points <= 0) continue;
        if (los && !los(t)) continue;
        T_Damage(t, {
            inflictorCenter: inflictorOrigin, damage: points,
            byPlayer: true, time: now,
        });
    }
}
