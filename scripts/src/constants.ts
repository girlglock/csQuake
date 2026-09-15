import { Vec3 } from "@s2ze/math";

//swapped by rollup at build time
export const DEBUG = (`__DEBUG__` as string) === "true";

export const SV_GRAVITY_DEFAULT = 800;
//gravity#<N> info_target overrides this
export let SV_GRAVITY = SV_GRAVITY_DEFAULT;
export function setGravity(v: number): void { SV_GRAVITY = v; }
export const GRAVITY_MARKER_NAME = "gravity";
export const SV_MAXVELOCITY = 2000;
export const SV_MAXSPEED = 320;
export const SV_ACCELERATE = 10;
export const SV_FRICTION = 4;
export const SV_EDGEFRICTION = 2;
export const SV_STOPSPEED = 100;
export const SV_NOSTEP = 0;

export const SV_JUMP_VELOCITY = 270;
//clamps wishspeed during air accel
export const AIR_ACCEL_CAP = 30;

export const STEPSIZE = 18;
export const STOP_EPSILON = 0.1;
export const MAX_CLIP_PLANES = 5;
export const MOVE_BUMPS = 4;
//position history for the stuck-rewind
export const STUCK_HIST_INTERVAL = 0.2;
export const STUCK_HIST_LEN = 64;
//trigger_multiple named `teleport*`: wipes the history + suspends checkStuck for this many ticks
export const STUCK_TP_GRACE_TICKS = 16;
//grace period for leaving lifts etc
export const STUCK_LIFT_GRACE_TICKS = 10;
export const MOVE_PITCH_DIVISOR = 3;

export const CL_FORWARDSPEED = 400;
export const CL_SIDESPEED = 400;
//half the above for regular walkies
export const CL_FORWARDSPEED_WALK = 200;
export const CL_SIDESPEED_WALK = 200;

//qnoclip
export const NOCLIP_SPEED = 900;

export const WATER_SINK_SPEED = 60;
export const WATER_SWIM_UP = 100;
export const SLIME_SWIM_UP = 80;
export const LAVA_SWIM_UP = 50;
export const WATER_WISHSPEED_SCALE = 0.7;
export const WATER_JUMP_UP = 225;
export const LAVA_WATER_JUMP_UP = WATER_JUMP_UP * 0.75;
export const WATER_JUMP_PUSH = 50;
export const WATER_JUMP_TIME = 2;
export const WATER_JUMP_START_UP = 8;
export const WATER_JUMP_FWD_DIST = 24;

export const WATER_TRIGGER_PREFIX = "water";
export const POISON_TRIGGER_PREFIX = "poison";
export const LAVA_TRIGGER_PREFIX = "lava";

//trigger_teleport: actually a trigger_multiple named `teleport*` parented to the dest
export const TELEPORT_TRIGGER_PREFIX = "teleport";
export const TELEPORT_EXIT_SPEED = 300;
export const TELEPORT_DEST_Z_OFS = 27;

//"needs_key_*" fires OnUser1 once the player has the key to unlock the door
export const KEY_DOOR_TRIGGER_PREFIX = "needs_key_";
//"opens_else_where*"; disable once not needed anymore
export const OPENS_ELSEWHERE_TRIGGER_PREFIX = "opens_else_where";
//"death*"
export const DEATH_TRIGGER_PREFIX = "death";
//"hurt*" / "hurt#25" etc
export const HURT_TRIGGER_PREFIX = "hurt";

export const AIR_TIME = 12;
export const DROWN_INTERVAL = 1;
export const DROWN_DMG_STEP = 2;//increase drown dmg every 2 ticks, clamp at 15
export const DROWN_DMG_MAX = 15;
export const SLIME_INTERVAL = 1;
export const SLIME_DMG_PER_LEVEL = 4;
export const LAVA_INTERVAL = 0.2;
export const LAVA_INTERVAL_SUITED = 1;
export const LAVA_DMG_PER_LEVEL = 10;

export const RADSUIT_TIME = 30;

export const QUAD_TIME = 30;
export const PENT_TIME = 30;
export const RING_TIME = 30;
export const QUAD_DAMAGE_MUL = 4;

//player bbox
export const HULL_MIN = new Vec3(-16, -16, -24);
export const HULL_MAX = new Vec3(16, 16, 32);
export const VIEW_OFS_Z = 22;

export const STEP_SMOOTH_SPEED = 150;
export const STEP_SMOOTH_MAX = 18;

export const FOV_MIN = 90;
export const FOV_MAX = 140;
export const FOV_STEP = 5;
export const FOV_DEFAULT = 90;

//parent a prop_physics bbox to the player so cs2 triggers fire
export const TOUCH_BODY_NAME = "quake_player_touch";
export const TOUCH_GROUND_LIFT = 16;   //to minimize it dragging on the ground and doing boink sound

export const PROX_RADIUS = 112;   //horizontal (crush-guard monster check)
export const PROX_Z = 128;        //vertical half-span
//"button_prox": just a plain bbox touch
export const BUTTON_PROX_RADIUS = 40;
export const BUTTON_PROX_Z = 44;
export const BUTTON_ACTIVATE_DIST = 24;
//"door_prox": proximity cylinder + eye->door trace; keep DOOR_ACTIVATE_DIST < PROX_RADIUS or the trace only gates los
export const DOOR_PROX_RADIUS = 144;
export const DOOR_PROX_Z = 128;
export const DOOR_ACTIVATE_DIST = 96;

//"lift_prox": opens while standing on it, closes LIFT_DEBOUNCE sec after getting off; a crush reverses it
export const LIFT_DEBOUNCE = 1;
export const LIFT_CRUSH_HOLD = 2.5;
export const LIFT_CRUSH_DAMAGE = 1;
export const HURT_TRIGGER_DAMAGE = LIFT_CRUSH_DAMAGE;//default for when "hurt" has no # with the dmg value
export const LIFT_CRUSH_HURT_INTERVAL = 0.1;

export const DEATH_VIEW_OFS = -8;
export const DEATH_TOSS_UP = 300;
export const DEATH_VIEW_LERP = 0.18;
export const SPAWN_VIEW_HOLD = 0.2;
export const HITMARK_DEBOUNCE = 0.05;

//delay after OnPlayerReset/OnRoundStart so the cam sticks properly
export const SPAWN_ENTER_DELAY = 0.1;

export const LEVEL_COUNT = 1;//when no loaders are present
export const SAVE_SLOTS = 3;

//these are excluded from the episode sequence
export const SECRET_LEVEL_IDS: readonly string[] = ["e1m8"];

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";
export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "nightmare"];
export const DIFFICULTY_DEFAULT: Difficulty = "normal";
export const STATS_MAX_ROWS = 12;//fixed for now, only ep1 exists
export const STATS_ROW_COLS = 26;   //"E1M1  S/6    K/23   1:22"

