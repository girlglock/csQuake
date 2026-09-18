import {
    Instance as css,
    Entity,
    PointTemplate,
    CSPlayerPawn,
    CustomPlayerCamera,
    CustomCameraMode,
    CSMoveType,
    CSInputs,
} from "cs_script/point_script";
import { Euler, Vec3 } from "@s2ze/math";
import * as C from "../constants";
import { QuakePlayerMove, UserCmd } from "../physics/movement";
import { angleVectors } from "../physics/qmath";
import { QuakeWeapons, VmPos } from "../combat/weapons";
import { Projectiles } from "../combat/projectiles";
import { Barrels } from "../combat/barrels";
import { Gibs, HeadKind } from "../combat/gibs";
import { Particles } from "./particles";
import { Fireballs } from "./fireballs";
import { EventLightning } from "./eventlightning";
import { Enemies } from "../monsters/enemies";
import type { Boss } from "../monsters/boss";
import { Backpacks, Items, ItemEffects, LevelExit } from "../items/pickups";
import { Sounds } from "./sound";
import { Music } from "./music";
import { Achievements, ACHIEVEMENTS } from "./achievements";
import { QuakeHud, HudState } from "./hud";
import { QuakeMenu, SlotSummary } from "./menu";
import { Crt } from "./crt";
import { Profiler } from "./profiler";
import { MapTriggers, TriggerHandlers } from "./triggers";
import { ProxActuators } from "./proximity";
import { MoveSounds } from "./movesounds";
import { LevelStream } from "./levelstream";
import { setTraceIgnore, setSolidBoxes, SolidBox, traceHull } from "../physics/trace";
import { Combatant, DamageInfo, T_Damage } from "../combat/combat";
import { safeRemove, hasTag } from "../entutil";

const BODY_NAME = "quake_player_controller";
const MUZZ_LIGHT_NAME = "muzz_light";
const MUZZ_LIGHT_ON = "Enable";
const MUZZ_LIGHT_OFF = "Disable";
const MUZZ_LIGHT_TIME = 0.1;
const EXPLOSION_TEMPLATE_NAME = "explosion_template";
const EXPLOSION_FX_TTL = 5;
const SPAWN_PREFIX = "ranger_spawn_";
const PLAYER_SRC = BODY_NAME;

const TOUCH_PARKED = new Vec3(0, 0, -16384);

interface SaveState {
    levelIndex: number;
    health: number;
    armorValue: number;
    armorType: number;
    shells: number;
    ammo?: { shells: number; nails: number; rockets: number; cells: number };
    weapons?: string[];
    weapon?: string;
}

interface LevelStat {
    secrets: number; secretsTotal: number;
    kills: number; killsTotal: number;
    time: number;
}

interface SaveSlot {
    save: SaveState;
    levels: Record<string, LevelStat>;
    difficulty: C.Difficulty;
    playTime?: number;
}

class PlayerCombatant implements Combatant {
    health = C.PLAYER_START_HEALTH;
    armorValue = C.PLAYER_START_ARMOR;
    armorType = 0;
    takeDamage = true;
    getsKnockback = true;
    godMode = false;
    invincibleUntil = 0;

    constructor(
        private pm: QuakePlayerMove,
        private onDie: (d: DamageInfo) => void,
        private onPain: (d: DamageInfo) => void,
    ) {}

    get origin(): Vec3 { return this.pm.origin; }
    get velocity(): Vec3 { return this.pm.velocity; }
    set velocity(v: Vec3) { this.pm.velocity = v; }
    knockback(delta: Vec3): void { this.pm.knockback(delta); }

    pain(d: DamageInfo): void { this.onPain(d); }
    die(d: DamageInfo): void { this.onDie(d); }
}

export class QuakeController {
    private pm = new QuakePlayerMove();
    private weapons = new QuakeWeapons();
    private projectiles = new Projectiles();
    private fireballs = new Fireballs();
    private eventLightning = new EventLightning();
    private barrels = new Barrels();
    private gibs = new Gibs();
    private particles = new Particles();
    private enemies = new Enemies();
    private backpacks = new Backpacks();
    private items = new Items();
    private levelExit = new LevelExit();
    private sounds = new Sounds();
    private music = new Music();
    private achievements = new Achievements();
    private hud = new QuakeHud();
    private prof = new Profiler();
    private showPos = false;
    private painFlashUntil = 0;
    private player = new PlayerCombatant(
        this.pm, (d) => this.onPlayerDeath(d), (d) => this.onPlayerPain(d));
    private enabled = false;
    private csControl = false;
    private pendingSpawn = false;
    private spawnDueAt = 0;
    private dead = false;
    private megaRotAt = 0;
    private crushHurtAt = 0;
    private slot = 0;
    private jumpEdge = false;
    private accum = 0;
    private body: Entity | undefined;
    private touchBody: Entity | undefined;
    private muzzLight: Entity | undefined;
    private muzzLit = false;
    private muzzOffAt = 0;
    private muzzShotSeen = 0;
    private explosionTmpl: PointTemplate | undefined;
    private explosionFx: { prop: Entity; dieAt: number }[] = [];
    private expFxSeq = 0;
    private readonly mapTriggers = new MapTriggers();
    private readonly prox = new ProxActuators();
    private readonly moveSounds = new MoveSounds();
    private readonly stream = new LevelStream();
    private pendingComplete: (() => void) | undefined;
    private loadShownAt = 0;
    private pendingLoadId = "";
    private pendingUnloadId = "";
    private loadedId = "";
    private spawnPoint = new Vec3(0, 0, 0);
    private spawnAngle = { pitch: 0, yaw: 0, roll: 0 };

    private viewCtl: "spawn" | "death" | "intermission" | "loading" | "play" = "play";
    private spawnHoldUntil = 0;
    private deathYaw = 0;
    private deathViewOfs = C.VIEW_OFS_Z;

    private wheelOpen = false;
    private wheelLawHeld = false;

    private levelStartTime = 0;
    private readonly secretsFound = new Set<string>();
    private secretsTotal = 0;
    private pendingRestore: SaveState | undefined;
    private activeSlot = -1;
    private activeDifficulty: C.Difficulty = C.DIFFICULTY_DEFAULT;
    private interFinale = false;
    private interReleased = false;
    private interCamPos = new Vec3(0, 0, 0);
    private interCamAng = { pitch: 0, yaw: 0, roll: 0 };
    private pendingLevelTarget: string | undefined;

    private viewBob = true;
    private pawnAngleForced = false;
    private injectedPitch = 0;

    private liquid: "none" | "water" | "poison" | "lava" = "none";
    private airFinished = 0;
    private nextDrown = 0;
    private drownDmg = 0;
    private nextSlime = 0;
    private waterSurfaceZ = 0;
    private waterEntryZ = 0;
    private liquidSurfaceTag: number | null = null;
    private headUnder = false;
    private nextSwimSnd = 0;
    private shownHints = new Set<string>();
    private radsuitUntil = 0;
    private quadUntil = 0;
    private pentUntil = 0;
    private ringUntil = 0;
    private quadWarnAt = 0;
    private pentTickAt = 0; private pentWarnAt = 0;
    private ringTickAt = 0; private ringWarnAt = 0;
    private lastKillCount = 0;
    private keys: [boolean, boolean] = [false, false];
    private runes: [boolean, boolean, boolean, boolean] = [false, false, false, false];

    private levelIndex = 0;
    private menu = new QuakeMenu();
    private crt = new Crt();
    private scoresHeld = false;
    private pauseAccum = 0;
    private pauseStart = 0;
    private playTimeBanked = 0;
    private playTimeSpanStart = 0;

    private settings: {
        viewBob: boolean; crt: boolean; eightbit: boolean; voice: "m" | "f";
        vmPos: VmPos; alwaysSprint: boolean; stepSmooth: boolean; fov: number;
        hitmarker: boolean; music: boolean;
        autoHop: boolean; giveAll: boolean; god: boolean; infAmmo: boolean;
        rRestart: boolean; showSpeedometer: boolean; showStats: boolean;
    } = {
        viewBob: true, crt: false, eightbit: true, voice: "f", vmPos: "center",
        alwaysSprint: true, stepSmooth: true, fov: C.FOV_DEFAULT,
        hitmarker: true, music: true,
        autoHop: false, giveAll: false, god: false, infAmmo: false,
        rRestart: false, showSpeedometer: false, showStats: false,
    };
    private lastHitMark = 0;
    private settingsLoaded = false;

    isEnabled(): boolean {
        return this.enabled;
    }

    getLevelIndex(): number {
        return this.levelIndex;
    }

    discoverLevels(): void {
        this.stream.discover();
    }

    installTriggers(): void {
        this.stream.onLoaded((id) => this.onLevelLoaded(id));
        this.stream.onUnloaded((id) => this.onLevelUnloaded(id));
        this.stream.discover();
        this.moveSounds.setSounds(this.sounds);
        this.prox.setEnemies(this.enemies);
        this.mapTriggers.setToucher((e) => !!e && e === this.touchBody);
        this.items.setToucher((e) => !!e && e === this.touchBody);
        this.backpacks.setToucher((e) => !!e && e === this.touchBody);
        this.mapTriggers.bind("level_end", { onStart: () => this.endLevel() });
        this.mapTriggers.bindPrefix(C.LEVEL_END_TARGET_PREFIX, { onStart: (name) => {
            const rest = name.slice(C.LEVEL_END_TARGET_PREFIX.length);
            const target = rest.replace(/@[a-z]+/gi, "");
            this.endLevel(target, hasTag(rest, "noint"));
        } });
        this.mapTriggers.bindPrefix("secret", { onStart: (name) => this.foundSecret(name) });
        this.mapTriggers.bindPrefix(C.TELEPORT_TRIGGER_PREFIX,
            { onStart: (_n, _a, trig) => this.teleportPlayer(trig) });
        this.mapTriggers.bindPrefix(C.KEY_DOOR_TRIGGER_PREFIX,
            { onStart: (name, _a, trig) => this.onKeyDoor(name, trig) });
        this.mapTriggers.bindPrefix(C.OPENS_ELSEWHERE_TRIGGER_PREFIX,
            { onStart: () => this.onOpensElsewhere() });
        this.mapTriggers.bindPrefix(C.DEATH_TRIGGER_PREFIX,
            { onStart: () => this.onDeathTrigger() });
        this.mapTriggers.bindPrefix(C.HURT_TRIGGER_PREFIX,
            { onStart: (name) => this.onHurtTrigger(name),
              onTouching: (name) => this.onHurtTrigger(name) });
        this.mapTriggers.bindPrefix("msg_center#",
            { onStart: (name) => this.onMsgTrigger(name, true) });
        this.mapTriggers.bindPrefix("msg#",
            { onStart: (name) => this.onMsgTrigger(name, false) });
        for (const p of [C.WATER_TRIGGER_PREFIX, C.POISON_TRIGGER_PREFIX, C.LAVA_TRIGGER_PREFIX]) {
            this.mapTriggers.bindPrefix(p, { onStart: (name) => this.onLiquidEnter(name) });
        }
        css.OnScriptInput(C.SPIKESHOOTER_INPUT, (d) => this.onSpikeShooterFire(d.caller));
        css.OnScriptInput(C.MUSIC_FINISHED_INPUT, () => this.music.onFinished());
    }

    private onKeyDoor(name: string, trig: Entity): void {
        if (this.dead || this.viewCtl !== "play") return;
        const colour = name.slice(C.KEY_DOOR_TRIGGER_PREFIX.length).split(/[_@]/)[0] || "silver";
        const idx = colour.toLowerCase() === "gold" ? 1 : 0;
        if (this.keys[idx]) {
            css.EntFireAtTarget({ target: trig, input: "FireUser1" });
        } else {
            this.hud.showCenter(`You need the ${colour} key`, this.gameNow());
            this.sounds.play(C.SND.doorLocked, trig.GetEntityName());
        }
    }

    private onOpensElsewhere(): void {
        if (this.dead || this.viewCtl !== "play") return;
        this.hud.showCenter("This door opens elsewhere", this.gameNow());
        this.sounds.play(C.SND.doorTalk, PLAYER_SRC);
    }

    private onMsgTrigger(name: string, center: boolean): void {
        if (this.dead || this.viewCtl !== "play") return;
        const msg = name.slice(name.indexOf("#") + 1).replace(/_/g, " ");
        if (!msg) return;
        if (center) {
            if (this.shownHints.has(name)) return;
            this.shownHints.add(name);
            this.hud.showCenter(msg, this.gameNow());
        } else {
            this.hud.showMsg(msg, this.gameNow());
        }
    }

