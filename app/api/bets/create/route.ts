import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateBetCode } from "@/lib/betCode";

const bodySchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  stakeAmount: z.number().positive().max(1_000_000),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  mode: z.enum(["H2H", "MULTI"])
});

async function upsertParticipant(admin: ReturnType<typeof supabaseAdminClient>, token: string, displayName: string) {
  const { data: existing, error: existingError } = await admin
    .from("participants")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.display_name !== displayName) {
      const { data, error } = await admin
        .from("participants")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return existing;
  }

  const { data, error } = await admin
    .from("participants")
    .insert({
      token,
      display_name: displayName
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);

    const admin = supabaseAdminClient();

    const participant = await upsertParticipant(
      admin,
      parsed.token,
      parsed.displayName
    );

    let code = generateBetCode(8);
    // Ensure unique code
    for (let i = 0; i < 5; i++) {
      const { data: existing, error } = await admin
        .from("bets")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Failed to check bet code" },
          { status: 500 }
        );
      }
      if (!existing) break;
      code = generateBetCode(8 + i);
    }

    const { data: bet, error: betError } = await admin
      .from("bets")
      .insert({
        code,
        title: parsed.title,
        description: parsed.description ?? null,
        stake_amount: parsed.stakeAmount,
        currency: parsed.currency,
        mode: parsed.mode,
        creator_participant_id: participant.id,
        creator_token: parsed.token
      })
      .select()
      .single();

    if (betError) {
      console.error(betError);
      return NextResponse.json(
        { error: "Failed to create bet" },
        { status: 500 }
      );
    }

    const { error: bpError } = await admin.from("bet_participants").insert({
      bet_id: bet.id,
      participant_id: participant.id,
      decision: "ACCEPTED"
    });

    if (bpError) {
      console.error(bpError);
      return NextResponse.json(
        { error: "Failed to add creator to bet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ code });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

