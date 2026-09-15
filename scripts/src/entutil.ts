import { Instance as css, Entity } from "cs_script/point_script";

export function entityTags(name: string): string[] {
    const out: string[] = [];
    const re = /@([a-z]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(name)) !== null) out.push(m[1].toLowerCase());
    return out;
}
export function hasTag(name: string, tag: string): boolean {
    return entityTags(name).includes(tag);
}

export type SkillTag = "easy" | "normal" | "hard";
const SKILLS: readonly string[] = ["easy", "normal", "hard"];
export function spawnTagOf(diff: string): SkillTag {
    return diff === "easy" ? "easy" : diff === "hard" || diff === "nightmare" ? "hard" : "normal";
}
function spawnVars(name: string): string[] {
    const h = name.indexOf("#");
    return h < 0 ? [] : name.slice(h + 1).split("#");
}
export function matchesSkill(name: string, tag: SkillTag): boolean {
    const skills = spawnVars(name).filter((t) => SKILLS.indexOf(t) >= 0);
    return skills.length === 0 || skills.indexOf(tag) >= 0;
}
export function hasSpawnVar(name: string, v: string): boolean {
    return spawnVars(name).indexOf(v) >= 0;
}
export function spawnBaseMatches(name: string, base: string): boolean {
    if (!name.startsWith(base)) return false;
    let rest = name.slice(base.length);
    const um = rest.match(/^_\d+/);
    if (um) rest = rest.slice(um[0].length);
    return rest === "" || rest.startsWith("#");
}
export function findSpawnMarkers(base: string, tag: SkillTag): Entity[] {
    const out: Entity[] = [];
    for (const e of css.FindEntitiesByClass("info_target")) {
        const n = e.GetEntityName();
        if (spawnBaseMatches(n, base) && matchesSkill(n, tag)) out.push(e);
    }
    return out;
}

export function safeRemove(e: Entity | undefined): void {
    try {
        if (e && e.IsValid()) e.Remove();
    } catch {}
}
