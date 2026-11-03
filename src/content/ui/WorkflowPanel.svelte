<script>
  import { onMount } from "svelte";
  import appState from "../state.js";
  import { STORAGE_KEYS } from "../../lib/constants.js";

  const starters = [
    { id: "wf-research", title: "Susun laporan dari bahan", description: "Ubah bahan yang kamu berikan menjadi laporan terstruktur.", prompt: "Buat laporan untuk {{topik}} dengan sasaran pembaca {{pembaca}}. Gunakan hanya bahan dan sumber yang saya berikan di bawah ini. Pisahkan fakta, analisis, dan hal yang belum diketahui. Jangan mengarang data atau tautan. Susun dengan ringkasan eksekutif, temuan utama, bukti, risiko, dan rekomendasi. Panjang: {{panjang}}. Bahan: [tempel bahan atau sumber di sini]." },
    { id: "wf-project-review", title: "Tinjau proyek dan buat rencana", description: "Minta analisis workspace dengan langkah yang bisa ditindaklanjuti.", prompt: "Tinjau proyek yang konteks berkasnya tersedia. Fokus: {{fokus}}. Sebutkan file dan baris yang mendukung setiap temuan. Urutkan isu berdasarkan dampak dan kemungkinan. Jangan menulis atau mengubah file dulu. Akhiri dengan rencana langkah kecil dan pertanyaan yang masih perlu dijawab." },
    { id: "wf-word-report", title: "Buat laporan Word", description: "Minta dokumen .docx dari bahan yang tersedia.", prompt: "Buat dokumen Word berjudul {{judul}} untuk {{pembaca}}. Gunakan bahan yang saya berikan; jangan mengarang angka atau sumber. Struktur: ringkasan, konteks, analisis, rekomendasi, dan sumber. Tulis ringkas dan rapi. Setelah penjelasan singkat, keluarkan blok DSM:DOCX_CREATE yang valid agar bisa saya tinjau dan unduh." },
    { id: "wf-presentation", title: "Ubah ide menjadi presentasi", description: "Minta outline slide yang siap ditinjau dan diunduh sebagai .pptx.", prompt: "Buat presentasi tentang {{topik}} untuk {{pembaca}} dalam {{jumlah}} slide. Tujuan presentasi: {{tujuan}}. Gunakan fakta dari bahan yang tersedia saja. Setiap slide memiliki satu pesan utama; hindari teks padat. Sertakan sumber untuk setiap klaim faktual. Keluarkan blok DSM:PPTX_CREATE yang valid di akhir agar saya bisa meninjau dan mengunduhnya." },
  ];

  let workflows = $state([]);
  let selectedId = $state("");
  let values = $state({});
  let titleInput = $state("");
  let promptInput = $state("");
  let status = $state("");
  let error = $state("");

  let selected = $derived(workflows.find((item) => item.id === selectedId) || null);
  let fields = $derived([...new Set((selected?.prompt?.match(/{{\s*([\w-]+)\s*}}/g) || []).map((token) => token.replace(/[{}\s]/g, "")))]);

  onMount(async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.workflows);
    workflows = Array.isArray(stored[STORAGE_KEYS.workflows]) ? stored[STORAGE_KEYS.workflows] : [...starters];
    if (!workflows.length) workflows = [...starters];
    selectedId = workflows[0]?.id || "";
    await save();
  });

  async function save() {
    appState.workflows = workflows;
    await chrome.storage.local.set({ [STORAGE_KEYS.workflows]: workflows });
  }

  function choose(id) {
    selectedId = id;
    values = {};
    status = "";
  }

  async function copyPrompt() {
    if (!selected) return;
    error = ""; status = "";
    const prompt = selected.prompt.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => values[key]?.trim() || "[" + key + "]");
    try {
      await navigator.clipboard.writeText(prompt);
      status = "Prompt disalin. Tempelkan ke kolom chat DeepSeek untuk menjalankan workflow.";
    } catch {
      error = "Clipboard tidak tersedia. Pilih prompt di bawah lalu salin secara manual.";
    }
  }

  async function addWorkflow() {
    const name = titleInput.trim();
    const prompt = promptInput.trim();
    if (!name || !prompt) { error = "Isi nama dan prompt workflow."; return; }
    const item = { id: crypto.randomUUID(), title: name.slice(0, 80), description: "Workflow buatan sendiri", prompt: prompt.slice(0, 8000), custom: true };
    workflows = [...workflows, item];
    await save();
    titleInput = ""; promptInput = ""; error = ""; choose(item.id);
  }

  async function removeWorkflow() {
    if (!selected) return;
    workflows = workflows.filter((item) => item.id !== selected.id);
    await save();
    selectedId = workflows[0]?.id || "";
    values = {};
  }