//achievements
export const ACH_TOAST_SLOTS = 4;
export const ACH_TOAST_HOLD = 5;
export const ACH_TOAST_EXIT = 0.8;
export const ACH_VISIBLE_ROWS = 6;

export const LEVEL_STREAM_TIMEOUT = 10;
export const LEVEL_UNLOAD_TIMEOUT = 8;
export const LEVEL_SETTLE_DELAY = 0.15;
export const LOAD_SCREEN_MIN = 3; //fake loading so the player gets to starre at controls :evil:
export const LEVEL_END_CAM = "level_end_cam"; //intermission cam info_target


export const LEVEL_END_TEMPLATE_NAME = "level_end_template";
export const LEVEL_END_SPAWN_NAME = "level_end";
export const LEVEL_END_TARGET_PREFIX = "level_end_";
export const LEVEL_END_HULL_MIN = new Vec3(-40, -40, -8);
export const LEVEL_END_HULL_MAX = new Vec3(40, 40, 88);


export const INTER_SWAY_PITCH = 0.7;
export const INTER_SWAY_YAW = 1.1;
export const INTER_SWAY_ROLL = 0.5;
export const INTER_SWAY_PITCH_CYCLE = 0.42;
export const INTER_SWAY_YAW_CYCLE = 0.27;
export const INTER_SWAY_ROLL_CYCLE = 0.19;
export const INTER_SWAY_POS = 1.5;
export const INTER_SWAY_POS_CYCLE = 0.23;

export const SV_ROLLANGLE = 2.0;
export const SV_ROLLSPEED = 200;

//bob scales with horizontal speed: forward*bob*VM_BOB_FWD + bob Z on the viewmodel
export const CL_BOB = 0.02;
export const CL_BOBCYCLE = 0.6;
export const CL_BOBUP = 0.5;
export const V_BOB_UP_MAX = 4;
export const V_BOB_DOWN_MAX = 7;
export const VM_BOB_FWD = 0.4;   //view->origin += forward*bob*0.4
export const VM_SIDE_OFFSET = 8;
//viewmodel tilts the gun, pawn tilts the cs player pawn; a hack to get custom camera roll without locking player angles while applying it
export type StrafeRollTarget = "viewmodel" | "pawn" | "off";
export const STRAFE_ROLL_TARGET: StrafeRollTarget = "pawn";
export const STRAFE_ROLL_SCALE: number = 1.0;

export const PUNCH_RETURN = 10;
export const VIEWKICK_ON_PAWN = true;
export const VIEWKICK_SCALE: number = 1.0;
export const PUNCH_PITCH: Record<string, number> = {
    shotgun: -2, ssg: -4, nailgun: -2, snailgun: -2,
    glauncher: -2, rlauncher: -2, lightning: -2,
};

export const TICK_INTERVAL = 0.015625;

//landings
export const LAND_SOFT_SPEED = 180;
export const LAND_HARD_SPEED = 650;
export const FALL_DAMAGE = 5;
export const MONSTER_IDLE_SOUND_CHANCE = 0.015;   //10hz think; kept low since idle sounds also fall off with distance

export const SND = {
    playerJump: "Quake.player_plyrjmp8",
    playerLand: "Quake.player_land",
    playerLandHard: "Quake.player_land2",
    playerPain: "Quake.player_pain",
    playerDeath: "Quake.player_death",
    axeSwing: "Quake.weapons_ax1",
    axeHitWall: "Quake.player_axhit2",
    axeHitFlesh: "Quake.player_axhit2",
    shotgun: "Quake.weapons_guncock",
    ssg: "Quake.weapons_shotgn2",
    nailgun: "Quake.weapons_rocket1i",
    snailgun: "Quake.weapons_spike2",
    grenadeFire: "Quake.weapons_grenade",
    grenadeFireEnemy: "Quake.weapons_grenade_enemy",
    rocketFire: "Quake.weapons_sgun1",
    lightningStart: "Quake.weapons_lstart",
    lightningFire: "Quake.weapons_lhit",
    explosion: "Quake.weapons_r_exp3",
    gibSplat: "Quake.gib_udeath",
    gibSplatPlayer: "Quake.player_udeath",
    gibHit: "Quake.player_gib",
    grenadeBounce: "Quake.weapons_bounce",
    spikeHitWall: ["Quake.weapons_ric1", "Quake.weapons_ric2", "Quake.weapons_ric3"],
    spikeHitWorld: "Quake.weapons_tink1",
    spikeShooterFire: "Quake.weapons_spike2",
    soldierSight: "Quake.soldier_sight1",
    soldierIdle: "Quake.soldier_idle",
    soldierFire: "Quake.soldier_sattck1",
    soldierPain: ["Quake.soldier_pain1", "Quake.soldier_pain2"],
    soldierDeath: "Quake.soldier_death1",
    dogSight: "Quake.dog_dsight",
    dogIdle: "Quake.dog_idle",
    dogAttack: "Quake.dog_dattack1",
    dogPain: "Quake.dog_dpain1",
    dogDeath: "Quake.dog_ddeath",
    ogreSight: "Quake.ogre_ogwake",
    ogreIdle: "Quake.ogre_ogidle",
    ogreSaw: "Quake.ogre_ogsawatk",
    ogrePain: ["Quake.ogre_ogpain1"],
    ogreDeath: "Quake.ogre_ogdth",
    knightSight: "Quake.knight_ksight",
    knightIdle: "Quake.knight_idle",
    knightSword: ["Quake.knight_sword1", "Quake.knight_sword2"],
    knightPain: ["Quake.knight_khurt"],
    knightDeath: "Quake.knight_kdeath",
    demonSight: "Quake.demon_sight2",
    demonIdle: "Quake.demon_idle1",
    demonJump: "Quake.demon_djump",
    demonHit: "Quake.demon_dhit2",
    demonPain: ["Quake.demon_dpain1"],
    demonDeath: "Quake.demon_ddeath",
    zombieSight: "Quake.zombie_z_idle",
    zombieIdle: "Quake.zombie_z_idle1",
    zombieShot: "Quake.zombie_z_shot1",
    zombieHit: "Quake.zombie_z_hit",
    zombieMiss: "Quake.zombie_z_miss",
    zombieFall: "Quake.zombie_z_fall",
    zombiePain: ["Quake.zombie_z_pain", "Quake.zombie_z_pain1"],
    zombieDeath: "Quake.zombie_z_gib",
    wizardSight: "Quake.wizard_wsight",
    wizardIdle: "Quake.wizard_widle1",
    wizardAttack: "Quake.wizard_wattack",
    wizardPain: ["Quake.wizard_wpain"],
    wizardDeath: "Quake.wizard_wdeath",
    shamblerSight: "Quake.shambler_ssight",
    shamblerIdle: "Quake.shambler_sidle",
    shamblerAttack: "Quake.shambler_sattck1",
    shamblerBoom: "Quake.shambler_sboom",
    shamblerMelee1: "Quake.shambler_melee1",
    shamblerMelee2: "Quake.shambler_melee2",
    shamblerSmack: "Quake.shambler_smack",
    shamblerPain: ["Quake.shambler_shurt2"],
    shamblerDeath: "Quake.shambler_sdeath",
    bossSight: "Quake.boss1_sight1",
    bossRise: "Quake.boss1_out1",
    bossThrow: "Quake.boss1_throw",
    bossPain: ["Quake.boss1_pain"],
    bossDeath: "Quake.boss1_death",
    runePickup: "Quake.misc_runekey",
    itemArmor: "Quake.items_armor1",
    itemHealthBox: "Quake.items_health1",
    itemHealthRotten: "Quake.items_r_item1",
    itemHealthMega: "Quake.items_r_item2",
    itemAmmo: "Quake.weapons_lock4",
    keyPickup: "Quake.misc_medkey",
    doorLocked: "Quake.doors_medtry",
    doorTalk: "Quake.misc_talk",
    itemSuit: "Quake.items_suit",
    itemQuad: "Quake.items_damage",
    itemPent: "Quake.items_protect",
    itemRing: "Quake.items_inv1",

    quadWarn: "Quake.items_damage2",
    quadKill: "Quake.items_damage2",
    pentTick: "Quake.items_protect3", pentWarn: "Quake.items_protect2",
    ringTick: "Quake.items_inv3", ringWarn: "Quake.items_inv2",
    secret: "Quake.misc_secret",
    hitmarker: "Quake.hitmarker",
    achievementUnlock: "Quake.achievement_unlock",
    teleport: ["Quake.misc_r_tele1", "Quake.misc_r_tele2", "Quake.misc_r_tele3",
        "Quake.misc_r_tele4", "Quake.misc_r_tele5"],
    doorMove: "Quake.doors_stndr1",
    doorStop: "Quake.doors_stndr2",
    buttonPress: "Quake.buttons_switch21",
    waterIn: "Quake.player_inh2o",
    slimeIn: "Quake.player_slimbrn2",
    lavaIn: "Quake.player_inlava",
    waterOut: "Quake.misc_outwater",
    swim: ["Quake.misc_water1", "Quake.misc_water2"],
    gaspRecover: "Quake.player_gasp1",
    gaspEmpty: "Quake.player_gasp2",
} as const;


