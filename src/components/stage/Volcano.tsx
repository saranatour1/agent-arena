import { BlurDef, Flicker, Floor, Fog, GlowDef, Noise, Veil } from "./parts";
import { litFaces, rand, ridge } from "./util";

// Magma Throne: all the light comes from below. The crater, the lava river and the
// floor cracks underlight the smoke and rim the rocks orange; the boss's violet
// banners hang from obsidian pillars crowned with braziers.

const CRATER = { x: 800, y: 262 };

const FAR: [number, number][] = [
  [-20, 430], [70, 380], [130, 410], [210, 340], [290, 400], [360, 372], [430, 430], [520, 470],
  [1080, 470], [1170, 420], [1240, 360], [1320, 404], [1400, 330], [1480, 392], [1560, 350], [1620, 400],
];

// Billows sorted top-down so each lower puff's lit underside overlaps the one above.
const PLUME = (() => {
  const r = rand(13);
  return Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    return [CRATER.x + t * t * 200 + Math.sin(t * 5) * 24 + (r() - 0.5) * 60, CRATER.y - 10 - t * 320 + (r() - 0.5) * 30, 36 + t * 100 + r() * 30];
  }).sort((p, q) => p[1] - q[1]);
})();

const ASH = [
  [200, 70, 260], [480, 30, 220], [1250, 50, 300], [1500, 110, 240], [40, 170, 180], [1580, 210, 160], [1020, 0, 220],
]
  .flatMap(([x, y, s], i) => {
    const r = rand(40 + i);
    return Array.from({ length: 8 }, () => [x + (r() - 0.5) * s * 1.8, y + (r() - 0.5) * s * 0.4, s * (0.22 + r() * 0.22)]);
  })
  .sort((p, q) => p[1] - q[1]);

export function Volcano() {
  return (
    <g>
      <Sky />
      <Mountain />
      <LavaRiver />
      <Pillar x={250} />
      <Pillar x={1350} />
      <Ground />
      <Rocks side={-1} />
      <Rocks side={1} />
      <Veil id="v-lane" y0={330} y1={800} color="#080102" a={0.25} peak={0.6} />
    </g>
  );
}

function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="v-sky" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#060102" />
          <stop offset="0.4" stopColor="#1c0406" />
          <stop offset="0.72" stopColor="#4a0c0c" />
          <stop offset="1" stopColor="#9a2e12" />
        </linearGradient>
        <GlowDef id="v-glow" color="#ff7a2a" a={0.75} />
        <GlowDef id="v-hot" color="#ffd27a" />
        <radialGradient id="v-smoke" cx={CRATER.x} cy={CRATER.y} r="700" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5a2216" />
          <stop offset="0.3" stopColor="#2c0f0c" />
          <stop offset="0.65" stopColor="#1c0a0a" />
          <stop offset="1" stopColor="#130607" />
        </radialGradient>
        <radialGradient id="v-smokelit" cx={CRATER.x} cy={CRATER.y} r="700" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffb054" />
          <stop offset="0.14" stopColor="#d8561e" />
          <stop offset="0.4" stopColor="#5e1c12" />
          <stop offset="1" stopColor="#2a0c0a" />
        </radialGradient>
        <linearGradient id="v-ash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#100506" />
          <stop offset="0.55" stopColor="#1c0909" />
          <stop offset="1" stopColor="#5a1e12" />
        </linearGradient>
        <BlurDef id="v-billow" sd="5" />
        <BlurDef id="v-soft" sd="2.5" />
      </defs>
      <rect width="1600" height="600" fill="url(#v-sky)" />
      <ellipse cx="800" cy="560" rx="1200" ry="230" fill="url(#v-glow)" opacity="0.7" />
      <ellipse cx={CRATER.x} cy={CRATER.y} rx="420" ry="300" fill="url(#v-glow)" />
      <g filter="url(#v-billow)">
        {ASH.map(([x, y, s], i) => (
          <ellipse key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} rx={s.toFixed(1)} ry={(s * 0.55).toFixed(1)} fill="url(#v-ash)" />
        ))}
      </g>
      <g filter="url(#v-billow)">
        {PLUME.map(([x, y, s], i) => (
          <g key={i}>
            <circle cx={x.toFixed(1)} cy={(y + s * 0.12).toFixed(1)} r={s.toFixed(1)} fill="url(#v-smokelit)" />
            <circle cx={x.toFixed(1)} cy={(y - s * 0.03).toFixed(1)} r={(s * 0.97).toFixed(1)} fill="url(#v-smoke)" />
          </g>
        ))}
      </g>
      <path d={ridge(FAR, 600)} fill="#2a0909" />
      <path d={litFaces(FAR, 600, 800)} fill="#ff6a2a" opacity="0.1" filter="url(#v-soft)" />
      <Veil id="v-haze" y0={380} y1={600} color="#c2401a" a={0.45} peak={0.85} />
    </>
  );
}

