const MAX_SLIDES = 30;
const MAX_TEXT = 40_000;
const MAX_ITEMS = 6;

const cleanText = (value, max = 500) => String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export function normalizeDeck(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid presentation data.");
  const title = cleanText(input.title, 160);
  const slidesIn = Array.isArray(input.slides) ? input.slides : [];
  if (!title || slidesIn.length < 1 || slidesIn.length > MAX_SLIDES) throw new Error("A title and 1–30 slides are required.");

  let charCount = title.length;
  const slides = slidesIn.map((slide) => {
    if (!slide || typeof slide !== "object") throw new Error("Invalid slide data.");
    const type = ["title", "bullets", "quote", "stats", "chart", "section", "cards", "comparison", "timeline"].includes(slide.type) ? slide.type : "bullets";
    const normalized = {
      type,
      title: cleanText(slide.title, 180),
      subtitle: cleanText(slide.subtitle, 280),
      bullets: Array.isArray(slide.bullets) ? slide.bullets.slice(0, MAX_ITEMS).map((x) => cleanText(x, 500)).filter(Boolean) : [],
      quote: cleanText(slide.quote, 800),
      attribution: cleanText(slide.attribution, 160),
      stats: Array.isArray(slide.stats) ? slide.stats.slice(0, 4).map((item) => ({ value: cleanText(item?.value, 60), label: cleanText(item?.label, 120) })).filter((item) => item.value || item.label) : [],
      chartType: ["bar", "line", "pie", "doughnut"].includes(slide.chartType) ? slide.chartType : "bar",
      labels: Array.isArray(slide.labels) ? slide.labels.slice(0, 8).map((x) => cleanText(x, 80)) : [],
      values: Array.isArray(slide.values) ? slide.values.slice(0, 8).map((x) => Number(x)) : [],
      seriesName: cleanText(slide.seriesName, 80) || "Series 1",
      items: Array.isArray(slide.items) ? slide.items.slice(0, 4).map((item) => ({ title: cleanText(item?.title, 100), text: cleanText(item?.text, 360) })).filter((item) => item.title || item.text) : [],
      leftTitle: cleanText(slide.leftTitle, 100), rightTitle: cleanText(slide.rightTitle, 100),
      leftItems: Array.isArray(slide.leftItems) ? slide.leftItems.slice(0, 6).map((x) => cleanText(x, 300)).filter(Boolean) : [],
      rightItems: Array.isArray(slide.rightItems) ? slide.rightItems.slice(0, 6).map((x) => cleanText(x, 300)).filter(Boolean) : [],
    };
    if (normalized.type === "bullets" && normalized.bullets.length === 0) throw new Error("A bullet slide needs at least one bullet.");
    if (normalized.type === "quote" && !normalized.quote) throw new Error("A quote slide needs quote text.");
    if (normalized.type === "stats" && normalized.stats.length === 0) throw new Error("A stats slide needs at least one item.");
    if (normalized.type === "section" && !normalized.title) throw new Error("A section slide needs a title.");
    if (["cards", "timeline"].includes(normalized.type) && !normalized.items.length) throw new Error(`A ${normalized.type} slide needs items.`);
    if (normalized.type === "comparison" && (!normalized.leftItems.length || !normalized.rightItems.length)) throw new Error("A comparison slide needs content on both sides.");
    charCount += JSON.stringify(normalized).length;
    if (charCount > MAX_TEXT) throw new Error("Presentation text exceeds the size limit.");
    if (normalized.type === "chart" && (!normalized.labels.length || normalized.labels.length !== normalized.values.length || normalized.values.some((x) => !Number.isFinite(x)))) {
      throw new Error("A chart needs matching labels and numeric values.");
    }
    return normalized;
  });
  const themes = { editorial: ["20304A", "355C7D", "EAF0F5"], forest: ["203B34", "56876D", "E8F0EA"], coral: ["442C38", "D96B55", "F7E8E1"], ocean: ["153B50", "168AAD", "E4F2F5"], berry: ["462B3B", "9A526F", "F3E9EE"], charcoal: ["252A30", "68737D", "ECEFF1"] };
  const theme = themes[input.theme] ? input.theme : "editorial";
  return { title, author: cleanText(input.author, 100), theme, slides };
}

export async function downloadPresentation(input) {
  if (!globalThis.__DSM_PptxGenJS) await import(/* @vite-ignore */ chrome.runtime.getURL("pptx-runtime.js"));
  const PptxGenJS = globalThis.__DSM_PptxGenJS;
  if (typeof PptxGenJS !== "function") throw new Error("PowerPoint runtime did not load.");
  const pptx = buildDeck(input, PptxGenJS);
  const base = pptx.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "presentasi";
  await pptx.writeFile({ fileName: `${base}.pptx`, compression: true });
}

