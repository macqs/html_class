'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cloud, Plus, Square, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WordCloud, WordCount, Participant } from '@/types';
import { WordCloudDisplay } from './WordCloudDisplay';

interface WordCloudResponse {
  id: string;
  word: string;
  created_at: string;
  participant_id: string;
}

interface WordCloudFullPanelProps {
  sessionId: string;
  participants: Participant[];
}

export function WordCloudFullPanel({ sessionId, participants }: WordCloudFullPanelProps) {
  const [activeWordCloud, setActiveWordCloud] = useState<WordCloud | null>(null);
  const [words, setWords] = useState<WordCount[]>([]);
  const [responses, setResponses] = useState<WordCloudResponse[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [maxWords, setMaxWords] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [showResponses, setShowResponses] = useState(false);

  // 참가자 ID로 좌석/닉네임 찾기
  const getParticipantInfo = useCallback((participantId: string) => {
    const p = participants.find(p => p.id === participantId);
    return p ? { seat: p.seat_position, nickname: p.nickname } : { seat: '?', nickname: '알 수 없음' };
  }, [participants]);

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

  // 응답 집계 및 상세 목록
  const fetchResponses = useCallback(async (wordcloudId: string) => {
    const { data } = await supabase
      .from('td_wordcloud_responses')
      .select('id, word, created_at, participant_id')
      .eq('wordcloud_id', wordcloudId)
      .order('created_at', { ascending: false });

    if (data) {
      setResponses(data);
      
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
      .channel(`wordcloud-responses-full-${activeWordCloud.id}`)
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
      setResponses([]);
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
    setResponses([]);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  // 생성 폼
  if (isCreating) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-zinc-900">
            <Cloud className="text-cyan-600" size={32} />
            새 워드클라우드
          </h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                질문
              </label>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="예: 오늘 배운 내용 중 기억에 남는 키워드는?"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-lg text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                참가자당 최대 단어 수
              </label>
              <select
                value={maxWords}
                onChange={(e) => setMaxWords(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-lg text-zinc-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-cyan-600 py-4 text-lg font-semibold text-white transition hover:bg-cyan-700"
              >
                시작하기
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-zinc-300 px-6 py-4 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 활성 워드클라우드
  if (activeWordCloud) {
    return (
      <div className="flex h-full flex-col">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 md:text-2xl">
              <Cloud className="text-cyan-600" size={28} />
              {activeWordCloud.question}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              응답: {responses.length}개 · 참가자: {new Set(responses.map(r => r.participant_id)).size}명
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResponses(!showResponses)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                showResponses 
                  ? 'bg-cyan-100 text-cyan-700' 
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Users size={18} />
              응답 목록
            </button>
            <button
              onClick={handleEnd}
              className="flex items-center gap-2 rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-200"
            >
              <Square size={16} />
              종료
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex min-h-0 flex-1">
          {/* 워드클라우드 */}
          <div className={`flex-1 overflow-auto bg-gradient-to-br from-cyan-50 to-blue-50 p-4 ${showResponses ? 'md:w-2/3' : 'w-full'}`}>
            <div className="flex h-full items-center justify-center">
              <WordCloudDisplay words={words} minFontSize={20} maxFontSize={80} />
            </div>
          </div>

          {/* 응답 목록 사이드바 */}
          {showResponses && (
            <div className="w-full border-l bg-white md:w-1/3">
              <div className="sticky top-0 border-b bg-zinc-50 px-4 py-3">
                <h3 className="font-semibold text-zinc-900">응답 상세</h3>
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-auto">
                {responses.length === 0 ? (
                  <p className="p-4 text-center text-sm text-zinc-500">아직 응답이 없습니다</p>
                ) : (
                  <ul className="divide-y">
                    {responses.map((r) => {
                      const info = getParticipantInfo(r.participant_id);
                      return (
                        <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                            {info.seat}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-zinc-900">{r.word}</p>
                            <p className="text-xs text-zinc-500">{info.nickname}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 비활성 상태 - 시작 화면
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 p-8">
      <div className="text-center">
        <Cloud className="mx-auto mb-6 text-cyan-400" size={80} />
        <h2 className="mb-3 text-3xl font-bold text-zinc-800">워드클라우드</h2>
        <p className="mb-8 text-lg text-zinc-600">
          참가자들의 실시간 의견을 워드클라우드로 확인하세요
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-3 rounded-2xl bg-cyan-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-cyan-700"
        >
          <Plus size={24} />
          워드클라우드 시작
        </button>
      </div>
    </div>
  );
}
