const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { globSync } = require("glob");

const app = express();
const PORT = Number(process.env.PORT || 3456);
const VERSION = "1.0.0";
const STARTED_AT = Date.now();

const HOME = os.homedir();
const CLAWD_ROOT = path.join(HOME, "clawd");
const OPENCLAW_ROOT = path.join(HOME, ".openclaw");
const AGENTS_DIR = path.join(OPENCLAW_ROOT, "agents");

const AGENT_META = [
  { id: "main", name: "霈霈豬", emoji: "🐷" },
  { id: "trading-lab", name: "Trading Lab", emoji: "📈" },
  { id: "coder", name: "Coder", emoji: "💻" },
  { id: "learner", name: "實習生阿霈", emoji: "🎓" },
];

app.use(cors({ origin: "*" }));
app.use(express.json());

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function listSessionFiles(agentId) {
  const pattern = path.join(AGENTS_DIR, agentId, "sessions", "**", "*.jsonl").replaceAll("\\", "/");
  return globSync(pattern, { nodir: true });
}

function latestSessionFile(agentId) {
  const files = listSessionFiles(agentId);
  let latest = null;
  for (const file of files) {
    const st = safeStat(file);
    if (!st) continue;
    if (!latest || st.mtimeMs > latest.mtimeMs) {
      latest = { file, mtimeMs: st.mtimeMs };
    }
  }
  return latest;
}

function statusFromLastActive(lastActiveMs) {
  if (!lastActiveMs) return "idle";
  const diff = Date.now() - lastActiveMs;
  if (diff <= 2 * 60 * 1000) return "acting";
  if (diff <= 10 * 60 * 1000) return "thinking";
  return "idle";
}

function inferCronFromSessions() {
  return AGENT_META.map((agent) => {
    const latest = latestSessionFile(agent.id);
    const lastRunAtMs = latest?.mtimeMs;
    return {
      id: `fallback-${agent.id}`,
      agentId: agent.id,
      name: `${agent.name} session activity`,
      schedule: "* * * * *",
      tz: "Asia/Taipei",
      enabled: true,
      lastStatus: lastRunAtMs ? "ok" : "unknown",
      lastRunAtMs,
      nextRunAtMs: undefined,
      lastDurationMs: undefined,
      consecutiveErrors: 0,
      inferred: true,
    };
  });
}

function normalizeCronState(cronStateRaw) {
  const sourceJobs = Array.isArray(cronStateRaw)
    ? cronStateRaw
    : Array.isArray(cronStateRaw?.jobs)
      ? cronStateRaw.jobs
      : [];

  return sourceJobs.map((job, index) => ({
    id: job?.id || `job-${index + 1}`,
    agentId: job?.agentId || "main",
    name: job?.name || `Job ${index + 1}`,
    schedule: job?.schedule?.expr || job?.schedule || "* * * * *",
    tz: job?.schedule?.tz || job?.tz || "Asia/Taipei",
    enabled: job?.enabled ?? true,
    lastStatus: job?.state?.lastStatus || job?.lastStatus || "unknown",
    lastRunAtMs: job?.state?.lastRunAtMs || job?.lastRunAtMs,
    nextRunAtMs: job?.state?.nextRunAtMs || job?.nextRunAtMs,
    lastDurationMs: job?.state?.lastDurationMs || job?.lastDurationMs,
    consecutiveErrors: job?.state?.consecutiveErrors ?? job?.consecutiveErrors ?? 0,
  }));
}

async function getCronJobs() {
  const candidates = [
    path.join(OPENCLAW_ROOT, "state", "cron.json"),
    path.join(OPENCLAW_ROOT, "state", "cron-state.json"),
    path.join(OPENCLAW_ROOT, "cron", "state.json"),
  ];

  for (const file of candidates) {
    try {
      const raw = JSON.parse(await fsp.readFile(file, "utf8"));
      return { jobs: normalizeCronState(raw), source: file };
    } catch {
      // try next
    }
  }

  return { jobs: inferCronFromSessions(), source: "sessions-fallback" };
}