export function buildDeck(input, PptxGenJS) {
  const deck = normalizeDeck(input);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = deck.author || "GoodDeepseek";
  pptx.subject = "AI-generated presentation";
  pptx.title = deck.title;
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial", lang: "id-ID" };

  const themes = { editorial: ["20304A", "355C7D", "EAF0F5"], forest: ["203B34", "56876D", "E8F0EA"], coral: ["442C38", "D96B55", "F7E8E1"], ocean: ["153B50", "168AAD", "E4F2F5"], berry: ["462B3B", "9A526F", "F3E9EE"], charcoal: ["252A30", "68737D", "ECEFF1"] };
  const [ink, accent, pale] = themes[deck.theme];
  const C = { ink, accent, muted: "667085", pale, white: "FFFFFF", line: "D9E0E5" };
  const W = 13.333, H = 7.5;
  for (const [index, data] of deck.slides.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: C.white };
    slide.addText(String(index + 1).padStart(2, "0"), { x: 12.2, y: 7.05, w: 0.45, h: 0.2, fontFace: "Arial", fontSize: 9, color: data.type === "title" ? "CBD5E1" : C.muted, align: "right", margin: 0 });

    if (data.type === "title") {
      slide.background = { color: C.ink };
      slide.addShape(pptx.ShapeType.ellipse, { x: 9.2, y: -1.2, w: 5.2, h: 5.2, line: { color: C.accent, transparency: 100 }, fill: { color: C.accent, transparency: 12 } });
      slide.addShape(pptx.ShapeType.ellipse, { x: 10.1, y: 3.4, w: 3.4, h: 3.4, line: { color: C.white, transparency: 100 }, fill: { color: C.white, transparency: 88 } });
      slide.addText(data.title || deck.title, { x: 0.9, y: 1.45, w: 9.1, h: 2.4, fontFace: "Cambria", fontSize: 38, bold: true, color: C.white, margin: 0, breakLine: false, valign: "mid", fit: "shrink" });
      if (data.subtitle) slide.addText(data.subtitle, { x: 0.95, y: 4.15, w: 8.2, h: 0.9, fontFace: "Arial", fontSize: 18, color: "E1E7EE", margin: 0, fit: "shrink" });
      continue;
    }

    if (data.type === "section") {
      slide.background = { color: C.pale };
      slide.addShape(pptx.ShapeType.ellipse, { x: 10.7, y: 1.05, w: 1.5, h: 1.5, line: { color: C.accent, transparency: 100 }, fill: { color: C.accent } });
      slide.addText(data.title || "", { x: 0.9, y: 2.2, w: 9.5, h: 1.4, fontFace: "Cambria", fontSize: 34, bold: true, color: C.ink, margin: 0.05, fit: "shrink", valign: "mid" });
      if (data.subtitle) slide.addText(data.subtitle, { x: 0.95, y: 3.8, w: 10.8, h: 0.8, fontFace: "Arial", fontSize: 18, color: C.muted, margin: 0.05, fit: "shrink" });
      continue;
    }

    slide.addText(data.title || deck.title, { x: 0.75, y: 0.5, w: 11.5, h: 0.75, fontFace: "Arial", fontSize: 26, bold: true, color: C.ink, margin: 0.02, fit: "shrink" });
    if (data.type === "bullets") {
      data.bullets.forEach((text, bulletIndex) => {
        const y = 1.85 + bulletIndex * 0.82;
        slide.addText(String(bulletIndex + 1).padStart(2, "0"), { x: 0.95, y, w: 0.42, h: 0.45, fontFace: "Cambria", fontSize: 17, bold: true, color: C.accent, margin: 0, valign: "mid" });
        slide.addText(text, { x: 1.6, y, w: 10.3, h: 0.62, fontFace: "Arial", fontSize: 18, color: C.ink, margin: 0.02, valign: "mid", fit: "shrink" });
      });
    } else if (data.type === "quote") {
      slide.addText(`“${data.quote}”`, { x: 1.2, y: 2.0, w: 10.5, h: 2.6, fontFace: "Arial", fontSize: 26, italic: true, color: C.ink, align: "center", valign: "mid", margin: 0.1, fit: "shrink" });
      if (data.attribution) slide.addText(data.attribution, { x: 2.0, y: 4.9, w: 9.0, h: 0.45, fontFace: "Arial", fontSize: 15, color: C.muted, align: "center", margin: 0 });
    } else if (data.type === "stats") {
      const count = Math.max(data.stats.length, 1), cardW = Math.min(2.8, 10.8 / count), gap = 0.28;
      const startX = (W - (count * cardW + (count - 1) * gap)) / 2;
      data.stats.forEach((item, statIndex) => {
        const x = startX + statIndex * (cardW + gap);
        slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.2, w: cardW, h: 2.3, rectRadius: 0.12, line: { color: C.line, width: 1 }, fill: { color: "F8FAFC" } });
        slide.addText(item.value, { x: x + 0.15, y: 2.65, w: cardW - 0.3, h: 0.75, fontFace: "Arial", fontSize: 30, bold: true, color: C.accent, align: "center", margin: 0.03, fit: "shrink" });
        slide.addText(item.label, { x: x + 0.15, y: 3.55, w: cardW - 0.3, h: 0.55, fontFace: "Arial", fontSize: 14, color: C.muted, align: "center", margin: 0.03, fit: "shrink" });
      });
    } else if (data.type === "chart") {
      const chartType = data.chartType === "line" ? pptx.ChartType.line : data.chartType === "pie" ? pptx.ChartType.pie : data.chartType === "doughnut" ? pptx.ChartType.doughnut : pptx.ChartType.bar;
      const series = [{ name: data.seriesName, labels: data.labels, values: data.values }];
      slide.addChart(chartType, series, {
        x: 1.0, y: 1.8, w: 10.9, h: 4.9, showTitle: false, showLegend: false,
        showValue: true, chartColors: [C.accent, "22A699", "F59E0B", "E76F51", "8B5CF6"],
        catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
        valGridLine: { color: C.line, size: 1 }, catGridLine: { style: "none" },
      });
    } else if (data.type === "cards") {
      const gap = 0.24, cardW = (11.7 - gap * (data.items.length - 1)) / data.items.length;
      data.items.forEach((item, i) => { const x = 0.82 + i * (cardW + gap); slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: cardW, h: 3.7, rectRadius: 0.12, line: { color: C.line, width: 0.7 }, fill: { color: i % 2 ? C.pale : "F5F7F8" } }); slide.addText(String(i + 1).padStart(2, "0"), { x: x + 0.22, y: 2.28, w: cardW - 0.44, h: 0.5, fontFace: "Cambria", fontSize: 21, bold: true, color: C.accent, margin: 0 }); slide.addText(item.title, { x: x + 0.22, y: 3.0, w: cardW - 0.44, h: 0.62, fontFace: "Arial", fontSize: 17, bold: true, color: C.ink, margin: 0, fit: "shrink" }); slide.addText(item.text, { x: x + 0.22, y: 3.78, w: cardW - 0.44, h: 1.48, fontFace: "Arial", fontSize: 13, color: C.muted, margin: 0, valign: "top", fit: "shrink" }); });
    } else if (data.type === "comparison") {
      for (const [i, title, items] of [[0, data.leftTitle || "Opsi A", data.leftItems], [1, data.rightTitle || "Opsi B", data.rightItems]]) { const x = 0.85 + i * 6.0; slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.9, w: 5.55, h: 4.65, rectRadius: 0.12, line: { color: C.line, width: 0.8 }, fill: { color: i ? C.pale : "F5F7F8" } }); slide.addText(title, { x: x + 0.3, y: 2.25, w: 4.95, h: 0.62, fontFace: "Cambria", fontSize: 23, bold: true, color: C.ink, margin: 0, fit: "shrink" }); items.forEach((text, j) => { slide.addText("—", { x: x + 0.32, y: 3.1 + j * 0.56, w: 0.3, h: 0.35, fontSize: 16, bold: true, color: C.accent, margin: 0 }); slide.addText(text, { x: x + 0.72, y: 3.08 + j * 0.56, w: 4.45, h: 0.43, fontFace: "Arial", fontSize: 15, color: C.ink, margin: 0, fit: "shrink" }); }); }
    } else if (data.type === "timeline") {
      const gap = 0.25, count = data.items.length, cardW = (11.7 - gap * (count - 1)) / count;
      slide.addShape(pptx.ShapeType.line, { x: 1.05, y: 3.1, w: 11.15, h: 0, line: { color: C.line, width: 2 } });
      data.items.forEach((item, i) => { const x = 0.82 + i * (cardW + gap); slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.12, y: 2.94, w: 0.34, h: 0.34, line: { color: C.white, width: 2 }, fill: { color: C.accent } }); slide.addText(item.title, { x, y: 3.55, w: cardW - 0.1, h: 0.58, fontFace: "Arial", fontSize: 17, bold: true, color: C.ink, margin: 0, fit: "shrink" }); slide.addText(item.text, { x, y: 4.25, w: cardW - 0.1, h: 1.25, fontFace: "Arial", fontSize: 13, color: C.muted, margin: 0, valign: "top", fit: "shrink" }); });
    }
  }

  return pptx;
}
