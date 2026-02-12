'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Agent {
  name: string;
  enabled: boolean;
  model: string;
  thinking: string;
}

interface CronJob {
  name: string;
  command: string;
  enabled: boolean;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  lastStatus: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 每 30 秒更新
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, cronRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/cron-status')
      ]);

      const agentsData = await agentsRes.json();
      const cronData = await cronRes.json();

      if (agentsData.error === 'local_only' || cronData.error === 'local_only') {
        setIsLocal(false);
      } else {
        setAgents(agentsData.agents || []);
        setCronJobs(cronData.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLastRun = (timestamp: string | null) => {
    if (!timestamp) return '從未執行';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} 小時前`;
    return date.toLocaleDateString('zh-TW', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isLocal) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">僅限本地使用</h2>
          <p className="text-zinc-400">此功能需要存取本地檔案，在 Vercel 上無法使用</p>
          <p className="text-sm text-zinc-500 mt-2">請在本地執行 <code className="bg-zinc-800 px-2 py-1 rounded">npm run dev</code></p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Agents Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Agent 狀態
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-zinc-400">
                未找到 OpenClaw agents
              </div>
            ) : (
              agents.map(agent => (
                <div key={agent.name} className="bg-[#252544] rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      agent.enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {agent.enabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {agent.enabled ? '運行中' : '已停用'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Model:</span>
                      <span className="text-zinc-200">{agent.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Thinking:</span>
                      <span className="text-zinc-200">{agent.thinking}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cron Jobs Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Cron Jobs
          </h2>
          <div className="space-y-3">
            {cronJobs.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                沒有 cron jobs
              </div>
            ) : (
              cronJobs.map((job, idx) => (
                <div key={idx} className="bg-[#252544] rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{job.name}</h4>
                      <p className="text-sm text-zinc-400 font-mono">{job.schedule}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.enabled 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {job.enabled ? '啟用' : '停用'}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    {job.lastRun && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>上次執行：{formatLastRun(job.lastRun)}</span>
                      </div>
                    )}
                    {job.nextRun && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>下次執行：{formatLastRun(job.nextRun)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
