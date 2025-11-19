'use client';

import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ExampleCode, LiveExampleItem } from '@/types';

interface ExampleSelectorProps {
  onSelect: (code: string) => void;
  liveExamples?: LiveExampleItem[];
}

const difficultyColors: Record<ExampleCode['difficulty'], string> = {
  basic: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-rose-100 text-rose-800',
};

export default function ExampleSelector({ onSelect, liveExamples = [] }: ExampleSelectorProps) {
  const [examples, setExamples] = useState<ExampleCode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('td_example_codes')
      .select('*')
      .order('order_index')
      .then(({ data }) => {
        if (data) setExamples(data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handlePick = (code: string) => {
    onSelect(code);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
      >
        <BookOpen size={16} />
        예제 불러오기
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">예제 라이브러리</p>
                <h3 className="text-lg font-bold text-zinc-900">공유된 코드와 기본 예제를 선택하세요</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100"
                aria-label="닫기"
              >
                <ChevronDown size={18} className="rotate-180" />
              </button>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                <Sparkles size={16} /> 실시간 공유
              </div>
              {liveExamples.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                  아직 공유된 예제가 없습니다. 강사님의 예제 배포나 우수작 공유를 기다려주세요.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {liveExamples.map((example) => {
                    const badgeClass =
                      example.type === 'broadcast'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700';
                    const badgeLabel = example.type === 'broadcast' ? '강사 배포' : '우수작';
                    return (
                      <button
                        type="button"
                        key={example.id}
                        onClick={() => handlePick(example.code)}
                        className="flex h-full flex-col rounded-2xl border border-zinc-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900">{example.title}</span>
                          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${badgeClass}`}>{badgeLabel}</span>
                        </div>
                        {example.description && <p className="mt-2 text-sm text-zinc-500">{example.description}</p>}
                        <span className="mt-3 text-xs text-zinc-400">
                          {new Date(example.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900">등록된 예제</h4>
                <span className="text-xs text-zinc-500">{examples.length}개</span>
              </div>
              {isLoading ? (
                <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                  예제를 불러오는 중입니다...
                </p>
              ) : examples.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                  등록된 예제가 없습니다.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {examples.map((example) => (
                    <button
                      type="button"
                      key={example.id}
                      onClick={() => handlePick(example.code)}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{example.title}</span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${difficultyColors[example.difficulty]}`}>
                          {example.difficulty === 'basic' ? '기초' : example.difficulty === 'intermediate' ? '중급' : '고급'}
                        </span>
                      </div>
                      {example.description && <p className="mt-2 text-sm text-slate-600">{example.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