//door_prox@tech / button_prox@med / ... no tag -> stone
export const PROX_THEME_ALIAS: Record<string, string> = {
    medieval: "med", base: "tech", hydraulic: "tech", wind: "metal",
    retractor: "train", stab: "train", spike: "train",
};
export const PROX_THEMES: Record<string, { move: string; stop: string; btn: string }> = {
    tech: { move: "Quake.doors_hydro1", stop: "Quake.doors_hydro2", btn: "Quake.buttons_switch21" },
    med: { move: "Quake.doors_doormv1", stop: "Quake.doors_drclos4", btn: "Quake.buttons_switch02" },
    stone: { move: "Quake.doors_stndr1", stop: "Quake.doors_stndr2", btn: "Quake.buttons_switch04" },
    metal: { move: "Quake.doors_ddoor1", stop: "Quake.doors_ddoor2", btn: "Quake.buttons_airbut1" },
    train: { move: "Quake.plats_train1", stop: "Quake.plats_train2", btn: "Quake.plats_train2" },
};

//@touchdeath touching it kills
export const TOUCHDEATH_TAG = "touchdeath";
export const TOUCHDEATH_MARGIN = 2;
export const TOUCHDEATH_DAMAGE = 9999;

//@nosound suppress its move/stop/press cue
export const NOSOUND_TAG = "nosound";

//level global info_target `default_sounds@<theme>` as fallback for when there is no @ tag on the doors or buttons
export const DEFAULT_SOUNDS_NAME = "default_sounds";

export function pick<T>(a: readonly T[]): T {
    return a[Math.floor(Math.random() * a.length)];
}

//music
export const MUSIC_TITLE_EVENT = "Quake.music_track1";   //title and eoe
export const MUSIC_INTER_EVENT = "Quake.music_track2";   //eol screen
export const LEVEL_MUSIC_TRACK: Record<string, number> = {
    start: 3, end: 3,
    e1m1: 5, e1m2: 7, e1m3: 8, e1m4: 4, e1m5: 10, e1m6: 3, e1m7: 6, e1m8: 9,
    e2m1: 5, e2m2: 7, e2m3: 8, e2m4: 4, e2m5: 10, e2m6: 3, e2m7: 6,
    e3m1: 5, e3m2: 7, e3m3: 8, e3m4: 7, e3m5: 10, e3m6: 3, e3m7: 4,
    e4m1: 5, e4m2: 7, e4m3: 8, e4m4: 4, e4m5: 10, e4m6: 3, e4m7: 6, e4m8: 9,
    dm1: 4, dm2: 4, dm3: 5, dm4: 1, dm5: 4, dm6: 4,
};
export function levelMusicEvent(id: string): string | undefined {
    const n = LEVEL_MUSIC_TRACK[id.toLowerCase()];
    return n ? `Quake.music_track${n}` : undefined;
}
//OnSoundFinished -> RunScriptInput Music.onFinished
export const MUSIC_FINISHED_INPUT = "music_finished";

//keep this a multiple of 64 or the tickrate feels goofy
export const EMULATED_FPS = 64;
export const SUB_FRAMETIME = 1 / EMULATED_FPS;

export const WHEEL_ORDER = [
    "axe", "shotgun", "ssg", "nailgun", "snailgun", "glauncher", "rlauncher", "lightning",
] as const;
export const WHEEL_TIME_SCALE = 0.10; //quake timescale in weap wheel

export const AXE_RANGE = 64;
export const AXE_DAMAGE = 20;
export const AXE_REFIRE = 0.5;
//longest fire anim possible
export const VM_FIRE_ANIM_TIME = 0.7;

export const SHOTGUN_PELLETS = 6;
export const SHOTGUN_PELLET_DAMAGE = 4;
export const SHOTGUN_SPREAD = 0.04;
export const SHOTGUN_RANGE = 2048;
export const SHOTGUN_REFIRE = 0.5;
export const WEAPON_START_SHELLS = 25;
export const WEAPON_MAX_SHELLS = 100;