    private onDeathTrigger(): void {
        if (this.dead) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin, damage: C.TOUCHDEATH_DAMAGE,
            byPlayer: false, time: this.gameNow(), noKnockback: true,
        });
    }

    private onHurtTrigger(name: string): void {
        if (this.dead || this.pm.noclip) return;
        const mm = name.match(/#(\d+)/);
        const dmg = mm ? parseInt(mm[1], 10) : C.HURT_TRIGGER_DAMAGE;
        if (dmg <= 0) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin, damage: dmg,
            byPlayer: false, time: this.gameNow(), noKnockback: true,
        });
    }

    private onLiquidEnter(name: string): void {
        const m = name.match(/@surface_(-?\d+)/);
        this.liquidSurfaceTag = m ? parseInt(m[1], 10) : null;
    }

    private onSpikeShooterFire(caller: Entity | undefined): void {
        if (!this.enabled || this.dead || this.viewCtl !== "play") return;
        if (!caller || !caller.IsValid()) return;
        const o = caller.GetAbsOrigin();
        const a = caller.GetAbsAngles();
        const dir = angleVectors(a.pitch, a.yaw, 0).forward;
        const sup = caller.GetEntityName().startsWith(C.SPIKESHOOTER_SUPER_PREFIX);
        this.projectiles.spikeShot(caller, new Vec3(o.x, o.y, o.z), dir, sup, this.gameNow());
        this.sounds.play(C.SND.spikeShooterFire, caller.GetEntityName());
    }

    private hurtPlayer(dmg: number, origin: Vec3, now: number): void {
        if (this.dead || !this.player.takeDamage) return;
        T_Damage(this.player, { inflictorCenter: origin, damage: dmg, byPlayer: false, time: now });
    }

    private teleportPlayer(trig: Entity): void {
        if (this.dead) return;
        const dest = trig.GetParent();
        if (!dest || !dest.IsValid()) {
            return;
        }
        const o = dest.GetAbsOrigin();
        const yaw = dest.GetAbsAngles().yaw;
        const { forward } = angleVectors(0, yaw, 0);
        this.pm.reset(new Vec3(o.x, o.y, o.z + C.TELEPORT_DEST_Z_OFS),
            forward.scale(C.TELEPORT_EXIT_SPEED), false);
        this.pm.notifyTeleport();
        this.pm.inWater = false;
        this.liquid = "none";
        this.waterSurfaceZ = 0;
        this.waterEntryZ = 0;
        this.liquidSurfaceTag = null;
        this.headUnder = false;
        this.stepSmoothZ = o.z;
        this.mapTriggers.reset();
        this.sounds.play(C.pick(C.SND.teleport), PLAYER_SRC);
        const pawn = this.pawn();
        if (pawn && pawn.IsValid()) pawn.Teleport({ angles: { pitch: 0, yaw, roll: 0 } });
        this.spawnAngle = { pitch: 0, yaw, roll: 0 };
    }

    private foundSecret(name: string): void {
        if (this.secretsFound.has(name)) return;
        this.secretsFound.add(name);
        this.hud.showCenter("You found a secret!", this.gameNow());
        this.sounds?.play(C.SND.secret, PLAYER_SRC);
        this.achievements.unlock("find_secret");
    }

    bindTrigger(name: string, h: TriggerHandlers): void {
        this.mapTriggers.bind(name, h);
    }
    unbindTrigger(name: string): void {
        this.mapTriggers.unbind(name);
    }
    isTouchingTrigger(name: string): boolean {
        return this.mapTriggers.isTouching(name);
    }
    isTouchingTriggerPrefix(prefix: string): boolean {
        return this.mapTriggers.isTouchingPrefix(prefix);
    }

    toggle(): void {
        if (this.enabled) this.disable();
        else this.enable();
    }

    private gameNow(): number {
        return css.GetGameTime() - this.pauseAccum;
    }

    private pauseGame(): void {
        this.menu.onEnable(this.slot);
        this.syncMenuOptions();
        this.menu.show("overlay", this.hasAnySave());
        this.pauseStart = css.GetGameTime();
        this.accum = 0;
        this.bankPlayTime();
    }

    private resumeGame(): void {
        this.menu.hide();
        this.pauseAccum += css.GetGameTime() - this.pauseStart;
        this.accum = 0;
        this.resumePlayTime();
    }

    private bankPlayTime(): void {
        if (this.playTimeSpanStart > 0) {
            this.playTimeBanked += css.GetGameTime() - this.playTimeSpanStart;
            this.playTimeSpanStart = 0;
        }
    }
    private resumePlayTime(): void {
        if (this.playTimeSpanStart === 0) this.playTimeSpanStart = css.GetGameTime();
    }
    private totalPlayTime(): number {
        return this.playTimeBanked
            + (this.playTimeSpanStart > 0 ? css.GetGameTime() - this.playTimeSpanStart : 0);
    }

    private loadSettings(): void {
        if (this.settingsLoaded) return;
        this.settingsLoaded = true;
        try {
            const raw = css.GetSaveData();
            const s = (raw ? JSON.parse(raw) : {}).quake ?? {};
            if (typeof s.viewBob === "boolean") this.settings.viewBob = s.viewBob;
            if (typeof s.crt === "boolean") this.settings.crt = s.crt;
            if (typeof s.eightbit === "boolean") this.settings.eightbit = s.eightbit;
            if (s.voice === "m" || s.voice === "f") this.settings.voice = s.voice;
            if (s.vmPos === "center" || s.vmPos === "left" || s.vmPos === "right") {
                this.settings.vmPos = s.vmPos;
            }
            if (typeof s.alwaysSprint === "boolean") this.settings.alwaysSprint = s.alwaysSprint;
            if (typeof s.stepSmooth === "boolean") this.settings.stepSmooth = s.stepSmooth;
            if (typeof s.hitmarker === "boolean") this.settings.hitmarker = s.hitmarker;
            if (typeof s.music === "boolean") this.settings.music = s.music;
            if (typeof s.fov === "number" && Number.isFinite(s.fov)) {
                this.settings.fov = Math.max(C.FOV_MIN, Math.min(C.FOV_MAX, Math.round(s.fov)));
            }
            if (typeof s.autoHop === "boolean") this.settings.autoHop = s.autoHop;
            if (typeof s.giveAll === "boolean") this.settings.giveAll = s.giveAll;
            if (typeof s.god === "boolean") this.settings.god = s.god;
            if (typeof s.infAmmo === "boolean") this.settings.infAmmo = s.infAmmo;
            if (typeof s.rRestart === "boolean") this.settings.rRestart = s.rRestart;
            if (typeof s.showSpeedometer === "boolean") this.settings.showSpeedometer = s.showSpeedometer;
            if (typeof s.showStats === "boolean") this.settings.showStats = s.showStats;
        } catch {  }
        this.viewBob = this.settings.viewBob;
        this.pm.autoHop = this.settings.autoHop;
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);
        this.weapons.setViewmodelPos(this.settings.vmPos);
        this.sounds.setVoice(this.settings.voice);
        this.music.setEnabled(this.settings.music);
        this.applyFov();
    }

    private saveSettings(): void {
        let d: Record<string, unknown> = {};
        try {
            const raw = css.GetSaveData();
            if (raw) d = JSON.parse(raw);
        } catch { d = {}; }
        d.quake = {
            viewBob: this.settings.viewBob,
            crt: this.settings.crt, eightbit: this.settings.eightbit,
            voice: this.settings.voice, vmPos: this.settings.vmPos,
            alwaysSprint: this.settings.alwaysSprint,
            stepSmooth: this.settings.stepSmooth,
            fov: this.settings.fov,
            hitmarker: this.settings.hitmarker,
            music: this.settings.music,
            autoHop: this.settings.autoHop,
            giveAll: this.settings.giveAll, god: this.settings.god,
            infAmmo: this.settings.infAmmo,
            rRestart: this.settings.rRestart,
            showSpeedometer: this.settings.showSpeedometer,
            showStats: this.settings.showStats,
        };
        try { css.SetSaveData(JSON.stringify(d)); } catch {}
    }

    private syncMenuOptions(): void {
        const s = this.settings;
        this.menu.setOptionValues(s.viewBob, s.crt, s.eightbit, s.voice, s.vmPos,
            s.alwaysSprint, s.stepSmooth, s.fov, s.hitmarker, s.music,
            s.autoHop, s.giveAll, s.god, s.infAmmo, s.rRestart,
            s.showSpeedometer, s.showStats);
    }

    onPlayerSpawned(): void {
        this.loadSettings();
        this.crt.onEnable(this.slot, this.settings.crt, this.settings.eightbit);
        if (this.levelIndex === 0) {
            if (this.enabled) this.disable();
            this.menu.onEnable(this.slot);
            this.syncMenuOptions();
            if (this.menu.show("main", this.hasAnySave())) {
                if (!this.patchNotesSeen()) this.menu.showPatchNotes(C.PATCHNOTES.split("\n").filter(Boolean));
                return;
            }
            this.levelIndex = 1;
        }
        this.pendingSpawn = true;
        this.spawnDueAt = css.GetGameTime() + C.SPAWN_ENTER_DELAY;
        css.SetThink(() => this.tick());
        css.SetNextThink(css.GetGameTime() + C.TICK_INTERVAL);
    }

    startNewGame(): void {
        this.menu.openNewSlots(this.slotSummaries(), this.nightmareUnlocked());
    }

    beginNewGame(slot: number, diff: C.Difficulty = C.DIFFICULTY_DEFAULT): void {
        this.activeSlot = slot;
        this.activeDifficulty = diff;
        this.runes = [false, false, false, false];
        this.playTimeBanked = 0;
        this.playTimeSpanStart = 0;
        const slots = this.readSlots();
        slots[slot] = {
            save: {
                levelIndex: 1,
                health: C.PLAYER_START_HEALTH,
                armorValue: C.PLAYER_START_ARMOR,
                armorType: 0,
                shells: C.WEAPON_START_SHELLS,
                ammo: { shells: C.WEAPON_START_SHELLS, nails: 0, rockets: 0, cells: 0 },
                weapons: ["axe", "shotgun"],
                weapon: "shotgun",
            },
            levels: {},
            difficulty: diff,
            playTime: 0,
        };
        this.writeSlots(slots);
        this.menu.hide();
        this.streamEnter(1, () => {
            this.levelIndex = 1;
            this.pendingRestore = undefined;
            this.resetMapEntities();
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
    }

    startMap(mapId: string, diff?: string): void {
        const d = ((C.DIFFICULTIES as readonly string[]).indexOf((diff ?? "").toLowerCase()) >= 0
            ? (diff as string).toLowerCase() : "easy") as C.Difficulty;
        let target: number;
        if (this.stream.count() === 0) {
            target = 1;
        } else {
            const id = mapId.trim().toLowerCase() || (this.stream.first() ?? "");
            target = this.stream.levelOf(id);
            if (target < 1) {
                return;
            }
        }
        this.menu.hide();
        this.activeSlot = -1;
        this.activeDifficulty = d;
        this.playTimeBanked = 0;
        this.playTimeSpanStart = 0;
        this.streamEnter(target, () => {
            this.levelIndex = target;
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
    }

    openMenu(): void {
        this.levelIndex = 0;
        this.activeSlot = -1;
        this.activeDifficulty = C.DIFFICULTY_DEFAULT;
        this.onPlayerSpawned();
    }

    endLevel(target?: string, skipIntermission?: boolean): void {
        if (!this.enabled || this.dead
            || this.viewCtl === "intermission" || this.viewCtl === "loading") return;
        this.pendingLevelTarget = target;
        this.interFinale = false;
        this.interReleased = false;
        this.enemies.setPlayerAlive(false);
        this.bankPlayTime();
        this.checkLevelCompleteAchievements();

        if (skipIntermission) {
            const k = this.enemies.killStats();
            const secs = Math.floor(this.gameNow() - this.levelStartTime);
            this.writeSlotLevel(this.activeSlot, this.currentLevelId(), {
                secrets: this.secretsFound.size, secretsTotal: this.secretsTotal,
                kills: k.killed, killsTotal: k.total, time: secs,
            });
            this.advanceLevel();
            return;
        }

        this.viewCtl = "intermission";
        this.music.play(C.MUSIC_INTER_EVENT, PLAYER_SRC);
        const marker = css.FindEntityByName(C.LEVEL_END_CAM);
        const pawn = this.pawn();
        if (marker) {
            const o = marker.GetAbsOrigin();
            const a = marker.GetAbsAngles();
            this.interCamPos = new Vec3(o.x, o.y, o.z);
            this.interCamAng = { pitch: a.pitch, yaw: a.yaw, roll: 0 };
        } else {
            this.interCamPos = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z);
            const a = pawn ? pawn.GetEyeAngles() : { pitch: 0, yaw: 0 };
            this.interCamAng = { pitch: a.pitch, yaw: a.yaw, roll: 0 };
        }
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.CONTROLLED);
        this.hud.setVisible(false);
        const k = this.enemies.killStats();
        const secs = Math.floor(this.gameNow() - this.levelStartTime);
        this.hud.showIntermission(
            this.formatTime(secs), k.killed, k.total,
            this.secretsFound.size, this.secretsTotal);
        this.writeSlotLevel(this.activeSlot, this.currentLevelId(), {
            secrets: this.secretsFound.size, secretsTotal: this.secretsTotal,
            kills: k.killed, killsTotal: k.total, time: secs,
        });
    }

    private checkLevelCompleteAchievements(): void {
        const id = this.currentLevelId();
        if (id === "e1m7") this.achievements.unlock("complete_e1m7");
        else if (id === "e2m6") this.achievements.unlock("complete_e2m6");
        else if (id === "e3m6") this.achievements.unlock("complete_e3m6");
        else if (id === "e4m7") this.achievements.unlock("complete_e4m7");
        if (id === "e1m1" && this.activeDifficulty === "nightmare"
            && this.weapons.lastShotAt <= this.levelStartTime) {
            this.achievements.unlock("pacifist");
        }
        if (id === "e1m1" && this.gameNow() - this.levelStartTime <= C.SPEEDRUN_E1M1_MAX_SEC) {
            this.achievements.unlock("speedrunner");
        }
    }

    private pumpAchievementToasts(now: number): void {
        for (let i = 0; i < C.ACH_TOAST_SLOTS; i++) {
            if (!this.hud.toastFree(i)) continue;
            const id = this.achievements.popQueued();
            if (!id) return;
            const def = ACHIEVEMENTS.find((a) => a.id === id);
            if (!def) continue;
            this.hud.showToast(i, def, now);
            this.sounds.play(C.SND.achievementUnlock, PLAYER_SRC);
        }
    }

    private onBossDefeated(boss: Boss, now: number): void {
        this.particles.burst("explosion", boss.origin.withZ(boss.origin.z + 48), undefined, now);
        const delay = Math.max(0.1, boss.deathAt - now);
        css.Delay(delay).then(() => {
            if (boss.prop.IsValid()) boss.prop.Teleport({ position: new Vec3(0, 0, -16384) });
        });
    }

    private levelCount(): number {
        if (this.stream.count() === 0) return C.LEVEL_COUNT;
        let n = 0;
        for (const id of this.stream.list()) if (!C.SECRET_LEVEL_IDS.includes(id)) n++;
        return n || C.LEVEL_COUNT;
    }

    private streamEnter(target: number, complete: () => void): void {
        if (this.stream.count() === 0) { complete(); return; }
        const id = this.stream.idAt(Math.max(1, Math.min(target, this.stream.count())));
        if (!id || id === this.loadedId) { complete(); return; }
        const from = this.loadedId;
        this.pendingComplete = complete;
        this.pendingLoadId = id;
        this.pendingUnloadId = from && from !== id ? from : "";
        this.beginLoadScreen();
        this.loadedId = id;

        this.stream.load(id);
        if (this.pendingUnloadId) this.stream.unload(this.pendingUnloadId);

        css.Delay(C.LEVEL_STREAM_TIMEOUT).then(() => {
            if (this.pendingLoadId === id) {
                this.onLevelLoaded(id);
            }
        });
        if (this.pendingUnloadId) {
            const un = this.pendingUnloadId;
            css.Delay(C.LEVEL_UNLOAD_TIMEOUT).then(() => {
                if (this.pendingUnloadId === un) {
                    this.onLevelUnloaded(un);
                }
            });
        }
    }

    private beginLoadScreen(): void {
        this.viewCtl = "loading";
        this.loadShownAt = css.GetGameTime();
        this.hud.hideIntermission();
        this.hud.showLoading();
        this.hud.setLoadStatus(this.pendingLoadId ? `LOADING ${this.pendingLoadId.toUpperCase()}` : "LOADING");
        const pawn = this.pawn();
        if (pawn && pawn.IsValid()) {
            pawn.SetMoveType(CSMoveType.NONE);
            const at = new Vec3(pawn.GetAbsOrigin());
            const eye = at.withZ(at.z + C.VIEW_OFS_Z);
            if (this.body && this.body.IsValid()) {
                this.body.Teleport({ position: eye });
            }
            this.touchBody?.Teleport({ position: eye });
        }
        this.mapTriggers.reset();
    }

    private onLevelLoaded(id: string): void {
        if (id !== this.pendingLoadId) return;
        this.pendingLoadId = "";
        if (this.pendingUnloadId) this.hud.setLoadStatus(`UNLOADING ${this.pendingUnloadId.toUpperCase()}`);
        this.maybeFinishStream();
    }

    private onLevelUnloaded(id: string): void {
        if (id !== this.pendingUnloadId) {
            return;
        }
        this.pendingUnloadId = "";
        this.maybeFinishStream();
    }

    private maybeFinishStream(): void {
        if (!this.pendingComplete || this.pendingLoadId || this.pendingUnloadId) return;
        const complete = this.pendingComplete;
        this.pendingComplete = undefined;
        this.hud.setLoadStatus(`SPAWNING ${this.loadedId.toUpperCase()}`);
        const held = css.GetGameTime() - this.loadShownAt;
        const wait = Math.max(C.LEVEL_SETTLE_DELAY, C.LOAD_SCREEN_MIN - held);
        css.Delay(wait).then(() => complete());
    }

    private advanceLevel(): void {
        if (this.interFinale) {
            this.hud.hideIntermission();
            this.viewCtl = "play";
            this.openMenu();
            return;
        }
        const target = this.pendingLevelTarget;
        this.pendingLevelTarget = undefined;
        if (target) {
            const idx = this.stream.levelOf(target);
            if (idx >= 1) { this.streamEnter(idx, () => this.finishAdvance(idx)); return; }
        }
        if (this.levelIndex >= this.levelCount()) {
            this.interFinale = true;
            this.interReleased = false;
            if (this.activeDifficulty === "hard" || this.activeDifficulty === "nightmare") {
                this.unlockNightmare();
            }
            this.achievements.unlock("defeat_shub");
            if (this.activeDifficulty === "nightmare") this.achievements.unlock("defeat_shub_nightmare");
            this.music.play(C.MUSIC_TITLE_EVENT, PLAYER_SRC);
            this.hud.showFinale();
            this.hud.setInterHint("PRESS JUMP");
            return;
        }
        this.streamEnter(this.levelIndex + 1, () => this.finishAdvance(this.levelIndex + 1));
    }

    private finishAdvance(idx: number): void {
        this.levelIndex = idx;
        this.viewCtl = "play";
        const carry = this.snapshotPlayer();
        this.pendingRestore = carry;
        this.writeSlotSave(this.activeSlot, carry);
        this.writeSlotPlayTime(this.activeSlot, this.totalPlayTime());
        const pawn = this.pawn();
        const body = this.body;
        if (pawn && pawn.IsValid() && body && body.IsValid()) {
            this.captureSpawn(pawn, body);
            this.resetLevel();
        }
    }

    private snapshotPlayer(): SaveState {
        const p = this.player;
        return {
            levelIndex: this.levelIndex,
            health: Math.ceil(p.health),
            armorValue: Math.ceil(p.armorValue),
            armorType: p.armorType,
            shells: this.weapons.shellCount,
            ammo: this.weapons.snapshot(),
            weapons: this.weapons.ownedWeapons(),
            weapon: this.weapons.activeWeapon,
        };
    }

    private readSlots(): (SaveSlot | null)[] {
        const out: (SaveSlot | null)[] = new Array(C.SAVE_SLOTS).fill(null);
        try {
            const raw = (JSON.parse(css.GetSaveData() || "{}") as Record<string, unknown>).quakeSaves;
            if (Array.isArray(raw)) {
                for (let i = 0; i < C.SAVE_SLOTS; i++) {
                    const s = raw[i] as SaveSlot | null | undefined;
                    if (s && s.save && typeof s.save.levelIndex === "number") {
                        out[i] = {
                            save: s.save, levels: s.levels ?? {},
                            difficulty: s.difficulty ?? C.DIFFICULTY_DEFAULT,
                            playTime: typeof s.playTime === "number" ? s.playTime : 0,
                        };
                    }
                }
            }
        } catch {}
        return out;
    }

    private readSlot(i: number): SaveSlot | undefined {
        return this.readSlots()[i] ?? undefined;
    }

    hasAnySave(): boolean {
        return this.readSlots().some((s) => s !== null);
    }

    private writeSlots(slots: (SaveSlot | null)[]): void {
        let d: Record<string, unknown> = {};
        try { d = JSON.parse(css.GetSaveData() || "{}"); } catch { d = {}; }
        d.quakeSaves = slots;
        try { css.SetSaveData(JSON.stringify(d)); } catch {}
    }

    private writeSlotSave(i: number, save: SaveState): void {
        if (i < 0) return;
        const slots = this.readSlots();
        slots[i] = {
            save, levels: slots[i]?.levels ?? {},
            difficulty: slots[i]?.difficulty ?? this.activeDifficulty,
            playTime: slots[i]?.playTime ?? 0,
        };
        this.writeSlots(slots);
    }

    private writeSlotPlayTime(i: number, seconds: number): void {
        if (i < 0) return;
        const slots = this.readSlots();
        const cur = slots[i];
        if (!cur) return;
        cur.playTime = seconds;
        this.writeSlots(slots);
    }

    private nightmareUnlocked(): boolean {
        try { return !!(JSON.parse(css.GetSaveData() || "{}") as Record<string, unknown>).quakeNightmare; }
        catch { return false; }
    }
    private unlockNightmare(): void {
        let d: Record<string, unknown> = {};
        try { d = JSON.parse(css.GetSaveData() || "{}"); } catch { d = {}; }
        if (d.quakeNightmare) return;
        d.quakeNightmare = true;
        try { css.SetSaveData(JSON.stringify(d)); } catch {}
    }

    cheatUnlockNightmare(): void {
        this.unlockNightmare();
    }

    private patchNotesSeen(): boolean {
        try { return (JSON.parse(css.GetSaveData() || "{}") as Record<string, unknown>).quakePatchVersion === C.VERSION; }
        catch { return false; }
    }
    private markPatchNotesSeen(): void {
        let d: Record<string, unknown> = {};
        try { d = JSON.parse(css.GetSaveData() || "{}"); } catch { d = {}; }
        if (d.quakePatchVersion === C.VERSION) return;
        d.quakePatchVersion = C.VERSION;
        try { css.SetSaveData(JSON.stringify(d)); } catch {}
    }

    private writeSlotLevel(i: number, id: string, stat: LevelStat): void {
        if (i < 0) return;
        const slots = this.readSlots();
        const cur = slots[i];
        if (!cur) return;
        cur.levels[id] = stat;
        this.writeSlots(slots);
    }

    private clearSlot(i: number): void {
        const slots = this.readSlots();
        slots[i] = null;
        this.writeSlots(slots);
    }

    private currentLevelId(): string {
        return this.loadedId || this.stream.idAt(this.levelIndex) || `m${this.levelIndex}`;
    }

    private slotSummaries(): SlotSummary[] {
        return this.readSlots().map((s) => ({
            occupied: !!s,
            label: s ? (this.stream.idAt(s.save.levelIndex) || `m${s.save.levelIndex}`).toUpperCase() : "EMPTY",
            difficulty: s ? (s.difficulty ?? C.DIFFICULTY_DEFAULT).toUpperCase() : "",
        }));
    }

    private slotLevelRows(i: number): string[] {
        const slot = this.readSlot(i);
        const ids = this.stream.list().length ? [...this.stream.list()] : ["m1"];
        return ids.slice(0, C.STATS_MAX_ROWS).map((id) => {
            const st = slot?.levels[id];
            const head = id.toUpperCase().padEnd(6);
            if (!st) return head + "----";
            const c3 = (n: number) => String(Math.min(999, Math.max(0, Math.trunc(n))));
            const secr = `${c3(st.secrets)}/${c3(st.secretsTotal)}`.padEnd(6);
            const kill = `${c3(st.kills)}/${c3(st.killsTotal)}`.padEnd(7);
            return (head + secr + " " + kill + " " + this.formatTime(st.time)).slice(0, C.STATS_ROW_COLS);
        });
    }

    private slotSaveTimeStr(i: number): string {
        const seconds = i === this.activeSlot ? this.totalPlayTime() : (this.readSlot(i)?.playTime ?? 0);
        return this.formatPlayTime(seconds);
    }

    resumeSlot(slot: number): void {
        const rec = this.readSlot(slot);
        const s = rec?.save;
        if (!s) return;
        this.activeSlot = slot;
        this.activeDifficulty = rec.difficulty ?? C.DIFFICULTY_DEFAULT;
        this.playTimeBanked = rec.playTime ?? 0;
        this.playTimeSpanStart = 0;
        this.menu.hide();
        this.streamEnter(s.levelIndex, () => {
            this.levelIndex = s.levelIndex;
            this.pendingRestore = s;
            const pawn = this.pawn();
            const body = this.body;
            if (this.enabled && pawn && pawn.IsValid() && body && body.IsValid()) {
                this.captureSpawn(pawn, body);
                this.resetLevel();
            } else {
                this.onPlayerSpawned();
            }
        });
    }

    exitToMenu(): void {
        this.levelIndex = 0;
        this.menu.hide();
        this.openMenu();
    }

    private formatTime(sec: number): string {
        const s = Math.max(0, Math.floor(sec));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
    }

    private formatPlayTime(sec: number): string {
        const s = Math.max(0, Math.floor(sec));
        const hh = Math.floor(s / 3600);
        const mm = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        return `${hh}:${mm < 10 ? "0" : ""}${mm}:${ss < 10 ? "0" : ""}${ss}`;
    }

    private interTick(pawn: CSPlayerPawn): void {
        const camera = pawn.GetCustomCamera();
        const t = this.gameNow();
        const sin = Math.sin;
        const a = this.interCamAng;
        camera.Move({
            position: this.interCamPos.add(new Vec3(
                sin(t * C.INTER_SWAY_POS_CYCLE) * C.INTER_SWAY_POS,
                sin(t * C.INTER_SWAY_POS_CYCLE * 0.83) * C.INTER_SWAY_POS,
                sin(t * C.INTER_SWAY_POS_CYCLE * 1.37) * C.INTER_SWAY_POS * 0.5)),
            angles: {
                pitch: a.pitch + sin(t * C.INTER_SWAY_PITCH_CYCLE) * C.INTER_SWAY_PITCH,
                yaw: a.yaw + sin(t * C.INTER_SWAY_YAW_CYCLE) * C.INTER_SWAY_YAW,
                roll: sin(t * C.INTER_SWAY_ROLL_CYCLE) * C.INTER_SWAY_ROLL,
            },
        });

        if (!this.interFinale) return;
        this.hud.updateFinale(t);

        const jump = pawn.WasInputJustPressed(CSInputs.JUMP) || pawn.IsInputPressed(CSInputs.JUMP);
        if (!this.interReleased) {
            if (!jump) this.interReleased = true;
        } else if (jump) {
            this.interReleased = false;
            if (this.hud.finaleAdvance()) return;
            this.advanceLevel();
        }
    }

    onMenuClick(buttonId: string): void {
        if (buttonId.startsWith("q_ww_s")) { this.wheelClick(+buttonId.slice(6)); return; }
        if (buttonId === "q_death_retry" || buttonId === "q_inter_retry") { this.replayLevel(); return; }
        if (buttonId === "q_inter_continue") { this.advanceLevel(); return; }
        if (buttonId === "q_patch_dismiss") { this.markPatchNotesSeen(); this.menu.hidePatchNotes(); return; }
        const action = this.menu.onClick(buttonId);
        if (action === "disabled") return;

        if (action === "opennewslots") this.startNewGame();
        else if (action === "opencontslots") this.menu.openContSlots(this.slotSummaries());
        else if (action === "openstats") {
            const s = this.menu.chosenSlot();
            this.menu.openStats(s, this.slotLevelRows(s), this.slotSaveTimeStr(s));
        }
        else if (action === "openAchievements") {
            this.menu.openAchievements(this.achievements.countUnlocked(), this.achievements.total(),
                this.achievements.sortedList(), (id) => this.achievements.isUnlocked(id));
        }
        else if (action === "achScrollUp") this.menu.scrollAch(-1);
        else if (action === "achScrollDn") this.menu.scrollAch(1);
        else if (action === "newgame") this.beginNewGame(this.menu.chosenSlot(), this.menu.chosenDifficulty());
        else if (action === "continue") this.resumeSlot(this.menu.chosenSlot());
        else if (action === "resume") this.resumeGame();
        else if (action === "exit") this.exitToMenu();
        else if (action === "quit") {
            css.ServerCommand("crosshair 1");
            css.Delay(C.TICK_INTERVAL).then(() => css.ServerCommand("disconnect"));
        }
        else if (action === "toggleBob") this.setViewBob();
        else if (action === "toggleHitmarker") this.setHitmarker();
        else if (action === "toggleMusic") this.setMusic();
        else if (action === "toggleCrt") this.setCrt();
        else if (action === "toggle8bit") this.set8bit();
        else if (action === "toggleVoice") this.setVoice();
        else if (action === "toggleVmPos") this.setViewmodelPos();
        else if (action === "toggleAlwaysSprint") this.setAlwaysSprint();
        else if (action === "toggleStepSmooth") this.setStepSmooth();
        else if (action === "toggleRRestart") this.setRRestart();
        else if (action === "toggleSpeedometer") this.setShowSpeedometer();
        else if (action === "toggleStats") this.setShowStats();
        else if (action === "fovDown") this.setFov(-1);
        else if (action === "fovUp") this.setFov(1);
        else if (action === "toggleAutohop") this.setAutoHop();
        else if (action === "toggleGiveAll") this.setGiveAll();
        else if (action === "toggleGod") this.setGod();
        else if (action === "toggleInfAmmo") this.setInfAmmo();
    }

    private tick(): void {
        const now = css.GetGameTime();
        if (this.pendingSpawn && now >= this.spawnDueAt) {
            this.pendingSpawn = false;
            if (this.enabled) this.resetLevel();
            else this.enable();
        }
        if (this.pendingSpawn) {
            css.SetNextThink(now + C.TICK_INTERVAL);
        } else if (this.enabled) {
            this.frame();
            css.SetNextThink(css.GetGameTime() + C.TICK_INTERVAL);
        }
    }

    private grabBody(): void {
        const body = css.FindEntityByName(BODY_NAME);
        this.body = body ?? undefined;
        this.touchBody = css.FindEntityByName(C.TOUCH_BODY_NAME) ?? undefined;
        this.muzzLight = css.FindEntityByName(MUZZ_LIGHT_NAME) ?? undefined;
        if (this.muzzLight) {
            css.EntFireAtTarget({ target: this.muzzLight, input: MUZZ_LIGHT_OFF });
            this.muzzLit = false;
            this.muzzOffAt = 0;
            this.muzzShotSeen = this.weapons.lastShotAt;
        }
    }

    enable(): void {
        if (this.enabled) return;

        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) {
            return;
        }
        this.loadSettings();
        if (this.levelIndex < 1) this.levelIndex = 1;
        this.menu.hide();
        const camera = pawn.GetCustomCamera();

        this.grabBody();
        const body = this.body;
        if (!body || !body.IsValid()) {  return; }
        this.sounds.onEnable();
        this.music.onEnable();
        this.hud.onEnable();
        this.captureSpawn(pawn, body);

        this.rebuild(pawn, body, camera);

        pawn.SetMoveType(CSMoveType.NONE);
        css.ServerCommand("cl_draw_only_deathnotices 1");
        css.ServerCommand("sv_infinite_ammo 1");

        const eye = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z);
        body.Teleport({ position: eye });
        this.touchBody?.Teleport({ position: this.touchPos() });
        camera.Teleport({ position: eye, angles: this.spawnAngle });
        this.beginSpawnView(camera);

        this.enabled = true;
        this.accum = 0;
        this.hud.hideLoading();
        css.SetThink(() => this.tick());
        css.SetNextThink(css.GetGameTime() + C.TICK_INTERVAL);
    }

    disable(): void {
        if (!this.enabled) return;
        this.enabled = false;
        this.csControl = false;
        this.pendingSpawn = false;
        this.pauseAccum = 0;
        this.wheelOpen = false;
        this.wheelLawHeld = false;
        this.hud.setWheelCapture(false);
        this.hud.hideWheel();

        const pawn = this.pawn();
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.DISABLED);
        this.viewCtl = "play";
        this.pendingComplete = undefined;
        this.pendingLoadId = "";
        this.pendingUnloadId = "";
        if (pawn && pawn.IsValid()) pawn.SetMoveType(CSMoveType.WALK);
        this.weapons.onDisable(pawn);
        this.projectiles.onDisable();
        this.fireballs.onDisable();
        this.eventLightning.onDisable();
        this.barrels.onDisable();
        for (const fx of this.explosionFx) safeRemove(fx.prop);
        this.explosionFx = [];
        this.explosionTmpl = undefined;
        this.gibs.onDisable();
        this.particles.onDisable();
        this.enemies.despawnAll();
        this.backpacks.onDisable();
        this.items.onDisable();
        this.levelExit.onDisable();
        this.moveSounds.onDisable();
        this.sounds.onDisable();
        this.music.onDisable();
        this.hud.onDisable();
        this.crt.setWater("none");
        if (this.fovSent !== 0) { this.fovSent = 0; css.ServerCommand("fov_cs_debug 0"); }
        css.ServerCommand("cl_draw_only_deathnotices 0");
        css.ServerCommand("sv_infinite_ammo 0");
        setSolidBoxes([]);
        this.dead = false;
        this.pm.noclip = false;
        this.mapTriggers.reset();
        this.body = undefined;
        this.touchBody?.Teleport({ position: TOUCH_PARKED });
        this.touchBody = undefined;
        if (this.muzzLight) css.EntFireAtTarget({ target: this.muzzLight, input: MUZZ_LIGHT_OFF });
        this.muzzLight = undefined;
        this.muzzLit = false;
    }

    private resetMapEntities(): void {
        this.moveSounds.mute(true);
        this.doResetMapEntities();
        css.Delay(C.LEVEL_SETTLE_DELAY).then(() => {
            if (this.enabled) this.doResetMapEntities();
            this.moveSounds.mute(false);
        });
    }

    private doResetMapEntities(): void {
        css.EntFireAtName({ name: "doResetMapEntities", input: "Trigger" });
    }

    private applyGravity(): void {
        let g = C.SV_GRAVITY_DEFAULT;
        for (const e of css.FindEntitiesByName(`${C.GRAVITY_MARKER_NAME}#*`)) {
            if (!e.IsValid()) continue;
            const m = e.GetEntityName().match(/#(-?\d+)/);
            if (m) { g = parseInt(m[1], 10);  }
            break;
        }
        C.setGravity(g);
    }

    private rebuild(pawn: CSPlayerPawn, body: Entity, camera: Entity): void {
        this.csControl = false;
        this.pm.reset(new Vec3(this.spawnPoint), new Vec3(0, 0, 0), false);
        this.pm.setSelf(pawn);
        this.pm.probeGround();

        this.player.health = C.PLAYER_START_HEALTH;
        this.player.armorValue = C.PLAYER_START_ARMOR;
        this.player.armorType = 0;
        this.player.takeDamage = true;
        this.player.godMode = this.settings.god;
        this.megaRotAt = 0;
        this.painFlashUntil = 0;
        this.stepSmoothZ = this.pm.origin.z;
        this.dead = false;
        this.liquid = "none";
        this.waterSurfaceZ = 0;
        this.waterEntryZ = 0;
        this.liquidSurfaceTag = null;
        this.headUnder = false;
        this.pm.inWater = false;
        this.pm.headUnder = false;
        this.radsuitUntil = 0;
        this.keys = [false, false];
        this.shownHints.clear();
        this.quadUntil = this.pentUntil = this.ringUntil = 0;
        this.quadWarnAt = this.pentTickAt = this.pentWarnAt = this.ringTickAt = this.ringWarnAt = 0;
        this.lastKillCount = this.enemies.killStats().killed;
        this.player.invincibleUntil = 0;
        this.levelStartTime = this.gameNow();
        this.hud.resync();
        this.hud.hideDeathStats();
        this.resetMapEntities();
        this.mapTriggers.wire();
        this.prox.rearm();
        this.moveSounds.wire();
        this.applyGravity();
        this.secretsFound.clear();
        this.secretsTotal = this.mapTriggers.countPrefix("secret");

        setTraceIgnore([pawn, body, camera, this.touchBody]);

        this.weapons.onEnable(pawn, this.gameNow());
        this.weapons.setEnemies(this.enemies);
        this.weapons.setSounds(this.sounds, PLAYER_SRC);
        this.weapons.setProjectiles(this.projectiles);
        this.weapons.setBarrels(this.barrels);
        this.weapons.setParticles(this.particles);
        this.weapons.setShootHook((e) => this.prox.onShot(e));
        this.weapons.setNoAmmoHook(() => this.hud.showNoAmmo(this.gameNow()));
        this.weapons.setDamageScale(() =>
            this.gameNow() < this.quadUntil ? C.QUAD_DAMAGE_MUL : 1);
        for (const fx of this.explosionFx) safeRemove(fx.prop);
        this.explosionFx = [];
        const et = css.FindEntityByName(EXPLOSION_TEMPLATE_NAME);
        this.explosionTmpl = et instanceof PointTemplate ? et : undefined;
        this.projectiles.onEnable(this.enemies, this.sounds,
            (o, d, n, ig, fromMon) => this.radiusDamage(o, d, n, !fromMon, ig),
            (d, o, n) => this.hurtPlayer(d, o, n));
        this.projectiles.setOnImpact((e) => this.prox.onShot(e));
        this.projectiles.setBarrels(this.barrels);
        this.projectiles.setParticles(this.particles);
        this.fireballs.setProjectiles(this.projectiles);
        this.fireballs.onEnable(this.gameNow(), this.activeDifficulty);
        this.barrels.onEnable(
            (o, d, n) => this.radiusDamage(o, d, n, false));
        this.particles.onEnable(this.gameNow());
        this.gibs.onEnable(this.sounds, PLAYER_SRC, this.particles);

        this.enemies.spawnAll(this.gameNow(), this.activeDifficulty);
        this.enemies.setPlayer(this.player, pawn);
        this.enemies.setPlayerAlive(true);
        this.enemies.setSounds(this.sounds);
        this.enemies.setParticles(this.particles);
        this.enemies.setHitHook(() => this.onEnemyHit());
        this.enemies.setAchievementSink((id) => this.achievements.unlock(id));
        this.enemies.setDropSink((o, loot, now) => this.backpacks.drop(o, loot, now));
        this.enemies.setGibSink((o, head, now) => this.gibs.burst(o, head as HeadKind, now));
        this.enemies.setGrenadeSink((muzzle, vel, owner, now) =>
            this.projectiles.monsterGrenade(muzzle, vel, now, owner));
        this.enemies.setZombieGibSink((muzzle, vel, owner, now) =>
            this.projectiles.zombieGib(muzzle, vel, now, owner));
        this.enemies.setSpikeSink((origin, dir, owner, now) =>
            this.projectiles.spikeShot(owner, origin, dir, false, now,
                C.WIZARD_SPIKE_SPEED, C.WIZARD_SPIKE_DAMAGE));
        this.enemies.setPlayerPushSink((box) => this.pushPlayerFromMonster(box));
        this.enemies.setBossMissileSink((muzzle, dir, owner, now) =>
            this.projectiles.bossball(muzzle, dir, owner, now));
        this.enemies.setBossDeathSink((boss, now) => this.onBossDefeated(boss, now));

        this.eventLightning.onDisable();
        this.eventLightning.setSinks(
            (a, b, n) => this.enemies.beamFx(a, b, n),
            (ent, n) => this.enemies.hurtByLightning(ent, n),
            (dmg, at, n) => this.hurtPlayer(dmg, at, n),
            () => this.pawn());
        this.eventLightning.onEnable();

        this.backpacks.onDisable();
        this.backpacks.onEnable((loot) => {
            this.weapons.addShells(loot.shells);
            return `You get ${loot.shells} shells`;
        }, this.sounds, PLAYER_SRC, (m) => this.onPickupMsg(m));

        this.items.onEnable(
            this.makeItemEffects(), this.sounds, PLAYER_SRC,
            (m, center) => this.onPickupMsg(m, center), this.activeDifficulty);
        this.levelExit.onEnable(() => this.endLevel());

        if (this.pendingRestore) {
            const r = this.pendingRestore;
            this.pendingRestore = undefined;
            this.player.health = r.health;
            this.player.armorValue = r.armorValue;
            this.player.armorType = r.armorType;
            if (r.ammo) this.weapons.restore(r.ammo);
            else this.weapons.setShells(r.shells);
            this.weapons.grantOwned(pawn, r.weapons);
            this.weapons.restoreActive(pawn, r.weapon, this.gameNow());
        }

        if (C.DEBUG || this.settings.giveAll) this.weapons.giveAll(pawn);
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);

        this.refreshTraceIgnore();
        setSolidBoxes([...this.enemies.solidBoxes(), this.playerBox(pawn)]);
    }

    private refreshTraceIgnore(): void {
        const pawn = this.pawn();
        setTraceIgnore([
            pawn, this.body, pawn?.GetCustomCamera(), this.touchBody,
            ...this.enemies.allProps(), ...this.levelExit.props(),
            ...this.gibs.props(), ...this.projectiles.props(),
            ...this.items.props(), ...this.backpacks.props(),
            ...this.particles.props(),
        ]);
    }

    private replayLevel(): void {
        const slot = this.activeSlot >= 0 ? this.readSlot(this.activeSlot) : undefined;
        if (slot && slot.save.levelIndex === this.levelIndex) this.pendingRestore = slot.save;
        this.resetLevel();
    }

    private resetLevel(): void {
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return;
        this.grabBody();
        this.hud.onEnable();
        const body = this.body;
        if (!body || !body.IsValid()) { this.disable(); return; }
        const camera = pawn.GetCustomCamera();
        this.rebuild(pawn, body, camera);
        pawn.SetMoveType(CSMoveType.NONE);
        const eye = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z);
        body.Teleport({ position: eye });
        camera.Teleport({ position: eye, angles: this.spawnAngle });
        this.touchBody?.Teleport({ position: this.touchPos() });
        this.beginSpawnView(camera);
        this.accum = 0;
        this.hud.hideLoading();
    }

    private captureSpawn(pawn: CSPlayerPawn, body: Entity): void {
        const mapNum = this.loadedId ? (this.loadedId.match(/(\d+)$/) ?? [])[1] : undefined;
        const marker =
            (this.loadedId ? css.FindEntityByName(`${SPAWN_PREFIX.slice(0, -1)}@${this.loadedId}`) : undefined)
            ?? (mapNum ? css.FindEntityByName(SPAWN_PREFIX + mapNum) : undefined)
            ?? css.FindEntityByName(SPAWN_PREFIX + this.levelIndex)
            ?? css.FindEntityByName(SPAWN_PREFIX.slice(0, -1))
            ?? css.FindEntityByName(`${SPAWN_PREFIX}1`)
            ?? body;
        if (marker) {
            const o = marker.GetAbsOrigin();
            const a = marker.GetAbsAngles();
            this.spawnPoint = new Vec3(o.x, o.y, o.z + 1);
            this.spawnAngle = { pitch: a.pitch, yaw: a.yaw, roll: 0 };
        } else {
            const feet = new Vec3(pawn.GetAbsOrigin());
            const a = pawn.GetEyeAngles();
            this.spawnPoint = feet.withZ(feet.z - C.HULL_MIN.z);
            this.spawnAngle = { pitch: a.pitch, yaw: a.yaw, roll: 0 };
        }
    }

    private beginSpawnView(camera: CustomPlayerCamera): void {
        this.viewCtl = "spawn";
        this.spawnHoldUntil = this.gameNow() + C.SPAWN_VIEW_HOLD;
        this.resumePlayTime();
        const musicEvent = C.levelMusicEvent(this.currentLevelId());
        if (musicEvent) this.music.play(musicEvent, PLAYER_SRC);
        else this.music.stop();
        camera.SetMode(CustomCameraMode.CONTROLLED);
    }

    private calcViewBob(now: number): number {
        let cycle = now - Math.floor(now / C.CL_BOBCYCLE) * C.CL_BOBCYCLE;
        cycle /= C.CL_BOBCYCLE;
        if (cycle < C.CL_BOBUP) cycle = Math.PI * cycle / C.CL_BOBUP;
        else cycle = Math.PI + Math.PI * (cycle - C.CL_BOBUP) / (1 - C.CL_BOBUP);
        const v = this.pm.velocity;
        let bob = Math.sqrt(v.x * v.x + v.y * v.y) * C.CL_BOB;
        bob = bob * 0.3 + bob * 0.7 * Math.sin(cycle);
        return bob > C.V_BOB_UP_MAX ? C.V_BOB_UP_MAX
            : bob < -C.V_BOB_DOWN_MAX ? -C.V_BOB_DOWN_MAX : bob;
    }

    private stepSmoothZ = 0;
    private stepSmoothAt = 0;

    private calcStepSmooth(now: number): number {
        const oz = this.pm.origin.z;
        const dt = Math.max(0, Math.min(now - this.stepSmoothAt, 0.1));
        this.stepSmoothAt = now;
        if (!this.settings.stepSmooth || !this.pm.onGround || oz - this.stepSmoothZ <= 0) {
            this.stepSmoothZ = oz;
            return 0;
        }
        this.stepSmoothZ += dt * C.STEP_SMOOTH_SPEED;
        if (this.stepSmoothZ > oz) this.stepSmoothZ = oz;
        if (oz - this.stepSmoothZ > C.STEP_SMOOTH_MAX) this.stepSmoothZ = oz - C.STEP_SMOOTH_MAX;
        return this.stepSmoothZ - oz;
    }

    private applyPlayCam(body: Entity, camera: CustomPlayerCamera, bob: number): void {
        const eye = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z + bob);
        body.Move({ position: eye });
        camera.Move({ position: eye });
    }

    private openWheel(): void {
        if (this.wheelOpen || this.dead || this.viewCtl !== "play" || this.menu.isOpen()) return;
        this.wheelOpen = true;
        this.accum = 0;
        this.hud.showWheel();
        this.hud.setWheelCapture(true);
        this.hud.setWheel(this.weapons.wheelSlots(), this.weapons.wheelActiveIndex());
    }

    private closeWheel(): void {
        if (!this.wheelOpen) return;
        this.wheelOpen = false;
        this.hud.setWheelCapture(false);
        this.hud.hideWheel();
        this.accum = 0;
    }

    private wheelClick(slot: number): void {
        if (!this.wheelOpen) return;
        const pawn = this.pawn();
        if (pawn) this.weapons.selectFromWheel(pawn, slot, this.gameNow());
        this.closeWheel();
    }

    private touchPos(): Vec3 {
        return this.pm.origin.withZ(this.pm.origin.z + C.TOUCH_GROUND_LIFT);
    }

    private updateLiquid(): void {
        const now = this.gameNow();
        const cur: "none" | "water" | "poison" | "lava" =
            this.dead || this.pm.noclip ? "none"
            : this.mapTriggers.isTouchingPrefix(C.LAVA_TRIGGER_PREFIX) ? "lava"
            : this.mapTriggers.isTouchingPrefix(C.POISON_TRIGGER_PREFIX) ? "poison"
            : this.mapTriggers.isTouchingPrefix(C.WATER_TRIGGER_PREFIX) ? "water"
            : "none";

        const eyeZ = this.pm.origin.z + C.VIEW_OFS_Z;

        if (cur !== "none" && this.liquid === "none") {
            this.sounds.play(
                cur === "water" ? C.SND.waterIn : cur === "lava" ? C.SND.lavaIn : C.SND.slimeIn,
                PLAYER_SRC);
            this.airFinished = now + C.AIR_TIME;
            this.drownDmg = 0;
            this.nextDrown = 0;
            this.nextSlime = 0;
            this.waterEntryZ = this.pm.origin.z + C.HULL_MIN.z;
            this.headUnder = false;
        } else if (cur === "none" && this.liquid !== "none") {
            this.sounds.play(C.SND.waterOut, PLAYER_SRC);
            if (this.headUnder) {
                if (now > this.airFinished) this.sounds.play(C.SND.gaspEmpty, PLAYER_SRC);
                else if (now > this.airFinished - 9) this.sounds.play(C.SND.gaspRecover, PLAYER_SRC);
            }
            this.waterSurfaceZ = 0;
            this.waterEntryZ = 0;
            this.liquidSurfaceTag = null;
            this.headUnder = false;
        }
        this.liquid = cur;
        this.pm.inWater = cur !== "none";
        if (cur === "none") {
            this.pm.headUnder = false;
            this.pm.swimUpSpeed = C.WATER_SWIM_UP;
            this.pm.waterJumpUp = C.WATER_JUMP_UP;
            return;
        }

        this.waterSurfaceZ = this.liquidSurfaceTag ?? this.waterEntryZ;

        const waistZ = this.pm.origin.z + (C.HULL_MIN.z + C.HULL_MAX.z) / 2;
        const waterLevel = eyeZ < this.waterSurfaceZ ? 3 : waistZ < this.waterSurfaceZ ? 2 : 1;

        if (waterLevel < 3) {
            if (this.headUnder) {
                if (now > this.airFinished) this.sounds.play(C.SND.gaspEmpty, PLAYER_SRC);
                else if (now > this.airFinished - 9) this.sounds.play(C.SND.gaspRecover, PLAYER_SRC);
            }
            this.headUnder = false;
            this.airFinished = now + C.AIR_TIME;
            this.drownDmg = C.DROWN_DMG_STEP;
            this.nextDrown = 0;
        } else {
            this.headUnder = true;
            if (now > this.airFinished && now >= this.nextDrown) {
                this.nextDrown = now + C.DROWN_INTERVAL;
                this.drownDmg = Math.min(this.drownDmg + C.DROWN_DMG_STEP, C.DROWN_DMG_MAX);
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: this.drownDmg,
                    byPlayer: false, time: now, noKnockback: true,
                });
            }
        }
        if ((cur === "poison" || cur === "lava") && now >= this.nextSlime) {
            const suited = now < this.radsuitUntil;
            if (cur === "lava") {
                this.nextSlime = now + (suited ? C.LAVA_INTERVAL_SUITED : C.LAVA_INTERVAL);
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: waterLevel * C.LAVA_DMG_PER_LEVEL,
                    byPlayer: false, time: now, noKnockback: true,
                });
            } else if (!suited) {
                this.nextSlime = now + C.SLIME_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: waterLevel * C.SLIME_DMG_PER_LEVEL,
                    byPlayer: false, time: now, noKnockback: true,
                });
            }
        }
        this.pm.swimUpSpeed =
            cur === "lava" ? C.LAVA_SWIM_UP : cur === "poison" ? C.SLIME_SWIM_UP : C.WATER_SWIM_UP;
        this.pm.waterJumpUp = cur === "lava" ? C.LAVA_WATER_JUMP_UP : C.WATER_JUMP_UP;
        this.pm.headUnder = this.headUnder;
    }

    setNoclip(on?: boolean): boolean {
        if (!this.enabled) return false;
        const want = on === undefined ? !this.pm.noclip : on;
        this.pm.noclip = want;
        this.player.takeDamage = !want;
        this.enemies.setPlayerInvisible(want || this.gameNow() < this.ringUntil);
        if (want) this.enemies.forgetPlayer();
        if (!want) {
            this.pm.velocity = new Vec3(0, 0, 0);
            this.pm.probeGround();
        }
        return want;
    }

    togglePlayerControl(): string {
        if (!this.enabled) return "quake mode is off (`quake on` first)";
        if (this.menu.isOpen()) return "close the menu first";
        if (this.dead) return "can't - the Quake player is dead";
        if (!this.csControl && this.viewCtl !== "play") return `busy (${this.viewCtl})`;
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return "no player pawn";
        const camera = pawn.GetCustomCamera();

        const pawnPos = new Vec3(pawn.GetAbsOrigin());
        const bodyPos = new Vec3(this.pm.origin);
        pawn.Teleport({ position: bodyPos });
        this.pm.reset(pawnPos, new Vec3(0, 0, 0), false);
        this.pm.notifyTeleport();
        this.pm.probeGround();

        this.csControl = !this.csControl;
        this.accum = 0;
        if (this.csControl) {
            this.pauseStart = css.GetGameTime();
            camera.SetMode(CustomCameraMode.DISABLED);
            pawn.SetMoveType(CSMoveType.WALK);
            this.hud.setVisible(false);
            css.ServerCommand("cl_draw_only_deathnotices 0");
            return "control -> CS player (walk around; `quaketoggleplayer` to return)";
        }
        this.pauseAccum += css.GetGameTime() - this.pauseStart;
        const eye = pawnPos.withZ(pawnPos.z + C.VIEW_OFS_Z);
        pawn.SetMoveType(CSMoveType.NONE);
        if (this.body?.IsValid()) this.body.Teleport({ position: eye });
        camera.Teleport({ position: eye });
        camera.SetMode(CustomCameraMode.CONTROLLED_POSITION);
        this.viewCtl = "play";
        this.hud.setVisible(true);
        css.ServerCommand("cl_draw_only_deathnotices 1");
        return "control -> Quake player";
    }

    giveAll(): void {
        const p = this.pawn();
        if (this.enabled && p) this.weapons.giveAll(p);
    }

    setShowPos(on?: boolean): boolean {
        this.showPos = on === undefined ? !this.showPos : on;
        return this.showPos;
    }

    setHudShown(on?: boolean): boolean {
        const show = on === undefined ? this.hud.isForcedOff() : on;
        this.hud.setForcedOff(!show);
        return show;
    }

    setViewmodelShown(on?: boolean): boolean {
        const show = on === undefined ? this.weapons.viewmodelHidden() : on;
        this.weapons.setViewmodelHidden(!show);
        return show;
    }

    setNoclipSpeed(v?: number): number {
        if (v !== undefined && isFinite(v) && v > 0) this.pm.noclipSpeed = v;
        return this.pm.noclipSpeed;
    }

    toggleMonsterAi(args: string): string {
        const parts = args.trim().split(/\s+/);
        const f = (parts[1] ?? "").toLowerCase();
        const force = f === "on" || f === "1" ? true
            : f === "off" || f === "0" ? false : undefined;
        return this.enemies.aiToggle(parts[0] ?? "", force);
    }

    spawnMonster(args: string): string {
        if (!this.enabled) return "quake mode is off";
        const pawn = this.pawn();
        if (!pawn || !pawn.IsValid()) return "no pawn";
        const eye = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z);
        const ang = pawn.GetEyeAngles();
        const fwd = angleVectors(ang.pitch, ang.yaw, 0).forward;
        const Z = new Vec3(0, 0, 0);
        const tr = traceHull(eye, Z, Z, eye.add(fwd.scale(4096)), [pawn, this.body]);
        const at = (tr.fraction < 1 ? new Vec3(tr.endpos) : eye.add(fwd.scale(160)))
            .subtract(fwd.scale(28));
        return this.enemies.spawnOne(args.trim().split(/\s+/)[0] ?? "", at, ang.yaw + 180, this.gameNow());
    }

    setViewBob(on?: boolean): boolean {
        this.viewBob = on === undefined ? !this.viewBob : on;
        this.settings.viewBob = this.viewBob;
        this.saveSettings();
        this.syncMenuOptions();
        return this.viewBob;
    }

    setAlwaysSprint(on?: boolean): boolean {
        this.settings.alwaysSprint = on === undefined ? !this.settings.alwaysSprint : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.alwaysSprint;
    }

    setStepSmooth(on?: boolean): boolean {
        this.settings.stepSmooth = on === undefined ? !this.settings.stepSmooth : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.stepSmooth;
    }

    setFov(d: number): number {
        const cur = this.settings.fov;
        const want = Math.abs(d) <= 1 ? cur + d * C.FOV_STEP : Math.round(d);
        this.settings.fov = Math.max(C.FOV_MIN, Math.min(C.FOV_MAX, want));
        this.applyFov();
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.fov;
    }

    private fovSent = 0;

    private applyFov(fov: number = this.settings.fov): void {
        if (fov === this.fovSent) return;
        this.fovSent = fov;
        css.ServerCommand(`fov_cs_debug ${fov}`);
    }

    setAutoHop(on?: boolean): boolean {
        this.settings.autoHop = on === undefined ? !this.settings.autoHop : on;
        this.pm.autoHop = this.settings.autoHop;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.autoHop;
    }

    setRRestart(on?: boolean): boolean {
        this.settings.rRestart = on === undefined ? !this.settings.rRestart : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.rRestart;
    }

    setGiveAll(on?: boolean): boolean {
        this.settings.giveAll = on === undefined ? !this.settings.giveAll : on;
        this.saveSettings();
        this.syncMenuOptions();
        const p = this.pawn();
        if (this.settings.giveAll && this.enabled && p) this.weapons.giveAll(p);
        return this.settings.giveAll;
    }

    setCrt(on?: boolean): boolean {
        this.settings.crt = on === undefined ? !this.settings.crt : on;
        this.crt.applyOverlay(this.settings.crt);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.crt;
    }

    set8bit(on?: boolean): boolean {
        this.settings.eightbit = on === undefined ? !this.settings.eightbit : on;
        this.crt.apply8bit(this.settings.eightbit);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.eightbit;
    }

    setHitmarker(on?: boolean): boolean {
        this.settings.hitmarker = on === undefined ? !this.settings.hitmarker : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.hitmarker;
    }

    setShowSpeedometer(on?: boolean): boolean {
        this.settings.showSpeedometer = on === undefined ? !this.settings.showSpeedometer : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.showSpeedometer;
    }

    setShowStats(on?: boolean): boolean {
        this.settings.showStats = on === undefined ? !this.settings.showStats : on;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.showStats;
    }

    setMusic(on?: boolean): boolean {
        this.settings.music = on === undefined ? !this.settings.music : on;
        this.music.setEnabled(this.settings.music);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.music;
    }

    private onEnemyHit(): void {
        if (!this.settings.hitmarker) return;
        const now = this.gameNow();
        if (now - this.lastHitMark < C.HITMARK_DEBOUNCE) return;
        this.lastHitMark = now;
        this.sounds.play(C.SND.hitmarker, PLAYER_SRC);
    }

    setVoice(v?: "m" | "f"): "m" | "f" {
        this.settings.voice = v ?? (this.settings.voice === "m" ? "f" : "m");
        this.sounds.setVoice(this.settings.voice);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.voice;
    }

    private static readonly VM_POS_ORDER: VmPos[] = ["center", "left", "right"];
    setViewmodelPos(v?: VmPos): VmPos {
        this.settings.vmPos = v ?? QuakeController.VM_POS_ORDER[
            (QuakeController.VM_POS_ORDER.indexOf(this.settings.vmPos) + 1)
            % QuakeController.VM_POS_ORDER.length];
        this.weapons.setViewmodelPos(this.settings.vmPos);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.vmPos;
    }

    setGod(on?: boolean): boolean {
        this.settings.god = on === undefined ? !this.settings.god : on;
        this.player.godMode = this.settings.god;
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.god;
    }

    setInfAmmo(on?: boolean): boolean {
        this.settings.infAmmo = on === undefined ? !this.settings.infAmmo : on;
        this.weapons.setInfiniteAmmo(this.settings.infAmmo);
        this.saveSettings();
        this.syncMenuOptions();
        return this.settings.infAmmo;
    }

    private makeItemEffects(): ItemEffects {
        return {
            armor: (type, value) => {
                const p = this.player;
                if (p.armorType * p.armorValue >= type * value) return false;
                p.armorType = type;
                p.armorValue = value;
                return true;
            },
            heal: (amount, ignoreMax) => {
                const p = this.player;
                if (p.health <= 0) return false;
                if (!ignoreMax && p.health >= C.PLAYER_MAX_HEALTH) return false;
                p.health = Math.ceil(p.health + amount);
                if (!ignoreMax && p.health >= C.PLAYER_MAX_HEALTH) p.health = C.PLAYER_MAX_HEALTH;
                if (p.health > C.HEALTH_MEGA_MAX) p.health = C.HEALTH_MEGA_MAX;
                if (ignoreMax) this.megaRotAt = this.gameNow() + C.MEGA_ROT_DELAY;
                return true;
            },
            shells: (n) => this.weapons.addShells(n),
            suit: () => { this.radsuitUntil = this.gameNow() + C.RADSUIT_TIME; return true; },
            powerup: (kind) => {
                const t = this.gameNow();
                if (kind === "quad") { this.quadUntil = t + C.QUAD_TIME; this.quadWarnAt = 0; }
                else if (kind === "pent") {
                    this.pentUntil = t + C.PENT_TIME;
                    this.player.invincibleUntil = this.pentUntil;
                    this.pentTickAt = t + 1 + Math.random() * 3; this.pentWarnAt = 0;
                } else {
                    this.ringUntil = t + C.RING_TIME;
                    this.ringTickAt = t + 1 + Math.random() * 3; this.ringWarnAt = 0;
                }
                return true;
            },
            ammo: (kind, n) => this.weapons.addAmmo(kind, n),
            weapon: (csName) => {
                const p = this.pawn();
                if (p) this.weapons.give(p, csName, this.gameNow());
                return true;
            },
            key: (idx) => { this.keys[idx] = true; return true; },
            rune: (idx) => { this.runes[idx] = true; return true; },
        };
    }

    private radiusDamage(origin: Vec3, damage: number, now: number,
        selfAttacker = true, ignore?: Entity): void {
        const dmg = damage * (this.gameNow() < this.quadUntil ? C.QUAD_DAMAGE_MUL : 1);
        let sndSrc = PLAYER_SRC;
        if (this.explosionTmpl) {
            const sp = this.explosionTmpl.ForceSpawn(origin, { pitch: 0, yaw: 0, roll: 0 });
            if (sp && sp.length) {
                sndSrc = `q_expfx_${this.expFxSeq++}`;
                sp[0].SetEntityName(sndSrc);
                this.explosionFx.push({ prop: sp[0], dieAt: now + EXPLOSION_FX_TTL });
            }
        }
        this.particles.burst("explosion", origin, undefined, now);
        this.sounds.play(C.SND.explosion, sndSrc);
        this.enemies.radiusHurt(origin, dmg, now, ignore, selfAttacker);
        this.barrels.radiusHit(origin, dmg, now);
        if (!this.dead && this.player.takeDamage) {
            const dist = this.pm.origin.distance(origin);
            let pts = dist > damage + C.EXPLOSION_RADIUS_PAD ? 0 : damage - 0.5 * dist;
            if (selfAttacker) pts *= 0.5;
            if (pts > 0) {
                T_Damage(this.player, {
                    inflictorCenter: origin, damage: pts, byPlayer: false, time: now,
                });
            }
        }
    }

    private tickPowerups(now: number): void {
        if (this.dead) return;
        if (now < this.ringUntil) {
            if (now >= this.ringTickAt) {
                this.sounds.play(C.SND.ringTick, PLAYER_SRC);
                this.ringTickAt = now + 1 + Math.random() * 3;
            }
            if (this.ringUntil - now < 3 && now >= this.ringWarnAt) {
                this.sounds.play(C.SND.ringWarn, PLAYER_SRC);
                this.ringWarnAt = now + 1;
            }
        }
        if (now < this.pentUntil) {
            if (now >= this.pentTickAt) {
                this.sounds.play(C.SND.pentTick, PLAYER_SRC);
                this.pentTickAt = now + 1 + Math.random() * 3;
            }
            if (this.pentUntil - now < 3 && now >= this.pentWarnAt) {
                this.sounds.play(C.SND.pentWarn, PLAYER_SRC);
                this.pentWarnAt = now + 1;
            }
        }
        if (now < this.quadUntil && this.quadUntil - now < 3 && now >= this.quadWarnAt) {
            this.sounds.play(C.SND.quadWarn, PLAYER_SRC);
            this.quadWarnAt = now + 1;
        }
        const killed = this.enemies.killStats().killed;
        if (killed !== this.lastKillCount) {
            if (killed > this.lastKillCount && now < this.quadUntil) {
                this.sounds.play(C.SND.quadKill, PLAYER_SRC);
            }
            this.lastKillCount = killed;
        }
    }

    private pawn(): CSPlayerPawn | undefined {
        return css.GetPlayerController(this.slot)?.GetPlayerPawn();
    }

    private playerBox(pawn: Entity): SolidBox {
        return { id: pawn, center: this.pm.origin, mins: C.HULL_MIN, maxs: C.HULL_MAX };
    }

    private megaRot(now: number): void {
        if (this.dead || this.player.health <= C.PLAYER_MAX_HEALTH) return;
        if (now < this.megaRotAt) return;
        this.player.health -= 1;
        this.megaRotAt = now + 1;
    }

    private onPlayerPain(d: DamageInfo): void {
        this.sounds.play(C.SND.playerPain, PLAYER_SRC);
        this.painFlashUntil = this.gameNow() + 0.2;
        this.damageCshift(d);
        this.playerBlood(d);
    }

    private onPickupMsg(m: string, center = false): void {
        if (center) this.hud.showCenter(m, this.gameNow());
        else this.hud.showMsg(m, this.gameNow());
        this.crt.bonusFlash();
    }

    private damageCshift(d: DamageInfo): void {
        const blood = d.healthTake ?? d.damage;
        const armor = d.armorSave ?? 0;
        this.crt.damageFlash(Math.max(10, blood * 0.5 + armor * 0.5), armor > blood);
    }

    private playerBlood(d: DamageInfo): void {
        if (d.noKnockback) return;
        const chest = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z * 0.5);
        const away = chest.subtract(d.inflictorCenter);
        if (away.length < 1) return;
        this.particles.burst("blood_impact", chest, away.normal, this.gameNow());
    }

    private onPlayerDeath(d: DamageInfo): void {
        if (this.dead) return;
        this.damageCshift(d);
        this.playerBlood(d);
        this.dead = true;
        this.closeWheel();
        this.pm.inWater = false;
        this.mapTriggers.reset();
        this.enemies.setPlayerAlive(false);
        this.enemies.calmDown();
        this.hud.setVisible(false);
        const k = this.enemies.killStats();
        this.hud.showDeathStats(k.killed, k.total, this.secretsFound.size, this.secretsTotal);
        this.writeSlotPlayTime(this.activeSlot, this.totalPlayTime());

        if (this.player.health < C.GIB_HEALTH) {
            this.gibs.burst(this.pm.origin, "head_player", this.gameNow());
        }

        if (this.pm.velocity.z < 10) {
            this.pm.velocity = this.pm.velocity.withZ(
                this.pm.velocity.z + Math.random() * C.DEATH_TOSS_UP);
        }
        const pawn = this.pawn();
        this.deathYaw = pawn ? pawn.GetEyeAngles().yaw : this.deathYaw;
        this.deathViewOfs = C.VIEW_OFS_Z;
        this.viewCtl = "death";
        pawn?.GetCustomCamera().SetMode(CustomCameraMode.CONTROLLED);

        this.sounds.play(C.SND.playerDeath, PLAYER_SRC);
    }

    private checkTouchDeath(now: number): void {
        const margin = new Vec3(C.TOUCHDEATH_MARGIN, C.TOUCHDEATH_MARGIN, C.TOUCHDEATH_MARGIN);
        const tr = traceHull(this.pm.origin,
            C.HULL_MIN.subtract(margin), C.HULL_MAX.add(margin), this.pm.origin, [], true);
        if (!tr.startsolid || !tr.ent || !tr.ent.IsValid()) return;
        const name = tr.ent.GetEntityName();
        if (!name || !hasTag(name, C.TOUCHDEATH_TAG)) return;
        T_Damage(this.player, {
            inflictorCenter: this.pm.origin, damage: C.TOUCHDEATH_DAMAGE,
            byPlayer: false, time: now, noKnockback: true,
        });
    }

    private pushPlayerFromMonster(box: SolidBox): void {
        if (this.pm.noclip) return;
        const p = this.pm.origin;
        const pMin = p.add(C.HULL_MIN), pMax = p.add(C.HULL_MAX);
        const mMin = box.center.add(box.mins), mMax = box.center.add(box.maxs);
        const overlap = pMin.x < mMax.x && pMax.x > mMin.x
            && pMin.y < mMax.y && pMax.y > mMin.y
            && pMin.z < mMax.z && pMax.z > mMin.z;
        if (!overlap) return;
        let dx = p.x - box.center.x, dy = p.y - box.center.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
        const dist = (box.maxs.x - box.mins.x) * 0.5 + (C.HULL_MAX.x - C.HULL_MIN.x) * 0.5
            + C.ZOMBIE_WAKE_PUSH_MARGIN;
        const target = p.add(new Vec3(dx * dist, dy * dist, 0));
        const tr = traceHull(p, C.HULL_MIN, C.HULL_MAX, target, [box.id]);
        this.pm.origin = new Vec3(tr.endpos);
    }

    private frame(): void {
        const pawn = this.pawn();
        const body = this.body;
        if (!pawn || !pawn.IsValid() || !body || !body.IsValid()) {
            this.disable();
            return;
        }

        if (this.viewCtl === "intermission") {
            this.interTick(pawn);
            return;
        }

        if (this.viewCtl === "loading") return;

        if (this.csControl) return;

        const scores = pawn.IsInputPressed(CSInputs.SHOW_SCORES);
        if (scores && !this.scoresHeld) {
            if (this.menu.isOpen()) this.resumeGame();
            else this.pauseGame();
        }
        this.scoresHeld = scores;

        if (this.menu.isOpen()) {
            const body = this.body;
            if (!this.dead && this.viewCtl === "play" && body
                && this.pm.pausedRide(C.TICK_INTERVAL)) {
                this.applyPlayCam(body, pawn.GetCustomCamera(), 0);
                if (this.touchBody) {
                    this.touchBody.Teleport({
                        position: this.touchPos(), angles: { pitch: 0, yaw: 0, roll: 0 },
                    });
                }
            }
            this.updateHud();
            return;
        }

        const law = !this.dead && this.viewCtl === "play"
            && pawn.IsInputPressed(CSInputs.LOOK_AT_WEAPON);
        if (law && !this.wheelLawHeld) this.openWheel();
        else if (this.wheelOpen && !law) this.closeWheel();
        this.wheelLawHeld = law;
        const timeScale = this.wheelOpen ? C.WHEEL_TIME_SCALE : 1;
        this.pauseAccum += C.TICK_INTERVAL * (1 - timeScale);
        const wheelFrame = this.wheelOpen;
        if (this.wheelOpen) this.hud.setWheel(this.weapons.wheelSlots(), this.weapons.wheelActiveIndex());

        this.prof.frame();

        const obs = this.pm.noclip;
        this.player.takeDamage = !obs;

        if (this.settings.rRestart && pawn.WasInputJustPressed(CSInputs.RELOAD)) {
            this.replayLevel();
            return;
        }

        const cmd = this.readInput(pawn);
        if (this.dead) {
            cmd.forwardmove = 0;
            cmd.sidemove = 0;
            cmd.jump = false;
        }

        this.updateLiquid();

        this.refreshTraceIgnore();
        this.prof.mark("input");

        if (timeScale < 1) {
            this.pm.runFrame(cmd, C.TICK_INTERVAL * timeScale);
            this.accum = 0;
        } else {
            this.accum = Math.min(this.accum + C.TICK_INTERVAL * timeScale, 0.1);
            let guard = 0;
            while (this.accum >= C.SUB_FRAMETIME && guard++ < 64) {
                this.pm.runFrame(cmd, C.SUB_FRAMETIME);
                this.accum -= C.SUB_FRAMETIME;
            }
        }
        if (timeScale < 1) {
            this.pm.liftCatchUp(C.TICK_INTERVAL * (1 - timeScale));
        }
        this.prof.mark("physics");

        if (this.pm.justJumped) {
            this.sounds.play(C.SND.playerJump, PLAYER_SRC);
            this.pm.justJumped = false;
        }
        if (this.pm.crushed) {
            this.pm.crushed = false;
            const lift = this.pm.groundEntity;
            const nm = lift && lift.IsValid() ? lift.GetEntityName() : "";
            if (nm.startsWith("lift_prox")) {
                this.prox.crushLift(nm, this.gameNow());
            } else if (nm.startsWith("lift_manual")) {
                css.ServerCommand(`ent_fire ${nm} Close`);
            }
            if (nm.startsWith("lift") && !this.dead
                && this.gameNow() >= this.crushHurtAt) {
                this.crushHurtAt = this.gameNow() + C.LIFT_CRUSH_HURT_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: C.LIFT_CRUSH_DAMAGE,
                    byPlayer: false, time: this.gameNow(), noKnockback: true,
                });
            }
        }
        if (this.pm.stuckHurt) {
            this.pm.stuckHurt = false;
            if (!this.dead && !obs && this.gameNow() >= this.crushHurtAt) {
                this.crushHurtAt = this.gameNow() + C.LIFT_CRUSH_HURT_INTERVAL;
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: C.LIFT_CRUSH_DAMAGE,
                    byPlayer: false, time: this.gameNow(), noKnockback: true,
                });
            }
        }
        if (!this.dead && !obs) this.checkTouchDeath(this.gameNow());
        if (this.pm.landSpeed > 0) {
            const hard = this.pm.landSpeed > C.LAND_HARD_SPEED;
            this.sounds.play(hard ? C.SND.playerLandHard : C.SND.playerLand, PLAYER_SRC);
            if (hard && !this.dead) {
                T_Damage(this.player, {
                    inflictorCenter: this.pm.origin, damage: C.FALL_DAMAGE,
                    byPlayer: false, time: this.gameNow(), noKnockback: true,
                });
            }
            this.pm.landSpeed = 0;
        }
        if (this.pm.swamUp) {
            this.pm.swamUp = false;
            const t = this.gameNow();
            if (t >= this.nextSwimSnd) {
                this.nextSwimSnd = t + 1;
                this.sounds.play(C.pick(C.SND.swim), PLAYER_SRC);
            }
        }
        this.prof.mark("move-post");

        const camera = pawn.GetCustomCamera();
        const now = this.gameNow();
        const bob = this.viewBob && this.viewCtl === "play" ? this.calcViewBob(now) : 0;
        const stepOfs = this.viewCtl === "play" ? this.calcStepSmooth(now) : 0;
        if (this.viewCtl === "death") {
            this.deathViewOfs += (C.DEATH_VIEW_OFS - this.deathViewOfs) * C.DEATH_VIEW_LERP;
            const p = this.pm.origin.withZ(this.pm.origin.z + this.deathViewOfs);
            body.Move({ position: p });
            camera.Move({ position: p, angles: { pitch: 0, yaw: this.deathYaw, roll: 0 } });
        } else if (this.viewCtl === "spawn") {
            const eye = this.pm.origin.withZ(this.pm.origin.z + C.VIEW_OFS_Z);
            body.Move({ position: eye });
            camera.Move({ position: eye, angles: this.spawnAngle });
            if (now >= this.spawnHoldUntil) {
                this.viewCtl = "play";
                camera.SetMode(CustomCameraMode.CONTROLLED_POSITION);
                pawn.Teleport({ angles: this.spawnAngle });
                this.injectedPitch = 0;
                this.pawnAngleForced = false;
            }
        } else {
            this.applyPlayCam(body, camera, bob + stepOfs);
            if (!this.wheelOpen) {
                const roll = (this.viewBob && C.STRAFE_ROLL_TARGET === "pawn")
                    ? this.pm.strafeRoll * C.STRAFE_ROLL_SCALE : 0;
                const kick = C.VIEWKICK_ON_PAWN ? this.weapons.viewPunchPitch : 0;
                const forced = Math.abs(roll) > 0.02 || Math.abs(kick) > 0.02;
                if (forced || this.pawnAngleForced) {
                    const pk = forced ? kick : 0;
                    pawn.Teleport({ angles: {
                        pitch: cmd.viewPitch + pk, yaw: cmd.viewYaw,
                        roll: forced ? roll : 0,
                    } });
                    this.pawnAngleForced = forced;
                    this.injectedPitch = pk;
                }
            }
        }

        if (this.touchBody) {
            if (this.dead || obs) this.touchBody.Teleport({ position: TOUCH_PARKED });
            else this.touchBody.Teleport({ position: this.touchPos(), angles: { pitch: 0, yaw: 0, roll: 0 } });
        }

        if (this.muzzLight) {
            this.muzzLight.Teleport({ position: this.pm.origin });
            const shot = this.weapons.lastShotAt;
            if (shot > this.muzzShotSeen) {
                this.muzzShotSeen = shot;
                this.muzzOffAt = shot + MUZZ_LIGHT_TIME;
                if (!this.muzzLit) {
                    css.EntFireAtTarget({ target: this.muzzLight, input: MUZZ_LIGHT_ON });
                    this.muzzLit = true;
                }
            }
            if (this.muzzLit && (this.dead || this.gameNow() >= this.muzzOffAt)) {
                css.EntFireAtTarget({ target: this.muzzLight, input: MUZZ_LIGHT_OFF });
                this.muzzLit = false;
            }
        }
        this.prof.mark("view");

        this.enemies.update(now, this.pm.origin, this.pm.velocity, this.weapons.attackedAt);
        setSolidBoxes([...this.enemies.solidBoxes(), this.playerBox(pawn)]);
        this.prof.mark("enemies");

        this.weapons.update(pawn,
            stepOfs ? this.pm.origin.withZ(this.pm.origin.z + stepOfs) : this.pm.origin,
            cmd.viewPitch, cmd.viewYaw,
            !this.dead && !wheelFrame, now, bob,
            this.viewCtl === "play" ? this.pm.velocity : undefined);
        this.prof.mark("weapons");
        this.projectiles.update(now, C.TICK_INTERVAL * timeScale);
        this.fireballs.update(now);
        this.eventLightning.update(now);
        if (this.explosionFx.length) {
            this.explosionFx = this.explosionFx.filter((fx) => {
                if (fx.prop.IsValid() && now < fx.dieAt) return true;
                safeRemove(fx.prop);
                return false;
            });
        }
        this.prof.mark("projectiles");
        this.gibs.update(now, C.TICK_INTERVAL * timeScale);
        this.particles.update(now);
        this.backpacks.update(now, C.TICK_INTERVAL * timeScale, this.pm.origin, !this.dead && !obs);
        this.items.update(this.pm.origin, !this.dead && !obs);
        this.levelExit.update(this.pm.origin, !this.dead && !obs);
        this.prof.mark("entities");
        if (!this.dead && !obs) {
            const ge = this.pm.groundEntity;
            const groundName = ge && ge.IsValid() ? ge.GetEntityName() : "";
            this.prox.update(this.pm.origin, now, groundName);
        }
        this.megaRot(now);
        this.tickPowerups(now);
        this.enemies.setPlayerInvisible(now < this.ringUntil || obs);
        this.prof.mark("prox");

        this.updateHud();
        this.hud.updateNoAmmo(now);
        this.hud.updateCenter(now);
        this.hud.updateToasts(now);
        this.pumpAchievementToasts(now);

        if (this.showPos) this.drawShowPos(pawn);
        this.prof.mark("hud");
        this.prof.done();
    }

    private drawShowPos(pawn: CSPlayerPawn): void {
        const o = this.pm.origin;
        const v = this.pm.velocity;
        const a = pawn.GetEyeAngles();
        const spd = Math.sqrt(v.x * v.x + v.y * v.y);
        const st = this.pm.noclip ? "noclip"
            : this.pm.headUnder ? "submerged"
            : this.pm.inWater ? "water"
            : this.pm.onGround ? "ground" : "air";
        const f = (n: number): string => n.toFixed(1);
        const rows = [
            `pos  ${f(o.x)}  ${f(o.y)}  ${f(o.z)}`,
            `ang  ${f(a.pitch)}  ${f(a.yaw)}`,
            `vel  ${f(spd)}   z ${f(v.z)}`,
            `spd  ${Math.round(spd)}   ${st}`,
        ];
        let y = 250;
        for (const r of rows) {
            css.DebugScreenText({ text: r, x: 40, y, duration: C.TICK_INTERVAL, color: { r: 235, g: 235, b: 235 } });
            y += 13;
        }
    }

    private updateHud(): void {
        if (this.dead) { this.hud.setVisible(false); return; }
        this.hud.updateLog(this.gameNow());
        this.hud.setMapTime(this.formatTime(this.gameNow() - this.levelStartTime));
        this.hud.setSaveTime(this.formatPlayTime(this.totalPlayTime()));
        this.hud.setStatsShown(this.settings.showStats);
        this.hud.setSpeedShown(this.settings.showSpeedometer);
        this.hud.setCheatsShown(this.settings.autoHop || this.settings.giveAll
            || this.settings.god || this.settings.infAmmo);
        const p = this.player;
        const at: 0 | 1 | 2 | 3 =
            p.armorType >= 0.75 ? 3 : p.armorType >= 0.5 ? 2 : p.armorType > 0 ? 1 : 0;
        const now = this.gameNow();
        const am = this.weapons.snapshot();
        const ak = this.weapons.activeAmmoKind;
        const ammoType: HudState["ammoType"] =
            ak === "rockets" ? "rocket" : ak === "" ? "none" : ak;
        const health = Math.ceil(p.health);
        const armor = Math.ceil(p.armorValue);
        const pain = now < this.painFlashUntil;
        const v = this.pm.velocity;
        const quad = now < this.quadUntil;
        const invuln = now < this.pentUntil;
        const invis = now < this.ringUntil;
        const face: HudState["face"] =
            invis && invuln ? "invisinvuln" : quad ? "quad" : invis ? "invis" : invuln ? "invuln" : "normal";
        const ks = this.enemies.killStats();
        this.crt.setWater(this.headUnder ? this.liquid : "none");
        this.crt.setPowerupTint(quad, now < this.radsuitUntil, invis, invuln);
        this.hud.update({
            speed: Math.sqrt(v.x * v.x + v.y * v.y),
            health, armor, armorType: at,
            ammo: this.weapons.activeAmmo,
            ammoType,
            shells: am.shells, nails: am.nails, rockets: am.rockets, cells: am.cells,
            weapons: this.weapons.ownedRow(),
            activeWeapon: this.weapons.activeIndex(),
            painFlash: pain,
            face,
            keys: [this.keys[0], this.keys[1]],
            powerups: [invis, invuln, now < this.radsuitUntil, quad],
            sigils: [this.runes[0], this.runes[1], this.runes[2], this.runes[3]],
            kills: ks.killed, killsTotal: ks.total,
            secrets: this.secretsFound.size, secretsTotal: this.secretsTotal,
            bossHp: (() => { const b = this.enemies.boss(); return b ? Math.max(0, b.health) / b.maxHealth : 0; })(),
        });

        if (C.DEBUG) {
            const wpn = this.weapons.activeWeapon;
            const ak = this.weapons.activeAmmoKind;
            css.DebugScreenText({
                text: `hp ${health}  armor ${armor}(${at})  wpn ${wpn}` +
                    `${ak ? ` ${ak} ${this.weapons.activeAmmo}` : ""}` +
                    `${pain ? "  PAIN" : ""}${this.dead ? "  DEAD" : ""}`,
                x: 40, y: 440, duration: C.TICK_INTERVAL,
                color: health <= 25 ? { r: 255, g: 90, b: 90 } : { r: 220, g: 220, b: 220 },
            });
        }
    }

    private readInput(pawn: CSPlayerPawn): UserCmd {
        const f = pawn.IsInputPressed(CSInputs.FORWARD) ? 1 : 0;
        const b = pawn.IsInputPressed(CSInputs.BACK) ? 1 : 0;
        const l = pawn.IsInputPressed(CSInputs.LEFT) ? 1 : 0;
        const r = pawn.IsInputPressed(CSInputs.RIGHT) ? 1 : 0;
        const ang = pawn.GetEyeAngles();

        if (pawn.WasInputJustPressed(CSInputs.JUMP)) this.jumpEdge = true;
        const jump = pawn.IsInputPressed(CSInputs.JUMP) || this.jumpEdge;
        this.jumpEdge = false;

        const sprint = this.settings.alwaysSprint || pawn.IsInputPressed(CSInputs.WALK);
        const fwdSpeed = sprint ? C.CL_FORWARDSPEED : C.CL_FORWARDSPEED_WALK;
        const sideSpeed = sprint ? C.CL_SIDESPEED : C.CL_SIDESPEED_WALK;

        return {
            forwardmove: (f - b) * fwdSpeed,
            sidemove: (r - l) * sideSpeed,
            jump,
            viewPitch: ang.pitch - this.injectedPitch,
            viewYaw: ang.yaw,
        };
    }
}