function getDocTargets() {
  const fixedFiles = [
    "MEMORY.md",
    "AGENTS.md",
    "SOUL.md",
    "HEARTBEAT.md",
    "memory/lessons.md",
    "memory/commitments.md",
    "memory/overnight_report.md",
    "memory/todo_queue.md",
    "memory/investing/stock_tracker.md",
  ].map((rel) => path.join(CLAWD_ROOT, rel));

  const learningPattern = path.join(CLAWD_ROOT, "memory", "learning", "{ai,coding,finance}", "**", "*.md").replaceAll("\\", "/");
  const learningFiles = globSync(learningPattern, { nodir: true });
  const cutoffMs = Date.now() - 2 * 24 * 60 * 60 * 1000;

  const recentLearning = learningFiles.filter((file) => {
    const st = safeStat(file);
    return st && st.mtimeMs >= cutoffMs;
  });

  return [...new Set([...fixedFiles, ...recentLearning])];
}

async function readDocFile(filePath) {
  try {
    const st = await fsp.stat(filePath);
    if (!st.isFile()) return null;
    const content = await fsp.readFile(filePath, "utf8");
    return {
      name: path.basename(filePath),
      path: filePath,
      content,
      updatedAt: new Date(st.mtimeMs).toISOString(),
      size: st.size,
    };
  } catch {
    return null;
  }
}

function parseTodoMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/);
    if (!m) continue;
    items.push({
      done: m[1].toLowerCase() === "x",
      text: m[2].trim(),
      raw: line,
    });
  }
  return items;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: Math.floor((Date.now() - STARTED_AT) / 1000), version: VERSION });
});

app.get("/api/agents", (_req, res) => {
  const agents = AGENT_META.map((agent) => {
    const latest = latestSessionFile(agent.id);
    const lastActive = latest ? new Date(latest.mtimeMs).toISOString() : null;
    return {
      ...agent,
      status: statusFromLastActive(latest?.mtimeMs),
      lastActive,
      sessionFile: latest?.file || null,
    };
  });

  res.json({
    agents,
    uptime: `${Math.floor((Date.now() - STARTED_AT) / 1000)}s`,
    version: VERSION,
    source: "local-session-scan",
  });
});

app.get("/api/cron", async (_req, res) => {
  const { jobs, source } = await getCronJobs();
  res.json({ jobs, source, generatedAt: new Date().toISOString() });
});

app.get("/api/docs", async (req, res) => {
  const name = req.query.name;
  const targets = getDocTargets();
  const files = (await Promise.all(targets.map(readDocFile))).filter(Boolean);

  if (typeof name === "string" && name.trim()) {
    const wanted = name.trim();
    const found = files.find((f) => f.name === wanted || f.path.endsWith(wanted));
    if (!found) return res.status(404).json({ error: "Document not found" });
    return res.json({ file: found, syncedAt: new Date().toISOString(), source: "local-files" });
  }

  res.json({ files, syncedAt: new Date().toISOString(), source: "local-files" });
});

app.get("/api/todo", async (_req, res) => {
  const todoPath = path.join(CLAWD_ROOT, "memory", "todo_queue.md");
  try {
    const content = await fsp.readFile(todoPath, "utf8");
    const items = parseTodoMarkdown(content);
    res.json({
      path: todoPath,
      items,
      total: items.length,
      pending: items.filter((x) => !x.done).length,
      done: items.filter((x) => x.done).length,
      content,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to read todo queue", detail: String(error) });
  }
});

app.get("/api/sessions", (_req, res) => {
  const pattern = path.join(AGENTS_DIR, "*", "sessions", "**", "*.jsonl").replaceAll("\\", "/");
  const files = globSync(pattern, { nodir: true });
  const now = Date.now();
  const sessions = files
    .map((file) => {
      const st = safeStat(file);
      if (!st) return null;
      const rel = path.relative(AGENTS_DIR, file).split(path.sep);
      const agent = rel[0] || "unknown";
      const sessionKey = path.basename(file, ".jsonl");
      const lastActiveMs = st.mtimeMs;
      return {
        agent,
        sessionKey,
        lastActive: new Date(lastActiveMs).toISOString(),
        isRunning: now - lastActiveMs <= 2 * 60 * 1000,
        path: file,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
    .slice(0, 80);

  res.json({ sessions, count: sessions.length });
});

// HTTPS for Tailscale (mixed content workaround)
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3457);
const certPath = path.join(__dirname, "certs", "cert.pem");
const keyPath = path.join(__dirname, "certs", "key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const https = require("https");
  const httpsServer = https.createServer(
    { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
    app
  );
  httpsServer.listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`peipei-local-api HTTPS running on https://0.0.0.0:${HTTPS_PORT}`);
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`peipei-local-api HTTP running on http://0.0.0.0:${PORT}`);
});
