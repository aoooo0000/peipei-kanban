import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface CronJobState {
  lastRunAtMs?: number;
  nextRunAtMs?: number;
  lastStatus?: string;
  lastDurationMs?: number;
}

interface CronJob {
  name?: string;
  id?: string;
  command?: string;
  prompt?: string;
  agentId?: string;
  enabled?: boolean;
  schedule?: string;
  state?: CronJobState;
}

export async function GET() {
  try {
    const isLocal = process.env.VERCEL !== '1';
    
    if (!isLocal) {
      return NextResponse.json({
        error: 'local_only',
        message: '此功能僅限本地使用',
        jobs: []
      });
    }

    try {
      const cronStatePath = path.join(process.env.HOME || '', '.openclaw/cron/jobs.json');
      
      const exists = await fs.access(cronStatePath).then(() => true).catch(() => false);
      
      if (exists) {
        const cronDataRaw = await fs.readFile(cronStatePath, 'utf8');
        const cronData = JSON.parse(cronDataRaw);
        
        const jobsArray: CronJob[] = Array.isArray(cronData) ? cronData : cronData.jobs || [];
        
        const jobs = jobsArray.map((j) => ({
          name: j.name || j.id || 'Unnamed Job',
          command: j.command || j.prompt || '',
          agentId: j.agentId || 'unknown',
          enabled: j.enabled !== false,
          schedule: j.schedule || '',
          lastRun: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
          nextRun: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
          lastStatus: j.state?.lastStatus || 'unknown',
          lastDurationMs: j.state?.lastDurationMs || null
        }));
        
        return NextResponse.json({ jobs });
      } else {
        return NextResponse.json({ jobs: [] });
      }
    } catch (err) {
      console.error('Error reading cron state:', err);
      return NextResponse.json({ jobs: [], error: 'cron_not_found' });
    }
  } catch (err) {
    return NextResponse.json({ jobs: [], error: String(err) }, { status: 500 });
  }
}
