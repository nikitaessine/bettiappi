"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateToken, getName, setName } from "@/lib/identity";
import { QRCodeCanvas } from "qrcode.react";

type Mode = "H2H" | "MULTI";

export default function CreateBetPage() {
  const router = useRouter();
  const [step, setStep] = useState<"FORM" | "SHARE">("FORM");
  const [displayName, setDisplayNameState] = useState(getName() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betCode, setBetCode] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "GBP">("EUR");
  const [mode, setMode] = useState<Mode>("H2H");

  const betUrl =
    typeof window !== "undefined" && betCode
      ? `${window.location.origin}/b/${betCode}`
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }

    const amount = Number(stakeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      setError("Stake amount must be between 0 and 1,000,000.");
      return;
    }

    setSaving(true);
    try {
      const token = getOrCreateToken();
      setName(displayName.trim());

      const res = await fetch("/api/bets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          displayName: displayName.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          stakeAmount: amount,
          currency,
          mode
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create bet");
      }

      const data = await res.json();
      setBetCode(data.code);
      setStep("SHARE");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!betUrl) return;
    try {
      await navigator.clipboard.writeText(betUrl);
      alert("Link copied to clipboard");
    } catch {
      alert("Could not copy link");
    }
  }

  if (step === "SHARE" && betCode) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Bet created</h1>
        <p className="text-slate-300">
          Share this link with your friends so they can accept or decline.
        </p>

        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Bet link
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 truncate text-sm bg-slate-950/60 px-3 py-2 rounded border border-slate-800">
              {betUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-400"
            >
              Copy link
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 inline-flex flex-col items-center">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            QR code
          </div>
          {betUrl && (
            <QRCodeCanvas
              value={betUrl}
              size={160}
              bgColor="#020617"
              fgColor="#e5e7eb"
            />
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => router.push(`/b/${betCode}`)}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Go to bet page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Create a bet</h1>
      <p className="text-sm text-slate-300">
        Fill in the details of your friendly bet. We&apos;ll create a link you
        can share with your friends. This is tracking-only&mdash;no payments are
        handled.
      </p>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Your display name</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={displayName}
            onChange={(e) => setDisplayNameState(e.target.value)}
            placeholder="e.g. Alice"
          />
          <p className="text-xs text-slate-400">
            This is how you&apos;ll appear on bets and the leaderboard.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Who wins the next game?"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500 min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra details, rules, or context."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Stake amount</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Currency</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bet mode</label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              type="button"
              onClick={() => setMode("H2H")}
              className={`rounded-md border px-3 py-2 text-left ${
                mode === "H2H"
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-700 bg-slate-950"
              }`}
            >
              <div className="font-medium">Head-to-head</div>
              <div className="text-xs text-slate-400">
                You vs one challenger. First accept wins.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("MULTI")}
              className={`rounded-md border px-3 py-2 text-left ${
                mode === "MULTI"
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-700 bg-slate-950"
              }`}
            >
              <div className="font-medium">Multi</div>
              <div className="text-xs text-slate-400">
                Many can accept. You pick one winner later.
              </div>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-400 disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create bet"}
        </button>
      </form>
    </div>
  );
}

