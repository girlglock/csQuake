import { Instance as css, CustomHudLayout } from "cs_script/point_script";
import { setLayoutClass } from "./layoutbatch";
import * as C from "../constants";
import { AchievementDef } from "./achievements";

const HUD_NAME = "quake_hud";
const SLOT = 0;

const HINT_SLOTS = 11;
const BOSS_BAR_SEGS = 30;

const FINALE_ROWS = 6;
const FINALE_COLS = 34;
const FINALE_CPS = 34;
const FINALE_BLIP_INTERVAL = 0.06;
const FINALE_PAGES: string[][] = [
    ["As the corpse of the monstrous",
     "entity Chthon sinks back into the",
     "lava whence it rose, you grip the",
     "Rune of Earth Magic tightly.",
     "You have conquered the Dimension",
     "of the Doomed."],
    ["Three realms of Quake yet remain.",
     "Only with all four Runes of Power,",
     "and an understanding of the true",
     "nature of the beast, will you",
     "fare well against his forces."],
    ["The gate to the Realm of Black",
     "Magic shudders open before you.",
     "You step through, and the world",
     "falls away."],
];
const STATS_SLOTS = 18;
const LOAD_STAT_SLOTS = 26;

const CTRL_HINTS = ["Open Menu    [TAB]", "Weapon Wheel    [F]"];
const CTRL_HINT_SLOTS = 19;

const NOAMMO_TEXT = "Not enough ammo";
const NOAMMO_SLOTS = 16;
const NOAMMO_HOLD = 2;

const CENTER_SLOTS = 32;
const CENTER_HOLD = 3;

const MSG_SLOTS = 128;
const MSG_HOLD = 4;
const MSG_FADE = 1.2;

const WHEEL_SLOTS = 8;
const WHEEL_AMMO_SLOTS = 4;
const WHEEL_NAMES = [
    "Axe", "Shotgun", "Super Shotgun", "Nailgun", "Super Nailgun",
    "Grenade Launcher", "Rocket Launcher", "Thunderbolt",
];

export interface WheelSlot {
    owned: boolean; hasAmmo: boolean; ammo: number; ammoKind: string;
}

const D = ["q_d0", "q_d1", "q_d2", "q_d3", "q_d4", "q_d5", "q_d6", "q_d7", "q_d8", "q_d9", "q_dm", "q_alt"];
const SM = ["q_s0", "q_s1", "q_s2", "q_s3", "q_s4", "q_s5", "q_s6", "q_s7", "q_s8", "q_s9"];
const FACE = ["q_ff0", "q_ff1", "q_ff2", "q_ff3", "q_ff4", "q_fp0", "q_fp1", "q_fp2", "q_fp3", "q_fp4",
    "q_fquad", "q_finvis", "q_finvuln", "q_finvisinvuln"];

const DIGITS = ["hp_d0", "hp_d1", "hp_d2", "armor_d0", "armor_d1", "armor_d2", "ammo_d0", "ammo_d1", "ammo_d2"];
const ICONS: [string, string[]][] = [
    ["armor_icon", ["q_ar1", "q_ar2", "q_ar3"]],
    ["ammo_icon", ["q_a_shells", "q_a_nails", "q_a_rocket", "q_a_cells"]],
    ["face", FACE],
];
const WSLOTS = [0, 1, 2, 3, 4, 5, 6];
const INV: [string, string[]][] = [
    ...["sm00", "sm01", "sm02", "sm10", "sm11", "sm12", "sm20", "sm21", "sm22", "sm30", "sm31", "sm32"]
        .map((p) => [p, SM] as [string, string[]]),
    ...WSLOTS.map((s) => [`ws${s}`, ["q_own", "q_sel"]] as [string, string[]]),
    ...["key0", "key1", "pow0", "pow1", "pow2", "pow3", "sig0", "sig1", "sig2", "sig3"]
        .map((p) => [p, ["q_show"]] as [string, string[]]),
];

