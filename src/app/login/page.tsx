import { createClient } from '@/lib/supabase-server';
import { LoginForm } from './login-form';
import { SessionCodeForm } from './SessionCodeForm';
import type { Session } from '@/types';

interface PageProps {
  searchParams: Promise<{ session?: string; code?: string }>;
}

export default async function LoginPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const sessionIdParam = searchParams.session;
  const sessionCodeParam = searchParams.code;

  if (!sessionIdParam && !sessionCodeParam) {
    return <SessionCodeForm />;
  }

  const supabase = await createClient();

  let sessionId = sessionIdParam;

  if (!sessionId && sessionCodeParam) {
    const sessionByCode = await supabase.from('td_sessions').select('*').eq('session_code', sessionCodeParam).single();
    if (sessionByCode.data) {
      sessionId = sessionByCode.data.id;
    } else {
      return <SessionCodeForm errorMessage="세션 코드가 올바른지 확인해주세요." />;
    }
  }

  const [sessionResult, participantsResult] = await Promise.all([
    supabase.from('td_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('td_participants').select('seat_position').eq('session_id', sessionId),
  ]);

  const session = sessionResult.data as Session | null;
  const participants = participantsResult.data as { seat_position: string }[] | null;

  if (!session) {
    return <SessionCodeForm />;
  }

  const occupiedSeats = participants ? participants.map((p) => p.seat_position) : [];

  return <LoginForm session={session} occupiedSeats={occupiedSeats} />;
}
