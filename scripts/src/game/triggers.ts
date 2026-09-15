import { Instance as css, Entity } from "cs_script/point_script";
import * as C from "../constants";

export interface TriggerHandlers {
    onStart?: (name: string, activator: Entity | undefined, trigger: Entity) => void;
    onTouching?: (name: string, activator: Entity | undefined, trigger: Entity) => void;
    onEnd?: (name: string, activator: Entity | undefined, trigger: Entity) => void;
}

const TRIGGER_CLASSES = ["trigger_multiple", "trigger_once"];

type Phase = "start" | "touching" | "end";

export class MapTriggers {
    private isToucher: (e: Entity | undefined) => boolean = () => false;
    private handlers = new Map<string, TriggerHandlers>();
    private prefixHandlers: Array<[string, TriggerHandlers]> = [];
    private touching = new Map<Entity, string>();
    private connections: number[] = [];

    setToucher(fn: (e: Entity | undefined) => boolean): void {
        this.isToucher = fn;
    }

    bind(triggerName: string, h: TriggerHandlers): void {
        this.handlers.set(triggerName, h);
    }
    unbind(triggerName: string): void {
        this.handlers.delete(triggerName);
    }
    bindPrefix(prefix: string, h: TriggerHandlers): void {
        this.prefixHandlers.push([prefix, h]);
    }
    countPrefix(prefix: string): number {
        let n = 0;
        for (const cls of TRIGGER_CLASSES) {
            for (const trig of css.FindEntitiesByClass(cls)) {
                if (trig.GetEntityName().startsWith(prefix)) n++;
            }
        }
        return n;
    }

    private resolve(name: string): TriggerHandlers | undefined {
        const h = this.handlers.get(name);
        if (h) return h;
        for (const [p, ph] of this.prefixHandlers) if (name.startsWith(p)) return ph;
        return undefined;
    }

    wire(): void {
        for (const id of this.connections) css.DisconnectOutput(id);
        this.connections = [];
        this.touching.clear();

        let n = 0;
        for (const cls of TRIGGER_CLASSES) {
            for (const trig of css.FindEntitiesByClass(cls)) {
                const name = trig.GetEntityName();
                if (!name) continue;
                this.hook(trig, name, "OnStartTouch", "start");
                this.hook(trig, name, "OnTrigger", "touching");
                this.hook(trig, name, "OnEndTouch", "end");
                n++;
            }
        }
    }

    reset(): void {
        this.touching.clear();
    }

    isTouching(name: string): boolean {
        for (const v of this.touching.values()) if (v === name) return true;
        return false;
    }
    isTouchingPrefix(prefix: string): boolean {
        for (const v of this.touching.values()) if (v.startsWith(prefix)) return true;
        return false;
    }

    private hook(trig: Entity, name: string, output: string, phase: Phase): void {
        const id = css.ConnectOutput(trig, output, (d) => {
            if (!this.isToucher(d.activator)) return;
            if (phase === "start") this.touching.set(trig, name);
            else if (phase === "end") this.touching.delete(trig);
            else if (!this.touching.has(trig)) return;

            const h = this.resolve(name);
            if (!h) {
                return;
            }
            if (phase === "start") h.onStart?.(name, d.activator, trig);
            else if (phase === "touching") h.onTouching?.(name, d.activator, trig);
            else h.onEnd?.(name, d.activator, trig);
        });
        if (id !== undefined) this.connections.push(id);
    }
}
