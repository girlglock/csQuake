import { Instance as css, Entity } from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { traceHull } from "../physics/trace";
import { entityTags } from "../entutil";
import { Enemies } from "../monsters/enemies";

const ZERO = new Vec3(0, 0, 0);

interface Kind {
    base: string;
    openInput: string;
    closeInput: string;
    sndOpen: string;
    sndClose: string;
    stay: boolean;
    crush: boolean;
    close: boolean;
    shoot: boolean;
    lift: boolean;
    hr: number;
    zr: number;
    front: boolean;
    trace: boolean;
    act: number;
}

const KINDS: Kind[] = [
    { base: "door_prox",        openInput: "open",    closeInput: "close",    sndOpen: C.SND.doorMove,    sndClose: C.SND.doorStop, stay: false, crush: true,  close: true,  shoot: false, lift: false, hr: C.DOOR_PROX_RADIUS,   zr: C.DOOR_PROX_Z,   front: false, trace: true,  act: C.DOOR_ACTIVATE_DIST },
    { base: "door_prox_stay",   openInput: "open",    closeInput: "close",    sndOpen: C.SND.doorMove,    sndClose: "",             stay: true,  crush: false, close: true,  shoot: false, lift: false, hr: C.DOOR_PROX_RADIUS,   zr: C.DOOR_PROX_Z,   front: false, trace: true,  act: C.DOOR_ACTIVATE_DIST },
    { base: "door_shoot",       openInput: "open",    closeInput: "close",    sndOpen: C.SND.doorMove,    sndClose: "",             stay: false, crush: false, close: false, shoot: true,  lift: false, hr: 0,                    zr: 0,               front: false, trace: false, act: 0 },
    { base: "door_shoot_stay",  openInput: "open",    closeInput: "close",    sndOpen: C.SND.doorMove,    sndClose: "",             stay: true,  crush: false, close: false, shoot: true,  lift: false, hr: 0,                    zr: 0,               front: false, trace: false, act: 0 },
    { base: "lift_prox",        openInput: "open",    closeInput: "close",    sndOpen: C.SND.doorMove,    sndClose: C.SND.doorStop, stay: false, crush: false, close: true,  shoot: false, lift: true,  hr: 0,                    zr: 0,               front: false, trace: false, act: 0 },
    { base: "button_prox",      openInput: "press",   closeInput: "pressout", sndOpen: C.SND.buttonPress, sndClose: "",             stay: false, crush: false, close: false, shoot: false, lift: false, hr: C.BUTTON_PROX_RADIUS, zr: C.BUTTON_PROX_Z, front: true,  trace: false, act: 0 },
    { base: "button_prox_stay", openInput: "pressin", closeInput: "pressout", sndOpen: C.SND.buttonPress, sndClose: "",             stay: true,  crush: false, close: false, shoot: false, lift: false, hr: C.BUTTON_PROX_RADIUS, zr: C.BUTTON_PROX_Z, front: true,  trace: false, act: 0 },
    { base: "button_shoot",     openInput: "press",   closeInput: "pressout", sndOpen: C.SND.buttonPress, sndClose: "",             stay: false, crush: false, close: false, shoot: true,  lift: false, hr: 0,                    zr: 0,               front: true,  trace: false, act: 0 },
    { base: "button_shoot_stay",openInput: "pressin", closeInput: "pressout", sndOpen: C.SND.buttonPress, sndClose: "",             stay: true,  crush: false, close: false, shoot: true,  lift: false, hr: 0,                    zr: 0,               front: true,  trace: false, act: 0 },
];

interface Marker {
    name: string;
    ent: Entity;
    pos: Vec3;
    open: boolean;
    fired: boolean;
    offAt: number;
    holdUntil: number;
    openDelay: number;
}

const DELAY_TAG = /@delay_(\d+(?:\.\d+)?)/i;

export class ProxActuators {
    private markers = new Map<string, Marker[]>();
    private enemies: Enemies | undefined;

    setEnemies(e: Enemies): void { this.enemies = e; }

