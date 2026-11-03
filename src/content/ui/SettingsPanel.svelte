<script>
  import { onMount } from "svelte";
  import appState from "../state.js";
  import { pushConfigToPage } from "../bridge.js";
  import { STORAGE_KEYS } from "../../lib/constants.js";
  import { t, i18n, availableLocaleCodes } from "../../lib/i18n.svelte.js";

  let { onimportdata } = $props();

  let disableMemory = $state(Boolean(appState.settings.disableMemory));
  let locale = $state(appState.settings.locale || availableLocaleCodes[0] || "en");
  let syncLocale = $state(Boolean(appState.settings.syncLocale));
  let speechLanguage = $state(appState.settings.speechLanguage || "id-ID");
  let personalityName = $state(appState.settings.personalityName || "");
  let personalityStyle = $state(appState.settings.personalityStyle || "");
  let customSystemPrompt = $state(appState.settings.customSystemPrompt || "");
  let promptSaved = $state(true);
  let persistentMemory = $state(!appState.settings.disableMemory);

  // Auto-save when any toggle changes
  let _initDone = false;
  $effect(() => {
    // Track all reactive values
    const _ = persistentMemory;
    const __ = syncLocale;
    const ___ = locale;
    const ____ = speechLanguage;
    if (!_initDone) { _initDone = true; return; }
    disableMemory = !persistentMemory;
    autoSave();
  });

  export function refresh() {
    disableMemory = Boolean(appState.settings.disableMemory);
    persistentMemory = !disableMemory;
    locale = appState.settings.locale || availableLocaleCodes[0] || "en";
    speechLanguage = appState.settings.speechLanguage || "id-ID";
    personalityName = appState.settings.personalityName || "";
    personalityStyle = appState.settings.personalityStyle || "";
    customSystemPrompt = appState.settings.customSystemPrompt || "";
    promptSaved = true;
    syncLocale = Boolean(appState.settings.syncLocale);
  }

  export function checkBeforeClose() {
    return Promise.resolve(true);
  }

  async function autoSave() {
    appState.settings.disableMemory = disableMemory;
    appState.settings.locale = locale;
    appState.settings.syncLocale = syncLocale;
    appState.settings.speechLanguage = speechLanguage;
    await chrome.storage.local.set({
      [STORAGE_KEYS.settings]: appState.settings,
    });
    if (!syncLocale) {
      i18n.setLocale(locale);
    }
    pushConfigToPage();
  }

  async function saveBehaviorPrompts() {
    appState.settings.personalityName = personalityName.trim().slice(0, 100);
    appState.settings.personalityStyle = personalityStyle.trim().slice(0, 4000);
    appState.settings.customSystemPrompt = customSystemPrompt.trim().slice(0, 12000);
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: appState.settings });
    await pushConfigToPage();
    promptSaved = true;
    appState.ui?.showToast("Kepribadian dan System Prompt tersimpan untuk percakapan baru.");
  }

  onMount(() => {
    refresh();
  });
</script>