const ALL: [string, string[]][] = (() => {
    const out: [string, string[]][] = [];
    for (const d of DIGITS) out.push(["q_" + d, D]);
    for (const [p, cs] of ICONS) out.push(["q_" + p, cs]);
    for (const [p, cs] of INV) out.push(["q_" + p, cs]);
    out.push(["qw_sigbg", ["q_show"]]);
    for (let i = 0; i < 4; i++) out.push([`q_spd${i}`, SM]);
    return out;
})();

export interface HudState {
    speed: number;
    health: number;
    armor: number;
    armorType: 0 | 1 | 2 | 3;
    ammo: number;
    ammoType: "shells" | "nails" | "rocket" | "cells" | "none";
    shells: number; nails: number; rockets: number; cells: number;
    weapons: boolean[];
    activeWeapon: number;
    painFlash: boolean;
    face: "normal" | "quad" | "invis" | "invuln" | "invisinvuln";
    keys: [boolean, boolean];
    powerups: [boolean, boolean, boolean, boolean];
    sigils: [boolean, boolean, boolean, boolean];
    kills: number; killsTotal: number;
    secrets: number; secretsTotal: number;
    bossHp: number;
}

export class QuakeHud {
    private hud: CustomHudLayout | undefined;
    private last = new Map<string, string>();
    private forcedOff = false;
    private interHint = "";
    private finalePage = 0;
    private finaleAt = 0;
    private finaleShown = 0;
    private finaleBlipAt = 0;
    private finaleFlat: [number, number][] = [];
    private levelTime = "";
    private saveTimeStr = "";
    private statsLine = "";
    private msgShownAt = 0;
    private noAmmoShownAt = 0;
    private centerShownAt = 0;
    private toastId: (string | undefined)[] = new Array(C.ACH_TOAST_SLOTS).fill(undefined);
    private toastShownAt: number[] = new Array(C.ACH_TOAST_SLOTS).fill(0);

    get bound(): boolean {
        return !!this.hud && this.hud.IsValid();
    }

    onEnable(): void {
        const e = css.FindEntityByName(HUD_NAME);
        this.hud = e instanceof CustomHudLayout ? e : undefined;
        if (!this.hud) {
            return;
        }
        this.resync();
    }

    private stripLast(): void {
        if (this.hud) {
            for (const [key, val] of this.last) {
                const bar = key.indexOf("|");
                if (bar < 0) {
                    setLayoutClass(this.hud, SLOT, key, val, false);
                } else if (val === "1") {
                    setLayoutClass(this.hud, SLOT, key.slice(0, bar), key.slice(bar + 1), false);
                }
            }
        }
        this.last.clear();
    }

    resync(): void {
        if (!this.hud) return;
        this.stripLast();
        for (const [panel, classes] of ALL) {
            for (const c of classes) setLayoutClass(this.hud, SLOT, panel, c, false);
        }
        this.levelTime = "";
        this.saveTimeStr = "";
        this.statsLine = "";
        this.interHint = "";
        this.msgShownAt = 0;
        this.hideAllPopups();
        this.hideAllToasts();
        this.hideWheel();
        this.setWheelCapture(false);
        this.setDeathCapture(false);
        this.setInterCapture(false);
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", this.forcedOff);
        this.setGlyphStr("q_hint0_", CTRL_HINT_SLOTS, CTRL_HINTS[0]);
        this.setGlyphStr("q_hint1_", CTRL_HINT_SLOTS, CTRL_HINTS[1]);
    }

    onDisable(): void {
        this.stripLast();
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", true);
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", true);
        this.setWheelCapture(false);
        this.setDeathCapture(false);
        this.setInterCapture(false);
        this.noAmmoShownAt = 0;
        this.centerShownAt = 0;
        this.hideAllToasts();
        this.hud = undefined;
        this.interHint = "";
        this.levelTime = "";
        this.saveTimeStr = "";
        this.msgShownAt = 0;
    }

    setVisible(v: boolean): void {
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", this.forcedOff || !v);
    }

    setForcedOff(off: boolean): void {
        this.forcedOff = off;
        setLayoutClass(this.hud, SLOT, "q_hud", "QHidden", off);
    }
    isForcedOff(): boolean { return this.forcedOff; }

