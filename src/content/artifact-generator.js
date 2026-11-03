const clean = (value, max = 500) => String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export async function downloadDocx(input) {
  if (!globalThis.__DSM_Docx) await import(/* @vite-ignore */ chrome.runtime.getURL("docx-runtime.js"));
  const api = globalThis.__DSM_Docx;
  if (!api) throw new Error("Word runtime did not load.");
  const title = clean(input.title, 160) || "Dokumen";
  const blocks = input.blocks.slice(0, 80).map((block) => {
    const text = clean(block.text, 5000);
    if (block.type === "table") {
      const rows = Array.isArray(block.rows) ? block.rows.slice(0, 60) : [];
      if (!rows.length) return [];
      const columnCount = Math.max(1, Math.min(12, Math.max(...rows.map((row) => Array.isArray(row) ? row.length : 0))));
      return new api.Table({ width: { size: 100, type: api.WidthType.PERCENTAGE }, rows: rows.map((row, rowIndex) => new api.TableRow({ children: Array.from({ length: columnCount }, (_, i) => new api.TableCell({ children: [new api.Paragraph({ children: [new api.TextRun({ text: clean(row?.[i], 1000), bold: rowIndex === 0 })] })], shading: rowIndex === 0 ? { fill: "EAF0F5" } : undefined, verticalAlign: api.VerticalAlign.CENTER })) })) });
    }
    if (block.type === "heading") return new api.Paragraph({ text, heading: [api.HeadingLevel.HEADING_1, api.HeadingLevel.HEADING_2, api.HeadingLevel.HEADING_3][Math.max(0, Math.min(2, Number(block.level || 1) - 1))] });
    if (["bullets", "numbered"].includes(block.type)) return (Array.isArray(block.items) ? block.items : []).slice(0, 30).map((item) => new api.Paragraph({ text: clean(item, 1000), bullet: block.type === "bullets" ? { indent: 360 } : undefined, numbering: block.type === "numbered" ? { reference: "dsm-numbering", level: 0 } : undefined }));
    return new api.Paragraph({ text });
  }).flat();
  const doc = new api.Document({ creator: clean(input.author, 100) || "GoodDeepseek", title, numbering: { config: [{ reference: "dsm-numbering", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "start", style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] }, sections: [{ children: blocks }] });
  const blob = await api.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "dokumen"}.docx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const COLOR = /^#[0-9a-f]{6}$/i;
const ANIMATIONS = new Set(["float", "pulse", "spin", "bounce"]);
export function normalizeAnimation(input) {
  return {
    title: clean(input.title, 120) || "Animasi",
    description: clean(input.description, 300),
    background: COLOR.test(input.background) ? input.background : "#101827",
    objects: input.objects.slice(0, 12).map((item) => ({
      type: ["circle", "rect", "text"].includes(item.type) ? item.type : "circle",
      x: Math.max(0, Math.min(100, Number(item.x) || 0)), y: Math.max(0, Math.min(100, Number(item.y) || 0)),
      size: Math.max(4, Math.min(60, Number(item.size) || 18)),
      color: COLOR.test(item.color) ? item.color : "#60a5fa",
      animation: ANIMATIONS.has(item.animation) ? item.animation : "float",
      text: clean(item.text, 80),
    })),
  };
}

export function renderAnimationSvg(input) {
  const data = normalizeAnimation(input);
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
  const shapes = data.objects.map((item, index) => {
    const cx = item.x * 10, cy = item.y * 6, size = item.size * 4;
    const shape = item.type === "text" ? `<text x="${cx}" y="${cy}" fill="${item.color}" font-size="${Math.max(24, size)}" text-anchor="middle">${escape(item.text || data.title)}</text>` : item.type === "rect" ? `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="${size * 0.12}" fill="${item.color}"/>` : `<circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="${item.color}"/>`;
    return `<g class="a${index}" style="animation:${item.animation} ${2 + index % 3}s ease-in-out ${index * -0.3}s infinite">${shape}</g>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" role="img" aria-labelledby="title desc"><title id="title">${escape(data.title)}</title><desc id="desc">${escape(data.description)}</desc><style>@keyframes float{50%{transform:translateY(-26px)}}@keyframes bounce{50%{transform:translateY(34px)}}@keyframes pulse{50%{opacity:.28;transform:scale(.82);transform-box:fill-box;transform-origin:center}}@keyframes spin{to{transform:rotate(360deg);transform-box:fill-box;transform-origin:center}}svg{background:${data.background};font-family:Arial,sans-serif}</style>${shapes}</svg>`;
}

export function downloadAnimation(input) {
  const svg = renderAnimationSvg(input);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${clean(input.title, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "animasi"}.svg`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
