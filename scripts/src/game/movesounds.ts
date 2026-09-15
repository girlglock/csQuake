import { Instance as css } from "cs_script/point_script";
import * as C from "../constants";
import { entityTags, hasTag } from "../entutil";
import { Sounds } from "./sound";

type Kind = "move" | "stop" | "btn";

const HOOKS: Record<string, ReadonlyArray<readonly [string, Kind]>> = {
    func_door: [["OnOpen", "move"], ["OnClose", "move"],
                ["OnFullyOpen", "stop"], ["OnFullyClosed", "stop"]],
    func_door_rotating: [["OnOpen", "move"], ["OnClose", "move"],
                         ["OnFullyOpen", "stop"], ["OnFullyClosed", "stop"]],
    func_movelinear: [["OnOpen", "move"], ["OnClose", "move"],
                      ["OnFullyOpen", "stop"], ["OnFullyClosed", "stop"]],
    func_button: [["OnPressed", "btn"]],
};

type Theme = { move: string; stop: string; btn: string };

function tagTheme(name: string): Theme | undefined {
    for (const t of entityTags(name)) {
        const th = C.PROX_THEMES[t] ?? C.PROX_THEMES[C.PROX_THEME_ALIAS[t] ?? ""];
        if (th) return th;
    }
    return undefined;
}

export class MoveSounds {
    private sounds: Sounds | undefined;
    private conns: number[] = [];
    private n = 0;
    private muted = false;
    private fallback: Theme = { move: C.SND.doorMove, stop: C.SND.doorStop, btn: C.SND.buttonPress };

    setSounds(s: Sounds): void { this.sounds = s; }

    mute(v: boolean): void { this.muted = v; }

    private theme(name: string): Theme {
        return tagTheme(name) ?? this.fallback;
    }

    wire(): void {
        this.drop();
        this.n = 0;
        let hooked = 0;

        this.fallback = { move: C.SND.doorMove, stop: C.SND.doorStop, btn: C.SND.buttonPress };
        for (const e of css.FindEntitiesByName(`${C.DEFAULT_SOUNDS_NAME}*`)) {
            if (!e.IsValid()) continue;
            const th = tagTheme(e.GetEntityName());
            if (th) { this.fallback = th;  }
            break;
        }

        for (const cls of Object.keys(HOOKS)) {
            for (const e of css.FindEntitiesByClass(cls)) {
                if (!e.IsValid()) continue;
                if (!e.GetEntityName()) e.SetEntityName(`qmv_${this.n++}`);
                for (const [out, kind] of HOOKS[cls]) {
                    const id = css.ConnectOutput(e, out, (d) => {
                        if (this.muted) return;
                        const src = d.caller && d.caller.IsValid() ? d.caller : e;
                        if (!src.IsValid()) return;
                        const nm = src.GetEntityName();
                        if (hasTag(nm, C.NOSOUND_TAG)) return;
                        const th = this.theme(nm);
                        const s = kind === "move" ? th.move
                            : kind === "stop" ? th.stop : th.btn;
                        if (s) this.sounds?.play(s, nm);
                    });
                    if (id !== undefined) { this.conns.push(id); hooked++; }
                }
            }
        }
    }

    onDisable(): void { this.drop(); }

    private drop(): void {
        for (const id of this.conns) {
            try { css.DisconnectOutput(id); } catch {}
        }
        this.conns = [];
    }
}
