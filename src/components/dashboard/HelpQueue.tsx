'use client';

import { Clock, Code, User } from 'lucide-react';
import type { HelpRequest, Participant } from '@/types';
import { timeAgo } from '@/lib/utils';

interface HelpQueueProps {
  helpRequests: (HelpRequest & { participant?: Participant })[];
  onResolve: (id: string) => void;
  onViewCode: (request: HelpRequest) => void;
}

export default function HelpQueue({ helpRequests, onResolve, onViewCode }: HelpQueueProps) {
  const pending = helpRequests.filter((request) => request.status === 'pending');

  if (pending.length === 0) {
    return (
      <div className="h-full rounded-lg border bg-white p-4 text-center text-sm text-zinc-500">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">도움 요청 큐</h3>
        현재 도움 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">도움 요청 큐 ({pending.length})</h3>
      <div className="flex-1 space-y-3 overflow-auto">
        {pending.map((request) => (
          <div key={request.id} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                <User size={16} />
                <span>{request.participant?.nickname ?? '알 수 없음'}</span>
                <span className="text-zinc-500">({request.participant?.seat_position ?? '-'})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={14} />
                {timeAgo(request.created_at)}
              </div>
            </div>
            <p className="mb-3 text-sm text-zinc-700">{request.message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onViewCode(request)}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Code size={14} /> 코드 보기
              </button>
              <button
                type="button"
                onClick={() => onResolve(request.id)}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                해결 완료
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