export const AMMO_MAX = { shells: 100, nails: 200, rockets: 100, cells: 100 } as const;
export const AMMO_NAILS_SMALL = 25;
export const AMMO_NAILS_BIG = 50;
export const AMMO_ROCKETS_SMALL = 5;
export const AMMO_ROCKETS_BIG = 10;
export const AMMO_CELLS_SMALL = 6;
export const AMMO_CELLS_BIG = 12;

export const SSG_PELLETS = 14;
export const SSG_PELLET_DAMAGE = 4;
export const SSG_SPREAD_X = 0.14;
export const SSG_SPREAD_Y = 0.08;
export const SSG_SHELLS = 2;
export const SSG_REFIRE = 0.7;

export const NAIL_SPEED = 1000;
export const NAIL_DAMAGE = 9;
export const SNAIL_DAMAGE = 18;
export const NAIL_REFIRE = 0.1;

export const SPIKESHOOTER_SPEED = 500;
export const SPIKESHOOTER_FUSE = 6;
///superspike flag is baked into the name like "trap_spikeshooter_s*"
export const SPIKESHOOTER_SUPER_PREFIX = "trap_spikeshooter_s";
export const SPIKESHOOTER_INPUT = "spikeshooter_fire";

export const GRENADE_SPEED = 600;
export const GRENADE_UP = 200;
export const GRENADE_FUSE = 2.5;
export const GRENADE_REFIRE = 0.6;
export const GRENADE_AVELOCITY = 300;

export const ROCKET_SPEED = 1000;
export const ROCKET_DIRECT_MIN = 100;
export const ROCKET_DIRECT_RND = 20;
export const ROCKET_REFIRE = 0.8;

//damage - 0.5*dist
export const EXPLOSION_DAMAGE = 120;
export const EXPLOSION_RADIUS_PAD = 40;

//one q_fx_* point_template per effecr
export const PARTICLE_BURST_TTL_DEFAULT = 2;
export const PARTICLE_BLOOD_TTL = 1.2;
export const PARTICLE_WALL_TTL = 1.2;
export const PARTICLE_EXPLOSION_TTL = 3;
export const PARTICLE_ZAP_TTL = 0.16;
export const PARTICLE_TRAIL_LINGER = 2.5;
export const AIR_BUBBLES_BASE = "air_bubbles";

export const LG_RANGE = 600;
export const LG_DAMAGE = 30;
export const LG_REFIRE = 0.1;
export const LG_CELLS_PER_SHOT = 1;
export const LG_BEAM_REFRESH = 0.05;
export const LG_BEAM_TTL = 0.16;

export const PROJ_LIFETIME = 5;
export const PROJ_SUBSTEPS = 4;
export const SPIKE_FX_TTL = 0.6;
export const PROJ_HULL = new Vec3(0, 0, 0);

//misc_fireball
export const FIREBALL_SPAWN_BASE = "fireball_spawn"; //"fireball_spawn_<N>#s<speed>"
export const FIREBALL_SPEED_DEFAULT = 1000;
export const FIREBALL_DAMAGE = 20;
export const FIREBALL_LIFETIME = 5;
export const FIREBALL_DELAY_MIN = 3;
export const FIREBALL_DELAY_RAND = 5;
export const GRENADE_HULL_MIN = new Vec3(-2, -2, -2);
export const GRENADE_HULL_MAX = new Vec3(2, 2, 2);
export const NAIL_TEMPLATE = "nail_template";
export const SNAIL_TEMPLATE = "snail_template";
export const ROCKET_TEMPLATE = "rocket_template";
export const GRENADE_TEMPLATE = "grenade_template";
export const ZOMGIB_TEMPLATE = "zom_gib_template";     //falls back to grenade if missing
export const LAVABALL_TEMPLATE = "lavaball_template";  //falls back to rocket if missing

//the arc that kills Chthon |||| "event_lightning_<N>" parented to "_<N>_end"
export const EVENT_LIGHTNING_BASE = "event_lightning";
export const EVENT_LIGHTNING_TICKS = 5;
export const EVENT_LIGHTNING_TICK = 0.1;
export const EVENT_LIGHTNING_DAMAGE = 30;
export const EVENT_LIGHTNING_BOSS_DAMAGE = 250;
export const EVENT_LIGHTNING_PERP = 16;
export const EVENT_LIGHTNING_START_UP = 16;

//item_sigil
export const SIGIL_TEMPLATE = "sigil_template";
export const SIGIL_SPAWN_NAME = "sigil_spawn";

//explosive barrels
export const EXPLOBOX_TEMPLATE = "explobox_template";
export const EXPLOBOX_SPAWN = "explobox_spawn";
export const EXPLOBOX_BIG_TEMPLATE = "explobox_big_template";
export const EXPLOBOX_BIG_SPAWN = "explobox_big_spawn";
export const EXPLOBOX_HEALTH = 20;
export const EXPLOBOX_DAMAGE = 160;
export const BOX_SPAWN_OFS = new Vec3(-16, -16, 0);

export const GIB_HEALTH = -40;
export const GIB_LIFETIME = 10;
export const GIB_SPREAD = 200;
export const GIB_UP_MIN = 200;
export const GIB_UP_RND = 300;

export const WEP_CS: Record<string, string> = {
    weapon_ak47: "shotgun",
    weapon_glock: "ssg",
    weapon_knife: "nailgun",
    weapon_smokegrenade: "snailgun",
    weapon_molotov: "glauncher",
    weapon_hegrenade: "rlauncher",
    weapon_flashbang: "lightning",
    weapon_decoy: "axe",
};

export const WEP_CS_GRENADE = new Set([
    "weapon_decoy", "weapon_molotov", "weapon_hegrenade", "weapon_flashbang", "weapon_smokegrenade"
]);

export const WEP_PICKUP: Record<string, { give: string; ammo: string; n: number }> = {
    weapon_ssg_spawn: { give: "weapon_glock", ammo: "shells", n: 5 },
    weapon_ng_spawn: { give: "weapon_knife", ammo: "nails", n: 30 },
    weapon_sng_spawn: { give: "weapon_smokegrenade", ammo: "nails", n: 30 },
    weapon_gl_spawn: { give: "weapon_molotov", ammo: "rockets", n: 5 },
    weapon_rl_spawn: { give: "weapon_hegrenade", ammo: "rockets", n: 5 },
    weapon_lg_spawn: { give: "weapon_flashbang", ammo: "cells", n: 15 },
    weapon_axe_spawn: { give: "weapon_decoy", ammo: "", n: 0 }
};

//TODO
export const ITEM_TOUCH_TEMPLATE = "item_touch_template";
export const BACKPACK_TOUCH_TEMPLATE = "backpack_touch_template";

