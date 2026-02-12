'use client';

import { useState, useEffect } from 'react';
import { FileText, Folder, Search, X, AlertCircle } from 'lucide-react';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  async: false,
  gfm: true,
  breaks: true
});

interface DocFile {
  path: string;
  name: string;
  category: string;
  size: number;
  mtime: string;
}

export default function DocsPage() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/docs');
      const data = await res.json();

      if (data.error === 'local_only') {
        setIsLocal(false);
      } else {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (filePath: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/docs/${encodeURIComponent(filePath)}`);
      const data = await res.json();
      const rawContent = data.content || '';
      const htmlContent = await marked(rawContent);
      setContent(htmlContent as string);
      setSelectedFile(filePath);
    } catch (err) {
      console.error('Error fetching file content:', err);
      const errorHtml = await marked('# 錯誤\n\n無法載入文件內容');
      setContent(errorHtml as string);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(files.map(f => f.category))];

  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const cat = file.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(file);
    return acc;
  }, {} as Record<string, DocFile[]>);

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'core': return '📋 核心文件';
      case 'memory': return '🧠 Memory';
      case 'other': return '📁 其他';
      default: return cat;
    }
  };

  if (!isLocal) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">僅限本地使用</h2>
          <p className="text-zinc-400">此功能需要存取本地檔案，在 Vercel 上無法使用</p>
        </div>
      </div>
    );
  }

  if (loading && files.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-zinc-100 flex pb-20">
      {/* Sidebar */}
      <div className="w-80 bg-[#252544] border-r border-zinc-700 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">文件瀏覽</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="搜尋文件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-[#1a1a2e] border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#1a1a2e] text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {cat === 'all' ? '全部' : getCategoryName(cat)}
            </button>
          ))}
        </div>

        {/* File List */}
        <div className="space-y-4">
          {Object.entries(groupedFiles).map(([category, categoryFiles]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-zinc-300">
                <Folder className="w-4 h-4" />
                <span>{getCategoryName(category)}</span>
                <span className="text-zinc-500">({categoryFiles.length})</span>
              </div>
              <div className="space-y-1">
                {categoryFiles.map(file => (
                  <button
                    key={file.path}
                    onClick={() => fetchFileContent(file.path)}
                    className={`w-full text-left p-2 rounded flex items-start gap-2 transition-colors ${
                      selectedFile === file.path
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'hover:bg-[#1a1a2e] text-zinc-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-zinc-500 flex gap-2">
                        <span>{formatFileSize(file.size)}</span>
                        <span>·</span>
                        <span>{formatDate(file.mtime)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              沒有找到符合的文件
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedFile ? (
          <>
            <div className="mb-4">
              <h3 className="text-2xl font-bold mb-1">
                {files.find(f => f.path === selectedFile)?.name}
              </h3>
              <p className="text-sm text-zinc-500">{selectedFile}</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-100"></div>
              </div>
            ) : (
              <div 
                className="prose prose-invert prose-zinc max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <FileText className="w-16 h-16 mb-4" />
            <p>選擇一個文件來查看內容</p>
          </div>
        )}
      </div>
    </div>
  );
}