    hideAllPopups(): void {
        if (!this.hud) return;
        for (const p of ["q_deathpop", "q_inter", "q_finale", "q_noammo", "q_center"]) {
            setLayoutClass(this.hud, SLOT, p, "QPopHidden", true);
        }
        this.noAmmoShownAt = 0;
        this.centerShownAt = 0;
    }

    showDeathStats(killed: number, total: number, secrets: number, secretsTotal: number): void {
        if (!this.hud) return;
        this.setGlyphStr("q_dk", 3, this.clamp3(killed));
        this.setGlyphStr("q_dt", 3, this.clamp3(total));
        this.setGlyphStr("q_dsc", 3, this.clamp3(secrets));
        this.setGlyphStr("q_dst", 3, this.clamp3(secretsTotal));
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", false);
        this.setDeathCapture(true);
    }

    hideDeathStats(): void {
        setLayoutClass(this.hud, SLOT, "q_deathpop", "QPopHidden", true);
        this.setDeathCapture(false);
    }

    setDeathCapture(on: boolean): void {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }

    setMapTime(str: string): void {
        if (!this.hud || str === this.levelTime) return;
        this.levelTime = str;
        this.setGlyphStr("q_lt", STATS_SLOTS, `MAP TIME`.padEnd(10) + str);
    }

    setSaveTime(str: string): void {
        if (!this.hud || str === this.saveTimeStr) return;
        this.saveTimeStr = str;
        this.setGlyphStr("q_svt", STATS_SLOTS, `SAVE TIME`.padEnd(10) + str);
    }

    setStatsShown(on: boolean): void {
        this.setToggle("q_stats", "QGone", !on);
    }
    setSpeedShown(on: boolean): void {
        this.setToggle("q_speed", "QGone", !on);
    }

    setCheatsShown(on: boolean): void {
        this.setToggle("q_cheatson", "QGone", !on);
    }

    showMsg(text: string, now: number): void {
        if (!this.hud || !text) return;
        this.setGlyphStr("q_log", MSG_SLOTS, text.slice(0, MSG_SLOTS));
        this.setToggle("q_log", "QLogFade", false);
        this.msgShownAt = now;
    }

    updateLog(now: number): void {
        if (!this.hud || this.msgShownAt === 0) return;
        const age = now - this.msgShownAt;
        this.setToggle("q_log", "QLogFade", age > MSG_HOLD);
        if (age > MSG_HOLD + MSG_FADE + 0.3) {
            this.setGlyphStr("q_log", MSG_SLOTS, "");
            this.msgShownAt = 0;
        }
    }

    toastFree(i: number): boolean {
        return this.toastId[i] === undefined;
    }

    showToast(i: number, def: AchievementDef, now: number): void {
        if (!this.hud) return;
        this.toastId[i] = def.id;
        this.toastShownAt[i] = now;
        this.setOne(`q_ach_icon${i}`, `q_ach_${def.id}`);
        this.hud.SetDialogVariableString(`q_ach_name${i}`, `achName${i}`, def.name);
        this.setToggle(`q_ach_toast${i}`, "QAchToastHidden", false);
    }

    updateToasts(now: number): void {
        if (!this.hud) return;
        for (let i = 0; i < C.ACH_TOAST_SLOTS; i++) {
            if (this.toastId[i] === undefined) continue;
            const age = now - this.toastShownAt[i];
            if (age >= C.ACH_TOAST_HOLD) this.setToggle(`q_ach_toast${i}`, "QAchToastHidden", true);
            if (age >= C.ACH_TOAST_HOLD + C.ACH_TOAST_EXIT) this.toastId[i] = undefined;
        }
    }

    private hideAllToasts(): void {
        for (let i = 0; i < C.ACH_TOAST_SLOTS; i++) {
            this.toastId[i] = undefined;
            this.toastShownAt[i] = 0;
            this.setToggle(`q_ach_toast${i}`, "QAchToastHidden", true);
        }
    }

