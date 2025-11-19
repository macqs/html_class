import { createClient } from '@/lib/supabase-server';
import { LoginForm } from './login-form';
import type { Session } from '@/types';

interface PageProps {
  searchParams: Promise<{ session?: string }>;
}

export default async function LoginPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const sessionId = searchParams.session;

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-lg font-semibold text-rose-600">잘못된 접근입니다.</p>
          <p className="mt-2 text-zinc-600">세션 ID가 필요합니다.</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [sessionResult, participantsResult] = await Promise.all([
    supabase.from('td_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('td_participants').select('seat_position').eq('session_id', sessionId),
  ]);

  const session = sessionResult.data as Session | null;
  const participants = participantsResult.data as { seat_position: string }[] | null;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-lg font-semibold text-rose-600">세션을 찾을 수 없습니다.</p>
          <p className="mt-2 text-zinc-600">올바른 링크인지 확인해주세요.</p>
        </div>
      </div>
    );
  }

  const occupiedSeats = participants ? participants.map((p) => p.seat_position) : [];

  return <LoginForm session={session} occupiedSeats={occupiedSeats} />;
}
