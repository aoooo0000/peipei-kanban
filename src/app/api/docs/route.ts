import { NextResponse } from "next/server";
import { supabaseGetFirstData } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

interface DocFile {
  name: string;
  path: string;
  content: string;
  updatedAt: string;
  size: number;
}

interface DocsPayload {
  files: DocFile[];
  syncedAt?: string;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name");

    const docsData = await supabaseGetFirstData<DocsPayload>("docs");
    const files = docsData?.files ?? [];

    if (name) {
      const target = files.find((f) => f.name === name || f.path === name);
      if (!target) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ file: target });
    }

    return NextResponse.json({ files, syncedAt: docsData?.syncedAt ?? null });
  } catch (error) {
    console.error("GET /api/docs error", error);
    return NextResponse.json({ error: "Failed to fetch docs" }, { status: 500 });
  }
}
