'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, Sparkles } from 'lucide-react';
import type { LiveExampleItem } from '@/types';

export interface LocalExampleItem {
  id: string;
  title: string;
  code: string;
  savedAt: string;
}

interface ExampleSelectorProps {
  onSelect: (code: string) => void;
  liveExamples?: LiveExampleItem[];
  localExamples?: LocalExampleItem[];
  onRemoveLocalExample?: (id: string) => void;
}

export default function ExampleSelector({
  onSelect,
  liveExamples = [],
  localExamples = [],
  onRemoveLocalExample,
}: ExampleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

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

            {localExamples.length > 0 && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">내 로컬 백업</div>
                  <p className="text-xs text-zinc-500">이 브라우저에서만 보이는 임시 저장본입니다.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {localExamples.map((example) => (
                    <div
                      key={example.id}
                      className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">{example.title}</p>
                          <p className="text-xs text-emerald-700">
                            {new Date(example.savedAt).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {onRemoveLocalExample && (
                          <button
                            type="button"
                            onClick={() => onRemoveLocalExample(example.id)}
                            className="text-xs font-semibold text-emerald-900 hover:text-emerald-600"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handlePick(example.code)}
                          className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-700 shadow hover:bg-emerald-100"
                        >
                          불러오기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
