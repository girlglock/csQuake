import { Instance as css, CustomHudLayout } from "cs_script/point_script";
import { setLayoutClass } from "./layoutbatch";

const CRT_NAME = "8bit";

export type LiquidTint = "none" | "water" | "poison" | "lava";

const PU_CLASSES = ["QpuQuad", "QpuSuit", "QpuRing", "QpuPent"] as const;

export class Crt {
    private layout: CustomHudLayout | undefined;
    private waterKind: LiquidTint = "none";
    private flashPing = false;
    private bonusPing = false;
    private puTint = "";

    onEnable(_slot: number, crtOn: boolean, eightbitOn: boolean): void {
        this.layout = this.findLayout();
        this.waterKind = "none";
        setLayoutClass(this.layout, -1, "q_water", "QWaterOn", false);
        setLayoutClass(this.layout, -1, "q_water", "QWaterPoison", false);
        setLayoutClass(this.layout, -1, "q_water", "QWaterLava", false);
        this.puTint = "";
        for (const c of ["QDmgLo", "QDmgMid", "QDmgHi", "QDmgArmor",
            "QFlashPing", "QFlashPong", "QBonusPing", "QBonusPong"]) {
            setLayoutClass(this.layout, -1, "q_flash", c, false);
        }
        for (const c of PU_CLASSES) setLayoutClass(this.layout, -1, "q_powerup", c, false);
        this.applyOverlay(crtOn);
        this.apply8bit(eightbitOn);
    }

    damageFlash(count: number, armorAbsorbedMost: boolean): void {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        if (!this.layout) return;
        const pct = Math.min(150, 3 * Math.max(10, count));
        setLayoutClass(this.layout, -1, "q_flash", "QDmgHi", pct >= 100);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgMid", pct >= 55 && pct < 100);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgLo", pct < 55);
        setLayoutClass(this.layout, -1, "q_flash", "QDmgArmor", armorAbsorbedMost);
        this.flashPing = !this.flashPing;
        setLayoutClass(this.layout, -1, "q_flash", "QFlashPing", this.flashPing);
        setLayoutClass(this.layout, -1, "q_flash", "QFlashPong", !this.flashPing);
    }

    bonusFlash(): void {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        if (!this.layout) return;
        this.bonusPing = !this.bonusPing;
        setLayoutClass(this.layout, -1, "q_flash", "QBonusPing", this.bonusPing);
        setLayoutClass(this.layout, -1, "q_flash", "QBonusPong", !this.bonusPing);
    }

    setPowerupTint(quad: boolean, suit: boolean, ring: boolean, pent: boolean): void {
        const want = quad ? "QpuQuad" : suit ? "QpuSuit" : ring ? "QpuRing" : pent ? "QpuPent" : "";
        if (want === this.puTint) return;
        this.puTint = want;
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        for (const c of PU_CLASSES) setLayoutClass(this.layout, -1, "q_powerup", c, c === want);
    }

    applyOverlay(on: boolean): void {
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        setLayoutClass(this.layout, -1, "crt_root", "CrtHidden", !on);
    }

    apply8bit(on: boolean): void {
        css.EntFireAtName({ name: CRT_NAME, input: on ? "Enable" : "Disable" });
    }

    setWater(kind: LiquidTint): void {
        if (kind === this.waterKind) return;
        this.waterKind = kind;
        if (!this.layout || !this.layout.IsValid()) this.layout = this.findLayout();
        setLayoutClass(this.layout, -1, "q_water", "QWaterOn", kind !== "none");
        setLayoutClass(this.layout, -1, "q_water", "QWaterPoison", kind === "poison");
        setLayoutClass(this.layout, -1, "q_water", "QWaterLava", kind === "lava");
    }

    private findLayout(): CustomHudLayout | undefined {
        for (const e of css.FindEntitiesByName(CRT_NAME)) {
            if (e instanceof CustomHudLayout) return e;
        }
        for (const e of css.FindEntitiesByClass("custom_hud_layout")) {
            if (e instanceof CustomHudLayout && e.GetEntityName() === CRT_NAME) return e;
        }
        return undefined;
    }
}