    showNoAmmo(now: number): void {
        if (!this.hud) return;
        this.noAmmoShownAt = now;
        this.setGlyphStr("q_na", NOAMMO_SLOTS, NOAMMO_TEXT);
        setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", false);
    }

    updateNoAmmo(now: number): void {
        if (!this.hud || this.noAmmoShownAt === 0) return;
        if (now - this.noAmmoShownAt >= NOAMMO_HOLD) {
            setLayoutClass(this.hud, SLOT, "q_noammo", "QPopHidden", true);
            this.noAmmoShownAt = 0;
        }
    }

    showCenter(text: string, now: number): void {
        if (!this.hud) return;
        this.centerShownAt = now;
        this.setGlyphStr("q_ce", CENTER_SLOTS, text);
        setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", false);
    }

    updateCenter(now: number): void {
        if (!this.hud || this.centerShownAt === 0) return;
        if (now - this.centerShownAt >= CENTER_HOLD) {
            setLayoutClass(this.hud, SLOT, "q_center", "QPopHidden", true);
            this.centerShownAt = 0;
        }
    }

    setWheelCapture(on: boolean): void {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }

    showWheel(): void {
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", false);
    }

    hideWheel(): void {
        setLayoutClass(this.hud, SLOT, "q_wheel", "QWheelHidden", true);
    }

    setWheel(slots: WheelSlot[], activeIdx: number): void {
        if (!this.hud) return;
        for (let i = 0; i < WHEEL_SLOTS; i++) {
            const s = slots[i];
            const owned = !!s && s.owned;
            this.setToggle(`q_ww_i${i}`, "QWwHave", owned);
            this.setToggle(`q_ww_i${i}`, "QWwLow", owned && !s.hasAmmo);
            this.setToggle(`q_ww_i${i}`, "QWwCur", i === activeIdx);
            this.setToggle(`q_ww_hov${i}`, "QWwOff", !owned);

            this.setGlyphStr(`q_wh${i}_n`, 18, WHEEL_NAMES[i] ?? "");
            const k = s && s.ammoKind ? (s.ammoKind === "rockets" ? "rocket" : s.ammoKind) : "";
            this.setOne(`q_wh${i}_ai`, k ? `QWwAi_${k}` : undefined);
            this.setGlyphStr(`q_wh${i}_a`, WHEEL_AMMO_SLOTS,
                s && s.ammo >= 0 ? String(s.ammo) : "");
        }
    }

    showIntermission(timeStr: string, killed: number, total: number,
                     secrets = 0, secretsTotal = 0): void {
        if (!this.hud) return;
        this.setGlyphStr("q_tm", 5, timeStr);
        this.setGlyphStr("q_kc", 3, this.clamp3(killed));
        this.setGlyphStr("q_tc", 3, this.clamp3(total));
        this.setGlyphStr("q_sc", 3, this.clamp3(secrets));
        this.setGlyphStr("q_stc", 3, this.clamp3(secretsTotal));
        this.interHint = "";
        this.hideAllPopups();
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", false);
        this.setInterCapture(true);
    }

    showFinale(): void {
        if (!this.hud) return;
        this.interHint = "";
        this.renderFinalePage(0);
        this.hideAllPopups();
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", false);
        this.setInterCapture(false);
    }

    setInterCapture(on: boolean): void {
        this.hud?.SetInputCaptureEnabled(SLOT, on);
    }

    private renderFinalePage(p: number): void {
        if (!this.hud) return;
        this.finalePage = p;
        this.finaleAt = 0;
        this.finaleShown = 0;
        this.finaleBlipAt = 0;
        this.finaleFlat = [];
        const lines = FINALE_PAGES[p] ?? [];
        for (let r = 0; r < FINALE_ROWS; r++) {
            this.setGlyphStr(`q_fl${r}_`, FINALE_COLS, lines[r] ?? "");
            for (let c = 0; c < FINALE_COLS; c++) {
                this.setToggle(`q_fl${r}_${c}`, "q_on", false);
                this.setToggle(`q_fl${r}_${c}`, "q_typed", false);
            }
        }
        for (let r = 0; r < lines.length; r++) {
            for (let c = 0; c < lines[r].length; c++) this.finaleFlat.push([r, c]);
        }
    }

