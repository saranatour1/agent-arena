// A fighter is a 2D skeleton (facing right, ground at y=205, sprite viewBox
// "10 10 180 200"). Animations tween between these key poses.
export type Pt = [number, number];
export type Pose = {
  P: Pt; // pelvis
  N: Pt; // neck base / chest
  H: Pt; // head center
  eB: Pt; // back elbow
  hB: Pt; // back hand
  eF: Pt; // front elbow
  hF: Pt; // front hand
  kB: Pt; // back knee
  fB: Pt; // back foot
  kF: Pt; // front knee
  fF: Pt; // front foot
  glow?: number; // Jev's visor flash, 0–1
  billow?: number; // Opus's cape lift, 0–1
};
export type PoseName = keyof typeof POSES;

const JOINTS = ["P", "N", "H", "eB", "hB", "eF", "hF", "kB", "fB", "kF", "fF"] as const;

export const POSES = {
  idle: {
    P: [92, 122], N: [98, 76], H: [102, 55],
    eB: [86, 100], hB: [104, 86], eF: [114, 96], hF: [128, 80],
    kB: [76, 156], fB: [62, 204], kF: [112, 158], fF: [124, 204],
  },
  idleLow: {
    P: [92, 125], N: [98, 79], H: [102, 58],
    eB: [86, 103], hB: [104, 89], eF: [114, 99], hF: [128, 83],
    kB: [75, 157], fB: [62, 204], kF: [113, 159], fF: [124, 204],
  },
  punchWind: {
    P: [90, 123], N: [94, 78], H: [97, 58],
    eB: [84, 100], hB: [100, 88], eF: [104, 100], hF: [112, 90],
    kB: [74, 157], fB: [62, 204], kF: [110, 159], fF: [124, 204],
  },
  punch: {
    P: [98, 122], N: [108, 76], H: [113, 57],
    eB: [92, 98], hB: [108, 88], eF: [134, 78], hF: [160, 74],
    kB: [80, 156], fB: [62, 204], kF: [120, 158], fF: [134, 204],
  },
  kickChamber: {
    P: [90, 120], N: [88, 76], H: [90, 56],
    eB: [80, 98], hB: [96, 86], eF: [104, 94], hF: [116, 82],
    kB: [86, 160], fB: [84, 204], kF: [116, 118], fF: [108, 150],
  },
  kick: {
    P: [90, 122], N: [78, 80], H: [74, 61],
    eB: [66, 100], hB: [58, 112], eF: [96, 94], hF: [108, 84],
    kB: [86, 162], fB: [86, 204], kF: [128, 106], fF: [170, 90],
  },
  walkA: {
    P: [93, 122], N: [99, 76], H: [103, 55],
    eB: [86, 100], hB: [104, 86], eF: [114, 96], hF: [128, 80],
    kB: [78, 158], fB: [58, 204], kF: [116, 156], fF: [132, 204],
  },
  walkB: {
    P: [93, 119], N: [99, 73], H: [103, 52],
    eB: [87, 98], hB: [105, 84], eF: [114, 94], hF: [128, 78],
    kB: [100, 156], fB: [92, 204], kF: [96, 158], fF: [100, 204],
  },
  dizzy: {
    P: [90, 126], N: [86, 82], H: [84, 63],
    eB: [76, 104], hB: [72, 124], eF: [98, 104], hF: [100, 126],
    kB: [78, 162], fB: [70, 204], kF: [104, 162], fF: [112, 204],
  },
  block: {
    P: [90, 124], N: [95, 80], H: [98, 60],
    eB: [104, 96], hB: [114, 70], eF: [110, 88], hF: [112, 62],
    kB: [72, 158], fB: [60, 204], kF: [110, 160], fF: [122, 204],
  },
  specialCharge: {
    P: [88, 128], N: [90, 84], H: [92, 64],
    eB: [80, 108], hB: [72, 118], eF: [84, 110], hF: [76, 120],
    kB: [70, 162], fB: [56, 204], kF: [108, 164], fF: [122, 204],
  },
  special: {
    P: [96, 124], N: [106, 80], H: [111, 61],
    eB: [124, 84], hB: [146, 82], eF: [126, 90], hF: [148, 92],
    kB: [76, 158], fB: [58, 204], kF: [120, 160], fF: [136, 204],
  },
  hit: {
    P: [88, 124], N: [84, 80], H: [78, 62],
    eB: [74, 94], hB: [66, 108], eF: [96, 92], hF: [104, 108],
    kB: [74, 158], fB: [62, 204], kF: [104, 162], fF: [114, 204],
  },
  ko: {
    P: [96, 196], N: [56, 192], H: [36, 190],
    eB: [50, 176], hB: [40, 168], eF: [66, 180], hF: [74, 170],
    kB: [124, 184], fB: [150, 198], kF: [126, 190], fF: [156, 202],
  },
  win: {
    P: [92, 122], N: [96, 76], H: [99, 55],
    eB: [86, 100], hB: [100, 90], eF: [118, 58], hF: [130, 34],
    kB: [78, 158], fB: [66, 204], kF: [108, 160], fF: [120, 204],
  },
} satisfies Record<string, Pose>;

