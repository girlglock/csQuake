import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { safeRemove, spawnBaseMatches } from "../entutil";

export type FxName =
    | "blood_impact" | "blood_trail" | "wall_impact"
    | "rock_trail" | "rock2_trail" | "explosion" | "lightning" | "bubbles";

const TEMPLATE: Record<FxName, string> = {
    blood_impact: "q_fx_blood_impact_template",
    blood_trail:  "q_fx_blood_trail_template",
    wall_impact:  "q_fx_wall_impact_template",
    rock_trail:   "q_fx_rock_trail_template",
    rock2_trail:  "q_fx_rock2_trail_template",
    explosion:    "q_fx_explosion_template",
    lightning:    "q_fx_lightning_template",
    bubbles:      "q_fx_bubbles_template",
};

const FAR = new Vec3(0, 0, -16384);

const BURST_TTL: Partial<Record<FxName, number>> = {
    blood_impact: C.PARTICLE_BLOOD_TTL,
    wall_impact:  C.PARTICLE_WALL_TTL,
    explosion:    C.PARTICLE_EXPLOSION_TTL,
};

const DEG = 180 / Math.PI;

export interface TrailHandle { stop(): void; }

const NULL_TRAIL: TrailHandle = { stop() {} };

interface Live { prop: Entity; dieAt: number; }

export class Particles {
    private tmpl = new Map<FxName, PointTemplate>();
    private live: Live[] = [];
    private trails: Entity[] = [];
    private statics: Entity[] = [];
    private seq = 0;

    onEnable(now: number): void {
        this.onDisable();
        for (const k of Object.keys(TEMPLATE) as FxName[]) {
            const e = css.FindEntityByName(TEMPLATE[k]);
            if (e instanceof PointTemplate) this.tmpl.set(k, e);
        }
        if (this.tmpl.size === 0) {
            return;
        }
        for (const k of this.tmpl.keys()) {
            const p = this.spawn(k, FAR, undefined);
            if (p) this.live.push({ prop: p, dieAt: now + 0.05 });
        }

        if (this.tmpl.has("bubbles")) {
            for (const e of css.FindEntitiesByClass("info_target")) {
                if (!spawnBaseMatches(e.GetEntityName(), C.AIR_BUBBLES_BASE)) continue;
                const o = e.GetAbsOrigin();
                const p = this.spawn("bubbles", new Vec3(o.x, o.y, o.z), undefined);
                if (!p) continue;
                css.EntFireAtTarget({ target: p, input: "Start" });
                this.statics.push(p);
            }
        }
    }

    onDisable(): void {
        for (const l of this.live) safeRemove(l.prop);
        for (const t of this.trails) safeRemove(t);
        for (const s of this.statics) {
            if (s.IsValid()) css.EntFireAtTarget({ target: s, input: "Stop" });
            safeRemove(s);
        }
        this.live = [];
        this.trails = [];
        this.statics = [];
    }

    props(): Entity[] {
        const out: Entity[] = [];
        for (const l of this.live) if (l.prop.IsValid()) out.push(l.prop);
        for (const t of this.trails) if (t.IsValid()) out.push(t);
        for (const s of this.statics) if (s.IsValid()) out.push(s);
        return out;
    }

    burst(fx: FxName, origin: Vec3, dir: Vec3 | undefined, now: number): void {
        const p = this.spawn(fx, origin, dir && dir.length > 0.001 ? this.aim(dir) : undefined);
        if (!p) return;
        css.EntFireAtTarget({ target: p, input: "Start" });
        this.live.push({ prop: p, dieAt: now + (BURST_TTL[fx] ?? C.PARTICLE_BURST_TTL_DEFAULT) });
    }

    zap(fx: FxName, start: Vec3, end: Vec3, now: number, ttl = C.PARTICLE_ZAP_TTL): void {
        const p = this.spawn(fx, start, undefined);
        if (!p) return;
        css.EntFireAtTarget({ target: p, input: "Start" });
        this.setCP(p, 1, end);
        css.EntFireAtTarget({ target: p, input: "setcontrolpoint",
            value: `1: ${end.x} ${end.y} ${end.z}`, delay: C.TICK_INTERVAL });
        this.live.push({ prop: p, dieAt: now + ttl });
    }

    attachTrail(fx: FxName, carrier: Entity): TrailHandle {
        if (!carrier.IsValid()) return NULL_TRAIL;
        const p = this.spawn(fx, new Vec3(carrier.GetAbsOrigin()), undefined);
        if (!p) return NULL_TRAIL;
        try { p.SetParent(carrier); } catch {}
        css.EntFireAtTarget({ target: p, input: "Start" });
        this.trails.push(p);
        const trails = this.trails;
        let stopped = false;
        return {
            stop() {
                if (stopped) return;
                stopped = true;
                const i = trails.indexOf(p);
                if (i >= 0) trails.splice(i, 1);
                if (!p.IsValid()) return;
                css.EntFireAtTarget({ target: p, input: "Stop" });
                try { p.SetParent(undefined); } catch {}
                css.EntFireAtTarget({ target: p, input: "DestroyImmediately", delay: C.PARTICLE_TRAIL_LINGER });
            },
        };
    }

    update(now: number): void {
        if (this.live.length === 0) return;
        for (const l of this.live) if (l.prop.IsValid() && now >= l.dieAt) safeRemove(l.prop);
        this.live = this.live.filter((l) => l.prop.IsValid() && now < l.dieAt);
    }

    private spawn(fx: FxName, origin: Vec3, ang: { pitch: number; yaw: number; roll: number } | undefined): Entity | undefined {
        const t = this.tmpl.get(fx);
        if (!t) return undefined;
        const sp = t.ForceSpawn(new Vec3(origin), ang ?? { pitch: 0, yaw: 0, roll: 0 });
        const p = sp && sp.length ? sp[0] : undefined;
        if (p) p.SetEntityName(`q_fx_${this.seq++}`);
        return p;
    }

    private setCP = (p: Entity, i: number, v: Vec3): void => {
        css.EntFireAtTarget({ target: p, input: "setcontrolpoint", value: `${i}: ${v.x} ${v.y} ${v.z}` });
    };

    private aim(v: Vec3): { pitch: number; yaw: number; roll: number } {
        return {
            pitch: -Math.atan2(v.z, Math.hypot(v.x, v.y)) * DEG,
            yaw: Math.atan2(v.y, v.x) * DEG,
            roll: 0,
        };
    }
}