    updateFinale(now: number): void {
        if (!this.hud) return;
        if (this.finaleAt === 0) this.finaleAt = now;
        const lines = FINALE_PAGES[this.finalePage] ?? [];
        const target = Math.min(this.finaleFlat.length, Math.floor((now - this.finaleAt) * FINALE_CPS));
        for (let i = this.finaleShown; i < target; i++) {
            const [r, c] = this.finaleFlat[i];
            this.setToggle(`q_fl${r}_${c}`, "q_on", true);
            if (lines[r] && lines[r][c] !== " " && now - this.finaleBlipAt >= FINALE_BLIP_INTERVAL) {
                this.setToggle(`q_fl${r}_${c}`, "q_typed", true);
                this.finaleBlipAt = now;
            }
        }
        this.finaleShown = target;
    }

    finaleAdvance(): boolean {
        if (!this.hud) return false;
        if (this.finaleShown < this.finaleFlat.length) {
            for (let i = this.finaleShown; i < this.finaleFlat.length; i++) {
                const [r, c] = this.finaleFlat[i];
                this.setToggle(`q_fl${r}_${c}`, "q_on", true);
            }
            this.finaleShown = this.finaleFlat.length;
            return true;
        }
        if (this.finalePage + 1 < FINALE_PAGES.length) {
            this.renderFinalePage(this.finalePage + 1);
            return true;
        }
        return false;
    }

    hideIntermission(): void {
        setLayoutClass(this.hud, SLOT, "q_inter", "QPopHidden", true);
        setLayoutClass(this.hud, SLOT, "q_finale", "QPopHidden", true);
        this.setInterCapture(false);
    }

    showLoading(): void {
        if (!this.hud || !this.hud.IsValid()) {
            const e = css.FindEntityByName(HUD_NAME);
            this.hud = e instanceof CustomHudLayout ? e : undefined;
        }
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", false);
    }

    hideLoading(): void {
        setLayoutClass(this.hud, SLOT, "q_loading", "QPopHidden", true);
        this.setGlyphStr("q_lstat_", LOAD_STAT_SLOTS, "");
    }

    setLoadStatus(text: string): void {
        this.setGlyphStr("q_lstat_", LOAD_STAT_SLOTS, text.toUpperCase().slice(0, LOAD_STAT_SLOTS));
    }

    setInterHint(text: string): void {
        if (!this.hud || text === this.interHint) return;
        this.interHint = text;
        this.setGlyphStr("q_fh", HINT_SLOTS, text);
    }

    private clamp3(n: number): string {
        const s = String(Math.max(0, Math.trunc(n)));
        return s.length > 3 ? "999" : s;
    }

    private setGlyphStr(prefix: string, slots: number, str: string): void {
        for (let i = 0; i < slots; i++) {
            const has = i < str.length;
            this.setOne(`${prefix}${i}`, has ? `g${str.charCodeAt(i)}` : undefined);
            this.setToggle(`${prefix}${i}`, "GlBlank", !has);
        }
    }

    private setOne(panel: string, cls: string | undefined): void {
        const prev = this.last.get(panel);
        if (prev === cls) return;
        if (prev) setLayoutClass(this.hud, SLOT, panel, prev, false);
        if (cls) {
            setLayoutClass(this.hud, SLOT, panel, cls, true);
            this.last.set(panel, cls);
        } else {
            this.last.delete(panel);
        }
    }

    private setToggle(panel: string, cls: string, on: boolean): void {
        const key = panel + "|" + cls;
        const want = on ? "1" : "0";
        if (this.last.get(key) === want) return;
        this.last.set(key, want);
        setLayoutClass(this.hud, SLOT, panel, cls, on);
    }

    private setNum(prefix: string, n: number, alt: boolean): void {
        let s = String(Math.trunc(n));
        if (s.length > 3) s = s.slice(-3);
        s = s.padStart(3, " ");
        for (let i = 0; i < 3; i++) {
            const ch = s[i];
            const p = `${prefix}_d${i}`;
            this.setOne(p, ch === " " ? undefined : ch === "-" ? "q_dm" : `q_d${ch}`);
            this.setToggle(p, "q_alt", alt);
        }
    }

