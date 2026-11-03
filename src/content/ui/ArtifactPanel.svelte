<script>
  import { onMount } from "svelte";
  import appState from "../state.js";
  import { downloadAnimation, downloadDocx, renderAnimationSvg } from "../artifact-generator.js";
  import { downloadWorkbook } from "../xlsx-generator.js";

  let documents = $state([]);
  let animations = $state([]);
  let spreadsheets = $state([]);
  let error = $state("");
  let busy = $state("");

  onMount(() => {
    documents = appState.documents;
    animations = appState.animations;
    spreadsheets = appState.spreadsheets;
    const onDoc = (event) => { if (!documents.some((x) => x.id === event.detail.id)) documents = [...documents, event.detail]; };
    const onAnim = (event) => { if (!animations.some((x) => x.id === event.detail.id)) animations = [...animations, event.detail]; };
    const onSheet = (event) => { if (!spreadsheets.some((x) => x.id === event.detail.id)) spreadsheets = [...spreadsheets, event.detail]; };
    window.addEventListener("dsm:document-proposal", onDoc);
    window.addEventListener("dsm:animation-proposal", onAnim);
    window.addEventListener("dsm:workbook-proposal", onSheet);
    return () => { window.removeEventListener("dsm:document-proposal", onDoc); window.removeEventListener("dsm:animation-proposal", onAnim); window.removeEventListener("dsm:workbook-proposal", onSheet); };
  });

  async function downloadDoc(item) {
    busy = item.id; error = "";
    try { await downloadDocx(item.document); dismiss("documents", item.id); }
    catch (e) { error = e?.message || "Gagal membuat dokumen Word."; }
    finally { busy = ""; }
  }
  function downloadAnim(item) { try { downloadAnimation(item.animation); dismiss("animations", item.id); } catch (e) { error = e?.message || "Gagal membuat animasi."; } }
  async function downloadSheet(item) { busy = item.id; error = ""; try { await downloadWorkbook(item.workbook); dismiss("spreadsheets", item.id); } catch (e) { error = e?.message || "Gagal membuat Excel."; } finally { busy = ""; } }
  function dismiss(key, id) { const next = appState[key].filter((x) => x.id !== id); appState[key] = next; if (key === "documents") documents = next; else if (key === "animations") animations = next; else spreadsheets = next; }
</script>

<section class="dsm-artifacts">
  <h3>Dokumen & Animasi</h3>
  <p>Minta DeepSeek membuat Word, Excel, atau ilustrasi animasi. Tinjau hasilnya, lalu unduh.</p>
  {#if error}<div class="error">{error}</div>{/if}
  {#if !documents.length && !animations.length && !spreadsheets.length}<div class="empty">Belum ada hasil. Coba: “buat dokumen Word…”, “buat tabel Excel…” atau “buat animasi SVG…”.</div>{/if}
  {#each spreadsheets as item (item.id)}
    <article><header><strong>{item.workbook.title || "Workbook Excel"}</strong><span>{item.workbook.sheets.length} sheet</span></header>
      <div class="preview">{#each item.workbook.sheets as sheet}<p><b>{sheet.name}: </b>{(sheet.headers || []).slice(0, 6).join(" · ")} — {(sheet.rows || []).length} baris</p>{/each}</div>
      <footer><button class="dsm-btn-outlined dsm-btn-xs" onclick={() => dismiss("spreadsheets", item.id)}>Hapus</button><button class="dsm-btn dsm-btn-xs" disabled={busy === item.id} onclick={() => downloadSheet(item)}>{busy === item.id ? "Menyiapkan…" : "Unduh .xlsx"}</button></footer>
    </article>
  {/each}
  {#each documents as item (item.id)}
    <article><header><strong>{item.document.title || "Dokumen Word"}</strong><span>{item.document.blocks.length} bagian</span></header>
      <div class="preview">{#each item.document.blocks.slice(0, 5) as block}<p><b>{block.type === "heading" ? "▸ " : ""}</b>{block.text || (block.items || []).join(" · ")}</p>{/each}</div>
      <footer><button class="dsm-btn-outlined dsm-btn-xs" onclick={() => dismiss("documents", item.id)}>Hapus</button><button class="dsm-btn dsm-btn-xs" disabled={busy === item.id} onclick={() => downloadDoc(item)}>{busy === item.id ? "Menyiapkan…" : "Unduh .docx"}</button></footer>
    </article>
  {/each}
  {#each animations as item (item.id)}
    <article><header><strong>{item.animation.title || "Animasi SVG"}</strong><span>{item.animation.objects.length} objek</span></header>
      <iframe title={`Pratinjau ${item.animation.title}`} sandbox="" srcdoc={renderAnimationSvg(item.animation)}></iframe>
      <footer><button class="dsm-btn-outlined dsm-btn-xs" onclick={() => dismiss("animations", item.id)}>Hapus</button><button class="dsm-btn dsm-btn-xs" onclick={() => downloadAnim(item)}>Unduh .svg</button></footer>
    </article>
  {/each}
</section>

<style>
  .dsm-artifacts{display:grid;gap:12px;color:var(--dsm-text-primary)}h3{margin:8px 0 0;font-size:15px}p{margin:0;color:var(--dsm-text-secondary);font-size:13px;line-height:1.5}.empty,.error{padding:10px;border:1px solid var(--dsm-border);border-radius:8px;background:var(--dsm-bg-hover)}.error{color:#b42318}article{display:grid;gap:10px;padding:12px;border:1px solid var(--dsm-border);border-radius:10px}header,footer{display:flex;justify-content:space-between;align-items:center;gap:8px}header span{font-size:12px;color:var(--dsm-text-secondary)}.preview{max-height:140px;overflow:auto;padding:8px;border-radius:6px;background:var(--dsm-bg-hover)}.preview p{margin:4px 0;overflow-wrap:anywhere}iframe{width:100%;height:180px;border:1px solid var(--dsm-border);border-radius:8px;background:#101827}
</style>
