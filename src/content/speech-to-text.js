const BUTTON_ID = "dsm-speech-to-text";
const PANEL_ID = "dsm-speech-preview";
const INPUT_SELECTORS = [
  'textarea:not([readonly]):not([disabled])',
  'input[type="text"]:not([readonly]):not([disabled])',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]',
];

export function initSpeechToText(state) {
  if (window.__dsmSpeechToTextReady) return;
  window.__dsmSpeechToTextReady = true;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.className = "dsm-speech-button";
  button.title = "Dikte suara";
  button.setAttribute("aria-label", "Mulai dikte suara");
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"></path></svg>`;
  button.style.display = "none";
  document.body.appendChild(button);

  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.className = "dsm-speech-preview";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `<div class="dsm-speech-preview-head"><strong>Dikte suara</strong><span class="dsm-speech-status"></span></div><div class="dsm-speech-text" dir="auto"></div><div class="dsm-speech-actions"><button type="button" data-action="stop">Stop</button><button type="button" data-action="discard">Buang</button><button type="button" data-action="insert">Pakai teks</button></div>`;
  panel.style.display = "none";
  document.body.appendChild(panel);

  const statusNode = panel.querySelector(".dsm-speech-status");
  const textNode = panel.querySelector(".dsm-speech-text");
  const stopButton = panel.querySelector('[data-action="stop"]');
  let recognition = null;
  let listening = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let targetInput = null;
  let savedCaret = null;

  function findComposer() {
    const candidates = INPUT_SELECTORS.flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter((element) => {
        if (!element.isConnected || element.closest("#dsm-root") || element.closest(`#${BUTTON_ID}, #${PANEL_ID}`)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width >= 260 && rect.height >= 26 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== "hidden" && style.display !== "none";
      });
    return candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      return br.bottom - ar.bottom || br.width - ar.width;
    })[0] || null;
  }

  function renderPreview() {
    const text = [finalTranscript.trim(), interimTranscript.trim()].filter(Boolean).join(finalTranscript.trim() && interimTranscript.trim() ? " " : "");
    textNode.textContent = text || (listening ? "Mendengarkan… mulai berbicara." : "Belum ada ucapan yang dikenali.");
    panel.style.display = "block";
    stopButton.disabled = !listening;
    panel.querySelector('[data-action="insert"]').disabled = !finalTranscript.trim();
  }

  function positionControls() {
    const input = findComposer();
    if (!input) { button.style.display = "none"; if (!listening) panel.style.display = "none"; return; }
    const rect = input.getBoundingClientRect();
    const left = Math.min(innerWidth - 46, Math.max(8, rect.right - 44));
    button.style.display = "grid";
    button.style.left = `${left}px`;
    button.style.top = `${Math.max(8, rect.top + 8)}px`;
    panel.style.left = `${Math.max(8, Math.min(Math.max(8, innerWidth - 328), rect.right - 320))}px`;
    panel.style.top = `${Math.max(8, rect.top - 166)}px`;
    button.dataset.ready = Recognition ? "true" : "false";
    button.title = Recognition ? `Dikte suara (${state.settings.speechLanguage || "id-ID"})` : "Pengenalan ucapan tidak didukung browser ini";
    button.setAttribute("aria-label", listening ? "Hentikan dikte suara" : "Mulai dikte suara");
  }

  let positionPending = false;
  const schedulePosition = () => {
    if (positionPending) return;
    positionPending = true;
    requestAnimationFrame(() => { positionPending = false; positionControls(); });
  };

  function setListening(value) {
    listening = value;
    button.classList.toggle("dsm-speech-listening", value);
    button.innerHTML = value
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"></path></svg>`;
    button.setAttribute("aria-label", value ? "Hentikan dikte suara" : "Mulai dikte suara");
    button.title = value ? "Hentikan dikte" : `Dikte suara (${state.settings.speechLanguage || "id-ID"})`;
    if (statusNode) statusNode.textContent = value ? "Mendengarkan" : "Tinjau transkrip";
    renderPreview();
  }

  function saveCaret(input) {
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      savedCaret = { start: input.selectionStart ?? input.value.length, end: input.selectionEnd ?? input.selectionStart ?? input.value.length };
      return;
    }
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    savedCaret = range && input.contains(range.startContainer) ? range.cloneRange() : null;
  }

  function insertTranscript() {
    const text = finalTranscript.trim();
    const input = targetInput?.isConnected ? targetInput : findComposer();
    if (!text || !input) return false;

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.focus();
      const start = Math.min(savedCaret?.start ?? input.selectionStart ?? input.value.length, input.value.length);
      const end = Math.min(savedCaret?.end ?? input.selectionEnd ?? start, input.value.length);
      const before = input.value.slice(0, start), after = input.value.slice(end);
      const addition = `${before && !/\s$/.test(before) ? " " : ""}${text}${after && !/^\s/.test(after) ? " " : ""}`;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
      const value = `${before}${addition}${after}`;
      if (setter) setter.call(input, value); else input.value = value;
      const caret = before.length + addition.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: addition }));
    } else {
      input.focus();
      const selection = window.getSelection();
      let range = savedCaret?.cloneRange?.() || (selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null);
      if (!range || !input.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
      }
      const beforeNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.textContent.slice(0, range.startOffset) : "";
      const addition = `${beforeNode && !/\s$/.test(beforeNode) ? " " : ""}${text}`;
      range.deleteContents();
      const node = document.createTextNode(addition);
      range.insertNode(node);
      range.setStartAfter(node); range.collapse(true);
      selection?.removeAllRanges(); selection?.addRange(range);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: addition }));
    }
    clearDraft();
    return true;
  }

  function clearDraft() {
    finalTranscript = "";
    interimTranscript = "";
    savedCaret = null;
    panel.style.display = "none";
  }

  function showError(message) {
    state.ui?.showToast(message);
  }

  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => {
    if (!Recognition) { showError("Browser ini tidak mendukung pengenalan ucapan. Coba Chrome atau Edge terbaru."); return; }
    if (listening) { recognition?.stop(); return; }
    if (finalTranscript.trim() || interimTranscript.trim()) { showError("Tinjau dulu transkrip sebelumnya: pilih Pakai teks atau Buang."); return; }
    try {
      targetInput = findComposer();
      if (!targetInput) { showError("Kolom pesan DeepSeek tidak ditemukan."); return; }
      saveCaret(targetInput);
      finalTranscript = ""; interimTranscript = "";
      recognition = new Recognition();
      recognition.lang = state.settings.speechLanguage || "id-ID";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript?.trim() || "";
          if (!transcript) continue;
          if (result.isFinal) finalTranscript = [finalTranscript.trim(), transcript].filter(Boolean).join(" ");
          else interimTranscript = [interimTranscript, transcript].filter(Boolean).join(" ");
        }
        renderPreview();
      };
      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") showError("Izin mikrofon atau layanan pengenalan ucapan ditolak. Izinkan mikrofon untuk mulai dikte.");
        else if (event.error !== "no-speech" && event.error !== "aborted") showError(`Dikte gagal: ${event.error}`);
      };
      recognition.onend = () => {
        setListening(false);
        recognition = null;
        if (interimTranscript.trim()) {
          finalTranscript = [finalTranscript.trim(), interimTranscript.trim()].filter(Boolean).join(" ");
          interimTranscript = "";
          renderPreview();
        }
        if (!finalTranscript.trim()) clearDraft();
      };
      statusNode.textContent = "Mendengarkan";
      renderPreview();
      recognition.start();
      setListening(true);
    } catch (error) {
      setListening(false);
      showError(`Tidak dapat memulai dikte: ${error?.message || error}`);
    }
  });

  panel.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  panel.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (action === "stop" && listening) recognition?.stop();
    if (action === "insert" && !listening) {
      if (!insertTranscript()) showError("Tidak dapat memasukkan transkrip ke kolom pesan.");
    }
    if (action === "discard") {
      recognition?.abort();
      recognition = null;
      setListening(false);
      clearDraft();
    }
  });

  const observer = new MutationObserver(schedulePosition);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedulePosition, { passive: true });
  window.addEventListener("scroll", schedulePosition, { passive: true, capture: true });
  schedulePosition();
}
