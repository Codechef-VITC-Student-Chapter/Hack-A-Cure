"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function LandingPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Hack-A-Cure
        </div>
        <div className="flex gap-4">
          {status === "authenticated" && session ? (
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
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

          {
            status !== "authenticated" &&
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="border-2 border-cyan-400 hover:bg-cyan-400/10"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Register
                </Button>
              </Link>
            </div>
          }
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

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Rules
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    API Docs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Examples
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Community</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Forum
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Sponsors</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Become a Sponsor
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition">
                    Partners
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>Built for innovators. Powered by knowledge.</p>
            <p className="mt-2">© 2025 Hack-A-Cure. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
