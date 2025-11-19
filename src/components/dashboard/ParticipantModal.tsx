'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Participant } from '@/types';
import { supabase } from '@/lib/supabase';
import CodeEditor from '@/components/editor/CodeEditor';

interface ParticipantSummary {
  codeWorksCount: number;
  validationsCount: number;
  helpRequestsCount: number;
  lastValidation?: string;
}

interface ParticipantModalProps {
  participant: Participant;
  onClose: () => void;
}

export default function ParticipantModal({ participant, onClose }: ParticipantModalProps) {
  const [latestCode, setLatestCode] = useState('');
  const [summary, setSummary] = useState<ParticipantSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant.id]);

  async function loadData() {
    setIsLoading(true);
    const [codeRes, worksRes, validationRes, helpRes] = await Promise.all([
      supabase
        .from('td_code_works')
        .select('code')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('td_code_works')
        .select('id', { count: 'exact', head: true })
        .eq('participant_id', participant.id),
      supabase
        .from('td_code_validations')
        .select('validation_result, created_at')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('td_help_requests')
        .select('id', { count: 'exact', head: true })
        .eq('participant_id', participant.id),
    ]);

    if (codeRes.data?.code) setLatestCode(codeRes.data.code);

    setSummary({
      codeWorksCount: worksRes.count ?? 0,
      validationsCount: validationRes.data?.length ?? 0,
      helpRequestsCount: helpRes.count ?? 0,
      lastValidation: validationRes.data?.[0]?.validation_result,
    });

    setIsLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{participant.nickname}</h2>
            <p className="text-sm text-zinc-500">좌석: {participant.seat_position}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100">
            <X size={20} />
          </button>
        </header>

        <section className="grid gap-4 border-b bg-zinc-50 px-6 py-4 text-center sm:grid-cols-4">
          <StatCard label="작성한 작품" value={summary?.codeWorksCount ?? 0} />
          <StatCard label="코드 검증" value={summary?.validationsCount ?? 0} />
          <StatCard label="도움 요청" value={summary?.helpRequestsCount ?? 0} />
          <StatCard label="상태" value={participant.status} />
        </section>

        <section className="px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">최근 코드</h3>
            {summary?.lastValidation && (
              <span className="text-sm text-zinc-500">최근 검증: {summary.lastValidation}</span>
            )}
          </div>
          <div className="h-96">
            <CodeEditor code={latestCode || '아직 코드가 없습니다.'} onChange={() => {}} readOnly />
          </div>
          {isLoading && <p className="mt-2 text-sm text-zinc-500">불러오는 중...</p>}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}