export const BACKPACK_TEMPLATE_NAME = "backpack_template";
export const BACKPACK_HULL_MIN = new Vec3(-16, -16, 0);
export const BACKPACK_HULL_MAX = new Vec3(16, 16, 56);
export const BACKPACK_MODEL_Z_OFS = 0;
export const BACKPACK_DROP_Z = 24;
export const BACKPACK_TOSS_UP = 300;
export const BACKPACK_TOSS_SPREAD = 100;
export const BACKPACK_LIFETIME = 120;

export const SOLDIER_DROP_SHELLS = 5;
export const DOG_DROP_SHELLS = 0;

export const ITEM_HULL_MIN = new Vec3(-16, -16, 0);
export const ITEM_HULL_MAX = new Vec3(16, 16, 56);
export const ITEM_MODEL_Z_OFS = 0;
export const ITEM_PLACE_RAISE = 6;
export const ITEM_DROP_DIST = 256;

//armors
export const ARMOR1_TYPE = 0.3; export const ARMOR1_VALUE = 100;
export const ARMOR2_TYPE = 0.6; export const ARMOR2_VALUE = 150;
export const ARMOR3_TYPE = 0.8; export const ARMOR3_VALUE = 200;

export const HEALTH_ROTTEN = 15;
export const HEALTH_BOX = 25;
export const HEALTH_MEGA = 100;
export const HEALTH_MEGA_MAX = 250;
export const MEGA_ROT_DELAY = 5;//overheal bleed

export const SHELLS_SMALL = 20;
export const SHELLS_BIG = 40;

export const PLAYER_START_HEALTH = 100;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_START_ARMOR = 0;
export const KNOCKBACK_SCALE = 8;

export const KNOCKBACK_LAUNCH_MIN = 150;

//monster_army
export const SOLDIER_TEMPLATE_NAME = "soldier_template";
export const SOLDIER_SPAWN_NAME = "soldier_spawn";
export const SOLDIER_HULL_MIN = new Vec3(-16, -16, -24);
export const SOLDIER_HULL_MAX = new Vec3(16, 16, 40);
export const SOLDIER_VIEW_OFS_Z = 25;
export const SOLDIER_YAW_SPEED = 20;
export const SOLDIER_MODEL_Z_OFS = 0;
export const SOLDIER_MODEL_YAW_OFS = -90;

export const AI_THINK_INTERVAL = 0.1;
//think rate falls off with distance
export const AI_THINK_FULL_DIST = 750;
export const AI_THINK_FAR_DIST = 1500;
export const AI_THINK_MAX_INTERVAL = 0.5;
export const AI_THINK_STAGGER = 8;
export const AI_INTERP_INTERVAL = 1 / 32;
export const AI_VIS_TTL = 0.15;
export const MONSTER_STEPSIZE = 18;

export const MONSTER_SPAWN_DROP = 256;
export const MONSTER_UNSUPPORTED_DROP = 4096;
export const MONSTER_EDGE_MARGIN = 20;
export const MONSTER_LEDGE_DROP = 48;
export const MONSTER_WALL_MARGIN = 6;
export const CORPSE_SETTLE_TIMEOUT = 3;

//roaming enemies spawns at "<species>_spawn_roam_*", patrol nodes are "path_node_*" parented to then
export const SOLDIER_SPAWN_ROAM_NAME = "soldier_spawn_roam";
export const DOG_SPAWN_ROAM_NAME = "dog_spawn_roam";
export const PATH_NODE_PREFIX = "path_node";
export const PATH_REACH_DIST = 24;

export const RANGE_MELEE = 120;
export const RANGE_NEAR = 500;
export const RANGE_MID = 1000;

//aggro redstone relay of monters
export const SIGHT_RELAY_WINDOW = 0.1;
export const SHOW_HOSTILE_TIME = 1;

export const SOLDIER_RUN_SPEED = 120;
export const SOLDIER_WALK_SPEED = 30;
export const SOLDIER_INFRONT_DOT = 0.3;
export const SOLDIER_GIVEUP = 5;
export const SOLDIER_FIRST_ATTACK_DELAY = 1;

export const SOLDIER_ATK_CHANCE_NEAR = 0.4;
export const SOLDIER_ATK_CHANCE_MID = 0.1;
export const SOLDIER_FIRE_AT = 0.35;
export const SOLDIER_ATK_LEN = 0.9;
export const SOLDIER_REFIRE_CHANCE = 0.4;
export const SOLDIER_SHOTS = 4;
export const SOLDIER_SPREAD = 0.1;
export const SOLDIER_FIRE_DAMAGE = 4;
export const SOLDIER_LEAD_TIME = 0.2;

export const SOLDIER_HEALTH = 30;
export const SOLDIER_GIB_HEALTH = -35;   //no gib models for the soldier though
export const SOLDIER_PAIN1_TIME = 0.6;
export const SOLDIER_PAIN1_LEN = 0.6;
export const SOLDIER_PAINB_TIME = 1.1;
export const SOLDIER_PAINB_LEN = 1.4;
export const SOLDIER_PAINC_LEN = 1.3;

export const SOLDIER_ANIM_PREFIX = "soldier_";
export const SOLDIER_ANIM_STAND = "stand";
export const SOLDIER_ANIM_WALK = "prowl";
export const SOLDIER_ANIM_RUN = "run";
export const SOLDIER_ANIM_SHOOT = "shoot";
export const SOLDIER_ANIM_PAIN = "pain";
export const SOLDIER_ANIM_PAINB = "painb";
export const SOLDIER_ANIM_PAINC = "painc";
export const SOLDIER_ANIM_DEATH = "death";
export const SOLDIER_ANIM_DEATHC = "deathc";

//monster_dog
export const DOG_TEMPLATE_NAME = "dog_template";
export const DOG_SPAWN_NAME = "dog_spawn";
export const DOG_HULL_MIN = new Vec3(-32, -32, -24);
export const DOG_HULL_MAX = new Vec3(32, 32, 40);
export const DOG_VIEW_OFS_Z = 25;
export const DOG_YAW_SPEED = 20;
export const DOG_MODEL_Z_OFS = 0;
export const DOG_MODEL_YAW_OFS = -90;

export const DOG_HEALTH = 25;
export const DOG_GIB_HEALTH = -35;
export const DOG_RUN_SPEED = 327;
export const DOG_WALK_SPEED = 80;
export const DOG_CHARGE_SPEED = 100;
export const DOG_GIVEUP = 5;
export const DOG_FIRST_ATTACK_DELAY = 1;
export const DOG_PAIN_LEN = 0.6;   //no debounce

export const DOG_BITE_RANGE = 100;
export const DOG_BITE_AT = 0.35;
export const DOG_BITE_LEN = 0.8;
export const DOG_ATK_CHANCE_NEAR = 0.2;
export const DOG_ATK_CHANCE_MID = 0.05;

