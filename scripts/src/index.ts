import { Instance as css } from "cs_script/point_script";
import { QuakeController } from "./game/controller";

const quake = new QuakeController();

let commandsRegistered = false;

function registerCommands(): void {
    if (commandsRegistered) return;
    commandsRegistered = true;

    css.RegisterCheatCommand("quake", (args: string) => {
        const a = args.trim().toLowerCase();
        const want = a === "on" || a === "1" ? true
            : a === "off" || a === "0" ? false
            : !quake.isEnabled();
        if (want !== quake.isEnabled()) quake.toggle();
    });

    css.RegisterCheatCommand("qmap", (args: string) => {
        const [id, diff] = args.trim().split(/\s+/);
        quake.startMap(id ?? "", diff);
    });

    css.RegisterCheatCommand("quakeend", () => quake.endLevel());

    css.RegisterCheatCommand("quaketoggleplayer", () => {
    });

    css.RegisterCheatCommand("qnoclip", (args: string) => {
        const a = args.trim().toLowerCase();
        const force = a === "on" || a === "1" ? true
            : a === "off" || a === "0" ? false : undefined;
    });

    css.RegisterCheatCommand("qgiveall", () => { quake.giveAll();  });

    css.RegisterCheatCommand("q_unlocknightmare", () => {
        quake.cheatUnlockNightmare();
    });

    css.RegisterCheatCommand("qtoggle_ai", (args: string) => {
    });

    css.RegisterCheatCommand("qspawn", (args: string) => {
    });

    css.RegisterCheatCommand("qcl_showpos", (args: string) => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true
            : a === "0" || a === "off" ? false : undefined;
    });

    css.RegisterCheatCommand("q_hud", (args: string) => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true
            : a === "0" || a === "off" ? false : undefined;
    });

    css.RegisterCheatCommand("q_viewmodel", (args: string) => {
        const a = args.trim().toLowerCase();
        const force = a === "1" || a === "on" ? true
            : a === "0" || a === "off" ? false : undefined;
    });

    css.RegisterCheatCommand("q_noclipspeed", (args: string) => {
        const n = parseFloat(args.trim());
    });

}

css.OnScriptReload({
    before: () => {
        const wasEnabled = quake.isEnabled();
        if (wasEnabled) quake.disable();
        return { wasEnabled };
    },
    after: (memory) => {
        registerCommands();
        if (memory?.wasEnabled) quake.enable();
    },
});

css.OnCustomHudClicked((event) => {
    if (event.player.GetPlayerSlot() === 0) quake.onMenuClick(event.buttonId);
});

quake.installTriggers();

css.OnActivate(() => {
    registerCommands();
    if (css.IsWarmupPeriod()) css.ServerCommand("mp_warmup_end");
    quake.discoverLevels();
    const pawn = css.GetPlayerController(0)?.GetPlayerPawn();
    if (pawn && pawn.IsValid() && !quake.isEnabled()) quake.onPlayerSpawned();
});

css.OnPlayerActivate(() => {
    css.ServerCommand("cl_draw_only_deathnotices 1");
});

css.OnPlayerReset((event) => {
    if (event.player.GetPlayerController()?.GetPlayerSlot() === 0) {
        quake.onPlayerSpawned();
    }
});
css.OnRoundStart(() => quake.onPlayerSpawned());
