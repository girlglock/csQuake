import { Instance as css, CustomHudLayout } from "cs_script/point_script";
import * as C from "../constants";
import { setLayoutClass } from "./layoutbatch";
import { AchievementDef } from "./achievements";

const MENU_NAME = "quake_hud";

export type MenuAction =
    "newgame" | "continue" | "resume" | "exit" | "quit"
    | "opennewslots" | "opencontslots" | "openstats" | "openAchievements"
    | "achScrollUp" | "achScrollDn"
    | "toggleBob" | "toggleHitmarker" | "toggleSaveTime" | "toggleMusic" | "toggleCrt" | "toggle8bit" | "toggleVoice" | "toggleVmPos"
    | "toggleAlwaysSprint" | "toggleStepSmooth" | "fovDown" | "fovUp"
    | "toggleAutohop" | "toggleGiveAll" | "toggleGod" | "toggleInfAmmo" | "disabled";

type Screen = "main" | "options" | "cheats" | "help"
    | "newslots" | "diff" | "contslots" | "confirm" | "stats" | "achievements";

export interface SlotSummary { occupied: boolean; label: string; difficulty: string; }

export class QuakeMenu {
    private layout: CustomHudLayout | undefined;
    private open = false;
    private screen: Screen = "main";
    private mode: "main" | "overlay" = "overlay";
    private saveAvailable = false;
    private slot = 0;
    private last = new Map<string, string>();

    private pendingSlot = 0;
    private slotOccupied: boolean[] = [];
    private newDiffIdx = 1;

    private nmUnlocked = false;

    private achList: AchievementDef[] = [];
    private achIsUnlocked: (id: string) => boolean = () => false;
    private achScroll = 0;
    private achUnlockedCount = 0;
    private achTotal = 0;

    onEnable(slot: number): void {
        this.slot = slot;
        const e = css.FindEntityByName(MENU_NAME);
        this.layout = e instanceof CustomHudLayout ? e : undefined;
    }

    isOpen(): boolean {
        return this.open;
    }

    chosenSlot(): number {
        return this.pendingSlot;
    }

    chosenDifficulty(): C.Difficulty {
        return C.DIFFICULTIES[this.newDiffIdx];
    }
    private newDiffLocked(): boolean {
        return this.newDiffIdx === 3 && !this.nmUnlocked;
    }

    show(mode: "main" | "overlay" = "overlay", hasSave = false): boolean {
        if (!this.layout) return false;
        this.open = true;
        this.mode = mode;
        this.saveAvailable = hasSave;
        this.screen = "main";
        this.applyScreen();
        setLayoutClass(this.layout, this.slot, "qm_root", "QmMain", mode === "main");
        setLayoutClass(this.layout, this.slot, "qm_continue", "QmDisabled", !hasSave);
        setLayoutClass(this.layout, this.slot, "qm_newgame", "QmDisabled", false);
        setLayoutClass(this.layout, this.slot, "qm_root", "QmHidden", false);
        this.layout.SetInputCaptureEnabled(this.slot, true);
        css.ServerCommand("cl_draw_only_deathnotices 1");
        return true;
    }

    hide(): void {
        this.open = false;
        if (!this.layout) return;
        setLayoutClass(this.layout, this.slot, "qm_root", "QmHidden", true);
        this.layout.SetInputCaptureEnabled(this.slot, false);
    }

