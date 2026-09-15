import { Instance as css } from "cs_script/point_script";

const PREFIX = "load_";
const MAX_EPISODES = 8;
const MAX_MAPS = 12;

export class LevelStream {
    private ids: string[] = [];
    private loadedCb: (id: string) => void = () => {};
    private unloadedCb: (id: string) => void = () => {};
    private registered = false;

    discover(): void {
        if (this.registered) return;
        const ids: string[] = [];
        for (let e = 1; e <= MAX_EPISODES; e++) {
            for (let m = 1; m <= MAX_MAPS; m++) {
                if (css.FindEntityByName(`${PREFIX}e${e}m${m}`)) ids.push(`e${e}m${m}`);
            }
        }
        if (ids.length === 0) return;
        this.ids = ids;
        for (const id of ids) {
            css.OnScriptInput(`level_loaded@${id}`, () => this.loadedCb(id));
            css.OnScriptInput(`level_unloaded@${id}`, () => this.unloadedCb(id));
        }
        this.registered = true;
    }

    onLoaded(cb: (id: string) => void): void { this.loadedCb = cb; }
    onUnloaded(cb: (id: string) => void): void { this.unloadedCb = cb; }

    count(): number { return this.ids.length; }
    list(): readonly string[] { return this.ids; }
    first(): string | undefined { return this.ids[0]; }
    idAt(level: number): string | undefined { return this.ids[level - 1]; }
    levelOf(id: string): number { return this.ids.indexOf(id) + 1; }

    load(id: string): void {
        css.EntFireAtName({ name: `${PREFIX}${id}`, input: "StartSpawnGroupLoad" });
    }
    unload(id: string): void {
        css.EntFireAtName({ name: `${PREFIX}${id}`, input: "StartSpawnGroupUnload" });
    }
}
