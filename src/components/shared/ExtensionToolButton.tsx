'use client';

import { Download } from 'lucide-react';

interface ExtensionToolButtonProps {
  className?: string;
  simple?: boolean;
}

export default function ExtensionToolButton({ className = '', simple = false }: ExtensionToolButtonProps) {
  const downloadUrl = "https://usayn5ox3ibnhfj0.public.blob.vercel-storage.com/GZC48O_c559fdde-4a6e-452e-b45a-24de445874e4_%ED%99%95%EC%9E%A5%EC%9E%90%20%EC%84%B8%ED%8A%B8.zip";

  const handleClick = () => {
    window.open(downloadUrl, '_blank');
  };

  if (simple) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="윈도우 10/11 확장자 변경 도구 (.txt → .html). .reg 실행 권장, 실패 시 .bat 사용"
        className={`flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 ${className}`}
      >
        <Download size={16} />
        <span>확장자 도구</span>
      </button>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900"
      >
        <Download size={18} />
        <span>확장자 변경 도구 다운로드 (.zip)</span>
      </button>
      <div className="mt-3 w-full space-y-1 rounded-xl bg-zinc-50 p-2.5 text-left text-sm text-zinc-500">
        <p className="font-semibold text-zinc-700">Windows 10/11에서 .txt → .html 확장자 변경 지원함.</p>
        <p className="text-zinc-600">
          1) <span className="font-semibold text-zinc-800">.reg 파일</span> 먼저 실행해 폴더 옵션 자동 설정함.
        </p>
        <p className="text-zinc-600">
          2) 적용 안 되면 <span className="font-semibold text-zinc-800">.bat 파일</span>로 동일 설정 재시도함.
        </p>
        <p className="text-zinc-500">확장자 보이기↔숨기기 토글 모두 포함함.</p>
      </div>
    </div>
  );
}