    onClick(buttonId: string): MenuAction | undefined {
        if (!this.open) return undefined;
        switch (buttonId) {
            case "qm_continue":
                return this.saveAvailable ? "opencontslots" : "disabled";
            case "qm_newgame":
                if (this.mode === "overlay") return "resume";
                return "opennewslots";
            case "qm_quit": return "quit";
            case "qm_exit": return "exit";
            case "qm_options": this.screen = "options"; this.applyScreen(); return undefined;
            case "qm_cheats": this.screen = "cheats"; this.applyScreen(); return undefined;
            case "qm_help": this.screen = "help"; this.applyScreen(); return undefined;
            case "qm_back_c": this.screen = "options"; this.applyScreen(); return undefined;
            case "qm_ach_back": this.screen = "main"; this.applyScreen(); return undefined;
            case "qm_back": case "qm_hlp_back":
            case "qm_ns_back": case "qm_cs_back":
                this.screen = "main"; this.applyScreen(); return undefined;
            case "qm_st_back": return "opencontslots";

            case "qm_achievements": return "openAchievements";
            case "qm_ach_up": return "achScrollUp";
            case "qm_ach_dn": return "achScrollDn";

            case "qm_ns0": case "qm_ns1": case "qm_ns2":
                this.pendingSlot = +buttonId.slice(-1);
                this.openDiff();
                return undefined;
            case "qm_df_back": this.screen = "newslots"; this.applyScreen(); return undefined;
            case "qm_df_prev": case "qm_df_next": {
                const d = buttonId.endsWith("next") ? 1 : -1;
                this.newDiffIdx = Math.min(3, Math.max(0, this.newDiffIdx + d));
                this.renderDiff();
                return undefined;
            }
            case "qm_df_start": {
                if (this.newDiffLocked()) return "disabled";
                if (this.slotOccupied[this.pendingSlot]) { this.openConfirm(this.pendingSlot); return undefined; }
                return "newgame";
            }
            case "qm_cf_yes": return "newgame";
            case "qm_cf_no": this.screen = "diff"; this.applyScreen(); return undefined;

            case "qm_cs0": case "qm_cs1": case "qm_cs2": {
                const n = +buttonId.slice(-1);
                if (!this.slotOccupied[n]) return "disabled";
                this.pendingSlot = n;
                return "continue";
            }
            case "qm_cs0s": case "qm_cs1s": case "qm_cs2s": {
                const n = +buttonId.charAt(5);
                if (!this.slotOccupied[n]) return "disabled";
                this.pendingSlot = n;
                return "openstats";
            }

            case "qm_opt_bob": return "toggleBob";
            case "qm_opt_hit": return "toggleHitmarker";
            case "qm_opt_svt": return "toggleSaveTime";
            case "qm_opt_music": return "toggleMusic";
            case "qm_opt_crt": return "toggleCrt";
            case "qm_opt_8bit": return "toggle8bit";
            case "qm_opt_voice": return "toggleVoice";
            case "qm_opt_vmpos": return "toggleVmPos";
            case "qm_opt_sprint": return "toggleAlwaysSprint";
            case "qm_opt_step": return "toggleStepSmooth";
            case "qm_opt_fov_dn": return "fovDown";
            case "qm_opt_fov_up": return "fovUp";
            case "qm_cht_hop": return "toggleAutohop";
            case "qm_cht_all": return "toggleGiveAll";
            case "qm_cht_god": return "toggleGod";
            case "qm_cht_ammo": return "toggleInfAmmo";
        }
        return undefined;
    }

    openNewSlots(sums: SlotSummary[], nmUnlocked = false): void {
        this.slotOccupied = sums.map((s) => s.occupied);
        this.nmUnlocked = nmUnlocked;
        for (let i = 0; i < C.SAVE_SLOTS; i++) this.setGlyphs(`qm_ns_v${i}_`, 6, sums[i]?.label ?? "EMPTY");
        this.screen = "newslots";
        this.applyScreen();
    }

    private openDiff(): void {
        this.renderDiff();
        this.screen = "diff";
        this.applyScreen();
    }

    private renderDiff(): void {
        const locked = this.newDiffLocked();
        this.setGlyphs("qm_df_v_", 9, this.chosenDifficulty().toUpperCase());
        this.setDim("qm_df_v", locked);
        this.setGlyphs("qm_df_hint_", 17, locked ? "FINISH HARD FIRST" : "");
    }

    openContSlots(sums: SlotSummary[]): void {
        this.slotOccupied = sums.map((s) => s.occupied);
        for (let i = 0; i < C.SAVE_SLOTS; i++) {
            const s = sums[i];
            this.setGlyphs(`qm_cs_v${i}_`, 16, s?.occupied ? `${s.label} ${s.difficulty}` : "----");
            this.setDim(`qm_cs${i}`, !s?.occupied);
            this.setDim(`qm_cs${i}s`, !s?.occupied);
        }
        this.screen = "contslots";
        this.applyScreen();
    }

    private openConfirm(slot: number): void {
        this.setGlyphs("qm_cf_slot_", 6, `SLOT ${slot + 1}`);
        this.screen = "confirm";
        this.applyScreen();
    }

    openStats(slot: number, lines: string[], saveTimeStr: string): void {
        this.screen = "stats";
        this.applyScreen();
        this.setGlyphs("qm_st_slot_", 6, `SLOT ${slot + 1}`);
        this.setGlyphs("qm_st_time_", 9, saveTimeStr);
        this.setGlyphs("qm_st_hdr_", C.STATS_ROW_COLS, "LEVEL SCRT   KILLS  TIME");
        for (let r = 0; r < C.STATS_MAX_ROWS; r++) {
            const on = r < lines.length;
            this.setRowHidden(`qm_st${r}`, !on);
            if (on) this.setGlyphs(`qm_st${r}_`, C.STATS_ROW_COLS, lines[r]);
        }
    }

