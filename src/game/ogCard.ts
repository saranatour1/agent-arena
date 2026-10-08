export const CARD_W = 1200;
export const CARD_H = 630;

const SANS = `'Helvetica Neue', Helvetica, Inter, Arial, sans-serif`;
const MONO = `'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace`;
const LOGO = `<g transform="translate(130 103) scale(0.103) translate(-129.225 -127.948) scale(4.16667)">
<path transform="translate(86.6099 107.074)" fill="#f5b01a" d="M0,-6.544C13.098,-7.973 25.449,-14.834 32.255,-26.287C29.037,2.033 -2.48,19.936 -28.196,8.94C-30.569,7.925 -32.605,6.254 -34.008,4.088C-39.789,-4.83 -41.69,-16.18 -38.963,-26.48C-31.158,-13.247 -15.3,-5.131 0,-6.544"/>
<path transform="translate(47.1708 74.7779)" fill="#8d2576" d="M0,-2.489C-5.312,9.568 -5.545,23.695 0.971,35.316C-21.946,18.37 -21.692,-17.876 0.689,-34.65C2.754,-36.197 5.219,-37.124 7.797,-37.257C18.41,-37.805 29.19,-33.775 36.747,-26.264C21.384,-26.121 6.427,-16.446 0,-2.489"/>
<path transform="translate(91.325 66.4152)" fill="#ee342f" d="M0,-14.199C-7.749,-24.821 -19.884,-32.044 -33.173,-32.264C-7.482,-43.726 24.112,-25.143 27.557,2.322C27.877,4.876 27.458,7.469 26.305,9.769C21.503,19.345 12.602,26.776 2.203,29.527C9.838,15.64 8.889,-1.328 0,-14.199"/>
</g>`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ponytail: wraps by character count (≈36 per line at 34px), max 2 lines; measure text if copy gets longer.
function wrap(text: string, max = 36) {
  if (text.includes("\n")) return text.split("\n").slice(0, 2);
  const lines = [""];
  for (const word of text.split(" ")) {
    const line = lines[lines.length - 1];
    if (line && line.length + word.length + 1 > max) lines.push(word);
    else lines[lines.length - 1] = line ? `${line} ${word}` : word;
  }
  return lines.slice(0, 2);
}

// 1200×630 share card: black, hairline frame, Convex mark, title, subtitle, mono footer.
export function cardSvg({ subtitle = "Put 4 AI agents in an arena.\nWhich ones survive?", footer = "haiku · sonnet · jev · opus" } = {}) {
  const sub = wrap(subtitle)
    .map((l, i) => `<text x="130" y="${370 + i * 57}" font-size="34" fill="#a1a1a1">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<rect width="${CARD_W}" height="${CARD_H}" fill="#000"/>
<g stroke="#2e2e2e" stroke-width="1">
<line x1="64.5" y1="0" x2="64.5" y2="${CARD_H}"/><line x1="1135.5" y1="0" x2="1135.5" y2="${CARD_H}"/>
<line x1="0" y1="64.5" x2="${CARD_W}" y2="64.5"/><line x1="0" y1="565.5" x2="${CARD_W}" y2="565.5"/>
</g>
${LOGO}
<g font-family="${SANS}">
<text x="184" y="136" font-size="29" font-weight="700" fill="#fff" letter-spacing="-0.5">Convex</text>
<text x="128" y="273" font-size="84" font-weight="700" fill="#fff" letter-spacing="-2.5">Agent Arena</text>
${sub}
</g>
<text x="130" y="527" font-family="${MONO}" font-size="22" fill="#7a7a7a" letter-spacing="1">${esc(footer)}</text>
</svg>`;
}

// Browser: SVG → canvas → PNG blob (system fonts only, which SVG-in-<img> can use).
export async function renderCardPng(opts: Parameters<typeof cardSvg>[0]) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardSvg(opts))}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
