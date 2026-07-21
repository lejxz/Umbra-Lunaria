import { NextRequest, NextResponse } from "next/server";
import { getMemberDetail } from "@/lib/db/member-queries";

/**
 * GET /api/members/[tag]
 * Returns the full MemberDetailView for a player tag.
 * Used by the dashboard's member detail popup (client-side fetch on click).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> },
) {
  const { tag: rawTag } = await params;
  // URL-decode the tag and add the # prefix if missing
  const playerTag = rawTag.startsWith("%23")
    ? `#${decodeURIComponent(rawTag.slice(3))}`
    : rawTag.startsWith("#")
      ? rawTag
      : `#${rawTag}`;

  try {
    const detail = await getMemberDetail(playerTag);
    if (!detail) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
