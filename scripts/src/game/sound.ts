import { Instance as css } from "cs_script/point_script";

const EMIT_NAME = "emit_sound";

export class Sounds {
    private voice: "m" | "f" = "f";

    setVoice(v: "m" | "f"): void { this.voice = v; }

    onEnable(): void {
        if (!css.FindEntityByName(EMIT_NAME)) {
        }
    }

    onDisable(): void {}

    play(event: string, srcName: string): void {
        this.fire(event, srcName);
    }

    private fire(event: string, srcName: string): void {
        if (!event || !srcName) return;
        if (this.voice === "f" && event.startsWith("Quake.player_")
            && !event.startsWith("Quake.player_f_")) {
            event = "Quake.player_f_" + event.slice("Quake.player_".length);
        }
        css.EntFireAtName({ name: EMIT_NAME, input: "SetSoundEventName", value: event });
        css.EntFireAtName({ name: EMIT_NAME, input: "SetSourceEntity", value: srcName });
        css.EntFireAtName({ name: EMIT_NAME, input: "StartSound" });
    }
}