export const DOG_LEAP_FWD = 300;
export const DOG_LEAP_UP = 200;
export const DOG_LEAP_DMG_MIN = 10;
export const DOG_LEAP_DMG_RND = 10;
export const DOG_LEAP_MIN_SPEED = 300;
export const DOG_LEAP_MAX_TIME = 1.2;
//precalc this otherwise dumbass will yump off bridges
export const DOG_LEAP_SIM_STEPS = 18;
export const DOG_LEAP_PROBE_DOWN = 220;

export const DOG_ANIM_PREFIX = "dog_";
export const DOG_ANIM_STAND = "stand";
export const DOG_ANIM_WALK = "walk";
export const DOG_ANIM_RUN = "run";
export const DOG_ANIM_ATTACK = "attack";
export const DOG_ANIM_LEAP = "leap";
export const DOG_ANIM_PAIN = "pain";
export const DOG_ANIM_DEATH = "death";
export const DOG_ANIM_DEATHB = "deathb";

//monster_ogre
export const OGRE_TEMPLATE_NAME = "ogre_template";
export const OGRE_SPAWN_NAME = "ogre_spawn";
export const OGRE_SPAWN_ROAM_NAME = "ogre_spawn_roam";
export const OGRE_HULL_MIN = new Vec3(-32, -32, -24);
export const OGRE_HULL_MAX = new Vec3(32, 32, 64);
export const OGRE_VIEW_OFS_Z = 25;
export const OGRE_YAW_SPEED = 20;
export const OGRE_MODEL_Z_OFS = 0;
export const OGRE_MODEL_YAW_OFS = -90;
export const OGRE_HEALTH = 200;
export const OGRE_RUN_SPEED = 135;
export const OGRE_WALK_SPEED = 27;
export const OGRE_CHARGE_SPEED = 100;
export const OGRE_GIVEUP = 5;
export const OGRE_FIRST_ATTACK_DELAY = 1;
export const OGRE_GIB_HEALTH = -80;
export const OGRE_DROP_SHELLS = 0;   //TODO
export const OGRE_GRENADE_SPEED = 600;
export const OGRE_GRENADE_UP = 200;
export const OGRE_GRENADE_FUSE = 2.5;
export const OGRE_GRENADE_DAMAGE = 40;
export const OGRE_SHOOT_AT = 0.35;
export const OGRE_SHOOT_LEN = 0.7;
export const OGRE_MELEE_RANGE = 100;
export const OGRE_MELEE_DMG = 4;
export const OGRE_SMASH_LEN = 1.4;
export const OGRE_SMASH_HIT_FROM = 0.5;
export const OGRE_SMASH_HIT_TO = 1.1;
export const OGRE_SWING_LEN = 1.4;
export const OGRE_SWING_HIT_FROM = 0.4;
export const OGRE_SWING_HIT_TO = 1.1;
export const OGRE_PAIN_DEBOUNCE_SHORT = 1;
export const OGRE_PAIN_DEBOUNCE_LONG = 2;
export const OGRE_PAIN_A_LEN = 0.5;
export const OGRE_PAIN_B_LEN = 0.3;
export const OGRE_PAIN_C_LEN = 0.6;
export const OGRE_PAIN_D_LEN = 1.6;
export const OGRE_PAIN_E_LEN = 1.5;
export const OGRE_ANIM_PREFIX = "ogre_";
export const OGRE_ANIM_STAND = "stand";
export const OGRE_ANIM_WALK = "walk";
export const OGRE_ANIM_RUN = "run";
export const OGRE_ANIM_SWING = "swing";
export const OGRE_ANIM_SMASH = "smash";
export const OGRE_ANIM_SHOOT = "shoot";
export const OGRE_ANIM_PAIN = "pain";
export const OGRE_ANIM_PAINB = "painb";
export const OGRE_ANIM_PAINC = "painc";
export const OGRE_ANIM_PAIND = "paind";
export const OGRE_ANIM_PAINE = "paine";
export const OGRE_ANIM_DEATH = "death";
export const OGRE_ANIM_BDEATH = "bdeath";

//monster_shambler
export const SHAMBLER_TEMPLATE_NAME = "shambler_template";
export const SHAMBLER_SPAWN_NAME = "shambler_spawn";
export const SHAMBLER_SPAWN_ROAM_NAME = "shambler_spawn_roam";
export const SHAMBLER_HULL_MIN = new Vec3(-32, -32, -24);
export const SHAMBLER_HULL_MAX = new Vec3(32, 32, 64);
export const SHAMBLER_VIEW_OFS_Z = 40;
export const SHAMBLER_YAW_SPEED = 20;
export const SHAMBLER_MODEL_Z_OFS = 0;
export const SHAMBLER_MODEL_YAW_OFS = -90;
export const SHAMBLER_HEALTH = 600;
export const SHAMBLER_GIB_HEALTH = -60;
export const SHAMBLER_RUN_SPEED = 213;
export const SHAMBLER_WALK_SPEED = 82;
export const SHAMBLER_CHARGE_SPEED = 100;
export const SHAMBLER_GIVEUP = 5;
export const SHAMBLER_FIRST_ATTACK_DELAY = 1;
export const SHAMBLER_MELEE_RANGE = 100;
export const SHAMBLER_SMASH_DMG = 40;
export const SHAMBLER_CLAW_DMG = 20;
export const SHAMBLER_SMASH_LEN = 1.2;
export const SHAMBLER_SMASH_HIT_AT = 0.95;
export const SHAMBLER_SWING_LEN = 0.9;
export const SHAMBLER_SWING_HIT_AT = 0.65;
export const SHAMBLER_MAGIC_LEN = 1.4;
export const SHAMBLER_MAGIC_BOLT_AT: readonly number[] = [0.7, 1.0, 1.1];
export const SHAMBLER_LIGHTNING_DMG = 10;
export const SHAMBLER_LIGHTNING_RANGE = 600;
export const SHAMBLER_CHANCE_NEAR = 0.2;
export const SHAMBLER_CHANCE_MID = 0.05;
export const SHAMBLER_PAIN_LEN = 0.6;
export const SHAMBLER_PAIN_DEBOUNCE = 2;
export const SHAMBLER_PAIN_FLINCH_DIV = 400;
export const SHAMBLER_ANIM_PREFIX = "shambler_";
export const SHAMBLER_ANIM_STAND = "stand";
export const SHAMBLER_ANIM_WALK = "walk";
export const SHAMBLER_ANIM_RUN = "run";
export const SHAMBLER_ANIM_SMASH = "smash";
export const SHAMBLER_ANIM_SWINGR = "swingr";
export const SHAMBLER_ANIM_SWINGL = "swingl";
export const SHAMBLER_ANIM_MAGIC = "magic";
export const SHAMBLER_ANIM_PAIN = "pain";
export const SHAMBLER_ANIM_DEATH = "death";

