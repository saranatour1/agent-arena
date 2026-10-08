// Renders the default social card to public/og.png: `pnpm og`
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { cardSvg } from "../src/game/ogCard";

const png = new Resvg(cardSvg(), {
  font: { loadSystemFonts: true, defaultFontFamily: "Helvetica Neue" },
  fitTo: { mode: "width", value: 1200 },
}).render().asPng();
writeFileSync(new URL("../public/og.png", import.meta.url), png);
console.log(`public/og.png (${Math.round(png.length / 1024)} KB)`);
