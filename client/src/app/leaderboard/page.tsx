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

interface TeamScore {
  rank: number;
  teamName: string;
  score: number;
  lastSubmission: string;
  isCurrentTeam?: boolean;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamScore[]>([
    {
      rank: 1,
      teamName: "Neural Nexus",
      score: 94.2,
      lastSubmission: "2025-01-15 02:45 PM",
    },
    {
      rank: 2,
      teamName: "Data Wizards",
      score: 92.8,
      lastSubmission: "2025-01-15 01:20 PM",
    },
    {
      rank: 3,
      teamName: "AI Architects",
      score: 91.5,
      lastSubmission: "2025-01-14 11:30 AM",
    },
    {
      rank: 4,
      teamName: "Code Crusaders",
      score: 89.3,
      lastSubmission: "2025-01-14 09:15 AM",
    },
    {
      rank: 5,
      teamName: "ML Masters",
      score: 87.9,
      lastSubmission: "2025-01-13 04:00 PM",
    },
    {
      rank: 6,
      teamName: "Tech Titans",
      score: 86.4,
      lastSubmission: "2025-01-13 02:30 PM",
    },
    {
      rank: 7,
      teamName: "Algorithm Aces",
      score: 85.1,
      lastSubmission: "2025-01-12 10:00 AM",
    },
    {
      rank: 8,
      teamName: "Quantum Quest",
      score: 83.7,
      lastSubmission: "2025-01-12 08:45 AM",
    },
    {
      rank: 9,
      teamName: "Logic League",
      score: 82.2,
      lastSubmission: "2025-01-11 03:20 PM",
    },
    {
      rank: 10,
      teamName: "Code Collective",
      score: 80.5,
      lastSubmission: "2025-01-11 01:00 PM",
    },
  ]);

    const { data: session, status } = useSession();

  const [currentTeam, setCurrentTeam] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // Wait until NextAuth finishes loading
    if (status === "unauthenticated") router.push("/");
  }, [router, status]);

  useEffect(() => {
    const team = localStorage.getItem("teamName");
    setCurrentTeam(team);

    // Mark current team
    if (team) {
      setTeams((prevTeams) =>
        prevTeams.map((t) => ({
          ...t,
          isCurrentTeam: t.teamName === team,
        }))
      );
    }
  }, []);

  const handleRefresh = () => {
    // Simulate refresh
    setTeams((prevTeams) =>
      prevTeams.map((team) => ({
        ...team,
        score: team.score + (Math.random() - 0.5) * 2,
      }))
    );
  };

  const topThree = teams.slice(0, 3);
  const restTeams = teams.slice(3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Hack-A-Cure
            </h1>
            <p className="text-sm text-muted-foreground">
              Competition Leaderboard
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <label
                htmlFor="autoRefresh"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Auto-refresh
              </label>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              Refresh Leaderboard
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
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

          <div className="grid md:grid-cols-3 gap-6 items-end">
            {/* 2nd Place */}
            <div className="md:order-1">
              <Card className="border-border bg-card/50 hover:bg-card/70 transition">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2 text-silver">
                      🥈
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {topThree[1]?.teamName}
                    </h3>
                    <div className="text-3xl font-bold text-cyan-400 mb-2">
                      {topThree[1]?.score.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last: {topThree[1]?.lastSubmission}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 1st Place */}
            <div className="md:order-2 md:-mt-8">
              <Card className="border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-card/50 hover:border-yellow-500 transition">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-2">🥇</div>
                    <h3 className="text-2xl font-bold mb-2">
                      {topThree[0]?.teamName}
                    </h3>
                    <div className="text-4xl font-bold text-yellow-400 mb-2">
                      {topThree[0]?.score.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last: {topThree[0]?.lastSubmission}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3rd Place */}
            <div className="md:order-3">
              <Card className="border-border bg-card/50 hover:bg-card/70 transition">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">🥉</div>
                    <h3 className="text-xl font-bold mb-2">
                      {topThree[2]?.teamName}
                    </h3>
                    <div className="text-3xl font-bold text-orange-400 mb-2">
                      {topThree[2]?.score.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last: {topThree[2]?.lastSubmission}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Full Leaderboard</CardTitle>
            <CardDescription>
              All teams ranked by score. Scores are auto-updated after every
              evaluation round.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Rank</th>
                    <th className="text-left py-3 px-4 font-medium">
                      Team Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Score</th>
                    <th className="text-left py-3 px-4 font-medium">
                      Last Submission
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr
                      key={team.rank}
                      className={`border-b border-border transition ${
                        team.isCurrentTeam
                          ? "bg-blue-500/10 hover:bg-blue-500/20"
                          : "hover:bg-card/50"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{team.rank}</span>
                          {team.rank === 1 && <span>🥇</span>}
                          {team.rank === 2 && <span>🥈</span>}
                          {team.rank === 3 && <span>🥉</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{team.teamName}</span>
                          {team.isCurrentTeam && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-lg text-cyan-400">
                          {team.score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {team.lastSubmission}
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
          <p>
            Scores are auto-updated after every evaluation round. Next update in
            approximately 2 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
