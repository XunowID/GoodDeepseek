/**
 * Normalize incoming config from the content script.
 *
 * Only skills and memories are wired through to the payload mutator after the
 * scope was reduced. Other keys are accepted and ignored for backwards
 * compatibility with stored settings payloads.
 */

export function normalizeConfig(config) {
  const skills = Array.isArray(config.skills)
    ? config.skills
        .map((skill) => ({
          id: String(skill && skill.id ? skill.id : ""),
          name: String(skill && skill.name ? skill.name : "skill"),
          usage: String(skill && skill.usage ? skill.usage : ""),
          content: String(skill && skill.content ? skill.content : ""),
        }))
        .filter((skill) => skill.content.trim().length > 0)
    : [];

  const memories = Array.isArray(config.memories)
    ? config.memories
        .map((item) => ({
          key: sanitizeKey(item && item.key),
          value: String(item && item.value ? item.value : ""),
          importance: sanitizeImportance(item && item.importance),
        }))
        .filter((item) => item.key && item.value.trim().length > 0)
    : [];

  const workspace = config.workspace && Array.isArray(config.workspace.files)
    ? {
        name: String(config.workspace.name || "workspace"),
        files: config.workspace.files
          .filter((file) => file && typeof file.content === "string")
          .slice(0, 80)
          .map((file) => ({ path: String(file.path || "").slice(0, 500), content: file.content.slice(0, 20_000) })),
      }
    : null;

  return {
    skills,
    autoSkills: Boolean(config.autoSkills),
    autoInstallSkills: Boolean(config.autoInstallSkills),
    personalityName: String(config.personalityName || "").slice(0, 100),
    personalityStyle: String(config.personalityStyle || "").slice(0, 4000),
    customSystemPrompt: String(config.customSystemPrompt || "").slice(0, 12000),
    memories,
    disableMemory: Boolean(config.disableMemory),
    workspace,
  };
}

export function sanitizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export function sanitizeImportance(value) {
  return String(value || "called").toLowerCase() === "always"
    ? "always"
    : "called";
}
