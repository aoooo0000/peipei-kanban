import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `selection-${timestamp}.md`;
    const notesDir = path.join(homedir(), "clawd/memory/notes");
    const filePath = path.join(notesDir, filename);

    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(
      filePath,
      `# Selection Note\n\nCreated: ${new Date().toISOString()}\n\n---\n\n${text}\n`
    );

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("POST /api/actions/note error", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
