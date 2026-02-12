import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  try {
    const isLocal = process.env.VERCEL !== '1';
    
    if (!isLocal) {
      return NextResponse.json({
        error: 'local_only',
        message: '此功能僅限本地使用',
        content: ''
      });
    }

    const workspaceRoot = path.join(process.env.HOME || '', 'clawd');
    const filePath = path.join(workspaceRoot, ...pathSegments);
    
    // 安全檢查：確保路徑在 workspaceRoot 內
    const resolvedPath = path.resolve(filePath);
    const resolvedWorkspace = path.resolve(workspaceRoot);
    
    if (!resolvedPath.startsWith(resolvedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (err) {
    console.error('Error reading doc:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