    openAchievements(unlockedCount: number, total: number, list: AchievementDef[],
        isUnlocked: (id: string) => boolean): void {
        this.achList = list;
        this.achIsUnlocked = isUnlocked;
        this.achUnlockedCount = unlockedCount;
        this.achTotal = total;
        this.achScroll = 0;
        this.screen = "achievements";
        this.applyScreen();
        this.renderAchievements();
    }

    private renderAchievements(): void {
        this.setGlyphs("qm_ach_hdr_", 16, `${this.achUnlockedCount}/${this.achTotal} UNLOCKED`);
        for (let r = 0; r < C.ACH_VISIBLE_ROWS; r++) {
            const a = this.achList[this.achScroll + r];
            this.setRowHidden(`qm_ach${r}`, !a);
            if (!a) continue;
            setLayoutClass(this.layout, this.slot, `qm_ach${r}`, "QAchLocked", !this.achIsUnlocked(a.id));
            this.layout?.SetDialogVariableString("qm_ach", `achName${r}`, a.name);
            this.layout?.SetDialogVariableString("qm_ach", `achDesc${r}`, a.desc);
            this.setOne(`qm_ach${r}_icon`, `q_ach_${a.id}`);
        }
    }

    scrollAch(delta: number): void {
        const max = Math.max(0, this.achList.length - C.ACH_VISIBLE_ROWS);
        const next = Math.min(max, Math.max(0, this.achScroll + delta));
        if (next === this.achScroll) return;
        this.achScroll = next;
        this.renderAchievements();
    }

    setOptionValues(viewBob: boolean, crt: boolean, eightbit: boolean,
        voice: "m" | "f", vmPos: "center" | "left" | "right", alwaysSprint: boolean,
        stepSmooth: boolean, fov: number, hitmarker: boolean, showSaveTime: boolean, music: boolean,
        autoHop: boolean, giveAll: boolean, god: boolean, infAmmo: boolean): void {
        this.setGlyphs("qm_bob_v", 3, viewBob ? "ON" : "OFF");
        this.setGlyphs("qm_hit_v", 3, hitmarker ? "ON" : "OFF");
        this.setGlyphs("qm_svt_v", 3, showSaveTime ? "ON" : "OFF");
        this.setGlyphs("qm_music_v", 3, music ? "ON" : "OFF");
        this.setGlyphs("qm_crt_v", 3, crt ? "ON" : "OFF");
        this.setGlyphs("qm_8bit_v", 3, eightbit ? "ON" : "OFF");
        this.setGlyphs("qm_voice_v", 4, voice === "f" ? "FEM" : "MASC");
        this.setGlyphs("qm_vmpos_v", 6, vmPos.toUpperCase());
        this.setGlyphs("qm_sprint_v", 3, alwaysSprint ? "ON" : "OFF");
        this.setGlyphs("qm_step_v", 3, stepSmooth ? "ON" : "OFF");
        this.setGlyphs("qm_fov_v", 3, String(fov));
        this.setGlyphs("qm_hop_v", 3, autoHop ? "ON" : "OFF");
        this.setGlyphs("qm_all_v", 3, giveAll ? "ON" : "OFF");
        this.setGlyphs("qm_god_v", 3, god ? "ON" : "OFF");
        this.setGlyphs("qm_ammo_v", 3, infAmmo ? "ON" : "OFF");
    }

    private applyScreen(): void {
        if (!this.layout) return;
        const map: [string, Screen][] = [
            ["qm_main", "main"], ["qm_opts", "options"], ["qm_chts", "cheats"], ["qm_hlp", "help"],
            ["qm_ns", "newslots"], ["qm_df", "diff"], ["qm_cs", "contslots"],
            ["qm_cf", "confirm"], ["qm_st", "stats"], ["qm_ach", "achievements"],
        ];
        for (const [panel, scr] of map) {
            setLayoutClass(this.layout, this.slot, panel, "QmScreenHidden", this.screen !== scr);
        }
    }

    private setGlyphs(prefix: string, slots: number, text: string): void {
        if (!this.layout) return;
        const t = text.toUpperCase();
        for (let i = 0; i < slots; i++) {
            const code = i < t.length ? t.charCodeAt(i) : 32;
            this.setOne(`${prefix}${i}`, `g${code}`);
        }
    }

    private setOne(panel: string, cls: string): void {
        const prev = this.last.get(panel);
        if (prev === cls) return;
        if (prev) setLayoutClass(this.layout, this.slot, panel, prev, false);
        setLayoutClass(this.layout, this.slot, panel, cls, true);
        this.last.set(panel, cls);
    }

    private setDim(panel: string, on: boolean): void {
        setLayoutClass(this.layout, this.slot, panel, "QmDisabled", on);
    }

    private setRowHidden(panel: string, on: boolean): void {
        setLayoutClass(this.layout, this.slot, panel, "QGone", on);
    }
}
