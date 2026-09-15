import { Instance as css, Entity, PointTemplate } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { traceHull } from "../physics/trace";
import { clipVelocity } from "../physics/qmath";
import { safeRemove } from "../entutil";
import { Sounds } from "../game/sound";
import { Particles, TrailHandle } from "../game/particles";

const V0 = new Vec3(0, 0, 0);

interface Gib { prop: Entity; origin: Vec3; velocity: Vec3; dieAt: number; trail?: TrailHandle; }

let nextGibSndId = 0;

export type HeadKind =
    "head_player" | "head_soldier" | "head_dog"
    | "head_ogre" | "head_knight" | "head_demon"
    | "head_zombie" | "head_wizard" | null;

export class Gibs {
    private live: Gib[] = [];
    private tmpl = new Map<string, PointTemplate>();
    private sounds: Sounds | undefined;
    private particles: Particles | undefined;
    private src = "";

    onEnable(sounds: Sounds, playerSrc: string, particles: Particles): void {
        this.onDisable();
        this.sounds = sounds;
        this.particles = particles;
        this.src = playerSrc;
        for (const n of ["gib1", "gib2", "gib3", "zom_gib",
            "head_player", "head_soldier", "head_dog",
            "head_ogre", "head_knight", "head_demon",
            "head_zombie", "head_wizard"]) {
            const t = css.FindEntityByName(n + "_template");
            if (t instanceof PointTemplate) this.tmpl.set(n, t);
        }
    }

    onDisable(): void {
        for (const g of this.live) { g.trail?.stop(); safeRemove(g.prop); }
        this.live = [];
    }

    props(): Entity[] {
        return this.live.filter((g) => g.prop.IsValid()).map((g) => g.prop);
    }

    burst(origin: Vec3, head: HeadKind, now: number): void {
        const at = origin.withZ(origin.z + 8);
        const kinds = ["gib1", "gib2", "gib3", ...(head ? [head] : [])];
        let sndSrc = this.src;
        for (const k of kinds) {
            const t = this.tmpl.get(k) ?? this.tmpl.get("gib1");
            if (!t) continue;
            const sp = t.ForceSpawn(at, {
                pitch: Math.random() * 360, yaw: Math.random() * 360, roll: Math.random() * 360,
            });
            if (!sp || !sp.length) continue;
            if (sndSrc === this.src) {
                sndSrc = `q_gibfx_${nextGibSndId++}`;
                sp[0].SetEntityName(sndSrc);
            }
            const trail = this.particles?.attachTrail("blood_trail", sp[0]);
            this.live.push({
                prop: sp[0], origin: new Vec3(at), dieAt: now + C.GIB_LIFETIME, trail,
                velocity: new Vec3(
                    (Math.random() - 0.5) * C.GIB_SPREAD,
                    (Math.random() - 0.5) * C.GIB_SPREAD,
                    C.GIB_UP_MIN + Math.random() * C.GIB_UP_RND),
            });
        }
        this.sounds?.play(head === "head_player" ? C.SND.gibSplatPlayer : C.SND.gibSplat, sndSrc);
    }

    update(now: number, dt: number): void {
        if (this.live.length === 0) return;
        const all = this.props();
        for (const g of this.live) {
            if (!g.prop.IsValid()) continue;
            g.velocity = g.velocity.withZ(g.velocity.z - C.SV_GRAVITY * dt);
            const tr = traceHull(g.origin, V0, V0, g.origin.add(g.velocity.scale(dt)),
                [g.prop, ...all]);
            g.origin = new Vec3(tr.endpos);
            if (tr.fraction < 1) {
                g.velocity = clipVelocity(g.velocity, tr.normal, 1.0).out;
                if (g.velocity.length < 40) g.velocity = new Vec3(0, 0, 0);
            }
            g.prop.Move({ position: g.origin });
        }
        for (const g of this.live) {
            if (g.prop.IsValid() && now >= g.dieAt) { g.trail?.stop(); g.prop.Remove(); }
        }
        this.live = this.live.filter((g) => {
            if (g.prop.IsValid()) return true;
            g.trail?.stop();
            return false;
        });
    }
}
