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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 화면 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 워드클라우드 레이아웃 계산
  useEffect(() => {
    if (words.length === 0 || dimensions.width === 0) return;

    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    
    // 폰트 크기 스케일 함수
    const fontSizeScale = scaleLinear()
      .domain([minCount, maxCount])
      .range([minFontSize, maxFontSize]);

    const layout = cloud<CloudWord>()
      .size([dimensions.width, dimensions.height])
      .words(
        words.map((w, i) => ({
          text: w.text,
          value: w.value,
          size: fontSizeScale(w.value),
          color: COLORS[i % COLORS.length],
        }))
      )
      .padding(10) // 단어 간 간격
      .rotate(() => (Math.floor(Math.random() * 2) * 90) - 0) // 0도 또는 90도 회전 (깔끔한 테트리스 느낌)
      .font('Pretendard, system-ui, sans-serif')
      .fontSize(d => d.size || 20)
      .on('end', (computedWords) => {
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
              left: word.x! + dimensions.width / 2,
              top: word.y! + dimensions.height / 2,
              fontSize: `${word.size}px`,
              color: word.color,
              transform: `translate(-50%, -50%) rotate(${word.rotate}deg)`,
            }}
            title={`${word.text}: ${word.value}회 (클릭하여 상세 보기)`}
          >
            {word.text}
          </button>
        ))}
      </div>
    </div>
  );
}
