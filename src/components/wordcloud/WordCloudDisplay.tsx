'use client';

import { useRef, useEffect, useState } from 'react';
import type { WordCount } from '@/types';

interface WordCloudDisplayProps {
  words: WordCount[];
  onWordClick?: (word: string) => void;
}

interface PositionedWord extends WordCount {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotation: number;
  width: number;
  height: number;
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

// 겹침 감지 함수
function checkCollision(word: PositionedWord, others: PositionedWord[]) {
  const w1 = word.width;
  const h1 = word.height;
  const x1 = word.x - w1 / 2;
  const y1 = word.y - h1 / 2;

  for (const other of others) {
    const w2 = other.width;
    const h2 = other.height;
    const x2 = other.x - w2 / 2;
    const y2 = other.y - h2 / 2;

    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) {
      return true;
    }
  }
  return false;
}

export function WordCloudDisplay({ words, onWordClick }: WordCloudDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [positionedWords, setPositionedWords] = useState<PositionedWord[]>([]);

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // 크기가 유효할 때만 업데이트
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };

    // 초기 실행 및 리사이즈 감지
    updateSize();
    
    // 약간의 딜레이 후 한 번 더 체크 (레이아웃 안정화 대기)
    const timeoutId = setTimeout(updateSize, 100);

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  // 워드클라우드 계산 로직
  useEffect(() => {
    if (words.length === 0 || containerSize.width === 0) return;

    // 캔버스를 사용하여 텍스트 크기 측정
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxCount = Math.max(...words.map(w => w.value));
    const minCount = Math.min(...words.map(w => w.value));
    const range = maxCount - minCount || 1;

    // 화면 크기와 단어 수에 따라 동적으로 폰트 크기 계산
    const totalWords = words.length;
    const area = containerSize.width * containerSize.height;
    
    const avgAreaPerWord = area / Math.max(totalWords, 1);
    // 글자 크기를 더 줄여서 많은 단어가 배치되도록 함
    const scaleFactor = Math.sqrt(avgAreaPerWord) / (totalWords > 50 ? 18 : 12);
    
    const baseMax = Math.min(Math.max(scaleFactor * 4, 30), 100); // 최대 크기 줄임
    const baseMin = Math.min(Math.max(scaleFactor * 1.2, 12), 20); // 최소 크기 줄임
    
    const sortedWords = [...words].sort((a, b) => b.value - a.value);
    const placedWords: PositionedWord[] = [];

    // 중앙 좌표
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    sortedWords.forEach((word, index) => {
      const normalized = (word.value - minCount) / range;
      const sizeRatio = Math.pow(normalized, 0.7); 
      const fontSize = baseMin + sizeRatio * (baseMax - baseMin);
      
      const color = COLORS[index % COLORS.length];
      const rotation = (Math.random() - 0.5) * 20; // 회전 각도 약간 늘림

      ctx.font = `bold ${fontSize}px Pretendard, sans-serif`;
      const textMetrics = ctx.measureText(word.text);
      const width = textMetrics.width + fontSize * 0.3; 
      const height = fontSize * 1.0;

      const tempWord: PositionedWord = {
        ...word,
        x: centerX,
        y: centerY,
        fontSize,
        color,
        rotation,
        width,
        height,
      };

      // 나선형 배치 알고리즘
      let angle = 0;
      let radius = 0;
      const spiralStep = 0.2; 
      const radiusStep = 10; // 반지름 증가량 늘려서 탐색 범위 확대
      let maxAttempts = 2500; // 시도 횟수 대폭 증가
      let isPlaced = false;

      if (placedWords.length === 0) {
        isPlaced = true;
      } else {
        while (maxAttempts > 0) {
          if (!checkCollision(tempWord, placedWords)) {
            // 화면 밖으로 나가는지 체크 (선택 사항이지만 너무 멀리 가는 것 방지)
            const halfW = width / 2;
            const halfH = height / 2;
            if (
              tempWord.x - halfW > 0 &&
              tempWord.x + halfW < containerSize.width &&
              tempWord.y - halfH > 0 &&
              tempWord.y + halfH < containerSize.height
            ) {
              isPlaced = true;
              break;
            }
          }
          radius += radiusStep * spiralStep * 0.5;
          angle += spiralStep;

          tempWord.x = centerX + radius * Math.cos(angle);
          tempWord.y = centerY + radius * Math.sin(angle) * 0.8;
          maxAttempts--;
        }
      }
      
      if (isPlaced) {
        placedWords.push(tempWord);
      }
    });

    // eslint-disable-next-line
    setPositionedWords(placedWords);

  }, [words, containerSize]);


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
      className="relative h-full w-full flex-1 overflow-hidden bg-zinc-50"
    >
      {positionedWords.map((word, index) => (
        <button
          type="button"
          key={`${word.text}-${index}`}
          onClick={() => onWordClick?.(word.text)}
          className="absolute inline-flex items-center justify-center whitespace-nowrap font-bold transition-all duration-300 hover:z-10 hover:scale-110 hover:brightness-110"
          style={{
            left: `${word.x}px`,
            top: `${word.y}px`,
            fontSize: `${word.fontSize}px`,
            color: word.color,
            transform: `translate(-50%, -50%) rotate(${word.rotation}deg)`,
            width: `${word.width}px`,
            height: `${word.height}px`,
            zIndex: Math.round(word.fontSize),
          }}
        >
          {word.text}
        </button>
      ))}
    </div>
  );
}
