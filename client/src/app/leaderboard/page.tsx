"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { IUser } from "@/lib/types";
import { fetchLeaderboard } from "@/lib/utils";

export default function LeaderboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<IUser[]>([]);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return; // Wait until NextAuth finishes loading
    if (status === "unauthenticated") router.push("/");

    fetchLeaderboard(setTeams);
  }, [router, status]);

  const handleRefresh = () => {
    fetchLeaderboard(setTeams);
  };

  const topThree = teams.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-500">
                Hack-A-Cure
              </h1>
            </Link>
            <p className="text-sm text-muted-foreground">
              Competition Leaderboard
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleRefresh}
              className="hover:bg-[rgb(30,86,213)] hover:text-white"
              variant="outline"
            >
              Refresh Leaderboard
            </Button>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="hover:bg-[rgb(30,86,213)] hover:text-white"
              >
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Podium Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Top Performers
          </h2>

          {teams.length === 0 ? (
            <p className="text-center text-muted-foreground">No teams yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 items-end">
              {/* 2nd Place */}
              {topThree[1] ? (
                <div className="md:order-1">
                  <Card className="border-border bg-card/50 hover:bg-card/70 transition">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold mb-2 text-silver">
                          🥈
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                          {topThree[1].teamName}
                        </h3>
                        <div className="text-3xl font-bold text-cyan-400 mb-2">
                          {topThree[1].bestScore.toFixed(1)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="md:order-1 text-center text-muted-foreground">
                  —
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] ? (
                <div className="md:order-2 md:-mt-8">
                  <Card className="border-2 border-yellow-500/50 bg-linear-to-b from-yellow-500/10 to-card/50 hover:border-yellow-500 transition">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-6xl font-bold mb-2">🥇</div>
                        <h3 className="text-2xl font-bold mb-2">
                          {topThree[0].teamName}
                        </h3>
                        <div className="text-4xl font-bold text-yellow-400 mb-2">
                          {topThree[0].bestScore.toFixed(1)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="md:order-2 text-center text-muted-foreground">
                  —
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] ? (
                <div className="md:order-3">
                  <Card className="border-border bg-card/50 hover:bg-card/70 transition">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold mb-2">🥉</div>
                        <h3 className="text-xl font-bold mb-2">
                          {topThree[2].teamName}
                        </h3>
                        <div className="text-3xl font-bold text-orange-400 mb-2">
                          {topThree[2].bestScore.toFixed(1)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="md:order-3 text-center text-muted-foreground">
                  —
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Full Leaderboard</CardTitle>
            <CardDescription>
              All teams ranked by score. Scores are updated every 15 mins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Rank</th>
                    <th className="text-left py-3 px-4 justify-start flex font-medium">
                      Team Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="">
                  {teams.map((team, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border transition ${
                        team._id === session?.user?.id
                          ? "bg-blue-500/10 hover:bg-blue-500/20"
                          : "hover:bg-card/50"
                      }`}
                    >
                      <td className="py-3 px-4 w-1/3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{i + 1}</span>
                          {i + 1 === 1 && <span>🥇</span>}
                          {i + 1 === 2 && <span>🥈</span>}
                          {i + 1 === 3 && <span>🥉</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex w-full justify-start items-center gap-2 ">
                          <span className="font-medium">{team.teamName}</span>
                          {team._id === session?.user.id && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 w-full px-4 flex">
                        <span className="font-bold text-lg text-cyan-400">
                          {team.bestScore.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Leaderboard is updated every 15 mins</p>
        </div>
      </main>
    </div>
  );
}
