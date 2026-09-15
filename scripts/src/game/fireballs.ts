import { Instance as css } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { spawnBaseMatches, matchesSkill, spawnTagOf } from "../entutil";
import { Projectiles } from "../combat/projectiles";

interface Emitter { origin: Vec3; speed: number; nextFire: number; }

export class Fireballs {
    private emitters: Emitter[] = [];
    private projectiles: Projectiles | undefined;

    setProjectiles(p: Projectiles): void { this.projectiles = p; }

    onEnable(now: number, difficulty: string): void {
        this.emitters = [];
        const tag = spawnTagOf(difficulty);
        for (const e of css.FindEntitiesByClass("info_target")) {
            const n = e.GetEntityName();
            if (!spawnBaseMatches(n, C.FIREBALL_SPAWN_BASE) || !matchesSkill(n, tag)) continue;
            const o = e.GetAbsOrigin();
            this.emitters.push({
                origin: new Vec3(o.x, o.y, o.z),
                speed: speedOf(n),
                nextFire: now + Math.random() * C.FIREBALL_DELAY_RAND,
            });
        }
    }

    onDisable(): void {
        this.emitters = [];
    }

    update(now: number): void {
        if (this.emitters.length === 0) return;
        for (const em of this.emitters) {
            if (now < em.nextFire) continue;
            this.projectiles?.fireball(em.origin, em.speed, now);
            em.nextFire = now + C.FIREBALL_DELAY_MIN + Math.random() * C.FIREBALL_DELAY_RAND;
        }
    }
}

function speedOf(name: string): number {
    const h = name.indexOf("#");
    if (h < 0) return C.FIREBALL_SPEED_DEFAULT;
    for (const t of name.slice(h + 1).split("#")) {
        const m = t.match(/^s(\d+)$/);
        if (m) return parseInt(m[1], 10);
    }
    return C.FIREBALL_SPEED_DEFAULT;
}