    private setSmall(prefix: string, group: number, n: number): void {
        let s = String(Math.max(0, Math.trunc(n)));
        if (s.length > 3) s = s.slice(-3);
        s = s.padStart(3, " ");
        for (let i = 0; i < 3; i++) {
            const ch = s[i];
            this.setOne(`${prefix}sm${group}${i}`, ch === " " ? undefined : `q_s${ch}`);
        }
    }

    private setSpeed(n: number): void {
        let s = String(Math.max(0, Math.trunc(n)));
        if (s.length > 4) s = "9999";
        for (let i = 0; i < 4; i++) {
            this.setOne(`q_spd${i}`, i < s.length ? `q_s${s[i]}` : undefined);
        }
    }

    update(st: HudState): void {
        if (!this.hud) return;
        const p = "q_";

        this.setSpeed(st.speed);

        if (st.armor > 0) {
            this.setNum(`${p}armor`, st.armor, st.armor <= 25);
        } else {
            for (let i = 0; i < 3; i++) this.setOne(`${p}armor_d${i}`, undefined);
        }
        this.setOne(`${p}armor_icon`,
            st.armor > 0 && st.armorType ? `q_ar${st.armorType}` : undefined);

        this.setNum(`${p}hp`, st.health, st.health <= 25);
        let face: string;
        if (st.face === "invisinvuln") face = "q_finvisinvuln";
        else if (st.face === "quad") face = "q_fquad";
        else if (st.face === "invis") face = "q_finvis";
        else if (st.face === "invuln") face = "q_finvuln";
        else {
            const f = st.health >= 100 ? 4 : Math.max(0, Math.trunc(st.health / 20));
            face = `${st.painFlash ? "q_fp" : "q_ff"}${f}`;
        }
        this.setOne(`${p}face`, face);

        this.setNum(`${p}ammo`, st.ammo, st.ammo <= 10);
        this.setOne(`${p}ammo_icon`, st.ammoType === "none" ? undefined : `q_a_${st.ammoType}`);

        this.setSmall(p, 0, st.shells);
        this.setSmall(p, 1, st.nails);
        this.setSmall(p, 2, st.rockets);
        this.setSmall(p, 3, st.cells);

        for (let i = 0; i < 7; i++) {
            const own = st.weapons[i];
            this.setToggle(`${p}ws${i}`, "q_own", own);
            this.setToggle(`${p}ws${i}`, "q_sel", own && st.activeWeapon === i);
        }

        this.setToggle(`${p}key0`, "q_show", st.keys[0]);
        this.setToggle(`${p}key1`, "q_show", st.keys[1]);
        for (let i = 0; i < 4; i++) this.setToggle(`${p}pow${i}`, "q_show", st.powerups[i]);
        for (let i = 0; i < 4; i++) this.setToggle(`${p}sig${i}`, "q_show", st.sigils[i]);

        this.setToggle("qw_sigbg", "q_show", st.sigils.some(Boolean));

        const bshow = st.bossHp > 0;
        this.setToggle("q_bossbar", "QBossOn", bshow);
        const lit = bshow ? Math.max(1, Math.ceil(Math.min(1, st.bossHp) * BOSS_BAR_SEGS)) : 0;
        for (let i = 0; i < BOSS_BAR_SEGS; i++) this.setToggle(`q_bseg${i}`, "q_dim", i >= lit);

        const kill = `KILLS`.padEnd(10) + `${st.kills}/${st.killsTotal}`;
        const secr = `SECRETS`.padEnd(10) + `${st.secrets}/${st.secretsTotal}`;
        const line = `${kill}|${secr}`;
        if (line !== this.statsLine) {
            this.statsLine = line;
            this.setGlyphStr("q_ks", STATS_SLOTS, kill);
            this.setGlyphStr("q_scs", STATS_SLOTS, secr);
        }
    }
}
