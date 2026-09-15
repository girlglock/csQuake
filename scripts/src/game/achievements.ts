import { Instance as css } from "cs_script/point_script";

export interface AchievementDef {
    id: string;
    name: string;
    desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    { id: "find_secret", name: "Secret Sleuth", desc: "Find a secret area." },
    { id: "friendly_fire", name: "Friendly Fire", desc: "Kill a monster with another monster's attack." },
    { id: "shambler_dance", name: "The Shambler Dance", desc: "Kill a shambler before it is able to cast its lightning attack." },
    { id: "complete_e1m7", name: "Sink the Horror Electric", desc: "Complete Quake Episode 1: Dimension of the Doomed in single player." },
    { id: "defeat_shub", name: "Indigestion", desc: "Defeat Shub-Niggurath in single player." },
    { id: "close_shave", name: "A Close Shave", desc: "Kill a shambler with an axe." },
    { id: "pacifist", name: "Slipgate Pacifist", desc: "Complete E1M1: The Slipgate Complex on Nightmare without firing a shot." },
    { id: "defeat_shub_nightmare", name: "Shub's Bud", desc: "Complete Quake on Nightmare in single player." },
    { id: "speedrunner", name: "Speedrunner", desc: "Complete E1M1: The Slipgate Complex in 22 seconds or less." },
];

const SAVE_KEY = "quakeAchievements";
const QUEUE_MAX = 8;

export class Achievements {
    private unlocked = new Set<string>();
    private queue: string[] = [];
    private loaded = false;

    private load(): void {
        if (this.loaded) return;
        this.loaded = true;
        try {
            const raw = css.GetSaveData();
            const list = (raw ? JSON.parse(raw) : {})[SAVE_KEY];
            if (Array.isArray(list)) {
                for (const id of list) if (typeof id === "string") this.unlocked.add(id);
            }
        } catch {  }
    }

    private save(): void {
        let d: Record<string, unknown> = {};
        try {
            const raw = css.GetSaveData();
            if (raw) d = JSON.parse(raw);
        } catch { d = {}; }
        d[SAVE_KEY] = [...this.unlocked];
        try { css.SetSaveData(JSON.stringify(d)); } catch {}
    }

    isUnlocked(id: string): boolean {
        this.load();
        return this.unlocked.has(id);
    }

    unlock(id: string): void {
        this.load();
        if (this.unlocked.has(id)) return;
        this.unlocked.add(id);
        this.save();
        if (this.queue.length < QUEUE_MAX) this.queue.push(id);
    }

    popQueued(): string | undefined {
        return this.queue.shift();
    }

    countUnlocked(): number {
        this.load();
        return this.unlocked.size;
    }

    total(): number {
        return ACHIEVEMENTS.length;
    }

    sortedList(): AchievementDef[] {
        this.load();
        const unlocked: AchievementDef[] = [];
        const locked: AchievementDef[] = [];
        for (const a of ACHIEVEMENTS) (this.unlocked.has(a.id) ? unlocked : locked).push(a);
        return [...unlocked, ...locked];
    }
}
