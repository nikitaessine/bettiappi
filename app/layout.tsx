import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quick Bets with Friends",
  description: "Track friendly bets with friends. No payments, just a fun ledger."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg">
              Quick Bets with Friends
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/create">Create Bet</a>
              <a href="/leaderboard">Leaderboard</a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-800 bg-slate-950/90">
          <div className="mx-auto max-w-4xl px-4 py-4 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">
              Tracking only. No payments. Use responsibly.
            </div>
            <p>
              This app is a friendly ledger for informal bets with friends. It
              does not process money, escrow funds, or provide gambling
              services. You are solely responsible for any real-world
              arrangements.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

