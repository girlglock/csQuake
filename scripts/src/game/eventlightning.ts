import { Instance as css, Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { traceHull } from "../physics/trace";

const V0 = new Vec3(0, 0, 0);

interface Bolt {
    start: Entity;
    end: Entity;
    active: boolean;
    count: number;
    nextTick: number;
    conn: number;
}

export class EventLightning {
    private bolts: Bolt[] = [];
    private beam: ((a: Vec3, b: Vec3, now: number) => void) | undefined;
    private hurtMonster: ((ent: Entity | undefined, now: number) => boolean) | undefined;
    private hurtPlayer: ((dmg: number, at: Vec3, now: number) => void) | undefined;
    private pawn: (() => Entity | undefined) | undefined;

    setSinks(
        beam: (a: Vec3, b: Vec3, now: number) => void,
        hurtMonster: (ent: Entity | undefined, now: number) => boolean,
        hurtPlayer: (dmg: number, at: Vec3, now: number) => void,
        pawn: () => Entity | undefined,
    ): void {
        this.beam = beam;
        this.hurtMonster = hurtMonster;
        this.hurtPlayer = hurtPlayer;
        this.pawn = pawn;
    }

    onEnable(): void {
        this.onDisable();
        for (const e of css.FindEntitiesByClass("info_target")) {
            const n = e.GetEntityName();
            if (!n.startsWith(C.EVENT_LIGHTNING_BASE + "_") || n.endsWith("_end")) continue;
            const end = e.GetParent();
            if (!end || !end.IsValid()) {
                continue;
            }
            const bolt: Bolt = { start: e, end, active: false, count: 0, nextTick: 0, conn: -1 };
            const id = css.ConnectOutput(e, "OnUser1", () => this.fire(bolt));
            if (id !== undefined) bolt.conn = id;
            this.bolts.push(bolt);
        }
    }

    onDisable(): void {
        for (const b of this.bolts) if (b.conn !== -1) { try { css.DisconnectOutput(b.conn); } catch {} }
        this.bolts = [];
    }

    private fire(b: Bolt): void {
        if (b.active) return;
        b.active = true;
        b.count = 0;
        b.nextTick = 0;
    }

    update(now: number): void {
        for (const b of this.bolts) {
            if (!b.active) continue;
            if (b.nextTick === 0) b.nextTick = now;
            while (b.active && now >= b.nextTick && b.count < C.EVENT_LIGHTNING_TICKS) {
                this.bolt(b, now);
                b.count++;
                b.nextTick += C.EVENT_LIGHTNING_TICK;
            }
            if (b.active && b.count >= C.EVENT_LIGHTNING_TICKS) {
                b.active = false;
                if (b.start.IsValid()) css.EntFireAtTarget({ target: b.start, input: "FireUser2" });
            }
        }
    }

    private bolt(b: Bolt, now: number): void {
        if (!b.start.IsValid() || !b.end.IsValid()) { b.active = false; return; }
        const so = b.start.GetAbsOrigin();
        const p1 = new Vec3(so.x, so.y, so.z + C.EVENT_LIGHTNING_START_UP);
        const eo = b.end.GetAbsOrigin();
        const p2 = new Vec3(eo.x, eo.y, eo.z);

        this.beam?.(p1, p2, now);

        let dir = p2.subtract(p1);
        const len = dir.length;
        if (len < 1) return;
        dir = dir.scale(1 / len);
        const perp = new Vec3(-dir.y, dir.x, 0);
        const pl = perp.length;
        const f = pl > 1e-4 ? perp.scale(C.EVENT_LIGHTNING_PERP / pl) : new Vec3(0, 0, 0);

        const hit: Entity[] = [];
        for (const off of [new Vec3(0, 0, 0), f, f.scale(-1)]) {
            const a = p1.add(off);
            const c = p2.add(off);
            const tr = traceHull(a, V0, V0, c, []);
            const ent = tr.ent;
            if (!ent || !ent.IsValid()) continue;
            if (hit.indexOf(ent) !== -1) continue;
            hit.push(ent);
            if (this.hurtMonster?.(ent, now)) continue;
            if (ent === this.pawn?.()) this.hurtPlayer?.(C.EVENT_LIGHTNING_DAMAGE, new Vec3(tr.endpos), now);
        }
    }
}