</script>

<section class="dsm-workflows">
  <h3>Workflow Studio</h3>
  <p>Pilih resep, isi variabelnya, lalu salin prompt ke chat. Workflow tidak menjalankan aksi atau mengakses layanan secara otomatis.</p>

  <label class="label" for="dsm-workflow-select">Pilih workflow</label>
  <select id="dsm-workflow-select" class="dsm-select" value={selectedId} onchange={(event) => choose(event.currentTarget.value)}>
    {#each workflows as item (item.id)}<option value={item.id}>{item.title}</option>{/each}
  </select>

  {#if selected}
    <article class="card">
      <header><strong>{selected.title}</strong>{#if selected.custom}<button class="dsm-btn-danger dsm-btn-xs" type="button" onclick={removeWorkflow}>Hapus</button>{/if}</header>
      <p>{selected.description}</p>
      {#each fields as field (field)}
        <label class="label" for={"wf-" + field}>{field}</label>
        <input id={"wf-" + field} class="dsm-input" placeholder={"Isi " + field} value={values[field] || ""} oninput={(event) => values = { ...values, [field]: event.currentTarget.value }} />
      {/each}
      <button class="dsm-btn" type="button" onclick={copyPrompt}>Salin prompt workflow</button>
      <textarea readonly rows="7" value={selected.prompt.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => values[key]?.trim() || "[" + key + "]")}></textarea>
    </article>
  {/if}

  {#if status}<div class="status">{status}</div>{/if}
  {#if error}<div class="error">{error}</div>{/if}

  <details>
    <summary>Buat workflow sendiri</summary>
    <label class="label" for="wf-title">Nama</label><input id="wf-title" class="dsm-input" bind:value={titleInput} maxlength="80" />
    <label class="label" for="wf-prompt">Prompt (gunakan {{variable}} untuk isian)</label><textarea id="wf-prompt" rows="7" bind:value={promptInput} maxlength="8000"></textarea>
    <button class="dsm-btn-outlined" type="button" onclick={addWorkflow}>Simpan workflow</button>
  </details>
</section>

<style>
  .dsm-workflows{display:grid;gap:12px;color:var(--dsm-text-primary)}h3{margin:8px 0 0;font-size:15px}.dsm-workflows>p,.card>p{margin:0;color:var(--dsm-text-secondary);font-size:13px;line-height:1.5}.label{display:block;margin:4px 0;font-size:12px;color:var(--dsm-text-secondary)}.card{display:grid;gap:10px;padding:12px;border:1px solid var(--dsm-border);border-radius:10px}.card header{display:flex;justify-content:space-between;align-items:center}.dsm-workflows textarea{width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--dsm-border);border-radius:8px;background:var(--dsm-bg-hover);color:var(--dsm-text-primary);font:12px/1.5 monospace;resize:vertical}.status,.error{padding:10px;border-radius:8px;background:var(--dsm-bg-hover);font-size:12px}.error{color:#b42318}details{display:grid;gap:9px;padding:12px;border:1px solid var(--dsm-border);border-radius:10px}summary{cursor:pointer;font-weight:600;font-size:13px}details>*{margin-top:8px}
</style>
