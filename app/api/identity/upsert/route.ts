import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const bodySchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);

    const admin = supabaseAdminClient();

    const { data: existing, error: existingError } = await admin
      .from("participants")
      .select("*")
      .eq("token", parsed.token)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      return NextResponse.json(
        { error: "Failed to read participant" },
        { status: 500 }
      );
    }

    if (existing) {
      if (existing.display_name !== parsed.displayName) {
        const { data, error } = await admin
          .from("participants")
          .update({
            display_name: parsed.displayName,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) {
          console.error(error);
          return NextResponse.json(
            { error: "Failed to update participant" },
            { status: 500 }
          );
        }
        return NextResponse.json({ participant: data });
      }
      return NextResponse.json({ participant: existing });
    }

    const { data, error } = await admin
      .from("participants")
      .insert({
        token: parsed.token,
        display_name: parsed.displayName
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to create participant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ participant: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

