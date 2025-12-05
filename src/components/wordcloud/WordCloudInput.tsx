'use client';

import { useState } from 'react';
import { Send, X } from 'lucide-react';

interface WordCloudInputProps {
  question: string;
  maxWords: number;
  submittedWords: string[];
  onSubmit: (word: string) => Promise<void>;
  onRemove?: (word: string) => Promise<void>;
  disabled?: boolean;
}

export function WordCloudInput({
  question,
  maxWords,
  submittedWords,
  onSubmit,
  onRemove,
  disabled = false,
}: WordCloudInputProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitMore = submittedWords.length < maxWords;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const word = input.trim();
    if (!word || !canSubmitMore || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(word);
      setInput('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(word: string) {
    if (!onRemove) return;
    await onRemove(word);
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <h3 className="mb-2 text-lg font-bold text-zinc-900">{question}</h3>
      <p className="mb-4 text-sm text-zinc-600">
        최대 {maxWords}개의 단어를 입력할 수 있습니다 ({submittedWords.length}/{maxWords})
      </p>

      {/* 제출한 단어 목록 */}
      {submittedWords.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {submittedWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white"
            >
              {word}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => handleRemove(word)}
                  className="ml-1 rounded-full p-0.5 hover:bg-blue-700"
                >
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 입력 폼 */}
      {canSubmitMore && !disabled && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="단어를 입력하세요"
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled={isSubmitting}
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      )}

      {!canSubmitMore && !disabled && (
        <p className="text-center text-sm font-medium text-emerald-600">
          ✓ 모든 단어를 제출했습니다
        </p>
      )}

      {disabled && (
        <p className="text-center text-sm font-medium text-zinc-500">
          워드클라우드가 종료되었습니다
        </p>
      )}
    </div>
  );
}
