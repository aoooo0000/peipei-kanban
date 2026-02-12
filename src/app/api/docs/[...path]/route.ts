import { readFile } from "fs/promises";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = decodeURIComponent(path.join("/"));
    
    // 安全檢查：只允許讀取特定目錄下的文件
    const allowedPaths = [
      process.env.HOME + "/clawd",
      process.env.HOME + "/.openclaw",
    ];
    
    const isAllowed = allowedPaths.some(p => filePath.startsWith(p));
    
    if (!isAllowed) {
      return new Response("Forbidden", { status: 403 });
    }
    
    const content = await readFile(filePath, "utf-8");
    return new Response(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to read file:", error);
    return new Response("File not found", { status: 404 });
  }
}
