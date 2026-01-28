import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const bodySchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1).max(100),
  decision: z.enum(["ACCEPTED", "DECLINED"])
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

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const code = params.code;

    const admin = supabaseAdminClient();

    const participant = await upsertParticipant(
      admin,
      parsed.token,
      parsed.displayName
    );

    const { data: bet, error: betError } = await admin
      .from("bets")
      .select("*")
      .eq("code", code)
      .single();

    if (betError || !bet) {
      console.error(betError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    if (bet.status !== "OPEN") {
      return NextResponse.json(
        { error: "Bet is not open for responses" },
        { status: 400 }
      );
    }

    // H2H: ensure only one non-creator ACCEPTED
    if (bet.mode === "H2H" && parsed.decision === "ACCEPTED") {
      const { data: accepted, error: acceptedError } = await admin
        .from("bet_participants")
        .select("id, participant_id")
        .eq("bet_id", bet.id)
        .eq("decision", "ACCEPTED");

      if (acceptedError) {
        console.error(acceptedError);
        return NextResponse.json(
          { error: "Failed to check existing accepts" },
          { status: 500 }
        );
      }

      const nonCreatorAccepted = (accepted ?? []).filter(
        (row) => row.participant_id !== bet.creator_participant_id
      );
      if (nonCreatorAccepted.length > 0) {
        return NextResponse.json(
          { error: "Bet already has a challenger" },
          { status: 400 }
        );
      }
    }

    // Ensure bet_participants row
    const { data: existingBp, error: existingBpError } = await admin
      .from("bet_participants")
      .select("*")
      .eq("bet_id", bet.id)
      .eq("participant_id", participant.id)
      .maybeSingle();

    if (existingBpError) {
      console.error(existingBpError);
      return NextResponse.json(
        { error: "Failed to read participant status" },
        { status: 500 }
      );
    }

    if (existingBp) {
      const { error: updateError } = await admin
        .from("bet_participants")
        .update({ decision: parsed.decision })
        .eq("id", existingBp.id);
      if (updateError) {
        console.error(updateError);
        return NextResponse.json(
          { error: "Failed to update response" },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await admin.from("bet_participants").insert(
        {
          bet_id: bet.id,
          participant_id: participant.id,
          decision: parsed.decision
        }
      );
      if (insertError) {
        console.error(insertError);
        return NextResponse.json(
          { error: "Failed to record response" },
          { status: 500 }
        );
      }
    }

    // Return updated bet with participants
    const { data: betWithParticipants, error: finalError } = await admin
      .from("bets")
      .select(
        "*, bet_participants (*, participants!bet_participants_participant_id_fkey (*))"
      )
      .eq("id", bet.id)
      .single();

    if (finalError) {
      console.error(finalError);
      return NextResponse.json(
        { error: "Failed to load updated bet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bet: betWithParticipants });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

