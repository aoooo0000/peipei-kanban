import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";

export const dynamic = "force-dynamic";

interface SearchResult {
  path: string;
  name: string;
  matches: Array<{
    line: number;
    text: string;
    context: string;
  }>;
}

async function searchInFile(
  filePath: string,
  query: string
): Promise<Array<{ line: number; text: string; context: string }>> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const matches: Array<{ line: number; text: string; context: string }> = [];
    const queryLower = query.toLowerCase();

    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(queryLower)) {
        // Get context (3 lines before and after)
        const startIdx = Math.max(0, idx - 1);
        const endIdx = Math.min(lines.length - 1, idx + 1);
        const context = lines.slice(startIdx, endIdx + 1).join("\n");

        matches.push({
          line: idx + 1,
          text: line,
          context,
        });
      }
    });

    return matches;
  } catch {
    return [];
  }
}

async function walkDirectory(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, etc.
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDirectory(fullPath, results);
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors for inaccessible directories
  }

  return results;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const clawdDir = path.join(homedir(), "clawd");
    const mdFiles = await walkDirectory(clawdDir);

    const searchResults: SearchResult[] = [];

    for (const filePath of mdFiles) {
      const matches = await searchInFile(filePath, query);
      if (matches.length > 0) {
        const relativePath = path.relative(clawdDir, filePath);
        searchResults.push({
          path: relativePath,
          name: path.basename(filePath),
          matches: matches.slice(0, 3), // Limit to 3 matches per file
        });
      }
    }

    // Sort by number of matches (most relevant first)
    searchResults.sort((a, b) => b.matches.length - a.matches.length);

    return NextResponse.json({
      query,
      count: searchResults.length,
      results: searchResults.slice(0, 20), // Limit to top 20 files
    });
  } catch (error) {
    console.error("GET /api/docs/search error", error);
    return NextResponse.json({ error: "Failed to search documents" }, { status: 500 });
  }
}