// Victory celebrations: each fighter's key poses, sequenced in rt/pose.ts.
export const WIN_POSES = {
  // The challenger: crouch, hop into a fist pump, keep pumping.
  player: {
    crouch: {
      P: [92, 130], N: [97, 85], H: [100, 64],
      eB: [84, 107], hB: [102, 97], eF: [96, 111], hF: [115, 120],
      kB: [72, 160], fB: [60, 204], kF: [116, 160], fF: [126, 204],
    },
    pump: {
      P: [93, 118], N: [97, 72], H: [99, 51],
      eB: [83, 93], hB: [93, 111], eF: [110, 55], hF: [122, 33],
      kB: [80, 152], fB: [64, 192], kF: [112, 148], fF: [116, 190],
    },
    high: {
      P: [92, 121], N: [96, 75], H: [99, 54],
      eB: [83, 96], hB: [93, 112], eF: [110, 58], hF: [122, 36],
      kB: [76, 158], fB: [60, 204], kF: [110, 159], fF: [124, 204],
    },
    low: {
      P: [92, 125], N: [96, 79], H: [99, 58],
      eB: [83, 100], hB: [93, 116], eF: [108, 104], hF: [120, 87],
      kB: [75, 160], fB: [60, 204], kF: [111, 161], fF: [124, 204],
    },
  },
  // Haiku: a quick tucked backflip, a polite bow, then happy little hops.
  haiku: {
    crouch: {
      P: [90, 134], N: [100, 92], H: [106, 72],
      eB: [84, 110], hB: [66, 118], eF: [90, 114], hF: [72, 122],
      kB: [72, 162], fB: [62, 204], kF: [114, 164], fF: [124, 204],
    },
    tuck: {
      P: [92, 132], N: [100, 90], H: [110, 74],
      eB: [110, 112], hB: [116, 130], eF: [114, 110], hF: [120, 128],
      kB: [122, 116], fB: [108, 156], kF: [118, 108], fF: [112, 152],
    },
    land: {
      P: [92, 134], N: [99, 90], H: [104, 70],
      eB: [80, 106], hB: [62, 102], eF: [116, 104], hF: [134, 96],
      kB: [72, 162], fB: [60, 204], kF: [116, 164], fF: [126, 204],
    },
    bow: {
      P: [84, 121], N: [108, 82], H: [122, 70],
      eB: [104, 108], hB: [123, 98], eF: [111, 107], hF: [126, 95],
      kB: [80, 161], fB: [78, 204], kF: [92, 161], fF: [96, 204],
    },
    cheer: {
      P: [92, 118], N: [96, 72], H: [99, 51],
      eB: [84, 58], hB: [74, 40], eF: [110, 58], hF: [124, 40],
      kB: [84, 158], fB: [80, 204], kF: [102, 158], fF: [106, 204],
    },
    cheerLow: {
      P: [92, 126], N: [96, 80], H: [99, 59],
      eB: [82, 68], hB: [70, 54], eF: [112, 68], hF: [128, 54],
      kB: [80, 162], fB: [78, 204], kF: [106, 162], fF: [106, 204],
    },
  },
  // Sonnet: "ta-da!", a deep courtly bow (quill sweeping), then recites.
  sonnet: {
    flourish: {
      P: [90, 122], N: [92, 76], H: [94, 55],
      eB: [74, 92], hB: [56, 100], eF: [108, 64], hF: [126, 52],
      kB: [84, 160], fB: [78, 204], kF: [116, 156], fF: [140, 198],
    },
    bow: {
      P: [86, 124], N: [121, 94], H: [141, 87],
      eB: [98, 86], hB: [78, 78], eF: [128, 116], hF: [112, 110],
      kB: [74, 162], fB: [64, 204], kF: [112, 158], fF: [132, 202],
    },
    recite: {
      P: [92, 121], N: [94, 75], H: [93, 54],
      eB: [76, 94], hB: [88, 108], eF: [113, 70], hF: [130, 58],
      kB: [84, 160], fB: [76, 204], kF: [108, 160], fF: [124, 204],
    },
    reciteHigh: {
      P: [92, 122], N: [93, 76], H: [91, 55],
      eB: [75, 95], hB: [87, 109], eF: [110, 66], hF: [124, 48],
      kB: [84, 161], fB: [76, 204], kF: [108, 161], fF: [124, 204],
    },
  },
  // Jev: snaps to attention in discrete steps, salutes, visor flashing.
  jev: {
    attention: {
      P: [94, 120], N: [94, 74], H: [94, 53],
      eB: [90, 100], hB: [90, 122], eF: [98, 100], hF: [98, 122],
      kB: [90, 162], fB: [88, 204], kF: [98, 162], fF: [100, 204],
      glow: 0.6,
    },
    salute: {
      P: [94, 120], N: [94, 74], H: [94, 53],
      eB: [90, 100], hB: [90, 122], eF: [112, 62], hF: [108, 39],
      kB: [90, 162], fB: [88, 204], kF: [98, 162], fF: [100, 204],
      glow: 1,
    },
  },
  // Opus: draws himself up, then slowly raises a fist as the cape lifts.
  opus: {
    tall: {
      P: [92, 120], N: [94, 74], H: [93, 53],
      eB: [76, 94], hB: [88, 108], eF: [102, 98], hF: [110, 116],
      kB: [74, 158], fB: [60, 204], kF: [112, 158], fF: [126, 204],
      billow: 0.35,
    },
    raise: {
      P: [92, 119], N: [94, 73], H: [92, 52],
      eB: [76, 93], hB: [88, 107], eF: [113, 57], hF: [123, 34],
      kB: [74, 157], fB: [60, 204], kF: [112, 157], fF: [126, 204],
      billow: 1,
    },
    raiseLow: {
      P: [92, 121], N: [94, 75], H: [92, 54],
      eB: [76, 95], hB: [88, 109], eF: [113, 59], hF: [124, 36],
      kB: [74, 158], fB: [60, 204], kF: [112, 158], fF: [126, 204],
      billow: 0.7,
    },
  },
} satisfies Record<string, Record<string, Pose>>;

const mix = (a = 0, b = 0, t: number) => a + (b - a) * t;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of JOINTS) {
    out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  }
  if (a.glow || b.glow) out.glow = mix(a.glow, b.glow, t);
  if (a.billow || b.billow) out.billow = mix(a.billow, b.billow, t);
  return out;
}

export function shiftPose(p: Pose, dx: number, dy: number): Pose {
  const out = { ...p };
  for (const k of JOINTS) out[k] = [p[k][0] + dx, p[k][1] + dy];
  return out;
}

// Rotate the whole skeleton about its centre of mass (screen degrees, clockwise).
export function spinPose(p: Pose, degrees: number): Pose {
  const a = (degrees * Math.PI) / 180;
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  const cx = JOINTS.reduce((s, k) => s + p[k][0], 0) / JOINTS.length;
  const cy = JOINTS.reduce((s, k) => s + p[k][1], 0) / JOINTS.length;
  const out = { ...p };
  for (const k of JOINTS) {
    const [x, y] = [p[k][0] - cx, p[k][1] - cy];
    out[k] = [cx + x * cos - y * sin, cy + x * sin + y * cos];
  }
  return out;
}

export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const smooth = (t: number) => t * t * (3 - 2 * t);
