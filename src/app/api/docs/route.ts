import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

interface Doc {
  name: string;
  path: string;
  category: "System" | "Docs";
  size: number;
  modified: string;
}

async function scanDirectory(dir: string, category: "System" | "Docs"): Promise<Doc[]> {
  const docs: Doc[] = [];
  
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      
      const fullPath = join(dir, file);
      const stats = await stat(fullPath);
      
      if (stats.isFile()) {
        docs.push({
          name: file,
          path: fullPath,
          category,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error(`Failed to scan ${dir}:`, error);
  }
  
  return docs;
}

export async function GET() {
  try {
    const workspaceRoot = join(process.env.HOME || "", "clawd");
    
    // 掃描 System 文件（workspace 根目錄）
    const systemDocs = await scanDirectory(workspaceRoot, "System");
    
    // 掃描 Docs 文件（memory 目錄）
    const memoryDir = join(workspaceRoot, "memory");
    const docsDocs = await scanDirectory(memoryDir, "Docs");
    
    const allDocs = [...systemDocs, ...docsDocs].sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );
    
    return NextResponse.json({ docs: allDocs });
  } catch (error) {
    console.error("Failed to fetch docs:", error);
    return NextResponse.json({ docs: [] }, { status: 500 });
  }
}
