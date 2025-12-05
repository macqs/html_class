'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { WordCount } from '@/types';

interface WordCloudDisplayProps {
  words: WordCount[];
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
  '#14B8A6', // teal-500
  '#F97316', // orange-500
];

export function WordCloudDisplay({ words, onWordClick }: WordCloudDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const processedWords = useMemo(() => {
    if (words.length === 0) return [];

    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    const range = maxCount - minCount || 1;

    // 화면 크기와 단어 수에 따라 동적으로 폰트 크기 계산
    const totalWords = words.length;
    const area = containerSize.width * containerSize.height;
    
    // 단어 수가 많을수록 크기를 줄임 (멘티미터 스타일)
    const avgAreaPerWord = area / Math.max(totalWords, 1);
    const scaleFactor = Math.sqrt(avgAreaPerWord) / 12;
    
    // 최소/최대 크기 설정 (화면과 단어 수에 따라 동적)
    const baseMax = Math.min(Math.max(scaleFactor * 3, 40), 120);
    const baseMin = Math.min(Math.max(scaleFactor * 0.8, 16), 36);
    
    // 단어가 적을 때는 더 크게
    const sizeMultiplier = totalWords < 10 ? 1.5 : totalWords < 30 ? 1.2 : 1;
    const maxFontSize = baseMax * sizeMultiplier;
    const minFontSize = baseMin * sizeMultiplier;

    return words.map((word, index) => {
      const normalized = (word.value - minCount) / range;
      const fontSize = minFontSize + normalized * (maxFontSize - minFontSize);
      const color = COLORS[index % COLORS.length];
      const rotation = (Math.random() - 0.5) * 16;

      return {
        ...word,
        fontSize,
        color,
        rotation,
      };
    });
  }, [words, containerSize]);

  // 중요도순으로 정렬 후 중앙부터 배치되도록 섞기
  const arrangedWords = useMemo(() => {
    if (processedWords.length === 0) return [];
    
    const sorted = [...processedWords].sort((a, b) => b.fontSize - a.fontSize);
    
    const result: typeof sorted = [];
    let left = 0;
    let right = sorted.length - 1;
    let toggle = true;
    
    while (left <= right) {
      if (toggle) {
        result.push(sorted[left++]);
      } else {
        result.push(sorted[right--]);
      }
      toggle = !toggle;
    }
    
    return result;
  }, [processedWords]);

  if (words.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex h-full w-full items-center justify-center text-2xl text-zinc-400"
      >
        아직 응답이 없습니다
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden p-4"
    >
      <div 
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        {arrangedWords.map((word, index) => (
          <button
            type="button"
            key={`${word.text}-${index}`}
            onClick={() => onWordClick?.(word.text)}
            className="inline-block whitespace-nowrap font-bold transition-all duration-200 hover:scale-110 hover:brightness-110"
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              transform: `rotate(${word.rotation}deg)`,
              lineHeight: 1.1,
              padding: '0.1em 0.2em',
            }}
          >
            {word.text}
          </button>
        ))}
      </div>
    </div>
  );
}
