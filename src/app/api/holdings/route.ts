import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isLocal = process.env.VERCEL !== '1';
    
    if (!isLocal) {
      return NextResponse.json({
        error: 'local_only',
        message: '此功能僅限本地使用',
        holdings: [],
        rawContent: ''
      });
    }

    const workspaceRoot = path.join(process.env.HOME || '', 'clawd');
    const holdingsPath = path.join(workspaceRoot, 'memory/investing/current_holdings.md');
    
    try {
      await fs.access(holdingsPath);
      const content = await fs.readFile(holdingsPath, 'utf8');
      
      // 簡單解析 markdown table
      const lines = content.split('\n');
      const holdings = [];
      
      for (const line of lines) {
        if (line.startsWith('|') && !line.includes('---') && !line.includes('Symbol')) {
          const parts = line.split('|').map(s => s.trim()).filter(Boolean);
          if (parts.length >= 3) {
            holdings.push({
              symbol: parts[0],
              shares: parts[1],
              cost: parts[2]
            });
          }
        }
      }
      
      return NextResponse.json({ holdings, rawContent: content });
    } catch {
      return NextResponse.json({ holdings: [], rawContent: '', error: 'file_not_found' });
    }
  } catch (err) {
    console.error('Error reading holdings:', err);
    return NextResponse.json({ holdings: [], rawContent: '', error: String(err) }, { status: 500 });
  }
}