<div class="dsm-settings-container">
  <div class="dsm-toggle-row">
    <div class="dsm-toggle-info">
      <span class="dsm-toggle-label">{t('settings.persistentMemory')}</span>
      <span class="dsm-toggle-hint">{t('settings.persistentMemoryHint')}</span>
    </div>
    <label class="dsm-switch">
      <input id="dsm-persistent-memory" type="checkbox" bind:checked={persistentMemory} />
      <span class="dsm-switch-track"></span>
    </label>
  </div>
  <p class="dsm-privacy-note">{t("settings.dataTransferHint")}</p>

  <div class="dsm-toggle-row">
    <div class="dsm-toggle-info">
      <span class="dsm-toggle-label">{t('settings.syncLocale')}</span>
    </div>
    <label class="dsm-switch">
      <input type="checkbox" bind:checked={syncLocale} />
      <span class="dsm-switch-track"></span>
    </label>
  </div>

  {#if !syncLocale}
    <div class="dsm-toggle-row">
      <div class="dsm-toggle-info">
        <span class="dsm-toggle-label">{t('settings.selectLanguage')}</span>
      </div>
      <div class="dsm-select-wrapper">
        <select class="dsm-select" bind:value={locale}>
          {#each availableLocaleCodes as code}
            <option value={code}>{i18n.getNativeName(code)}</option>
          {/each}
        </select>
        <svg class="dsm-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </div>
  {/if}

  <div class="dsm-toggle-row">
    <div class="dsm-toggle-info">
      <span class="dsm-toggle-label">Bahasa ucapan</span>
      <span class="dsm-toggle-hint">Bahasa untuk transkripsi mikrofon.</span>
    </div>
    <div class="dsm-select-wrapper">
      <select class="dsm-select" bind:value={speechLanguage}>
        <option value="id-ID">Bahasa Indonesia</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option>
        <option value="zh-CN">中文</option><option value="ja-JP">日本語</option><option value="ko-KR">한국어</option>
        <option value="ms-MY">Bahasa Melayu</option><option value="th-TH">ไทย</option><option value="es-ES">Español</option><option value="fr-FR">Français</option>
      </select>
      <svg class="dsm-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  </div>
  <p class="dsm-privacy-note">Transkripsi memakai layanan pengenalan suara yang tersedia di browser. Browser dapat memproses audio melalui layanan pengenalan suaranya; mikrofon hanya mulai aktif setelah tombol dikte ditekan.</p>

  <details class="dsm-behavior-settings">
    <summary>Kepribadian &amp; System Prompt</summary>
    <p class="dsm-behavior-hint">Atur gaya bicara dan instruksi global DeepSeek. Instruksi disisipkan sebagai konteks tersembunyi, bukan pesan biasa. Perubahan berlaku setelah disimpan dan digunakan pada pesan berikutnya atau percakapan baru.</p>
    <label for="dsm-personality-name">Nama kepribadian (opsional)</label>
    <input id="dsm-personality-name" class="dsm-input" maxlength="100" bind:value={personalityName} oninput={() => promptSaved = false} placeholder="Contoh: Asisten santai dan kritis" />
    <label for="dsm-personality-style">Gaya dan sifat</label>
    <textarea id="dsm-personality-style" class="dsm-input" rows="4" maxlength="4000" bind:value={personalityStyle} oninput={() => promptSaved = false} placeholder="Contoh: Ramah, lugas, humor ringan, berani memberi alasan saat tidak setuju." ></textarea>
    <label for="dsm-system-prompt">System Prompt tambahan</label>
    <textarea id="dsm-system-prompt" class="dsm-input" rows="7" maxlength="12000" bind:value={customSystemPrompt} oninput={() => promptSaved = false} placeholder="Tulis aturan tetap, cara menjawab, format, konteks, dan hal yang harus diutamakan." ></textarea>
    <div class="dsm-prompt-footer"><span>{promptSaved ? "Tersimpan" : "Ada perubahan yang belum disimpan"}</span><button class="dsm-btn" type="button" onclick={saveBehaviorPrompts}>Simpan instruksi</button></div>
  </details>

  <div class="dsm-settings-footer">
    <a class="dsm-github-link" href="https://github.com/XunowID/GoodDeepseek" target="_blank" rel="noopener noreferrer">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      <span>GoodDeepseek v2.0.0 · XunowID</span>
    </a>
  </div>
</div>

<style>
  .dsm-privacy-note { margin: 4px 0 16px; padding: 10px 12px; border-radius: 8px; background: var(--dsm-bg-hover); color: var(--dsm-text-secondary); font-size: 12px; line-height: 1.5; }
  .dsm-behavior-settings{display:grid;gap:9px;margin:14px 0;padding:12px;border:1px solid var(--dsm-border);border-radius:10px}.dsm-behavior-settings summary{cursor:pointer;font-size:13px;font-weight:600}.dsm-behavior-settings label{font-size:12px;color:var(--dsm-text-secondary)}.dsm-behavior-settings textarea{resize:vertical;line-height:1.45}.dsm-behavior-hint{margin:0;color:var(--dsm-text-secondary);font-size:12px;line-height:1.5}.dsm-prompt-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:var(--dsm-text-secondary)}
</style>
