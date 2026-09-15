import { Instance as css } from "cs_script/point_script";
import * as C from "../constants";

declare const performance: any;
const HI_RES = typeof performance !== "undefined" && performance && typeof performance.now === "function";
const clockMs: () => number = HI_RES ? () => performance.now() : () => Date.now();

const WINDOW_MS = 1000;

function groups(n: number): string {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export class Profiler {
    private prev = 0;
    private winStart = 0;
    private ticks = 0;
    private order: string[] = [];
    private acc = new Map<string, number>();
    private lines: string[] = [];

    frame(): void {
        if (!C.DEBUG) return;
        if (this.winStart === 0) this.winStart = clockMs();
        this.prev = clockMs();
        this.ticks++;
    }

    mark(label: string): void {
        if (!C.DEBUG) return;
        const t = clockMs();
        this.acc.set(label, (this.acc.get(label) ?? 0) + (t - this.prev));
        if (this.order.indexOf(label) < 0) this.order.push(label);
        this.prev = t;
    }

    done(): void {
        if (!C.DEBUG) return;
        const elapsed = clockMs() - this.winStart;
        if (elapsed > WINDOW_MS * 5) {
            this.acc.clear();
            this.ticks = 0;
            this.winStart = clockMs();
        } else if (elapsed >= WINDOW_MS && this.ticks > 0) {
            const budgetNs = C.TICK_INTERVAL * 1e9;
            let sum = 0;
            for (const l of this.order) sum += this.acc.get(l) ?? 0;
            const rows = [`-- think / ns per tick (avg ${this.ticks})${HI_RES ? "" : ", ~1ms clock"} --`];
            for (const label of this.order) {
                const totMs = this.acc.get(label) ?? 0;
                const avgNs = (totMs / this.ticks) * 1e6;
                const pct = sum > 0 ? (totMs / sum) * 100 : 0;
                rows.push(`${label.padEnd(11)} ${groups(avgNs).padStart(12)}  ${pct.toFixed(0).padStart(3)}%`);
            }
            const avgTot = (sum / this.ticks) * 1e6;
            rows.push(`${"TOTAL".padEnd(11)} ${groups(avgTot).padStart(12)}  ${((avgTot / budgetNs) * 100).toFixed(0).padStart(3)}% bud`);
            rows.push(`${"budget".padEnd(11)} ${groups(budgetNs).padStart(12)}`);
            this.lines = rows;
            this.acc.clear();
            this.ticks = 0;
            this.winStart = clockMs();
        }

        let y = 92;
        const rows = this.lines.length ? this.lines : ["-- think profile: sampling... --"];
        for (let i = 0; i < rows.length; i++) {
            css.DebugScreenText({
                text: rows[i], x: 40, y, duration: C.TICK_INTERVAL * 2,
                color: i === 0 ? { r: 255, g: 220, b: 120 } : { r: 210, g: 210, b: 210 },
            });
            y += 13;
        }
    }
}
