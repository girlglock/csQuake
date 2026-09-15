import { Instance as css } from "cs_script/point_script";

const EMIT_NAME = "emit_music";

export class Music {
    private enabled = true;
    private desired = "";
    private playing = "";
    private src = "";

    setEnabled(on: boolean): void {
        if (this.enabled === on) return;
        this.enabled = on;
        if (on) this.apply();
        else this.stopEmitter();
    }

    onEnable(): void {
        if (!css.FindEntityByName(EMIT_NAME)) {
        }
    }

    onDisable(): void {
        this.desired = "";
        this.stopEmitter();
    }

    play(event: string | undefined, srcName: string): void {
        if (!event || event === this.desired) return;
        this.desired = event;
        this.src = srcName;
        if (this.enabled) this.apply();
    }

    stop(): void {
        if (!this.desired) return;
        this.desired = "";
        if (this.enabled) this.stopEmitter();
    }

    onFinished(): void {
        if (!this.enabled || !this.desired || this.desired !== this.playing) return;
        this.playing = "";
        this.apply();
    }

    private apply(): void {
        if (this.desired === this.playing) return;
        this.playing = this.desired;
        css.EntFireAtName({ name: EMIT_NAME, input: "SetSoundEventName", value: this.desired });
        css.EntFireAtName({ name: EMIT_NAME, input: "SetSourceEntity", value: this.src });
        css.EntFireAtName({ name: EMIT_NAME, input: "StartSound" });
    }

    private stopEmitter(): void {
        if (!this.playing) return;
        this.playing = "";
        css.EntFireAtName({ name: EMIT_NAME, input: "StopSound" });
    }
}
