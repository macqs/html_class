'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cloud, Plus, Square, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WordCloud, WordCount } from '@/types';
import { WordCloudDisplay } from './WordCloudDisplay';

interface WordCloudPanelProps {
  sessionId: string;
}

export function WordCloudPanel({ sessionId }: WordCloudPanelProps) {
  const [activeWordCloud, setActiveWordCloud] = useState<WordCloud | null>(null);
  const [words, setWords] = useState<WordCount[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [maxWords, setMaxWords] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  // 활성 워드클라우드 조회
  const fetchActiveWordCloud = useCallback(async () => {
    const { data } = await supabase
      .from('td_wordclouds')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setActiveWordCloud(data);
    return data;
  }, [sessionId]);

  // 응답 집계
  const fetchResponses = useCallback(async (wordcloudId: string) => {
    const { data } = await supabase
      .from('td_wordcloud_responses')
      .select('word')
      .eq('wordcloud_id', wordcloudId);

    if (data) {
      const wordCounts = data.reduce<Record<string, number>>((acc, { word }) => {
        const normalized = word.toLowerCase().trim();
        acc[normalized] = (acc[normalized] || 0) + 1;
        return acc;
      }, {});

      const wordList: WordCount[] = Object.entries(wordCounts)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value);

      setWords(wordList);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const wc = await fetchActiveWordCloud();
      if (wc) {
        await fetchResponses(wc.id);
      }
      setIsLoading(false);
    }
    init();
  }, [fetchActiveWordCloud, fetchResponses]);

  // 실시간 구독
  useEffect(() => {
    if (!activeWordCloud) return;

    const channel = supabase
      .channel(`wordcloud-responses-${activeWordCloud.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'td_wordcloud_responses',
          filter: `wordcloud_id=eq.${activeWordCloud.id}`,
        },
        () => {
          fetchResponses(activeWordCloud.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWordCloud, fetchResponses]);

  // 워드클라우드 생성
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const { data, error } = await supabase
      .from('td_wordclouds')
      .insert({
        session_id: sessionId,
        question: newQuestion.trim(),
        max_words_per_user: maxWords,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setActiveWordCloud(data);
      setWords([]);
      setNewQuestion('');
      setIsCreating(false);
    }
  }

  // 워드클라우드 종료
  async function handleEnd() {
    if (!activeWordCloud) return;

    await supabase
      .from('td_wordclouds')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', activeWordCloud.id);

    setActiveWordCloud(null);
    setWords([]);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-zinc-400" size={24} />
      </div>
    );
  }

  // 생성 폼
  if (isCreating) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900">
          <Cloud className="text-blue-600" size={24} />
          새 워드클라우드 만들기
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              질문
            </label>
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="예: 오늘 배운 내용 중 기억에 남는 키워드는?"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              참가자당 최대 단어 수
            </label>
            <select
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-base text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              시작하기
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-xl border border-zinc-300 px-6 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 활성 워드클라우드
  if (activeWordCloud) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
              <Cloud className="text-blue-600" size={24} />
              {activeWordCloud.question}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              응답 수: {words.reduce((sum, w) => sum + w.value, 0)}개
            </p>
          </div>
          <button
            onClick={handleEnd}
            className="flex items-center gap-2 rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-200"
          >
            <Square size={16} />
            종료
          </button>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50">
          <WordCloudDisplay words={words} />
        </div>
      </div>
    );
  }

  // 비활성 상태
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <Cloud className="mx-auto mb-4 text-zinc-400" size={48} />
      <h3 className="mb-2 text-lg font-semibold text-zinc-700">워드클라우드</h3>
      <p className="mb-6 text-sm text-zinc-500">
        참가자들의 실시간 의견을 워드클라우드로 확인하세요
      </p>
      <button
        onClick={() => setIsCreating(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={20} />
        워드클라우드 시작
      </button>
    </div>
  );
}
