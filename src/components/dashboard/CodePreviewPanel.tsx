'use client';

import { useEffect, useState } from 'react';
import { Code2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Participant } from '@/types';

interface CodePreviewPanelProps {
  participant: Participant | null;
}

export default function CodePreviewPanel({ participant }: CodePreviewPanelProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!participant) {
      // eslint-disable-next-line
      setCode('');
      return;
    }

    async function fetchLatestCode() {
      if (!participant) return;
      setIsLoading(true);
      const { data } = await supabase
        .from('td_code_works')
        .select('*')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.code) {
        setCode(data.code);
      } else {
        setCode('<p style="padding: 20px; color: #666;">아직 저장된 코드가 없습니다.</p>');
      }
      setIsLoading(false);
    }

    fetchLatestCode();
  }, [participant]);

  if (!participant) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border bg-white p-8 text-center">
        <Code2 size={48} className="text-zinc-300" />
        <p className="mt-4 text-sm font-semibold text-zinc-900">참가자를 선택하세요</p>
        <p className="mt-2 text-xs text-zinc-500">좌석을 클릭하면 실시간 코드 미리보기를 볼 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b bg-zinc-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-zinc-900">{participant.nickname}</h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {participant.seat_position}
          </span>
        </div>
        <div className="text-xs text-zinc-500">
          {participant.status === 'working' ? '작업 중' : participant.status === 'help_needed' ? '도움 필요' : '대기'}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">코드를 불러오는 중...</p>
          </div>
        ) : (
          <iframe
            srcDoc={code}
            title={`${participant.nickname} 작품 미리보기`}
            className="h-full w-full rounded-lg border border-zinc-200 bg-white"
            sandbox="allow-scripts"
          />
        )}
      </div>

      <div className="border-t bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
        💡 더블클릭하면 전체 코드를 확인할 수 있습니다.
      </div>
    </div>
  );
}
