import { useState } from "react";
import { useQuery } from "convex/react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "../../../convex/_generated/api";
import { FIGHTERS, type FighterId } from "../../../convex/game/fighters";
import { Achievements } from "./Achievements";

const dollars = (nanos: number) => `$${(nanos / 1e9).toFixed(4)}`;

export function Leaderboard({ achievements, me }: { achievements: string[]; me: string }) {
  const board = useQuery(api.game.leaderboard);
  const [tab, setTab] = useState("scores");
  const usage = useQuery(api.limits.usage, tab === "usage" ? {} : "skip");
  const pvp = useQuery(api.pvp.leaderboard, tab === "pvp" ? {} : "skip");
  const loading = <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>;
  return (
    <Card className="border-2 bg-card/85">
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3 w-full sm:w-auto">
            <TabsTrigger value="scores">High scores</TabsTrigger>
            <TabsTrigger value="pvp">PvP</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="trophies">Trophies</TabsTrigger>
            <TabsTrigger value="usage">AI usage</TabsTrigger>
          </TabsList>

          <TabsContent value="scores">
            {board === undefined ? (
              loading
            ) : board.players.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No challengers yet — be the first.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Fighter</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.players.map((p, i) => (
                    <TableRow key={p.username} className={p.username === me ? "bg-accent/10" : undefined}>
                      <TableCell className="font-display text-lg text-accent">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        {p.username}
                        {p.clears > 0 && <span title="Beat all four agents"> 👑</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.runs}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{p.bestScore.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="pvp">
            {pvp === undefined ? (
              loading
            ) : pvp.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No ranked fights yet. Hit Find opponent to start one.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Fighter</TableHead>
                    <TableHead className="text-right">W – L</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pvp.map((p, i) => (
                    <TableRow key={p.username} className={p.username === me ? "bg-accent/10" : undefined}>
                      <TableCell className="font-display text-lg text-accent">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.username}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.wins} – {p.losses}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{p.rating}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="agents">
            {board === undefined ? (
              loading
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Wins – Losses</TableHead>
                    <TableHead className="text-right">vs Humans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...board.fighters]
                    .sort((a, b) => b.wins - a.wins)
                    .map((f) => (
                      <TableRow key={f.fighterId}>
                        <TableCell className="font-display text-lg tracking-wide" style={{ color: FIGHTERS[f.fighterId].color }}>
                          {FIGHTERS[f.fighterId].name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.wins} – {f.losses}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.humanWins} – {f.humanLosses}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="trophies">
            <Achievements unlocked={achievements} />
          </TabsContent>

          <TabsContent value="usage">
            {usage === undefined ? (
              loading
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.fighters.map((f) => (
                      <TableRow key={f.fighterId}>
                        <TableCell className="font-display text-lg tracking-wide" style={{ color: FIGHTERS[f.fighterId as FighterId]?.color }}>
                          {FIGHTERS[f.fighterId as FighterId]?.name ?? f.fighterId}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{f.requests}</TableCell>
                        <TableCell className="text-right tabular-nums">{f.tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{dollars(f.spendNanos)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-sm text-muted-foreground">
                  Today {dollars(usage.spentTodayNanos)}
                  {usage.dailyLimitNanos !== null && ` of ${dollars(usage.dailyLimitNanos)} daily cap`} · all time{" "}
                  {dollars(usage.spentTotalNanos)}
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