const CONE =
  "M300 590 C480 520 600 420 680 330 C712 292 730 272 742 262 L756 255 L772 262 L790 251 L806 259 L822 250 L840 258 L858 262 C870 272 890 292 922 330 C1000 420 1120 520 1300 590 Z";

const FLOWS = [
  "M772 262 C768 300 752 330 758 368 C764 402 738 430 742 470 C746 508 718 540 704 572",
  "M838 260 C846 300 872 326 866 368 C860 404 888 440 902 480 C914 514 938 546 950 570",
  "M758 368 C730 392 700 420 690 460 C682 492 650 520 628 560",
  "M866 368 C900 390 940 420 960 460 C978 494 1010 520 1040 556",
];

const GULLIES = [
  "M752 270 C700 330 640 410 560 470",
  "M762 300 C730 380 690 450 620 530",
  "M846 280 C900 340 960 410 1040 480",
  "M850 300 C900 380 980 470 1080 540",
];

function Mountain() {
  return (
    <g>
      <defs>
        <linearGradient id="v-cone" x1="0" y1="250" x2="0" y2="580" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2e0d0b" />
          <stop offset="1" stopColor="#120505" />
        </linearGradient>
        <BlurDef id="v-flowglow" sd="9" />
      </defs>
      <path d={CONE} fill="url(#v-cone)" />
      <g fill="none" filter="url(#v-soft)">
        {GULLIES.map((d, i) => (
          <path key={d} d={d} stroke={i % 2 ? "#050101" : "#000"} strokeWidth={10 - i} opacity="0.55" />
        ))}
        {GULLIES.map((d) => (
          <path key={d} d={d} stroke="#ff7a3a" strokeWidth="2" opacity="0.12" transform="translate(6 0)" />
        ))}
      </g>
      <path d="M300 590 C480 520 600 420 680 330 C712 292 730 272 742 262 L752 268 C700 330 610 440 400 590 Z" fill="#ff7a3a" opacity="0.08" />
      <path d="M1300 590 C1120 520 1000 420 922 330 C890 292 870 272 858 262 L848 268 C900 330 990 440 1200 590 Z" fill="#ff7a3a" opacity="0.12" />
      <Noise id="v-rock" freq="0.03 0.07" seed={6} color="#000000" gain={3} bias={-1.3} opacity={0.55}>
        <path d={CONE} />
      </Noise>
      <Noise id="v-rockhi" freq="0.05 0.1" seed={9} color="#ff8a4a" gain={4} bias={-2.7} opacity={0.14}>
        <path d={CONE} />
      </Noise>
      <ellipse cx={CRATER.x} cy={CRATER.y - 20} rx="150" ry="60" fill="url(#v-hot)" opacity="0.6" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M742 262 L756 255 L772 262 L790 251 L806 259 L822 250 L840 258 L858 262" stroke="#ff8a2a" strokeWidth="14" opacity="0.6" filter="url(#v-flowglow)" />
        <path d="M742 262 L756 255 L772 262 L790 251 L806 259 L822 250 L840 258 L858 262" stroke="#ffd56a" strokeWidth="3" />
        <g stroke="#ff6a1a" strokeWidth="22" opacity="0.45" filter="url(#v-flowglow)">
          {FLOWS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#c8321a" strokeWidth="8">
          {FLOWS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#ff8a2a" strokeWidth="4.5">
          {FLOWS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#ffe08a" strokeWidth="1.6">
          {FLOWS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </g>
  );
}

function LavaRiver() {
  return (
    <g>
      <defs>
        <linearGradient id="v-river" x1="0" y1="540" x2="0" y2="580" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff8a2a" />
          <stop offset="0.5" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#ff6a1a" />
        </linearGradient>
      </defs>
      <ellipse cx="800" cy="560" rx="900" ry="70" fill="url(#v-glow)" />
      <path d="M0 548 Q400 538 800 546 T1600 544 V582 H0 Z" fill="url(#v-river)" />
      <Noise id="v-crust" freq="0.008 0.06" octaves={4} seed={3} color="#1e0806" gain={14} bias={-6}>
        <path d="M0 548 Q400 538 800 546 T1600 544 V582 H0 Z" />
      </Noise>
      <Noise id="v-crust2" freq="0.02 0.12" octaves={2} seed={8} color="#2a0a06" gain={8} bias={-3.4}>
        <path d="M0 548 Q400 538 800 546 T1600 544 V582 H0 Z" />
      </Noise>
      <path d="M0 548 Q400 538 800 546 T1600 544" stroke="#ffd56a" strokeWidth="1.5" fill="none" opacity="0.6" />
      <rect y="572" width="1600" height="12" fill="#1a0707" />
      <rect y="571" width="1600" height="2" fill="#ffa060" opacity="0.55" />
      {/* rocky far bank silhouettes */}
      <path d="M0 548 L40 536 L90 544 L150 530 L220 546 L300 540 L360 548 Z M1240 548 L1300 534 L1360 542 L1430 528 L1500 544 L1560 536 L1600 546 L1600 548 Z" fill="#160606" />
    </g>
  );
}

function Pillar({ x }: { x: number }) {
  const banner = `M${x - 30} 290 H${x + 30} V452 L${x + 14} 436 L${x} 456 L${x - 14} 436 L${x - 30} 452 Z`;
  return (
    <g>
      <ellipse cx={x} cy="230" rx="130" ry="130" fill="url(#v-glow)" />
      {/* hexagonal basalt column: three visible faces */}
      <path d={`M${x - 44} 276 L${x - 24} 268 L${x - 24} 586 L${x - 44} 582 Z`} fill="#1a080b" />
      <path d={`M${x - 24} 268 H${x + 24} V586 H${x - 24} Z`} fill="#120609" />
      <path d={`M${x + 24} 268 L${x + 44} 276 L${x + 44} 582 L${x + 24} 586 Z`} fill="#0a0305" />
      <Noise id={`v-col-${x}`} freq="0.02 0.12" seed={x} color="#000000" gain={3} bias={-1.2} opacity={0.6}>
        <path d={`M${x - 44} 268 H${x + 44} V586 H${x - 44} Z`} />
      </Noise>
      <rect x={x - 25} y="268" width="2" height="318" fill="#ff8a4a" opacity="0.35" />
      <path d={`M${x - 44} 582 L${x - 24} 586 L${x + 24} 586 L${x + 44} 582 L${x + 44} 540 L${x - 44} 540 Z`} fill="#ff6a1a" opacity="0.12" />
      {/* capital + brazier */}
      <path d={`M${x - 60} 270 L${x + 60} 270 L${x + 50} 248 L${x - 50} 248 Z`} fill="#1e0b10" />
      <path d={`M${x - 60} 270 L${x + 60} 270 L${x + 60} 274 L${x - 60} 274 Z`} fill="#ff9a5a" opacity="0.45" />
      <path d={`M${x - 40} 248 Q${x} 262 ${x + 40} 248 L${x + 46} 226 L${x - 46} 226 Z`} fill="#2a1016" />
      <path d={`M${x - 46} 226 L${x + 46} 226 L${x + 44} 230 L${x - 44} 230 Z`} fill="#ffb060" opacity="0.7" />
      <path
        d={`M${x - 36} 228 C${x - 40} 200 ${x - 16} 190 ${x - 14} 160 C${x - 2} 178 ${x + 4} 150 ${x + 2} 128 C${x + 22} 152 ${x + 18} 176 ${x + 28} 168 C${x + 40} 190 ${x + 38} 210 ${x + 36} 228 Z`}
        fill="#e8401c"
      />
      <path
        d={`M${x - 24} 228 C${x - 26} 206 ${x - 8} 196 ${x - 6} 176 C${x + 2} 188 ${x + 6} 170 ${x + 6} 156 C${x + 18} 176 ${x + 14} 192 ${x + 22} 190 C${x + 28} 206 ${x + 26} 218 ${x + 24} 228 Z`}
        fill="#ffa53a"
      />
      <path d={`M${x - 12} 228 C${x - 12} 214 ${x - 2} 206 ${x} 192 C${x + 6} 206 ${x + 12} 214 ${x + 12} 228 Z`} fill="#fff1b0" />
      {/* the boss's crown banner */}
      <path d={banner} fill="#4b1a8a" />
      <path d={`M${x - 30} 290 H${x - 14} V440 L${x - 30} 452 Z`} fill="#2e0f5a" />
      <path d={`M${x + 8} 290 H${x + 16} V438 L${x + 8} 446 Z`} fill="#6a34b8" opacity="0.6" />
      <path d={banner} fill="none" stroke="#e0b23a" strokeWidth="2.5" />
      <rect x={x - 34} y="282" width="68" height="10" rx="3" fill="#2a1016" />
      <path d={`M${x - 15} 352 L${x - 15} 332 L${x - 7} 343 L${x} 326 L${x + 7} 343 L${x + 15} 332 L${x + 15} 352 Z`} fill="#e0b23a" />
      <rect x={x - 15} y="352" width="30" height="5" fill="#b8862a" />
      <path d={banner} fill="#ff7a2a" opacity="0.12" />
    </g>
  );
}

const CRACKS = [
  "M120 900 L200 800 L176 740 L240 676 L232 630 L268 600",
  "M200 800 L150 760",
  "M1480 900 L1396 790 L1440 724 L1366 660 L1380 616",
  "M1396 790 L1460 770",
  "M560 900 L610 840 L590 800 L630 760",
  "M1060 900 L1012 846 L1040 806 L1006 772",
  "M760 640 L790 620 L830 628 L856 612",
];

function Ground() {
  return (
    <Floor id="v" far="#3a1a18" near="#0b0405" joint="#050102" edge="#ff9a5a" tile={0.5} seed={33} mottle={0.7} grain={0.12} freq="0.006 0.02">
      <defs>
        <BlurDef id="v-crackglow" sd="7" />
        <GlowDef id="v-pool" color="#ff6a1a" a={0.45} />
      </defs>
      <ellipse cx="800" cy="590" rx="900" ry="40" fill="url(#v-pool)" />
      <ellipse cx="210" cy="760" rx="160" ry="70" fill="url(#v-pool)" opacity="0.6" />
      <ellipse cx="1420" cy="760" rx="160" ry="70" fill="url(#v-pool)" opacity="0.6" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#ff5a14" strokeWidth="14" opacity="0.55" filter="url(#v-crackglow)">
          {CRACKS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#ff7a1a" strokeWidth="4.5">
          {CRACKS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="#ffe08a" strokeWidth="1.6">
          {CRACKS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </Floor>
  );
}

const ROCK = "M-30 900 L-30 690 L10 668 L36 636 L58 674 L92 648 L120 700 L150 722 L176 790 L214 900 Z";
const ROCK_EDGE = "M-30 690 L10 668 L36 636 L58 674 L92 648 L120 700 L150 722 L176 790";

// Jagged foreground rocks in the bottom corners, rimmed by the floor cracks.
function Rocks({ side }: { side: -1 | 1 }) {
  return (
    <g transform={side < 0 ? undefined : "translate(1600 0) scale(-1 1)"}>
      <defs>
        <BlurDef id={`v-rockglow${side}`} sd="4" />
      </defs>
      <path d={ROCK} fill="#070203" />
      <path d="M36 636 L58 674 L44 724 L18 700 Z M92 648 L120 700 L104 760 L80 700 Z M150 722 L176 790 L160 840 L140 770 Z" fill="#1e0909" />
      <path d={ROCK_EDGE} fill="none" stroke="#ff6a1a" strokeWidth="6" opacity="0.45" filter={`url(#v-rockglow${side})`} />
      <path d={ROCK_EDGE} fill="none" stroke="#ff9a4a" strokeWidth="1.8" opacity="0.8" />
    </g>
  );
}

export function VolcanoFx() {
  return (
    <>
      <Flicker x={250} y={190} r={110} color="rgb(255 140 50 / 0.5)" />
      <Flicker x={1350} y={190} r={110} color="rgb(255 140 50 / 0.5)" delay={-1.3} />
      <Flicker x={800} y={560} r={420} color="rgb(255 110 30 / 0.16)" kind="amb-hum" />
      <Flicker x={800} y={262} r={170} color="rgb(255 170 70 / 0.3)" kind="amb-hum" delay={-2} />
      <Fog x={500} y={470} w={1000} h={120} color="rgb(40 8 8 / 0.45)" dur={60} />
      <Fog x={1150} y={420} w={900} h={100} color="rgb(50 10 10 / 0.4)" dur={80} delay={-35} />
    </>
  );
}
