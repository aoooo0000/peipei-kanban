import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configPath = path.join(process.env.HOME || '', '.config/openclaw/config.json');
    
    // 檢查是否為本地環境
    const isLocal = process.env.VERCEL !== '1';
    
    if (!isLocal) {
      return NextResponse.json({
        error: 'local_only',
        message: '此功能僅限本地使用',
        agents: []
      });
    }

    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);

      const agents = [];
      if (config.agents) {
        for (const [name, agentConfig] of Object.entries(config.agents)) {
          if (name === 'defaults') continue;
          
          const agent = agentConfig as Record<string, unknown>;
          agents.push({
            name,
            enabled: agent.enabled !== false,
            model: agent.model || config.agents.defaults?.model || 'unknown',
            thinking: agent.thinking || config.agents.defaults?.thinking || 'low'
          });
        }
      }

      return NextResponse.json({ agents });
    } catch (err) {
      console.error('Error reading OpenClaw config:', err);
      return NextResponse.json({ agents: [], error: 'config_not_found' });
    }
  } catch (err) {
    return NextResponse.json({ agents: [], error: String(err) }, { status: 500 });
  }
}
