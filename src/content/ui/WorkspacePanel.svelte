<script>
  import { onMount } from "svelte";
  import appState from "../state.js";
  import { connectWorkspace, disconnectWorkspace, refreshWorkspace, writeWorkspaceFile } from "../workspace.js";
  import { pushConfigToPage } from "../bridge.js";
  import { t } from "../../lib/i18n.svelte.js";

  let workspace = $state(appState.workspace);
  let proposals = $state([]);
  let selected = $state(null);
  let original = $state("");
  let originalExists = $state(false);
  let busy = $state(false);
  let error = $state("");
  let canUndo = $state(Boolean(appState.workspaceUndo));

  onMount(() => {
    proposals = appState.workspaceProposals;
    const onProposal = (event) => {
      const proposal = event.detail;
      if (!proposal?.path || typeof proposal.content !== "string") return;
      if (proposals.some((item) => item.id === proposal.id)) return;
      proposals = [...proposals, proposal];
    };
    window.addEventListener("dsm:file-proposal", onProposal);
    return () => window.removeEventListener("dsm:file-proposal", onProposal);
  });

  async function connect() {
    error = "";
    try { workspace = await connectWorkspace(); appState.workspace = workspace; await pushConfigToPage(); }
    catch (e) { error = e.message === "unsupported" ? t("workspace.unsupported") : t("workspace.connectFailed"); }
  }

  async function refresh() {
    error = "";
    try { workspace = await refreshWorkspace(); appState.workspace = workspace; await pushConfigToPage(); }
    catch { error = t("workspace.permissionError"); }
  }

  async function disconnect() {
    await disconnectWorkspace();
    workspace = { connected: false, name: "", files: [], fileCount: 0 };
    appState.workspace = workspace;
    await pushConfigToPage();
  }

  async function review(proposal) {
    error = "";
    selected = proposal;
    original = "";
    originalExists = false;
    try { original = await (await import("../workspace.js")).readWorkspaceFile(proposal.path); originalExists = true; }
    catch { original = ""; }
  }

  async function applyProposal() {
    if (!selected || busy) return;
    busy = true; error = "";
    try {
      let current = "";
      let exists = true;
      try { current = await (await import("../workspace.js")).readWorkspaceFile(selected.path); }
      catch { exists = false; }
      if (exists !== originalExists || (exists && current !== original)) {
        error = t("workspace.changedSinceReview");
        return;
      }
      appState.workspaceUndo = { path: selected.path, existed: exists, content: current };
      canUndo = true;
      await writeWorkspaceFile(selected.path, selected.content);
      workspace = appState.workspace = await refreshWorkspace();
      proposals = appState.workspaceProposals = proposals.filter((item) => item.id !== selected.id);
      selected = null;
      await pushConfigToPage();
    } catch {
      error = t("workspace.writeFailed");
    } finally { busy = false; }
  }

  async function undoLastChange() {
    const undo = appState.workspaceUndo;
    if (!undo || busy) return;
    busy = true; error = "";
    try {
      const api = await import("../workspace.js");
      if (undo.existed) await api.writeWorkspaceFile(undo.path, undo.content);
      else await api.removeWorkspaceFile(undo.path);
      appState.workspaceUndo = null; canUndo = false;
      workspace = appState.workspace = await refreshWorkspace();
      await pushConfigToPage();
    } catch { error = t("workspace.writeFailed"); }
    finally { busy = false; }
  }

  function rejectProposal() {
    if (selected) proposals = appState.workspaceProposals = proposals.filter((item) => item.id !== selected.id);
    selected = null;
  }
</script>

