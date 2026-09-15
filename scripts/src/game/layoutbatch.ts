import { Instance as css, CustomHudLayout } from "cs_script/point_script";
import * as C from "../constants";

const CHANGES_PER_TICK = 100;

interface Op {
    layout: CustomHudLayout;
    slot: number;
    panel: string;
    cls: string;
    on: boolean;
}

let tickStamp = -1;
let committed = 0;
const queue = new Map<string, Op>();
let drainArmed = false;

function rollTick(): void {
    const t = css.GetGameTime();
    if (t === tickStamp) return;
    tickStamp = t;
    committed = 0;
}

function commit(op: Op): void {
    if (!op.layout.IsValid()) return;
    if (op.slot < 0) op.layout.SetHasClass(op.panel, op.cls, op.on);
    else op.layout.SetHasClassForPlayer(op.slot, op.panel, op.cls, op.on);
    committed++;
}

function armDrain(): void {
    if (drainArmed) return;
    drainArmed = true;
    css.Delay(C.TICK_INTERVAL).then(drain);
}

function drain(): void {
    drainArmed = false;
    rollTick();
    for (const [key, op] of queue) {
        if (committed >= CHANGES_PER_TICK) break;
        queue.delete(key);
        commit(op);
    }
    if (queue.size > 0) armDrain();
}

function keyOf(layout: CustomHudLayout, slot: number, panel: string, cls: string): string {
    return layout.GetEntityName() + "::" + slot + "::" + panel + "::" + cls;
}

export function setLayoutClass(
    layout: CustomHudLayout | undefined, slot: number, panel: string, cls: string, on: boolean,
): void {
    if (!layout) return;
    rollTick();
    const key = keyOf(layout, slot, panel, cls);
    const pending = queue.get(key);
    if (pending) { pending.on = on; return; }
    if (queue.size === 0 && committed < CHANGES_PER_TICK) {
        commit({ layout, slot, panel, cls, on });
        return;
    }
    queue.set(key, { layout, slot, panel, cls, on });
    armDrain();
}
