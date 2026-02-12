import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "agent" | "task" | "document" | "system";
  message: string;
  details?: string;
}

async function parseSessionLogs(): Promise<LogEntry[]> {
  const logs: LogEntry[] = [];
  
  try {
    const agentsDir = join(process.env.HOME || "", ".openclaw", "agents");
    const sessions = await readdir(agentsDir);
    
    // 只讀取最近的 50 個 session
    const recentSessions = sessions.slice(-50);
    
    for (const session of recentSessions) {
      const sessionPath = join(agentsDir, session);
      
      try {
        const files = await readdir(sessionPath);
        const transcriptFile = files.find(f => f.includes("transcript"));
        
        if (transcriptFile) {
          const content = await readFile(join(sessionPath, transcriptFile), "utf-8");
          
          // 簡單解析：提取時間戳和消息
          const lines = content.split("\n").filter(line => line.trim());
          
          lines.slice(-10).forEach((line, idx) => {
            if (line.length > 10) {
              logs.push({
                id: `${session}-${idx}`,
                timestamp: new Date().toISOString(), // 實際應該從文件中解析
                type: "agent",
                message: line.slice(0, 200),
              });
            }
          });
        }
      } catch {
        // 跳過無法讀取的 session
      }
    }
  } catch (error) {
    console.error("Failed to parse session logs:", error);
  }
  
  // 如果沒有找到日誌，返回一些示例數據
  if (logs.length === 0) {
    return [
      {
        id: "demo-1",
        timestamp: new Date().toISOString(),
        type: "system",
        message: "霈霈豬儀表板已啟動",
      },
    ];
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function GET() {
  try {
    const logs = await parseSessionLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json({ logs: [] }, { status: 500 });
  }
}
