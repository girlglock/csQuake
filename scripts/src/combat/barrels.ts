import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { safeRemove } from "../entutil";

interface Barrel {
    prop: Entity; origin: Vec3; health: number; name: string;
}

export class Barrels {
    private barrels: Barrel[] = [];
    private radiusDamage: (o: Vec3, d: number, n: number) => void = () => {};

    onEnable(radiusDamage: (o: Vec3, d: number, n: number) => void): void {
        this.onDisable();
        this.radiusDamage = radiusDamage;
        let i = 0;
        for (const [tmpl, spawn] of [
            [C.EXPLOBOX_TEMPLATE, C.EXPLOBOX_SPAWN],
            [C.EXPLOBOX_BIG_TEMPLATE, C.EXPLOBOX_BIG_SPAWN],
        ] as [string, string][]) {
            const t = css.FindEntityByName(tmpl);
            if (!(t instanceof PointTemplate)) {
                if (css.FindEntitiesByName(spawn).length) {
                }
                continue;
            }
            for (const mk of css.FindEntitiesByName(spawn)) {
                const pos = new Vec3(mk.GetAbsOrigin());
                const sp = t.ForceSpawn(pos.add(C.BOX_SPAWN_OFS),
                    { pitch: 0, yaw: mk.GetAbsAngles().yaw, roll: 0 });
                if (!sp || !sp.length) continue;
                const name = `q_barrel_${i++}`;
                sp[0].SetEntityName(name);
                this.barrels.push({
                    prop: sp[0], origin: pos, health: C.EXPLOBOX_HEALTH, name,
                });
            }
        }
    }

    onDisable(): void {
        for (const b of this.barrels) safeRemove(b.prop);
        this.barrels = [];
    }

    isBarrelProp(ent: Entity | undefined): boolean {
        return this.find(ent) !== undefined;
    }

    hit(ent: Entity | undefined, dmg: number, now: number): boolean {
        const b = this.find(ent);
        if (!b) return false;
        this.damage(b, dmg, now);
        return true;
    }

    private find(ent: Entity | undefined): Barrel | undefined {
        if (!ent) return undefined;
        const nm = ent.IsValid() ? ent.GetEntityName() : "";
        return this.barrels.find((x) => x.prop === ent || (nm !== "" && x.name === nm));
    }

    radiusHit(origin: Vec3, dmg: number, now: number): void {
        for (const b of [...this.barrels]) {
            if (!b.prop.IsValid()) continue;
            const pts = dmg - 0.5 * b.origin.distance(origin);
            if (pts > 0) this.damage(b, pts, now);
        }
    }

    private damage(b: Barrel, dmg: number, now: number): void {
        if (b.health <= 0) return;
        b.health -= dmg;
        if (b.health > 0) return;
        this.barrels = this.barrels.filter((x) => x !== b);
        const center = b.origin.withZ(b.origin.z + 32);
        if (b.prop.IsValid()) b.prop.Remove();
        this.radiusDamage(center, C.EXPLOBOX_DAMAGE, now);
    }
}
