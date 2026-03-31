'use client';

import { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'instructor_pin_verified';

interface InstructorPinGateProps {
  children: React.ReactNode;
}

export default function InstructorPinGate({ children }: InstructorPinGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setIsVerified(true);
      } else {
        setError('PIN이 올바르지 않습니다.');
        setPin('');
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">강사 인증</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            강사 전용 페이지입니다. PIN을 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={10}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN 입력"
            autoFocus
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-zinc-900 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {error && (
            <p className="text-center text-sm font-semibold text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!pin.trim() || isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
