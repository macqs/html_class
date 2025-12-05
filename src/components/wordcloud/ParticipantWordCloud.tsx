'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WordCloud } from '@/types';
import { WordCloudInput } from './WordCloudInput';

interface ParticipantWordCloudProps {
  sessionId: string;
  participantId: string;
}

export function ParticipantWordCloud({ sessionId, participantId }: ParticipantWordCloudProps) {
  const [activeWordCloud, setActiveWordCloud] = useState<WordCloud | null>(null);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);

  // 활성 워드클라우드 조회
  const fetchActiveWordCloud = useCallback(async () => {
    const { data } = await supabase
      .from('td_wordclouds')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveWordCloud(data);
    return data;
  }, [sessionId]);

  // 제출한 단어 조회
  const fetchSubmittedWords = useCallback(async (wordcloudId: string) => {
    const { data } = await supabase
      .from('td_wordcloud_responses')
      .select('word')
      .eq('wordcloud_id', wordcloudId)
      .eq('participant_id', participantId);

    if (data) {
      setSubmittedWords(data.map((r) => r.word));
    }
  }, [participantId]);

  // 초기 로드
  useEffect(() => {
    async function init() {
      const wc = await fetchActiveWordCloud();
      if (wc) {
        await fetchSubmittedWords(wc.id);
      }
    }
    init();
  }, [fetchActiveWordCloud, fetchSubmittedWords]);

  // 워드클라우드 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel(`wordcloud-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'td_wordclouds',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newWc = payload.new as WordCloud;
            if (newWc.is_active) {
              setActiveWordCloud(newWc);
              setSubmittedWords([]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedWc = payload.new as WordCloud;
            if (!updatedWc.is_active && activeWordCloud?.id === updatedWc.id) {
              setActiveWordCloud(null);
              setSubmittedWords([]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, activeWordCloud?.id]);

  // 단어 제출
  async function handleSubmit(word: string) {
    if (!activeWordCloud) return;

    const { error } = await supabase.from('td_wordcloud_responses').insert({
      wordcloud_id: activeWordCloud.id,
      participant_id: participantId,
      word: word.trim(),
    });

    if (!error) {
      setSubmittedWords((prev) => [...prev, word.trim()]);
    }
  }

  // 단어 삭제
  async function handleRemove(word: string) {
    if (!activeWordCloud) return;

    const { error } = await supabase
      .from('td_wordcloud_responses')
      .delete()
      .eq('wordcloud_id', activeWordCloud.id)
      .eq('participant_id', participantId)
      .eq('word', word);

    if (!error) {
      setSubmittedWords((prev) => prev.filter((w) => w !== word));
    }
  }

  if (!activeWordCloud) {
    return null;
  }

  return (
    <div className="animate-in slide-in-from-top duration-300">
      <WordCloudInput
        question={activeWordCloud.question}
        maxWords={activeWordCloud.max_words_per_user}
        submittedWords={submittedWords}
        onSubmit={handleSubmit}
        onRemove={handleRemove}
        disabled={!activeWordCloud.is_active}
      />
    </div>
  );
}