//monster_boss |||| activates on OnUser1, takes dmg from event_lightning crosspath
export const BOSS_TEMPLATE_NAME = "boss_template";
export const BOSS_SPAWN_NAME = "boss_spawn";
export const BOSS_HULL_MIN = new Vec3(-128, -128, -24);
export const BOSS_HULL_MAX = new Vec3(128, 128, 224);
export const BOSS_VIEW_OFS_Z = 150;
export const BOSS_YAW_SPEED = 20;
export const BOSS_MODEL_Z_OFS = 0;
export const BOSS_MODEL_YAW_OFS = -90;
//base normal, scales per difficulty too
export const BOSS_HEALTH = 2500;
export const BOSS_HEALTH_SCALE: Record<string, number> = {
    easy: 0.5, normal: 1, hard: 1.6, nightmare: 2.2,
};
export const BOSS_WEAPON_DAMAGE_SCALE = 0.25;//idk if this is alsprite value wise but i think letting the player do dmg via weapons is more interactive
export const BOSS_GIB_HEALTH = -9999;   //never gibs
export const BOSS_GIVEUP = 9999;        //never loses interest
export const BOSS_FIRST_ATTACK_DELAY = 1;
export const BOSS_RISE_LEN = 2.0;
export const BOSS_DEATH_LEN = 1.8;
export const BOSS_ATTACK_LEN = 1.2;
export const BOSS_ATTACK_HIT_AT = 0.6;
export const BOSS_ATTACK_CD = 2.5;
export const BOSS_MISSILE_SPEED = 300;
export const BOSS_MISSILE_DAMAGE = 110;
export const BOSS_MISSILE_FUSE = 5;
export const BOSS_MUZZLE_FWD = 100;
export const BOSS_MUZZLE_UP = 200;
export const BOSS_SHOCK_LEN = 0.6;
export const BOSS_PAIN_MIN_DAMAGE = 80;   //prevents flinch below this
export const BOSS_ANIM_PREFIX = "boss_";
export const BOSS_ANIM_IDLE = "walk";
export const BOSS_ANIM_RISE = "rise";
export const BOSS_ANIM_ATTACK = "attack";
export const BOSS_ANIM_DEATH = "death";
export const BOSS_ANIM_SHOCK: readonly string[] = ["shocka", "shockb", "shockc"];

//monster_knight
export const KNIGHT_TEMPLATE_NAME = "knight_template";
export const KNIGHT_SPAWN_NAME = "knight_spawn";
export const KNIGHT_SPAWN_ROAM_NAME = "knight_spawn_roam";
export const KNIGHT_HULL_MIN = new Vec3(-16, -16, -24);
export const KNIGHT_HULL_MAX = new Vec3(16, 16, 40);
export const KNIGHT_VIEW_OFS_Z = 25;
export const KNIGHT_YAW_SPEED = 20;
export const KNIGHT_MODEL_Z_OFS = 0;
export const KNIGHT_MODEL_YAW_OFS = -180;
export const KNIGHT_HEALTH = 75;
export const KNIGHT_RUN_SPEED = 140;
export const KNIGHT_WALK_SPEED = 33;
export const KNIGHT_CHARGE_SPEED = 40;
export const KNIGHT_LUNGE_SPEED = 200;
export const KNIGHT_GIVEUP = 5;
export const KNIGHT_FIRST_ATTACK_DELAY = 1;
export const KNIGHT_GIB_HEALTH = -40;
export const KNIGHT_MELEE_RANGE = 60;
export const KNIGHT_MELEE_DMG = 3;
export const KNIGHT_STANDATK_DIST = 80;
export const KNIGHT_ATK_LEN = 1.0;
export const KNIGHT_ATK_HIT_FROM = 0.5;
export const KNIGHT_ATK_HIT_TO = 0.8;
export const KNIGHT_RUNATK_LEN = 1.1;
export const KNIGHT_RUNATK_HIT_FROM = 0.4;
export const KNIGHT_RUNATK_HIT_TO = 0.9;
export const KNIGHT_PAIN_DEBOUNCE = 1;
export const KNIGHT_PAIN_A_LEN = 0.3;
export const KNIGHT_PAIN_B_LEN = 1.1;
export const KNIGHT_ANIM_PREFIX = "knight_";
export const KNIGHT_ANIM_STAND = "stand";
export const KNIGHT_ANIM_WALK = "walk";
export const KNIGHT_ANIM_RUN = "runb";
export const KNIGHT_ANIM_ATK = "attackb";
export const KNIGHT_ANIM_RUNATK = "runattack";
export const KNIGHT_ANIM_PAIN = "pain";
export const KNIGHT_ANIM_PAINB = "painb";
export const KNIGHT_ANIM_DEATH = "death";
export const KNIGHT_ANIM_DEATHB = "deathb";

//monster_demon1
export const DEMON_TEMPLATE_NAME = "demon_template";
export const DEMON_SPAWN_NAME = "demon_spawn";
export const DEMON_SPAWN_ROAM_NAME = "demon_spawn_roam";
export const DEMON_HULL_MIN = new Vec3(-32, -32, -24);
export const DEMON_HULL_MAX = new Vec3(32, 32, 64);
export const DEMON_VIEW_OFS_Z = 25;
export const DEMON_YAW_SPEED = 20;
export const DEMON_MODEL_Z_OFS = 0;
export const DEMON_MODEL_YAW_OFS = -90;
export const DEMON_HEALTH = 300;
export const DEMON_RUN_SPEED = 237;
export const DEMON_WALK_SPEED = 71;
export const DEMON_CHARGE_SPEED = 40;
export const DEMON_MELEE_CLOSE = 12;
export const DEMON_GIVEUP = 5;
export const DEMON_FIRST_ATTACK_DELAY = 1;
export const DEMON_GIB_HEALTH = -80;
export const DEMON_MELEE_RANGE = 100;
export const DEMON_MELEE_DMG_MIN = 10;
export const DEMON_MELEE_DMG_RND = 5;
export const DEMON_ATTACK_LEN = 1.5;
export const DEMON_MELEE_HIT_1 = 0.4;
export const DEMON_MELEE_HIT_2 = 1.0;
export const DEMON_LEAP_FWD = 600;
export const DEMON_LEAP_UP = 250;
export const DEMON_LEAP_DMG_MIN = 40;
export const DEMON_LEAP_DMG_RND = 10;
export const DEMON_LEAP_MIN_SPEED = 400;
export const DEMON_LEAP_MIN_DIST = 100;
export const DEMON_LEAP_FAR_DIST = 200;
export const DEMON_LEAP_FAR_SKIP = 0.9;
export const DEMON_LEAP_MAX_TIME = 1.5;
export const DEMON_LEAP_SIM_STEPS = 15;
export const DEMON_LEAP_PROBE_DOWN = 260;
export const DEMON_PAIN_DEBOUNCE = 1;
export const DEMON_PAIN_LEN = 0.6;
export const DEMON_PAIN_FLINCH_DIV = 200;
export const DEMON_ANIM_PREFIX = "demon_";
export const DEMON_ANIM_STAND = "stand";
export const DEMON_ANIM_WALK = "walk";
export const DEMON_ANIM_RUN = "run";
export const DEMON_ANIM_ATTACK = "attacka";
export const DEMON_ANIM_LEAP = "leap";
export const DEMON_ANIM_PAIN = "pain";
export const DEMON_ANIM_DEATH = "death";

