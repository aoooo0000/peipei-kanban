import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  mtime: Date;
}

async function walkMarkdown(dir: string, baseDir: string = dir): Promise<FileInfo[]> {
  const results: FileInfo[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subResults = await walkMarkdown(fullPath, baseDir);
        results.push(...subResults);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const stat = await fs.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        
        results.push({
          path: relativePath,
          name: entry.name,
          size: stat.size,
          mtime: stat.mtime
        });
      }
    }
  } catch (err) {
    console.error('Error walking directory:', err);
  }
  
  return results;
}

export async function GET() {
  try {
    const isLocal = process.env.VERCEL !== '1';
    
    if (!isLocal) {
      return NextResponse.json({
        error: 'local_only',
        message: '此功能僅限本地使用',
        files: []
      });
    }

    const workspaceRoot = path.join(process.env.HOME || '', 'clawd');
    const files: (FileInfo & { category?: string })[] = [];

    // 掃描 memory/ 目錄
    const memoryDir = path.join(workspaceRoot, 'memory');
    try {
      await fs.access(memoryDir);
      const memoryFiles = await walkMarkdown(memoryDir);
      files.push(...memoryFiles.map(f => ({
        ...f,
        path: `memory/${f.path}`,
        category: 'memory'
      })));
    } catch {
      // memory 目錄不存在
    }

    // 掃描核心文件
    const coreFiles = ['MEMORY.md', 'SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md'];
    for (const file of coreFiles) {
      const filePath = path.join(workspaceRoot, file);
      try {
        await fs.access(filePath);
        const stat = await fs.stat(filePath);
        files.push({
          path: file,
          name: file,
          category: 'core',
          size: stat.size,
          mtime: stat.mtime
        });
      } catch {
        // 文件不存在，跳過
      }
    }

    return NextResponse.json({ files });
  } catch (err) {
    console.error('Error listing docs:', err);
    return NextResponse.json({ files: [], error: String(err) }, { status: 500 });
  }
}
