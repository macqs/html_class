'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';

interface SessionCodeFormProps {
  errorMessage?: string;
}

export function SessionCodeForm({ errorMessage }: SessionCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    router.push(`/login?code=${encodeURIComponent(code.trim())}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <KeyRound size={28} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">세션 식별 코드 입력</h1>
        <p className="mt-2 text-sm text-zinc-500">강사에게 받은 4~6자리 숫자 코드를 입력하면 바로 입장할 수 있습니다.</p>

        {errorMessage && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{errorMessage}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="text-left">
            <label htmlFor="sessionCode" className="mb-2 block text-sm font-semibold text-zinc-700">
              식별 코드
            </label>
            <input
              id="sessionCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="예: 482931"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-xl font-mono tracking-widest text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-2 text-xs text-zinc-500">숫자만 입력하세요.</p>
          </div>

          <button
            type="submit"
            disabled={!code || isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '확인 중...' : '세션 찾기'}
          </button>
        </form>
      </div>
    </div>
  );
}
