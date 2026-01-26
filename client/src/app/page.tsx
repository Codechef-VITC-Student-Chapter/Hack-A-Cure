"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchLeaderboard } from "@/lib/utils";
import type { IUser } from "@/lib/types";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<IUser[]>([]);

  // Show up to 6 decimal places (trim trailing zeros)
  const formatScore = (val: number) =>
    Number.isFinite(val) ? parseFloat(val.toFixed(6)).toString() : "0";

  useEffect(() => {
    // Try to fetch leaderboard; if route is protected, this will fail silently and show "No teams yet."
    fetchLeaderboard(setTeams);
  }, []);

  const topThree = teams.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-500">
          Hack-A-Cure
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Glowing background effect */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="text-center max-w-3xl">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-balance">
            Hack-A-Cure
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-balance">
            AI Retrieval-Augmented Generation Challenge 2025
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto text-balance">
            Build intelligent RAG models capable of answering complex questions
            from multiple textbooks. Push the limits of AI retrieval and
            reasoning.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6 bg-card/50 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">
            About the Competition
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Hack-A-Cure is a competition where participants build
                intelligent RAG models capable of answering complex questions
                from multiple textbooks. Push the limits of AI retrieval and
                reasoning.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>Build advanced RAG systems</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>Compete on accuracy and latency</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>Win prizes and recognition</span>
                </li>
              </ul>
            </div>

            <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-border flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🧠</div>
                <p className="text-muted-foreground">AI-Powered Competition</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Sponsors</h2>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-card/50 border border-border rounded-lg p-8 flex items-center justify-center">
              <Image
                src="/xyz-logo-color.png"
                alt="XYZ Logo"
                width={200}
                height={100}
                className="object-contain"
              />
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-8 flex items-center justify-center">
              <Image
                src="/Sponsor_Mgm.png"
                alt="XYZ Logo"
                width={200}
                height={100}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Final Leaderboard
          </h2>

          {/* Podium */}
          <div className="mb-12">
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
                            {`${topThree[1].teamName}${
                              topThree[1].name ? ` - ${topThree[1].name}` : ""
                            }`}
                          </h3>
                          <div className="text-3xl font-bold text-cyan-400 mb-2">
                            {formatScore(topThree[1].bestScore)}
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
                            {`${topThree[0].teamName}${
                              topThree[0].name ? ` - ${topThree[0].name}` : ""
                            }`}
                          </h3>
                          <div className="text-4xl font-bold text-yellow-400 mb-2">
                            {formatScore(topThree[0].bestScore)}
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
                            {`${topThree[2].teamName}${
                              topThree[2].name ? ` - ${topThree[2].name}` : ""
                            }`}
                          </h3>
                          <div className="text-3xl font-bold text-orange-400 mb-2">
                            {formatScore(topThree[2].bestScore)}
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
              <CardDescription>All teams ranked by score.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 justify-start flex font-medium">
                        Team - Participant
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-[200px]">
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
                            <span className="font-medium">
                              {`${team.teamName}${
                                team.name ? ` - ${team.name}` : ""
                              }`}
                            </span>
                            {team._id === session?.user?.id && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 w-full px-4 flex">
                          <span className="font-bold text-lg text-cyan-400">
                            {formatScore(team.bestScore)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>Built for innovators. Powered by knowledge.</p>
            <p className="mt-2">© 2025 Hack-A-Cure. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