    rearm(): void {
        const prevPos = new Map<Entity, Vec3>();
        for (const list of this.markers.values()) {
            for (const m of list) prevPos.set(m.ent, m.pos);
        }
        this.markers.clear();
        for (const k of KINDS) {
            const nested = KINDS.filter((o) => o !== k && o.base.startsWith(k.base))
                .map((o) => o.base);
            let found = css.FindEntitiesByName(`${k.base}*`)
                .filter((e) => !nested.some((b) => e.GetEntityName().startsWith(b)));
            if (found.length === 0) found = css.FindEntitiesByName(k.base);
            const list: Marker[] = [];
            for (let i = 0; i < found.length; i++) {
                const e = found[i];
                if (!e.IsValid()) continue;
                const origName = e.GetEntityName();
                const dm = origName.match(DELAY_TAG);
                const openDelay = dm ? parseFloat(dm[1]) : 0;
                const tags = entityTags(origName).map((t) => `@${t}`).join("");
                e.SetEntityName(`${k.base}${tags}_${i}`);
                const name = e.GetEntityName();
                let pos = prevPos.get(e);
                if (!pos) {
                    const o = e.GetAbsOrigin();
                    pos = new Vec3(o.x, o.y, o.z);
                }
                list.push({ name, ent: e, pos, open: false,
                    fired: false, offAt: 0, holdUntil: 0, openDelay });
                if (k.front) css.ServerCommand(`ent_fire ${name} Unlock`);
                css.ServerCommand(`ent_fire ${name} ${k.closeInput}`);
            }
            this.markers.set(k.base, list);
        }
    }

    crushLift(name: string, now: number): void {
        const k = KINDS.find((x) => x.lift);
        const m = k && this.markers.get(k.base)?.find((x) => x.name === name);
        if (!m) return;
        css.ServerCommand(`ent_fire ${name} close`);
        m.open = false; m.offAt = 0; m.holdUntil = now + C.LIFT_CRUSH_HOLD;
    }

    onShot(ent: Entity | undefined): boolean {
        if (!ent || !ent.IsValid()) return false;
        const name = ent.GetEntityName();
        for (const k of KINDS) {
            if (!k.shoot) continue;
            const m = this.markers.get(k.base)?.find((x) => x.name === name);
            if (!m) continue;
            if (k.stay) {
                if (m.fired) return true;
                m.fired = true;
            }
            css.ServerCommand(`ent_fire ${name} ${k.openInput}`);
            return true;
        }
        return false;
    }

    update(playerOrigin: Vec3, now: number, groundName: string): void {
        for (const k of KINDS) {
            if (k.shoot) continue;
            const list = this.markers.get(k.base);
            if (!list) continue;
            for (const m of list) {
                if (k.lift) {
                    if (now < m.holdUntil) { this.drive(k, m, false); continue; }
                    const on = m.name === groundName && groundName !== "";
                    if (on) m.offAt = 0;
                    else if (m.open && m.offAt === 0) m.offAt = now;
                    const want = on || (m.open && m.offAt > 0
                        && now - m.offAt < C.LIFT_DEBOUNCE);
                    this.drive(k, m, want);
                    continue;
                }
                const hit = this.playerHits(k, m, playerOrigin);
                if (k.stay) {
                    if (hit && !m.fired) {
                        m.fired = true;
                        css.ServerCommand(`ent_fire ${m.name} ${k.openInput}`);
                    }
                    continue;
                }
                this.drive(k, m, hit || (k.crush && m.open && this.monsterInRange(m.pos)));
            }
        }
    }

    private drive(k: Kind, m: Marker, want: boolean): void {
        if (want === m.open) return;
        m.open = want;
        if (!want) {
            if (k.close) css.ServerCommand(`ent_fire ${m.name} ${k.closeInput}`);
            return;
        }
        if (m.openDelay > 0) {
            css.EntFireAtName({ name: m.name, input: k.openInput, delay: m.openDelay });
            return;
        }
        css.ServerCommand(`ent_fire ${m.name} ${k.openInput}`);
    }

    private playerHits(k: Kind, m: Marker, player: Vec3): boolean {
        if (!this.within(m.pos, player, k.hr, k.zr)) return false;
        if (k.trace) {
            if (!k.stay && m.open) return true;
            return this.traceReaches(m.pos, player, k.act);
        }
        return true;
    }

    private traceReaches(target: Vec3, player: Vec3, act: number): boolean {
        const from = player.withZ(player.z + C.VIEW_OFS_Z);
        const dx = target.x - from.x, dy = target.y - from.y, dz = target.z - from.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= act) return true;
        const tr = traceHull(from, ZERO, ZERO, target);
        return tr.fraction * dist >= dist - act;
    }

    private within(a: Vec3, b: Vec3, hr: number, zr: number): boolean {
        const dx = a.x - b.x, dy = a.y - b.y;
        return dx * dx + dy * dy <= hr * hr && Math.abs(a.z - b.z) <= zr;
    }

    private monsterInRange(pos: Vec3): boolean {
        const mons = this.enemies?.monsters;
        if (!mons) return false;
        for (const mon of mons) {
            if (mon.state === "dead") continue;
            if (this.within(pos, mon.origin, C.PROX_RADIUS, C.PROX_Z)) return true;
        }
        return false;
    }
}
