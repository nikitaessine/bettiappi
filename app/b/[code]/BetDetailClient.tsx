"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateToken, getName, setName } from "@/lib/identity";

type BetParticipant = {
  id: string;
  decision: "PENDING" | "ACCEPTED" | "DECLINED";
  participant_id: string;
  participants: {
    id: string;
    display_name: string;
  };
};

type Bet = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  stake_amount: string;
  currency: string;
  mode: "H2H" | "MULTI";
  status: "OPEN" | "LOCKED" | "RESOLVED";
  creator_participant_id: string;
  creator_token: string;
  winner_participant_id: string | null;
  bet_participants: BetParticipant[];
};

type SettlementItem = {
  from_participant_id: string;
  to_participant_id: string;
  amount: string;
  currency: string;
  from_name: string;
  to_name: string;
};

interface Props {
  initialBet: Bet;
  code: string;
  initialSettlement: SettlementItem[];
}

export default function BetDetailClient({
  initialBet,
  code,
  initialSettlement
}: Props) {
  const [bet, setBet] = useState<Bet>(initialBet);
  const [settlement, setSettlement] = useState<SettlementItem[]>(
    initialSettlement
  );
  const [displayName, setDisplayNameState] = useState<string>(getName() ?? "");
  const [token, setToken] = useState<string>("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = getOrCreateToken();
    setToken(t);
    if (!getName()) {
      setShowNameModal(true);
    }
  }, []);

  const isCreator = useMemo(
    () => !!token && token === bet.creator_token,
    [token, bet.creator_token]
  );

  const currentParticipant = useMemo(() => {
    if (!token) return null;
    return bet.bet_participants.find(
      (bp) => bp.participants && bp.participants.id && bp.participants.id
    );
  }, [bet.bet_participants, token]);

  const acceptedParticipants = bet.bet_participants.filter(
    (bp) => bp.decision === "ACCEPTED"
  );

  async function ensureName(): Promise<string | null> {
    if (displayName.trim()) {
      setName(displayName.trim());
      try {
        await fetch("/api/identity/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token || getOrCreateToken(),
            displayName: displayName.trim()
          })
        });
      } catch {
        // ignore, non-critical
      }
      setShowNameModal(false);
      return displayName.trim();
    }
    setShowNameModal(true);
    return null;
  }

  async function handleDecision(decision: "ACCEPTED" | "DECLINED") {
    setActionError(null);
    if (!token) return;

    const name = await ensureName();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bets/${code}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          displayName: name,
          decision
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update response");
      }
      const data = await res.json();
      setBet(data.bet);
    } catch (err: any) {
      setActionError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLock(lock: boolean) {
    setActionError(null);
    if (!token || !isCreator) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bets/${code}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lock })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update lock status");
      }
      const data = await res.json();
      setBet((prev) => ({ ...prev, status: data.bet.status }));
    } catch (err: any) {
      setActionError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(winnerId: string) {
    setActionError(null);
    if (!token || !isCreator) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bets/${code}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          winnerParticipantId: winnerId
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resolve bet");
      }
      const data = await res.json();
      setBet((prev) => ({
        ...prev,
        ...data.bet,
        status: "RESOLVED",
        winner_participant_id: data.bet.winner_participant_id
      }));
      setSettlement(data.settlement || []);
    } catch (err: any) {
      setActionError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const betUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/b/${bet.code}`
      : "";

  async function handleCopyLink() {
    if (!betUrl) return;
    try {
      await navigator.clipboard.writeText(betUrl);
      alert("Link copied to clipboard");
    } catch {
      alert("Could not copy link");
    }
  }

  const winnerParticipant = bet.bet_participants.find(
    (bp) => bp.participant_id === bet.winner_participant_id
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                bet.status === "OPEN"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                  : bet.status === "LOCKED"
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                  : "bg-sky-500/10 text-sky-300 border border-sky-500/40"
              }`}
            >
              {bet.status}
            </span>
            <span className="text-xs rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
              {bet.mode === "H2H" ? "Head-to-head" : "Multi"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold">{bet.title}</h1>
          {bet.description && (
            <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">
              {bet.description}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-slate-300">
          <div className="font-medium">
            Stake: {bet.stake_amount} {bet.currency}
          </div>
          <div className="text-xs text-slate-400">
            Creator-only actions are highlighted in blue.
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-slate-300">
            Share this link so others can join:
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            Copy link
          </button>
        </div>
        <div className="truncate rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
          {betUrl}
        </div>
      </div>

      {actionError && (
        <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {actionError}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Participants</h2>
          <span className="text-xs text-slate-400">
            {bet.bet_participants.length} total
          </span>
        </div>

        <div className="space-y-2">
          {bet.bet_participants.map((bp) => (
            <div
              key={bp.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {bp.participants?.display_name ?? "Unknown"}
                </span>
                {bp.participant_id === bet.creator_participant_id && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300 border border-sky-500/40">
                    Creator
                  </span>
                )}
                {bet.winner_participant_id === bp.participant_id && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300 border border-emerald-500/40">
                    Winner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    bp.decision === "ACCEPTED"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                      : bp.decision === "DECLINED"
                      ? "bg-red-500/10 text-red-300 border border-red-500/40"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  {bp.decision}
                </span>
              </div>
            </div>
          ))}

          {bet.bet_participants.length === 0 && (
            <div className="text-xs text-slate-400">
              No participants yet. Share the link above to invite friends.
            </div>
          )}
        </div>
      </section>

      {bet.status !== "RESOLVED" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Your decision</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting || bet.status !== "OPEN"}
              onClick={() => handleDecision("ACCEPTED")}
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-400 disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={isSubmitting || bet.status !== "OPEN"}
              onClick={() => handleDecision("DECLINED")}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
            >
              Decline
            </button>
            {bet.status !== "OPEN" && (
              <span className="text-xs text-slate-400">
                Bet is locked or resolved; responses are closed.
              </span>
            )}
          </div>
        </section>
      )}

      {isCreator && bet.status !== "RESOLVED" && (
        <section className="space-y-3 rounded-lg border border-sky-700/60 bg-sky-950/20 p-4">
          <h2 className="text-sm font-semibold text-sky-200">
            Creator controls
          </h2>
          <p className="text-xs text-slate-200">
            You can lock the bet to prevent new participants, and resolve it by
            choosing a winner among accepted participants.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleLock(bet.status !== "LOCKED")}
              className="inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
            >
              {bet.status === "LOCKED" ? "Unlock bet" : "Lock bet"}
            </button>
            <span className="text-xs text-slate-300">
              {bet.status === "LOCKED"
                ? "Locked: no new responses allowed."
                : "Open: participants can still accept or decline."}
            </span>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-200">
              Resolve bet
            </div>
            {acceptedParticipants.length === 0 ? (
              <div className="text-xs text-slate-300">
                No accepted participants yet. You&apos;ll need at least one
                accepted participant to resolve.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Choose the winner. Each accepted loser will be recorded as
                  owing the stake amount to the winner.
                </p>
                <div className="flex flex-wrap gap-2">
                  {acceptedParticipants.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleResolve(bp.participant_id)}
                      className="inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-sky-400 disabled:opacity-60"
                    >
                      Mark {bp.participants?.display_name ?? "Unknown"} as
                      winner
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {bet.status === "RESOLVED" && (
        <section className="space-y-3 rounded-lg border border-emerald-700/60 bg-emerald-950/20 p-4">
          <h2 className="text-sm font-semibold text-emerald-200">
            Bet resolved
          </h2>
          {winnerParticipant && (
            <p className="text-sm text-emerald-100">
              Winner:{" "}
              <span className="font-semibold">
                {winnerParticipant.participants?.display_name ?? "Unknown"}
              </span>
            </p>
          )}

          <div className="mt-2 space-y-1 text-sm text-slate-100">
            <div className="font-medium">Settlement summary</div>
            {settlement.length === 0 ? (
              <p className="text-xs text-slate-200">
                No settlement records found for this bet.
              </p>
            ) : (
              <ul className="space-y-1 text-xs">
                {settlement.map((s, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{s.from_name}</span> owes{" "}
                    <span className="font-medium">{s.to_name}</span>{" "}
                    <span className="font-semibold">
                      {s.amount} {s.currency}
                    </span>
                    .
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {showNameModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Choose a display name</h2>
            <p className="text-sm text-slate-300">
              We use this name to show who is participating in bets and on the
              leaderboard. You can change it later.
            </p>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              placeholder="e.g. Alice"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!displayName.trim()) return;
                  ensureName();
                }}
                className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

