'use client';

import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Lock, Star, 
  MoreVertical, Plus, X, Globe 
} from 'lucide-react';
import { useState } from 'react';

interface PreviewFrameProps {
  code: string;
}

export default function PreviewFrame({ code }: PreviewFrameProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-sm">
      {/* 브라우저 상단 탭 영역 */}
      <div className="flex items-end gap-2 px-2 pt-2 pb-0">
        {/* 활성 탭 */}
        <div className="group relative flex w-48 items-center gap-2 rounded-t-lg bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm">
          <Globe size={14} className="text-blue-500" />
          <span className="flex-1 truncate font-medium">내 작품 미리보기</span>
          <button className="rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-100">
            <X size={12} className="text-zinc-500" />
          </button>
          {/* 탭 구분선 효과 (우측) */}
          <div className="absolute -right-2 bottom-0 h-4 w-4 bg-transparent shadow-[inset_8px_-8px_0_0_#fff] pointer-events-none rounded-bl-lg"></div>
          <div className="absolute -left-2 bottom-0 h-4 w-4 bg-transparent shadow-[inset_-8px_-8px_0_0_#fff] pointer-events-none rounded-br-lg"></div>
        </div>

        {/* 새 탭 버튼 */}
        <button className="mb-1 rounded p-1 hover:bg-zinc-200">
          <Plus size={16} className="text-zinc-600" />
        </button>
      </div>

      {/* 브라우저 주소창 영역 */}
      <div className="flex items-center gap-2 bg-white px-3 py-2 border-b border-zinc-200">
        <div className="flex gap-1 text-zinc-400">
          <button className="rounded p-1.5 hover:bg-zinc-100 hover:text-zinc-700">
            <ArrowLeft size={16} />
          </button>
          <button className="rounded p-1.5 hover:bg-zinc-100 hover:text-zinc-700">
            <ArrowRight size={16} />
          </button>
          <button 
            onClick={handleRefresh}
            className="rounded p-1.5 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <RotateCw size={16} />
          </button>
        </div>

        {/* 주소 입력창 */}
        <div className="flex flex-1 items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200 transition-colors cursor-text">
          <Lock size={12} className="text-zinc-400" />
          <span className="flex-1 truncate">localhost:3000/preview</span>
          <Star size={14} className="text-zinc-400 hover:text-amber-400 cursor-pointer" />
        </div>

        <div className="flex gap-1 text-zinc-600">
          <button className="rounded p-1.5 hover:bg-zinc-100">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* 컨텐츠 영역 (iframe) */}
      <div className="flex-1 bg-white relative">
        <iframe
          key={refreshKey}
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          className="h-full w-full border-none"
          srcDoc={code}
        />
      </div>
    </div>
  );
}
