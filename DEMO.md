# Demoing Agent Arena

The pitch in one line: **"Can you beat AI in a fist fight?"** A real-time arcade fighter where every opponent is
a live model — Haiku, Sonnet, Opus and Jev — planning its moves while you play, and the faster model literally
reacts faster.

## 1. The 3-minute live demo

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | Title screen, share card | "Four AI agents. One arcade cabinet. Can you beat them?" |
| 0:15 | Sign in with GitHub → name → lobby | Hearts (5 runs, +1 / 30 min), daily streak, level, wardrobe |
| 0:40 | Fight your first opponent (the order is random each run) | Point at the **⏱ think time + queued moves** chip: the model plans 5–10 moves ahead, the game never waits; when a plan runs out the fallback move fires |
| 1:20 | Fight the next one, lose on purpose | "Lose once and you're out — now the agents fight each other." |
| 1:40 | Showdown (random bracket) | When Sonnet meets Opus, wait for Sonnet to get low → **PLOT TWIST: Haiku sub-agents** |
| 2:10 | Results → XP count-up, achievements, **Share on X** | The card is rendered client-side and the share link unfurls with it |
| 2:30 | Convex dashboard | Workflow run (each match awaits a `matchResult` event), AI Budget spend per fighter, `runsByDay` aggregate, rate limiter |

Tips: run it on the prod URL, pre-warm by playing one round, keep sound on (announcer + hits), and have a backup
screen recording.

## 2. Make it demo-proof (recommended additions)

1. **Attract mode** — like real cabinets: after ~15s idle on the title screen, play an AI-vs-AI exhibition with
   scripted brains (no model calls, no login, free). Instantly shows the game on a booth screen or a link click.
2. **`?demo=1` flag** (dev/prod behind a secret) — no heart cost, shorter rounds (30s), and the showdown starts
   with Sonnet vs Opus so the plot twist is guaranteed in under a minute.
3. **Seeded leaderboard** — a few named runs so the High Scores tab isn't empty.
4. **Recorded trailer (30s)** — capture at 60fps (Screen Studio/OBS): FIGHT! → a kick → FINISH IT! → plot twist →
   WINNER: SONNET → share card. Post it with the share link so the X card unfurls under the video.

## 3. Launch

- Post: trailer + "I beat 3/4 AI agents… can you beat Opus?" + share link (card = `public/og.png` / per-run card).
- Ask people to reply with their share cards; the leaderboard is the hook, streaks + outfits bring them back.
- Watch spend in the AI Usage tab and the AI Budget global cap (`limits.ts`), raise it before launch day.
