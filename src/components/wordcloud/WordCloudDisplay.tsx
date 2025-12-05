'use client';

import { useMemo } from 'react';
import type { WordCount } from '@/types';

interface WordCloudDisplayProps {
  words: WordCount[];
  minFontSize?: number;
  maxFontSize?: number;
  onWordClick?: (word: string) => void;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#6366F1', // indigo-500
];

export function WordCloudDisplay({ 
  words, 
  minFontSize = 14, 
  maxFontSize = 64,
  onWordClick,
}: WordCloudDisplayProps) {
  const processedWords = useMemo(() => {
    if (words.length === 0) return [];

    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    const range = maxCount - minCount || 1;

    return words.map((word, index) => {
      const normalized = (word.value - minCount) / range;
      const fontSize = minFontSize + normalized * (maxFontSize - minFontSize);
      const color = COLORS[index % COLORS.length];
      // 약간의 회전 (-10도 ~ +10도)
      const rotation = Math.floor(Math.random() * 21) - 10;

      return {
        ...word,
        fontSize,
        color,
        rotation,
      };
    });
  }, [words, minFontSize, maxFontSize]);

  // 단어를 랜덤하게 섞기
  const shuffledWords = useMemo(() => {
    return [...processedWords].sort(() => Math.random() - 0.5);
  }, [processedWords]);

  if (words.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl text-zinc-400">
        아직 응답이 없습니다
      </div>
    );
  }

  return (
    <div className="flex min-h-[600px] flex-wrap items-center justify-center gap-6 p-8">
      {shuffledWords.map((word, index) => (
        <button
          type="button"
          key={`${word.text}-${index}`}
          onClick={() => onWordClick?.(word.text)}
          className="inline-block px-3 py-2 font-bold transition-all hover:scale-125 hover:brightness-110"
          style={{
            fontSize: `${word.fontSize}px`,
            color: word.color,
            transform: `rotate(${word.rotation}deg)`,
          }}
          title={`${word.text}: ${word.value}회 (클릭하여 상세 보기)`}
        >
          {word.text}
        </button>
      ))}
    </div>
  );
}
