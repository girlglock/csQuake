import {
    Instance as css,
    Entity,
    CSPlayerPawn,
    CSWeaponBase,
    CSGearSlot,
    CSInputs,
    CSDamageTypes,
} from "cs_script/point_script";
import { Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { angleVectors } from "../physics/qmath";
import { traceHull } from "../physics/trace";
import { Enemies } from "../monsters/enemies";
import { Sounds } from "../game/sound";
import { Particles } from "../game/particles";
import { Projectiles } from "./projectiles";
import { Barrels } from "./barrels";

const V0 = new Vec3(0, 0, 0);

export type QWeapon =
    | "none" | "axe" | "shotgun" | "ssg" | "nailgun" | "snailgun"
    | "glauncher" | "rlauncher" | "lightning";

export type VmPos = "center" | "left" | "right";

type VmDef = {
    name: string; seq: string; rest?: string; muz: number;
    fireAnim?: number;
    off: { fwd: number; right: number; up: number };
    ang: { pitch: number; yaw: number; roll: number };
};
const O = (fwd: number, right: number, up: number) => ({ fwd, right, up });
const A = (pitch: number, yaw: number, roll: number) => ({ pitch, yaw, roll });
const VIEWMODEL: Record<Exclude<QWeapon, "none">, VmDef> = {
    axe:       { name: "v_axe",   seq: "v_axe",   rest: "v_axe_rest",    muz: 0,  off: O(0, 0, 0), ang: A(0, 0, 0) },
    shotgun:   { name: "v_shot",  seq: "v_shot",  rest: "v_shot_rest",   muz: 0, off: O(0, 0, 0), ang: A(0, 0, 0) },
    ssg:       { name: "v_shot2", seq: "v_shot2", rest: "v_shot2_rest",  muz: 0, off: O(3, 0, 0), ang: A(0, 0, 0) },
    nailgun:   { name: "v_nail",  seq: "v_nail",  rest: "v_nail_rest",   muz: 30, off: O(0, 0, 0), ang: A(0, 0, 0) },
    snailgun:  { name: "v_nail2", seq: "v_nail2", rest: "v_nail2_rest",  muz: 30, off: O(0, 0, 0), ang: A(0, 0, 0) },
    glauncher: { name: "v_rock",  seq: "v_rock",  rest: "v_rock_rest",   muz: 28, off: O(0, 0, 0), ang: A(0, 0, 0) },
    rlauncher: { fireAnim: 0.5,name: "v_rock2", seq: "v_rock2", rest: "v_rock2_rest",  muz: 32, off: O(0, 0, 0), ang: A(0, 0, 0) },
    lightning: { name: "v_light", seq: "v_light", rest: "v_light_rest",  muz: 28, off: O(0, 0, 0), ang: A(0, 0, 0) },
};

type VOfs = { f: number; r: number; u: number };
const PROJ_WEAPONS = new Set<QWeapon>(["nailgun", "snailgun", "glauncher", "rlauncher"]);
const BARREL_OFS: Partial<Record<QWeapon, VOfs | readonly [VOfs, VOfs]>> = {
    glauncher: { f: 5.40, r: 0.00, u: -12.04 },
    rlauncher: { f: 4.08, r: 0.00, u: -11.49 },
    nailgun:   [{ f: 14.34, r: -3.81, u: -13.83 }, { f: 14.34, r: 3.95, u: -13.83 }],
    snailgun:  { f: 18.77, r: 0.00, u: -13.10 },
    lightning: { f: 10.0, r: 0, u: -10.5 },
};

const AUTO_ANIM = new Set<QWeapon>(["nailgun", "snailgun", "lightning"]);
const VM_NAMES = Object.values(VIEWMODEL).map((v) => v.name);
const VM_HIDDEN = new Vec3(0, 0, -16384);

type AmmoKind = "shells" | "nails" | "rockets" | "cells";
const AMMO_FOR: Record<QWeapon, AmmoKind | ""> = {
    none: "", axe: "", shotgun: "shells", ssg: "shells",
    nailgun: "nails", snailgun: "nails",
    glauncher: "rockets", rlauncher: "rockets", lightning: "cells",
};

const SELECT_NEED: Partial<Record<QWeapon, number>> = { ssg: 2, snailgun: 2 };

const CS_FOR: Partial<Record<QWeapon, string>> = {};
for (const [cs, q] of Object.entries(C.WEP_CS)) CS_FOR[q as QWeapon] = cs;

function cr(): number { return Math.random() * 2 - 1; }

function normalizeWeapon(name: string): string {
    if (name.startsWith("weapon_knife") || name === "weapon_bayonet") return "weapon_knife";
    return name;
}

export class QuakeWeapons {
    private ammo = { shells: C.WEAPON_START_SHELLS, nails: 0, rockets: 0, cells: 0 };
    private nextAttack = 0;
    private pendingSwitch: QWeapon | "" = "";
    private pendingSwitchAt = 0;
    private infAmmo = false;
    private lgActive = false;
    private nailSide = -1;
    private vmBusyUntil = 0;
    private vmFireClipOn = false;
    private vmShownWeapon: QWeapon = "none";
    lastShotAt = 0;
    attackedAt = 0;
    private punchPitch = 0;
    private punchAt = 0;
    private current: QWeapon = "none";
    private owned = new Set<QWeapon>(["axe", "shotgun"]);
    private enemies: Enemies | undefined;
    private sounds: Sounds | undefined;
    private projectiles: Projectiles | undefined;
    private barrels: Barrels | undefined;
    private particles: Particles | undefined;
    private lgBeamAt = 0;
    private shootHook: ((ent: Entity | undefined) => boolean) | undefined;
    private noAmmoHook: (() => void) | undefined;
    private dmgScale: () => number = () => 1;
    private playerSrc = "";
    private vmPos: VmPos = "center";
    private vmHidden = false;

    setViewmodelPos(pos: VmPos): void { this.vmPos = pos; }
    setViewmodelHidden(h: boolean): void { this.vmHidden = h; }
    viewmodelHidden(): boolean { return this.vmHidden; }
    private vmSideOfs(): number {
        return this.vmPos === "left" ? -C.VM_SIDE_OFFSET
            : this.vmPos === "right" ? C.VM_SIDE_OFFSET : 0;
    }

    setInfiniteAmmo(on: boolean): void { this.infAmmo = on; }
    setNoAmmoHook(fn: () => void): void { this.noAmmoHook = fn; }
    setEnemies(enemies: Enemies): void { this.enemies = enemies; }
    setProjectiles(p: Projectiles): void { this.projectiles = p; }
    setBarrels(b: Barrels): void { this.barrels = b; }
    setParticles(p: Particles): void { this.particles = p; }
    setShootHook(fn: (ent: Entity | undefined) => boolean): void { this.shootHook = fn; }
    setDamageScale(fn: () => number): void { this.dmgScale = fn; }
    setSounds(sounds: Sounds, playerSrc: string): void {
        this.sounds = sounds;
        this.playerSrc = playerSrc;
    }

    get viewPunchPitch(): number { return this.punchPitch; }

    get shellCount(): number { return this.ammo.shells; }
    get activeWeapon(): QWeapon { return this.current; }
    get activeAmmoKind(): AmmoKind | "" { return AMMO_FOR[this.current]; }
    get activeAmmo(): number {
        const k = AMMO_FOR[this.current];
        return k ? this.ammo[k] : 0;
    }
    get activeIsShotgun(): boolean { return this.current === "shotgun" || this.current === "ssg"; }
    get hasShotgun(): boolean { return true; }

    private static readonly SBAR_ORDER: QWeapon[] = [
        "shotgun", "ssg", "nailgun", "snailgun", "glauncher", "rlauncher", "lightning",
    ];
    ownedRow(): boolean[] { return QuakeWeapons.SBAR_ORDER.map((w) => this.owned.has(w)); }
    activeIndex(): number { return QuakeWeapons.SBAR_ORDER.indexOf(this.current); }

    wheelSlots(): { owned: boolean; hasAmmo: boolean; ammo: number; ammoKind: AmmoKind | "" }[] {
        return C.WHEEL_ORDER.map((w) => {
            const k = AMMO_FOR[w];
            return {
                owned: w === "axe" || this.owned.has(w),
                hasAmmo: this.hasAmmoFor(w),
                ammo: k ? this.ammo[k] : -1,
                ammoKind: k,
            };
        });
    }
    wheelActiveIndex(): number { return C.WHEEL_ORDER.indexOf(this.current as (typeof C.WHEEL_ORDER)[number]); }

    selectFromWheel(pawn: CSPlayerPawn, slot: number, now: number): boolean {
        const w = C.WHEEL_ORDER[slot] as QWeapon | undefined;
        if (!w || (w !== "axe" && !this.owned.has(w))) return false;
        this.selectWeapon(pawn, w, now);
        if (!this.hasAmmoFor(w)) this.noAmmoHook?.();
        return true;
    }

    addShells(n: number): boolean { return this.addAmmo("shells", n); }
    addAmmo(kind: AmmoKind, n: number): boolean {
        const cap = C.AMMO_MAX[kind];
        if (this.ammo[kind] >= cap) return false;
        this.ammo[kind] = Math.min(this.ammo[kind] + n, cap);
        return true;
    }
    setShells(n: number): void {
        this.ammo.shells = Math.max(0, Math.min(Math.trunc(n), C.AMMO_MAX.shells));
    }
    snapshot(): typeof this.ammo { return { ...this.ammo }; }
    restore(a: Partial<typeof this.ammo>): void { Object.assign(this.ammo, a); }
    ownedWeapons(): QWeapon[] { return [...this.owned]; }
    grantOwned(pawn: CSPlayerPawn, list: string[] | undefined): void {
        if (list) for (const q of list) this.owned.add(q as QWeapon);
        this.reconcile(pawn);
    }

    restoreActive(pawn: CSPlayerPawn, w: string | undefined, now: number): void {
        const q = w as QWeapon | undefined;
        if (q && q !== "none" && this.owned.has(q)) this.selectWeapon(pawn, q, now);
    }

    reconcile(pawn: CSPlayerPawn): void {
        for (const [cs, q] of Object.entries(C.WEP_CS)) {
            const held = this.findCs(pawn, cs);
            if (this.owned.has(q as QWeapon)) {
                if (!held) pawn.GiveNamedItem(cs);
            } else if (held) {
                pawn.DestroyWeapon(held);
            }
        }
        const c4 = pawn.GetC4();
        if (c4) pawn.DestroyWeapon(c4);
    }

    onEnable(pawn: CSPlayerPawn, now: number): void {
        this.ammo = { shells: C.WEAPON_START_SHELLS, nails: 0, rockets: 0, cells: 0 };
        this.nextAttack = 0;
        this.lgActive = false;
        this.owned = new Set<QWeapon>(["axe", "shotgun"]);
        this.current = "shotgun";
        this.pendingSwitch = "";
        this.reconcile(pawn);
        this.selectWeapon(pawn, "shotgun", now);
    }

    give(pawn: CSPlayerPawn, csName: string, now?: number): void {
        const q = C.WEP_CS[csName] as QWeapon | undefined;
        const isNew = !!q && !this.owned.has(q);
        if (q) this.owned.add(q);
        this.reconcile(pawn);
        if (isNew && q && now !== undefined) this.selectWeapon(pawn, q, now);
    }

    giveAll(pawn: CSPlayerPawn): void {
        this.owned = new Set<QWeapon>(["axe", ...Object.values(C.WEP_CS)] as QWeapon[]);
        this.reconcile(pawn);
        this.ammo = { ...C.AMMO_MAX };
    }

    onDisable(pawn?: CSPlayerPawn): void {
        this.current = "none";
        for (const n of VM_NAMES) {
            const e = css.FindEntityByName(n);
            if (!e) continue;
            e.Move({ position: VM_HIDDEN });
        }
        if (pawn && pawn.IsValid()) pawn.DestroyWeapons();
    }

    update(pawn: CSPlayerPawn, origin: Vec3, viewPitch: number, viewYaw: number,
        alive: boolean, now: number, bob = 0, vel?: Vec3): void {
        if (this.infAmmo) this.ammo = { ...C.AMMO_MAX };
        const active = pawn.GetActiveWeapon();
        const name = normalizeWeapon(active ? active.GetData()?.GetName() ?? "" : "");
        const mapped = C.WEP_CS[name] as QWeapon | undefined;

        if (this.pendingSwitch) {
            if (mapped === this.pendingSwitch || now - this.pendingSwitchAt > 1.0) {
                this.pendingSwitch = "";
            } else {
                this.current = this.pendingSwitch;
            }
        }
        if (!this.pendingSwitch) {
            if (!mapped) this.current = "axe";
            else if (this.owned.has(mapped)) {
                if (mapped === this.current || this.hasAmmoFor(mapped) || !this.denyEmpty(pawn, now)) {
                    this.current = mapped;
                }
            }
        }

        if (this.current !== this.vmShownWeapon) {
            for (const w of [this.vmShownWeapon, this.current]) {
                if (w === "none") continue;
                const d = VIEWMODEL[w];
                this.setVmAnim(d.name, d.rest ?? d.seq);
            }
            this.vmShownWeapon = this.current;
            this.vmFireClipOn = false;
            this.vmBusyUntil = 0;
        }

        if (active && name in C.WEP_CS && !C.WEP_CS_GRENADE.has(name)) {
            if (active.GetClipAmmo() !== 0) active.SetClipAmmo(0);
            if (active.GetReserveAmmo() !== 0) active.SetReserveAmmo(0);
        }

        const { forward, right, up } = angleVectors(viewPitch, viewYaw, 0);
        const eye = origin.withZ(origin.z + C.VIEW_OFS_Z);
        const held = alive && pawn.IsInputPressed(CSInputs.ATTACK);
        const pressed = alive && (held || pawn.WasInputJustPressed(CSInputs.ATTACK));

        const firedFrom = this.current;
        const poolK = AMMO_FOR[firedFrom];
        const hadAmmo = !!poolK && this.ammo[poolK] > 0;

        if (this.current === "lightning") {
            this.fireLightning(pawn, eye, forward, right, up, held, now);
        } else if (pressed && now >= this.nextAttack) {
            this.fire(pawn, origin, eye, forward, right, up, now);
        }
        if (this.current !== "lightning") this.lgActive = false;

        if (alive && hadAmmo && poolK && this.current === firedFrom && this.ammo[poolK] <= 0) {
            this.checkNoAmmo(pawn, now);
        }

        if (!held || this.current !== "nailgun") this.nailSide = -1;

        const pdt = this.punchAt ? Math.max(0, now - this.punchAt) : 0;
        this.punchAt = now;
        if (this.punchPitch !== 0 && pdt > 0) {
            const d = C.PUNCH_RETURN * pdt;
            this.punchPitch = this.punchPitch < 0
                ? Math.min(0, this.punchPitch + d) : Math.max(0, this.punchPitch - d);
        }

        this.updateVmAnim(held, now);
        this.positionViewmodels(eye, viewPitch, viewYaw, forward, right, up, bob, vel);
        if (C.DEBUG) this.drawHud();
    }

    private muzzleOrigin(eye: Vec3, fwd: Vec3, right: Vec3, up: Vec3): Vec3 {
        if (!PROJ_WEAPONS.has(this.current) && this.current !== "lightning") return eye;
        const vm = VIEWMODEL[this.current as Exclude<QWeapon, "none">];
        const vmPos = eye.add(fwd.scale(vm.off.fwd))
            .add(right.scale(vm.off.right + this.vmSideOfs())).add(up.scale(vm.off.up));
        const bo = BARREL_OFS[this.current];
        const b = Array.isArray(bo) ? bo[this.nailSide > 0 ? 0 : 1] : bo;
        const f = vm.muz + (b?.f ?? 0);
        return vmPos.add(fwd.scale(f)).add(right.scale(b?.r ?? 0)).add(up.scale(b?.u ?? 0));
    }

    private aimPoint(eye: Vec3, fwd: Vec3, pawn: CSPlayerPawn): Vec3 {
        const end = eye.add(fwd.scale(8192));
        const tr = traceHull(eye, V0, V0, end, [pawn]);
        return tr.fraction < 1 ? new Vec3(tr.endpos) : end;
    }

    private fire(pawn: CSPlayerPawn, origin: Vec3, eye: Vec3,
        fwd: Vec3, right: Vec3, up: Vec3, now: number): void {
        const a = this.ammo;
        const q = this.dmgScale();
        const muz = this.muzzleOrigin(eye, fwd, right, up);
        const pdir = PROJ_WEAPONS.has(this.current)
            ? muz.directionTowards(this.aimPoint(eye, fwd, pawn)) : fwd;
        switch (this.current) {
            case "axe":
                this.fireAxe(pawn, origin, fwd, now, q);
                this.nextAttack = now + C.AXE_REFIRE;
                return;
            case "shotgun":
                if (a.shells < 1) return this.outOfAmmo(now);
                a.shells -= 1;
                this.fireBullets(pawn, origin, fwd, right, up, C.SHOTGUN_PELLETS,
                    C.SHOTGUN_SPREAD, C.SHOTGUN_SPREAD, C.SHOTGUN_PELLET_DAMAGE * q, now);
                this.anim("shotgun", now); this.sounds?.play(C.SND.shotgun, this.playerSrc);
                this.nextAttack = now + C.SHOTGUN_REFIRE;
                return;
            case "ssg":
                if (a.shells < C.SSG_SHELLS) return this.outOfAmmo(now);
                a.shells -= C.SSG_SHELLS;
                this.fireBullets(pawn, origin, fwd, right, up, C.SSG_PELLETS,
                    C.SSG_SPREAD_X, C.SSG_SPREAD_Y, C.SSG_PELLET_DAMAGE * q, now);
                this.anim("ssg", now); this.sounds?.play(C.SND.ssg, this.playerSrc);
                this.nextAttack = now + C.SSG_REFIRE;
                return;
            case "nailgun": {
                if (a.nails < 1) return this.outOfAmmo(now);
                a.nails -= 1;
                this.projectiles?.spawn("nail", muz, pdir, now, C.NAIL_DAMAGE * q);
                this.nailSide = -this.nailSide;
                this.anim("nailgun", now); this.sounds?.play(C.SND.nailgun, this.playerSrc);
                this.nextAttack = now + C.NAIL_REFIRE;
                return;
            }
            case "snailgun": {
                if (a.nails < 1) return this.outOfAmmo(now);
                let snd: string = C.SND.nailgun;
                if (a.nails >= 2) {
                    a.nails -= 2;
                    this.projectiles?.spawn("snail", muz, pdir, now, C.SNAIL_DAMAGE * q);
                    snd = C.SND.snailgun;
                } else {
                    a.nails -= 1;
                    this.projectiles?.spawn("nail", muz, pdir, now, C.NAIL_DAMAGE * q);
                }
                this.anim("snailgun", now); this.sounds?.play(snd, this.playerSrc);
                this.nextAttack = now + C.NAIL_REFIRE;
                return;
            }
            case "glauncher":
                if (a.rockets < 1) return this.outOfAmmo(now);
                a.rockets -= 1;
                this.projectiles?.spawn("grenade", muz, pdir, now, 0);
                this.anim("glauncher", now); this.sounds?.play(C.SND.grenadeFire, this.playerSrc);
                this.nextAttack = now + C.GRENADE_REFIRE;
                return;
            case "rlauncher":
                if (a.rockets < 1) return this.outOfAmmo(now);
                a.rockets -= 1;
                this.projectiles?.spawn("rocket", muz, pdir, now,
                    (C.ROCKET_DIRECT_MIN + Math.random() * C.ROCKET_DIRECT_RND) * q);
                this.anim("rlauncher", now); this.sounds?.play(C.SND.rocketFire, this.playerSrc);
                this.nextAttack = now + C.ROCKET_REFIRE;
                return;
            default:
                return;
        }
    }

    private outOfAmmo(now: number): void {
        this.nextAttack = now + 0.5;
    }

    private hasAmmoFor(w: QWeapon): boolean {
        const k = AMMO_FOR[w];
        if (!k) return true;
        return this.ammo[k] >= (SELECT_NEED[w] ?? 1);
    }

    private bestWeapon(): QWeapon {
        const o = this.owned, a = this.ammo;
        if (a.cells >= 1 && o.has("lightning")) return "lightning";
        if (a.nails >= 2 && o.has("snailgun")) return "snailgun";
        if (a.shells >= 2 && o.has("ssg")) return "ssg";
        if (a.nails >= 1 && o.has("nailgun")) return "nailgun";
        if (a.shells >= 1 && o.has("shotgun")) return "shotgun";
        return "axe";
    }

    private findCs(pawn: CSPlayerPawn, cs: string): CSWeaponBase | undefined {
        return pawn.FindWeapon(cs)
            ?? (cs === "weapon_knife" ? pawn.FindWeaponBySlot(CSGearSlot.KNIFE) : undefined);
    }

    private selectWeapon(pawn: CSPlayerPawn, w: QWeapon, now: number): void {
        const cs = CS_FOR[w];
        const wep = cs ? this.findCs(pawn, cs) : undefined;
        if (wep) pawn.SwitchToWeapon(wep);
        this.current = w;
        this.pendingSwitch = w;
        this.pendingSwitchAt = now;
    }

    private checkNoAmmo(pawn: CSPlayerPawn, now: number): void {
        const best = this.bestWeapon();
        if (best === this.current) return;
        this.selectWeapon(pawn, best, now);
        this.nextAttack = Math.max(this.nextAttack, now + 0.2);
    }

    private noAmmoMsgAt = 0;
    private denyEmpty(pawn: CSPlayerPawn, now: number): boolean {
        const cs = CS_FOR[this.current];
        const back = cs ? this.findCs(pawn, cs) : undefined;
        if (!back || pawn.GetActiveWeapon() === back) return false;
        pawn.SwitchToWeapon(back);
        if (now - this.noAmmoMsgAt > 0.3) {
            this.noAmmoHook?.();
            this.noAmmoMsgAt = now;
        }
        return true;
    }

    private fireLightning(pawn: CSPlayerPawn, eye: Vec3, fwd: Vec3, right: Vec3, up: Vec3,
        held: boolean, now: number): void {
        if (!held || this.ammo.cells < C.LG_CELLS_PER_SHOT) {
            if (!held) this.lgActive = false;
            if (held) this.outOfAmmo(now);
            return;
        }

        const eyeEnd = eye.add(fwd.scale(C.LG_RANGE));
        const tr = traceHull(eye, V0, V0, eyeEnd, [pawn]);
        const beamEnd = tr.fraction < 1 ? new Vec3(tr.endpos) : eyeEnd;
        if (now >= this.lgBeamAt) {
            const muz = this.muzzleOrigin(eye, fwd, right, up);
            this.particles?.zap("lightning", muz, beamEnd, now, C.LG_BEAM_TTL);
            this.lgBeamAt = now + C.LG_BEAM_REFRESH;
        }

        if (now < this.nextAttack) return;
        if (!this.lgActive) this.sounds?.play(C.SND.lightningStart, this.playerSrc);
        this.lgActive = true;
        this.ammo.cells -= C.LG_CELLS_PER_SHOT;
        this.sounds?.play(C.SND.lightningFire, this.playerSrc);
        this.anim("lightning", now);
        if (tr.fraction < 1) {
            const org = beamEnd.subtract(fwd.scale(2));
            this.hurt(tr.ent, C.LG_DAMAGE * this.dmgScale(), org, pawn, now, CSDamageTypes.SHOCK);
        }
        this.nextAttack = now + C.LG_REFIRE;
    }

    private positionViewmodels(eye: Vec3, viewPitch: number, viewYaw: number,
        fwd: Vec3, right: Vec3, up: Vec3, bob: number, vel?: Vec3): void {
        const cur = this.current === "none" ? null : VIEWMODEL[this.current];

        let pos = cur ? eye
            .add(fwd.scale(cur.off.fwd))
            .add(right.scale(cur.off.right + this.vmSideOfs()))
            .add(up.scale(cur.off.up)) : eye;
        pos = pos.add(fwd.scale(bob * C.VM_BOB_FWD));
        pos = pos.withZ(pos.z + bob);
        const a = cur ? cur.ang : { pitch: 0, yaw: 0, roll: 0 };
        const angles = {
            pitch: viewPitch + a.pitch, yaw: viewYaw + a.yaw,
            roll: a.roll + this.strafeRoll(vel, viewYaw),
        };
        for (const n of VM_NAMES) {
            const e = css.FindEntityByName(n);
            if (!e || !e.IsValid()) continue;
            if (this.vmHidden || !cur || n !== cur.name) { e.Move({ position: VM_HIDDEN }); continue; }
            e.Move({ position: pos, angles });
        }
    }

    private strafeRoll(vel: Vec3 | undefined, viewYaw: number): number {
        if (!vel || C.STRAFE_ROLL_TARGET !== "viewmodel") return 0;
        const { right } = angleVectors(0, viewYaw, 0);
        let side = vel.x * right.x + vel.y * right.y;
        const sign = side < 0 ? -1 : 1;
        side = Math.abs(side);
        const r = side < C.SV_ROLLSPEED
            ? (side * C.SV_ROLLANGLE) / C.SV_ROLLSPEED : C.SV_ROLLANGLE;
        return r * sign * C.STRAFE_ROLL_SCALE;
    }

    private setVmAnim(name: string, seq: string): void {
        css.EntFireAtName({ name, input: "SetAnimation", value: seq });
    }

    private anim(w: QWeapon, now: number): void {
        if (w === "none") return;
        this.attackedAt = now;
        if (w !== "axe") this.lastShotAt = now;
        if (w in C.PUNCH_PITCH) this.punchPitch = C.PUNCH_PITCH[w] * C.VIEWKICK_SCALE;
        if (AUTO_ANIM.has(w)) {
            this.vmBusyUntil = now + (VIEWMODEL[w].fireAnim ?? C.NAIL_REFIRE + 0.06);
            return;
        }
        this.setVmAnim(VIEWMODEL[w].name, VIEWMODEL[w].seq);
        this.vmBusyUntil = now + (VIEWMODEL[w].fireAnim ?? C.VM_FIRE_ANIM_TIME);
        this.vmFireClipOn = true;
    }

    private updateVmAnim(held: boolean, now: number): void {
        if (this.current === "none") return;
        const vm = VIEWMODEL[this.current];
        const rest = vm.rest ?? vm.seq;
        const firing = AUTO_ANIM.has(this.current)
            ? held && now < this.vmBusyUntil
            : now < this.vmBusyUntil;
        if (firing && !this.vmFireClipOn) {
            this.setVmAnim(vm.name, vm.seq);
            this.vmFireClipOn = true;
        } else if (!firing && this.vmFireClipOn) {
            this.setVmAnim(vm.name, rest);
            this.vmFireClipOn = false;
        }
    }

    private bulletSrc(origin: Vec3, forward: Vec3): Vec3 {
        const z = origin.z + C.HULL_MIN.z + (C.HULL_MAX.z - C.HULL_MIN.z) * 0.7;
        return origin.withZ(z).add(forward.scale(10));
    }

    private hurt(ent: Entity | undefined, dmg: number, pos: Vec3, pawn: CSPlayerPawn,
        now: number, dt: CSDamageTypes): boolean {
        if (this.shootHook && this.shootHook(ent)) return true;
        if (this.enemies && this.enemies.damageFromPlayer(ent, dmg, pos, now, this.current)) return true;
        if (this.barrels && this.barrels.hit(ent, dmg, now)) return true;
        if (ent && ent.IsValid()) {
            ent.TakeDamage({ damage: dmg, damageTypes: dt, attacker: pawn, inflictor: pawn });
            return true;
        }
        return false;
    }

    private fireAxe(pawn: CSPlayerPawn, origin: Vec3, forward: Vec3, now: number, q: number): void {
        this.anim("axe", now);
        this.sounds?.play(C.SND.axeSwing, this.playerSrc);
        const src = origin.withZ(origin.z + 16);
        const tr = traceHull(src, V0, V0, src.add(forward.scale(C.AXE_RANGE)), [pawn]);
        if (tr.fraction === 1) return;
        const org = new Vec3(tr.endpos).subtract(forward.scale(4));
        const ent = tr.ent && tr.ent.IsValid() ? tr.ent : undefined;
        const mon = ent ? this.enemies?.monsterByProp(ent) : undefined;
        this.hurt(ent, C.AXE_DAMAGE * q, org, pawn, now, CSDamageTypes.SLASH);
        this.sounds?.play(mon ? C.SND.axeHitFlesh : C.SND.axeHitWall, this.playerSrc);
        if (!mon) this.particles?.burst("wall_impact", org, new Vec3(tr.normal), now);
    }

    private fireBullets(pawn: CSPlayerPawn, origin: Vec3, fwd: Vec3, right: Vec3, up: Vec3,
        n: number, spreadX: number, spreadY: number, dmgEach: number, now: number): void {
        const src = this.bulletSrc(origin, fwd);
        const hits = new Map<Entity, { dmg: number; pos: Vec3 }>();
        for (let i = 0; i < n; i++) {
            const dir = fwd.add(right.scale(cr() * spreadX)).add(up.scale(cr() * spreadY));
            const tr = traceHull(src, V0, V0, src.add(dir.scale(C.SHOTGUN_RANGE)), [pawn]);
            if (tr.fraction === 1) continue;
            const org = new Vec3(tr.endpos).subtract(dir.scale(4));
            const ent = tr.ent && tr.ent.IsValid() ? tr.ent : undefined;
            const mon = ent ? this.enemies?.monsterByProp(ent) : undefined;
            if (mon) {
                const acc = hits.get(ent!);
                if (acc) acc.dmg += dmgEach;
                else hits.set(ent!, { dmg: dmgEach, pos: org });
            } else {
                this.hurt(ent, dmgEach, org, pawn, now, CSDamageTypes.BULLET);
                this.particles?.burst("wall_impact", org, new Vec3(tr.normal), now);
                if (C.DEBUG) css.DebugLine({ start: src, end: org, duration: 0.2, color: { r: 255, g: 210, b: 120 } });
            }
        }
        for (const [ent, acc] of hits) this.hurt(ent, acc.dmg, acc.pos, pawn, now, CSDamageTypes.BULLET);
    }

    private drawHud(): void {
        if (!C.DEBUG) return;
        const k = AMMO_FOR[this.current];
        css.DebugScreenText({
            text: `wpn ${this.current}${k ? "  " + this.ammo[k] + " " + k : ""}`,
            x: 480, y: 480, duration: C.TICK_INTERVAL,
        });
    }
}
