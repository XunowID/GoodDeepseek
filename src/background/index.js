/**
 * Background service worker for GoodDeepseek.
 *
 * Responsibilities:
 * - Fetch remote skill URLs (GitHub READMEs, raw files, etc.)
 *   on behalf of the content script (avoids CORS restrictions).
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  // ── Fetch remote skill URL ──
  // The content script cannot fetch arbitrary URLs due to CORS.
  // The background service worker is not subject to CORS, so it
  // acts as a proxy to fetch the content and return it.
  if (message.type === "DSM_FETCH_SKILL_URL") {
    const rawUrl = String(message.url || "").trim();
    if (!rawUrl) {
      sendResponse({ success: false, error: "No URL provided." });
      return false;
    }

    const fetchUrl = normalizeSkillUrl(rawUrl);

    fetch(fetchUrl, {
      headers: { "Accept": "text/plain, text/markdown, text/html, */*" },
      redirect: "follow",
    })
      .then(async (res) => {
        if (!res.ok) {
          sendResponse({ success: false, error: `HTTP ${res.status}: ${res.statusText}` });
          return;
        }

        const contentType = res.headers.get("content-type") || "";
        let text = await res.text();

        // If HTML, try to extract main text content
        if (contentType.includes("text/html")) {
          text = extractTextFromHtml(text);
        }

        text = text.trim();
        if (!text) {
          sendResponse({ success: false, error: "Fetched content is empty." });
          return;
        }

        // Derive a name from the URL
        const name = deriveSkillName(rawUrl);

        sendResponse({ success: true, name, content: text });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err.message || err) });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === "DSM_SEARCH_AND_INSTALL_SKILL") {
    searchAndInstallSkill(String(message.query || ""))
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: String(error.message || error) }));
    return true;
  }

  return false;
});

async function searchAndInstallSkill(rawQuery) {
  const query = rawQuery.trim().slice(0, 120);
  if (query.length < 2) throw new Error("Search query is too short.");
  const searchUrl = new URL("https://api.github.com/search/repositories");
  searchUrl.searchParams.set("q", `${query} skill SKILL.md`);
  searchUrl.searchParams.set("sort", "stars");
  searchUrl.searchParams.set("order", "desc");
  searchUrl.searchParams.set("per_page", "8");
  const searchResponse = await fetch(searchUrl, { headers: githubHeaders() });
  if (searchResponse.status === 403 || searchResponse.status === 429) throw new Error("GitHub search is rate-limited. Try again later.");
  if (!searchResponse.ok) throw new Error(`GitHub search failed (HTTP ${searchResponse.status}).`);
  const search = await searchResponse.json();
  const queryTerms = new Set(query.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((term) => term.length > 1));
  const repos = (search.items || []).slice(0, 6);
  const candidates = [];

  for (const repo of repos) {
    const repoPath = repo.full_name.split("/").map(encodeURIComponent).join("/");
    const treePath = repo.default_branch.split("/").map(encodeURIComponent).join("/");
    const treeUrl = `https://api.github.com/repos/${repoPath}/git/trees/${treePath}?recursive=1`;
    const treeResponse = await fetch(treeUrl, { headers: githubHeaders() });
    if (!treeResponse.ok) continue;
    const tree = await treeResponse.json();
    const paths = (tree.tree || []).filter((item) => item.type === "blob" && /(^|\/)SKILL\.md$/i.test(item.path));
    for (const item of paths) {
      const pathTerms = new Set(item.path.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((term) => term.length > 1));
      let score = 0;
      for (const term of queryTerms) if (pathTerms.has(term)) score += 4;
      const repoText = `${repo.name} ${repo.description || ""}`.toLowerCase();
      for (const term of queryTerms) if (repoText.includes(term)) score += 1;
      candidates.push({ repo, path: item.path, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || b.repo.stargazers_count - a.repo.stargazers_count);
  const selected = candidates[0];
  if (!selected) throw new Error("No GitHub repository with a matching SKILL.md was found. Try a more specific request or add a skill URL manually.");

  const rawPath = selected.path.split("/").map(encodeURIComponent).join("/");
  const branchPath = selected.repo.default_branch.split("/").map(encodeURIComponent).join("/");
  const rawUrl = `https://raw.githubusercontent.com/${selected.repo.full_name}/${branchPath}/${rawPath}`;
  const skillResponse = await fetch(rawUrl, { headers: { Accept: "text/plain" }, redirect: "follow" });
  if (!skillResponse.ok) throw new Error(`Could not download SKILL.md (HTTP ${skillResponse.status}).`);
  const finalUrl = new URL(skillResponse.url);
  if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "raw.githubusercontent.com") throw new Error("Skill download redirected outside GitHub; blocked.");
  const content = (await skillResponse.text()).trim();
  if (!content || content.length > 60_000) throw new Error("The skill is empty or exceeds the 60 KB limit.");
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error("The file does not have Agent Skill frontmatter; it was not installed.");
  const metadata = frontmatter[1];
  const name = metadata.match(/^name:\s*["']?(.+?)["']?\s*$/mi)?.[1]?.trim() || selected.path.split("/").at(-2) || selected.repo.name;
  const description = metadata.match(/^description:\s*["']?(.+?)["']?\s*$/mi)?.[1]?.trim() || selected.repo.description || "";
  return {
    name: String(name).slice(0, 100),
    description: String(description).slice(0, 400),
    content,
    source: `https://github.com/${selected.repo.full_name}/blob/${selected.repo.default_branch}/${rawPath}`,
    stars: selected.repo.stargazers_count || 0,
  };
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// ── Open GoodDeepseek on Extension Icon Click ──
if (typeof chrome !== "undefined" && chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab && tab.id && tab.url && tab.url.includes("chat.deepseek.com")) {
      chrome.tabs.sendMessage(tab.id, { type: "DSM_OPEN_DRAWER" }).catch(() => {});
    } else {
      chrome.tabs.create({ url: "https://chat.deepseek.com" });
    }
  });
}

/**
 * Normalize skill URLs:
 * - GitHub repo page → raw README URL
 * - GitHub blob URL → raw content URL
 * - Other URLs → pass through as-is
 */
function normalizeSkillUrl(url) {
  // GitHub blob: https://github.com/user/repo/blob/branch/path → raw
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (blobMatch) {
    return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}/${blobMatch[4]}`;
  }

  // GitHub repo root: https://github.com/user/repo → raw README
  const repoMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/
  );
  if (repoMatch) {
    return `https://raw.githubusercontent.com/${repoMatch[1]}/${repoMatch[2]}/main/README.md`;
  }

  // Already raw.githubusercontent.com or any other URL — pass through
  return url;
}

/**
 * Derive a human-readable skill name from a URL.
 */
function deriveSkillName(url) {
  try {
    const parsed = new URL(url);
    // GitHub: user/repo
    const ghMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (parsed.hostname.includes("github")) {
      if (ghMatch) return `${ghMatch[1]}/${ghMatch[2]}`;
    }
    // Fallback: last path segment or hostname
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      return last.replace(/\.(md|txt|html?)$/i, "") || parsed.hostname;
    }
    return parsed.hostname;
  } catch {
    return "Remote Skill";
  }
}

/**
 * Extract readable text from HTML.
 * Strips scripts/styles, then gets textContent.
 */
function extractTextFromHtml(html) {
  try {
    // Use a simple regex-based approach since we don't have DOMParser in SW
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "");

    // Try to find the main/article content
    const mainMatch = cleaned.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
    if (mainMatch) {
      cleaned = mainMatch[1];
    }

    // Convert common elements to text
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned;
  } catch {
    return html;
  }
}