//monster_zombie ||| only dies by gibbing
export const ZOMBIE_TEMPLATE_NAME = "zombie_template";
export const ZOMBIE_SPAWN_NAME = "zombie_spawn";
export const ZOMBIE_SPAWN_ROAM_NAME = "zombie_spawn_roam";
export const ZOMBIE_HULL_MIN = new Vec3(-16, -16, -24);
export const ZOMBIE_HULL_MAX = new Vec3(16, 16, 40);
export const ZOMBIE_DOWN_HULL_MAX = new Vec3(1, 1, 1);   //when fake ded
export const ZOMBIE_WAKE_PUSH_MARGIN = 8;
export const ZOMBIE_VIEW_OFS_Z = 25;
export const ZOMBIE_YAW_SPEED = 20;
export const ZOMBIE_MODEL_Z_OFS = 0;
export const ZOMBIE_MODEL_YAW_OFS = 90;
export const ZOMBIE_HEALTH = 60;          //reset to 60 every pain
export const ZOMBIE_GIB_HEALTH = 99999;   //zombie_die is an unconditional gib
export const ZOMBIE_RUN_SPEED = 55;       //2x
export const ZOMBIE_WALK_SPEED = 12;
export const ZOMBIE_GIVEUP = 5;
export const ZOMBIE_FIRST_ATTACK_DELAY = 1;
export const ZOMBIE_ATK_LEN = 1.3;
export const ZOMBIE_ATK_RELEASE = 1.2;
export const ZOMBIE_ATK_CHANCE_NEAR = 0.4;
export const ZOMBIE_ATK_CHANCE_MID = 0.1;
export const ZOMBIE_GIB_SPEED = 600;
export const ZOMBIE_GIB_UP = 200;
export const ZOMBIE_GIB_DAMAGE = 10;
export const ZOMBIE_GIB_FUSE = 2.5;
export const ZOMBIE_PAIN_IGNORE = 9;
export const ZOMBIE_PAIN_KNOCKDOWN = 25;   //fake ded over this
export const ZOMBIE_PAIN_COMBO_WINDOW = 3; //hit twice within this s -> fake ded
export const ZOMBIE_PAIN_A_LEN = 1.2;
export const ZOMBIE_PAIN_B_LEN = 2.8;
export const ZOMBIE_PAIN_C_LEN = 1.8;
export const ZOMBIE_PAIN_D_LEN = 1.3;
export const ZOMBIE_PAIN_DOWN_HOLD = 6.1;
export const ZOMBIE_PAIN_UP_LEN = 1.9;
export const ZOMBIE_ANIM_PREFIX = "zombie_";
export const ZOMBIE_ANIM_STAND = "stand";
export const ZOMBIE_ANIM_WALK = "walk";
export const ZOMBIE_ANIM_RUN = "run";
export const ZOMBIE_ANIM_ATTA = "atta";
export const ZOMBIE_ANIM_ATTB = "attb";
export const ZOMBIE_ANIM_ATTC = "attc";
export const ZOMBIE_ANIM_PAINA = "paina";
export const ZOMBIE_ANIM_PAINB = "painb";
export const ZOMBIE_ANIM_PAINC = "painc";
export const ZOMBIE_ANIM_PAIND = "paind";
export const ZOMBIE_ANIM_PAINEDOWN = "painedown";
export const ZOMBIE_ANIM_PAINEUP = "paineup";

//monster_wizard
export const WIZARD_TEMPLATE_NAME = "wizard_template";
export const WIZARD_SPAWN_NAME = "wizard_spawn";
export const WIZARD_SPAWN_ROAM_NAME = "wizard_spawn_roam";
export const WIZARD_HULL_MIN = new Vec3(-16, -16, -24);
export const WIZARD_HULL_MAX = new Vec3(16, 16, 40);
export const WIZARD_VIEW_OFS_Z = 25;
export const WIZARD_YAW_SPEED = 20;
export const WIZARD_MODEL_Z_OFS = 0;
export const WIZARD_MODEL_YAW_OFS = 180;
export const WIZARD_HEALTH = 80;
export const WIZARD_GIB_HEALTH = -40;
export const WIZARD_RUN_SPEED = 160;
export const WIZARD_WALK_SPEED = 80;
export const WIZARD_GIVEUP = 5;
export const WIZARD_FIRST_ATTACK_DELAY = 1;
export const WIZARD_ATK_LEN = 1.0;
export const WIZARD_ATK_FINISH = 2.0;
export const WIZARD_SHOT_A = 0.3;
export const WIZARD_SHOT_B = 0.8;
export const WIZARD_SHOT_SIDE = 14;
export const WIZARD_SHOT_LEAD = 13;
export const WIZARD_SPIKE_SPEED = 600;
export const WIZARD_SPIKE_DAMAGE = 9;
export const WIZARD_CHANCE_MELEE = 0.9;
export const WIZARD_CHANCE_NEAR = 0.6;
export const WIZARD_CHANCE_MID = 0.2;
export const WIZARD_PAIN_LEN = 0.4;
export const WIZARD_PAIN_FLINCH_DIV = 70;
export const WIZARD_DEATH_TUMBLE_XY = 200;
export const WIZARD_DEATH_TUMBLE_UP = 100;
export const WIZARD_ANIM_PREFIX = "wizard_";
export const WIZARD_ANIM_STAND = "hover";
export const WIZARD_ANIM_WALK = "hover";
export const WIZARD_ANIM_RUN = "fly";
export const WIZARD_ANIM_ATTACK = "magatt";
export const WIZARD_ANIM_PAIN = "pain";
export const WIZARD_ANIM_DEATH = "death";


export const SOLDIER_DEBUG = DEBUG; //TODO change to MONSTER_DEBUG