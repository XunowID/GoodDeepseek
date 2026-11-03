const DB_NAME = "DeepSeekMemoryWorkspace";
const STORE_NAME = "handles";
const HANDLE_KEY = "active-workspace";
const MAX_FILES = 80;
const MAX_TOTAL_CHARS = 40_000;
const MAX_FILE_CHARS = 20_000;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);

let directoryHandle = null;
let files = [];

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadHandle() {
  const db = await openDb();
  const handle = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function deleteHandle() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function hasPermission(handle, request = false) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return request && (await handle.requestPermission(options)) === "granted";
}

async function collectFiles(dir, prefix, output, budget) {
  for await (const [name, entry] of dir.entries()) {
    if (output.length >= MAX_FILES || budget.remaining <= 0) break;
    const path = prefix ? `${prefix}/${name}` : name;
    if (/(^|\/)(\.env(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|credentials?(?:\.[^/]*)?|id_rsa(?:\.[^/]*)?|id_ed25519(?:\.[^/]*)?)(\/|$)/i.test(path) && !/(^|\/)\.env\.example$/i.test(path)) continue;
    if (/\.(pem|p12|pfx|key)$/i.test(name)) continue;
    if (entry.kind === "directory") {
      if (!SKIP_DIRS.has(name)) await collectFiles(entry, path, output, budget);
      continue;
    }
    if (!/\.(txt|md|markdown|json|js|mjs|cjs|ts|tsx|jsx|html|css|scss|py|go|rs|java|kt|swift|c|h|cpp|cs|rb|php|sh|yml|yaml|toml|xml|sql|svelte|vue|astro|env\.example)$/i.test(name)) continue;
    try {
      const file = await entry.getFile();
      if (file.size > MAX_FILE_CHARS * 4) continue;
      const text = (await file.text()).slice(0, Math.min(MAX_FILE_CHARS, budget.remaining));
      if (!text.trim() || text.includes("\u0000")) continue;
      output.push({ path, content: text, truncated: text.length < file.size && text.length >= MAX_FILE_CHARS });
      budget.remaining -= text.length;
    } catch { /* Ignore unreadable or changing files. */ }
  }
}

export async function connectWorkspace() {
  if (!window.showDirectoryPicker) throw new Error("unsupported");
  directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  await storeHandle(directoryHandle);
  return await refreshWorkspace();
}

export async function restoreWorkspace() {
  try {
    directoryHandle = await loadHandle();
    if (!directoryHandle || !(await hasPermission(directoryHandle))) return getWorkspaceState();
    await refreshWorkspace();
  } catch { directoryHandle = null; files = []; }
  return getWorkspaceState();
}

export async function refreshWorkspace() {
  if (!directoryHandle || !(await hasPermission(directoryHandle, true))) throw new Error("permission");
  const collected = [];
  await collectFiles(directoryHandle, "", collected, { remaining: MAX_TOTAL_CHARS });
  files = collected;
  return getWorkspaceState();
}

export function getWorkspaceState() {
  return {
    connected: Boolean(directoryHandle),
    name: directoryHandle?.name || "",
    files: files.map(({ path, content, truncated }) => ({ path, content, truncated })),
    fileCount: files.length,
  };
}

export async function disconnectWorkspace() {
  directoryHandle = null;
  files = [];
  await deleteHandle();
}

export async function readWorkspaceFile(path) {
  const entry = await getFileHandle(path);
  return await (await entry.getFile()).text();
}

export async function writeWorkspaceFile(path, content) {
  const entry = await getFileHandle(path, true);
  const writable = await entry.createWritable();
  await writable.write(content);
  await writable.close();
  await refreshWorkspace();
}

export async function removeWorkspaceFile(path) {
  const entry = await getFileHandle(path);
  const parts = String(path || "").replace(/\\/g, "/").split("/");
  let directory = directoryHandle;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  await directory.removeEntry(parts.at(-1));
  await refreshWorkspace();
}

async function getFileHandle(path, create = false) {
  if (!directoryHandle || !(await hasPermission(directoryHandle, true))) throw new Error("permission");
  const parts = String(path || "").replace(/\\/g, "/").split("/");
  if (!parts.length || parts.length > 20 || parts.some((part) => !part || part === "." || part === ".." || part.includes(":") || part.startsWith("."))) {
    throw new Error("path");
  }
  let directory = directoryHandle;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part, { create });
  return await directory.getFileHandle(parts.at(-1), { create });
}
