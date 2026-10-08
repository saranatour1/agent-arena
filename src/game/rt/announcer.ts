import type { BannerItem } from "../../components/fight/Banner";
import { isFinalRound, type World } from "./engine";

const RED = "#e8192c";

export function announce(
  w: World,
  names: [string, string],
  playerSide: number,
): { items: BannerItem[]; key: string; persistLast: boolean } {
  const none = { items: [], key: "none", persistLast: false };
  switch (w.phase) {
    case "intro": {
      return {
        items: [{ text: isFinalRound(w) ? "FINAL ROUND" : `ROUND ${w.round}` }, { text: "FIGHT!", color: RED }],
        key: `intro-${w.round}`,
        persistLast: false,
      };
    }
    case "finish":
      return { items: [{ text: "FINISH IT!", color: RED }], key: `finish-${w.round}`, persistLast: true };
    case "roundEnd": {
      if (w.roundWinner === null) return { items: [{ text: "DRAW!" }], key: `draw-${w.round}`, persistLast: true };
      const items: BannerItem[] = [{ text: w.roundEndReason === "time" ? "TIME!" : "K.O.!", color: RED }];
      if (w.f[w.roundWinner].flawless) items.push({ text: "PERFECT!" });
      return { items, key: `end-${w.round}`, persistLast: true };
    }
    case "matchEnd": {
      if (w.winner === null) return none;
      const text =
        playerSide >= 0 ? (w.winner === playerSide ? "YOU WIN!" : "YOU LOSE") : `${names[w.winner]}\nWINS!`;
      return { items: [{ text }], key: "match-end", persistLast: true };
    }
    default:
      return none;
  }
}
