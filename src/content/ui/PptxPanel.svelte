<script>
  import { onMount } from "svelte";
  import appState from "../state.js";
  import { t } from "../../lib/i18n.svelte.js";

  let proposals = $state([]);
  let busyId = $state(null);
  let error = $state("");
  let status = $state("");

  onMount(() => {
    proposals = appState.presentations;
    const onProposal = (event) => {
      const item = event.detail;
      if (!item?.id || proposals.some((proposal) => proposal.id === item.id)) return;
      proposals = [...proposals, item];
    };
    window.addEventListener("dsm:pptx-proposal", onProposal);
    return () => window.removeEventListener("dsm:pptx-proposal", onProposal);
  });

  async function download(item) {
    busyId = item.id; error = ""; status = "";
    try {
      const { downloadPresentation } = await import("../pptx-generator.js");
      await downloadPresentation(item.presentation);
      status = t("pptxMaker.downloaded", { title: item.presentation.title || "PowerPoint" });
    } catch (e) {
      error = e?.message || t("pptxMaker.failed");
    } finally { busyId = null; }
  }

  function dismiss(id) {
    proposals = appState.presentations = proposals.filter((item) => item.id !== id);
  }
</script>

<section class="dsm-pptx-maker">
  <h3>{t("pptxMaker.title")}</h3>
  <p>{t("pptxMaker.description")}</p>
  <p class="dsm-pptx-maker-note">{t("pptxMaker.scope")}</p>

  {#if error}<div class="dsm-pptx-maker-error">{error}</div>{/if}
  {#if status}<div class="dsm-pptx-maker-status">{status}</div>{/if}

  {#if proposals.length === 0}
    <div class="dsm-pptx-maker-empty">{t("pptxMaker.empty")}</div>
  {:else}
    {#each proposals as item (item.id)}
      <article class="dsm-pptx-maker-card">
        <header><strong>{item.presentation.title || t("pptxMaker.untitled")}</strong><span>{t("pptxMaker.slideCount", { count: item.presentation.slides.length })}</span></header>
        <ol>
          {#each item.presentation.slides as slide, index}
            <li>
              <b>{index + 1}. {slide.title || slide.type || t("pptxMaker.untitled")}</b>
              {#if slide.type === "bullets" && Array.isArray(slide.bullets)}<span>{slide.bullets.slice(0, 3).join(" · ")}</span>{/if}
              {#if slide.type === "quote"}<span>{slide.quote}</span>{/if}
              {#if slide.type === "stats" && Array.isArray(slide.stats)}<span>{slide.stats.map((stat) => `${stat.value} ${stat.label}`).join(" · ")}</span>{/if}
              {#if slide.type === "chart" && Array.isArray(slide.labels)}<span>{t("pptxMaker.chartPreview", { chart: slide.chartType, count: slide.labels.length })}</span>{/if}
            </li>
          {/each}
        </ol>
        <footer>
          <button class="dsm-btn-outlined dsm-btn-xs" type="button" onclick={() => dismiss(item.id)}>{t("pptxMaker.dismiss")}</button>
          <button class="dsm-btn dsm-btn-xs" type="button" onclick={() => download(item)} disabled={busyId === item.id}>
            {busyId === item.id ? t("pptxMaker.generating") : t("pptxMaker.download")}
          </button>
        </footer>
      </article>
    {/each}
  {/if}
</section>

<style>
  .dsm-pptx-maker { display:grid; gap:12px; color:var(--dsm-text-primary); }
  .dsm-pptx-maker h3 { margin:8px 0 0; font-size:15px; }
  .dsm-pptx-maker p { margin:0; color:var(--dsm-text-secondary); font-size:13px; line-height:1.5; }
  .dsm-pptx-maker-note,.dsm-pptx-maker-empty { padding:10px; border:1px solid var(--dsm-border); border-radius:8px; background:var(--dsm-bg-hover); }
  .dsm-pptx-maker-card { display:grid; gap:8px; padding:12px; border:1px solid var(--dsm-border); border-radius:10px; }
  .dsm-pptx-maker-card header,.dsm-pptx-maker-card footer { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .dsm-pptx-maker-card header strong { overflow-wrap:anywhere; }
  .dsm-pptx-maker-card header span { flex:none; color:var(--dsm-text-secondary); font-size:12px; }
  .dsm-pptx-maker-card ol { display:grid; gap:8px; max-height:300px; overflow:auto; margin:0; padding-left:24px; }
  .dsm-pptx-maker-card li { padding-left:2px; font-size:12px; }
  .dsm-pptx-maker-card li span { display:block; margin-top:3px; color:var(--dsm-text-secondary); overflow-wrap:anywhere; }
  .dsm-pptx-maker-error { padding:10px; color:#b42318; background:#fee4e2; border-radius:8px; font-size:13px; }
  .dsm-pptx-maker-status { padding:10px; color:#166534; background:#dcfce7; border-radius:8px; font-size:13px; }
</style>
