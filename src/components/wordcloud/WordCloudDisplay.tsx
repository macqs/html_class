'use client';

import { useEffect, useState, useRef } from 'react';
import cloud from 'd3-cloud';
import { scaleLinear } from 'd3-scale';
import type { WordCount } from '@/types';

interface WordCloudDisplayProps {
  words: WordCount[];
  minFontSize?: number;
  maxFontSize?: number;
  onWordClick?: (word: string) => void;
}

interface CloudWord extends cloud.Word {
  text: string;
  value: number;
  color: string;
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
  minFontSize = 20, 
  maxFontSize = 100,
  onWordClick,
}: WordCloudDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutWords, setLayoutWords] = useState<CloudWord[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 화면 크기 감지 (ResizeObserver 사용)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 워드클라우드 레이아웃 계산
  useEffect(() => {
    if (words.length === 0 || dimensions.width === 0) return;

    // 화면 크기에 맞춰 최대 글자 크기 제한 (긴 단어가 잘리지 않도록)
    // 화면 너비의 1/5 또는 설정된 maxFontSize 중 작은 값 사용
    const safeMaxFontSize = Math.min(maxFontSize, dimensions.width / 6);
    const safeMinFontSize = Math.min(minFontSize, safeMaxFontSize / 2);

    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    
    const fontSizeScale = scaleLinear()
      .domain([minCount, maxCount])
      .range([safeMinFontSize, safeMaxFontSize]);

    // d3-cloud 인스턴스 생성
    // @ts-ignore: d3-cloud import 호환성 처리
    const layoutFunc = cloud.default || cloud;
    
    const layout = layoutFunc<CloudWord>()
      .size([dimensions.width, dimensions.height])
      .words(
        words.map((w, i) => ({
          text: w.text,
          value: w.value,
          size: fontSizeScale(w.value),
          color: COLORS[i % COLORS.length],
        }))
      )
      .padding(5) // 패딩 축소
      .rotate(() => (Math.floor(Math.random() * 2) * 90)) // 0도 또는 90도
      .font('sans-serif') // 기본 폰트 사용
      .fontSize((d: cloud.Word) => d.size || 20)
      .spiral('rectangular') // 테트리스처럼 채우기 위해 rectangular 나선 사용
      .on('end', (computedWords: CloudWord[]) => {
        setLayoutWords(computedWords);
      });

    layout.start();
  }, [words, dimensions, minFontSize, maxFontSize]);

  if (words.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl text-zinc-400">
        아직 응답이 없습니다
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <div 
        className="absolute left-1/2 top-1/2 transition-all duration-500 ease-out"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {layoutWords.map((word, i) => (
          <button
            key={`${word.text}-${i}`}
            type="button"
            onClick={() => onWordClick?.(word.text)}
            className="absolute cursor-pointer whitespace-nowrap font-bold transition-all duration-300 hover:scale-110 hover:brightness-110 hover:drop-shadow-lg"
            style={{
              left: (word.x || 0) + dimensions.width / 2,
              top: (word.y || 0) + dimensions.height / 2,
              fontSize: `${word.size}px`,
              color: word.color,
              transform: `translate(-50%, -50%) rotate(${word.rotate}deg)`,
              opacity: 0,
              animation: `fadeIn 0.5s ease-out forwards ${i * 0.02}s`
            }}
            title={`${word.text}: ${word.value}회 (클릭하여 상세 보기)`}
          >
            {word.text}
          </button>
        ))}
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(0.5); }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