<section class="dsm-workspace">
  <h3>{t("workspace.title")}</h3>
  <p>{t("workspace.description")}</p>
  {#if workspace.connected}
    <div class="dsm-workspace-folder">📁 <strong>{workspace.name}</strong><span>{t("workspace.fileCount", { count: workspace.fileCount })}</span></div>
    <p class="dsm-workspace-note">{t("workspace.contextNote")}</p>
    <div class="dsm-workspace-files">
      {#each workspace.files as file (file.path)}
        <div title={file.path}>{file.path}{#if file.truncated}<small> · {t("workspace.truncated")}</small>{/if}</div>
      {/each}
      {#if workspace.fileCount >= 80}<small>{t("workspace.fileLimit")}</small>{/if}
    </div>
    <div class="dsm-workspace-actions">
      <button class="dsm-btn-outlined" type="button" onclick={refresh}>{t("workspace.refresh")}</button>
      {#if canUndo}<button class="dsm-btn-outlined" type="button" onclick={undoLastChange} disabled={busy}>{t("workspace.undoLast")}</button>{/if}
      <button class="dsm-btn-outlined" type="button" onclick={disconnect}>{t("workspace.disconnect")}</button>
    </div>
  {:else}
    <button class="dsm-btn" type="button" onclick={connect}>{t("workspace.chooseFolder")}</button>
  {/if}

  {#if error}<p class="dsm-workspace-error">{error}</p>{/if}
  <hr />
  <h3>{t("workspace.proposals", { count: proposals.length })}</h3>
  {#if proposals.length}
    {#each proposals as proposal (proposal.id)}
      <div class="dsm-workspace-proposal">
        <code>{proposal.path}</code>
        <button class="dsm-btn-outlined dsm-btn-xs" type="button" onclick={() => review(proposal)}>{t("workspace.review")}</button>
      </div>
    {/each}
  {:else}<p>{t("workspace.noProposals")}</p>{/if}
</section>

{#if selected}
  <div class="dsm-workspace-review-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) selected = null; }}>
    <div class="dsm-workspace-review" role="dialog" aria-modal="true" aria-label={t("workspace.reviewTitle")} tabindex="-1">
      <header><strong>{t("workspace.reviewTitle")}: {selected.path}</strong><button type="button" class="dsm-close" onclick={() => selected = null} aria-label={t("common.close")}>x</button></header>
      <p>{t("workspace.reviewNote")}</p>
      <div class="dsm-workspace-diff">
        <div><h4>{t("workspace.current")}</h4><pre>{original || t("workspace.newFile")}</pre></div>
        <div><h4>{t("workspace.proposed")}</h4><pre>{selected.content}</pre></div>
      </div>
      {#if error}<p class="dsm-workspace-error">{error}</p>{/if}
      <footer><button class="dsm-btn-outlined" type="button" onclick={rejectProposal}>{t("workspace.reject")}</button><button class="dsm-btn" type="button" onclick={applyProposal} disabled={busy}>{busy ? t("common.working") : t("workspace.approve")}</button></footer>
    </div>
  </div>
{/if}

<style>
  .dsm-workspace { display: grid; gap: 10px; color: var(--dsm-text-primary); }
  .dsm-workspace h3 { margin: 8px 0 0; font-size: 15px; }
  .dsm-workspace p { margin: 0; color: var(--dsm-text-secondary); font-size: 13px; line-height: 1.5; }
  .dsm-workspace-folder,.dsm-workspace-proposal { display:flex; align-items:center; gap:8px; padding:10px; border:1px solid var(--dsm-border); border-radius:8px; }
  .dsm-workspace-folder span { margin-left:auto; font-size:12px; color:var(--dsm-text-secondary); }
  .dsm-workspace-files { max-height:180px; overflow:auto; padding:8px; background:var(--dsm-bg-hover); border-radius:8px; font:12px/1.7 monospace; }
  .dsm-workspace-files div { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .dsm-workspace-files small { color:var(--dsm-text-secondary); }
  .dsm-workspace-actions { display:flex; gap:8px; }
  .dsm-workspace-proposal code { flex:1; overflow:hidden; text-overflow:ellipsis; }
  .dsm-workspace-error { color:#d33 !important; }
  .dsm-workspace hr { width:100%; border:0; border-top:1px solid var(--dsm-border); margin:10px 0; }
  .dsm-workspace-review-backdrop { position:fixed; inset:0; z-index:1000001; background:#0009; display:grid; place-items:center; padding:20px; }
  .dsm-workspace-review { width:min(1100px,96vw); max-height:90vh; display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:12px; background:var(--dsm-bg-primary,#fff); color:var(--dsm-text-primary); box-shadow:0 18px 60px #0005; }
  .dsm-workspace-review header,.dsm-workspace-review footer { display:flex; justify-content:space-between; align-items:center; gap:10px; }
  .dsm-workspace-review header strong { overflow-wrap:anywhere; }
  .dsm-workspace-review header button { border:0; background:none; font-size:24px; cursor:pointer; color:inherit; }
  .dsm-workspace-review footer { justify-content:flex-end; }
  .dsm-workspace-diff { min-height:0; display:grid; grid-template-columns:1fr 1fr; gap:10px; overflow:hidden; }
  .dsm-workspace-diff > div { min-width:0; min-height:0; display:flex; flex-direction:column; }
  .dsm-workspace-diff h4 { margin:0 0 6px; font-size:12px; }
  .dsm-workspace-diff pre { flex:1; min-height:200px; max-height:55vh; overflow:auto; margin:0; padding:10px; border:1px solid var(--dsm-border); border-radius:8px; background:var(--dsm-bg-hover); white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.5 monospace; }
  @media(max-width:700px) { .dsm-workspace-diff { grid-template-columns:1fr; overflow:auto; } .dsm-workspace-diff pre { max-height:28vh; } }
</style>
