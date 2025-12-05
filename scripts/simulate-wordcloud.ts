import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 환경변수 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const WORDS = [
  'HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Supabase', 'Web', 'Frontend',
  'Developer', 'Coding', 'Component', 'Hook', 'State', 'Props', 'Database',
  'API', 'Server', 'Client', 'Browser', 'DOM', 'Event', 'Style', 'Layout',
  'Flexbox', 'Grid', 'Responsive', 'Mobile', 'Tablet', 'Desktop', 'UI/UX',
  'Design', 'Accessibility', 'Performance', 'Optimization', 'Deployment', 'Git',
  'GitHub', 'Commit', 'Push', 'Pull', 'Merge', 'Branch', 'Conflict', 'Debug',
  'Error', 'Warning', 'Console', 'Log', 'Test', 'Jest'
];

async function simulate(sessionId: string, wordcloudId: string) {
  console.log(`🚀 시뮬레이션 시작: 세션 ${sessionId}, 워드클라우드 ${wordcloudId}`);
  console.log('👥 참가자 80명 생성 및 응답 제출 중...');

  const participants = [];
  
  // 1. 80명 참가자 생성
  for (let i = 1; i <= 80; i++) {
    const seatPos = `${Math.ceil(i / 8)}-${(i - 1) % 8 + 1}`; // 대략적인 좌석 번호
    participants.push({
      session_id: sessionId,
      nickname: `참가자${i}`,
      seat_position: seatPos,
      status: 'idle',
      last_active: new Date().toISOString(),
    });
  }

  const { data: createdParticipants, error: pError } = await supabase
    .from('td_participants')
    .insert(participants)
    .select();

  if (pError) {
    console.error('❌ 참가자 생성 실패:', pError);
    return;
  }

  console.log(`✅ 참가자 ${createdParticipants.length}명 생성 완료`);

  // 2. 각 참가자가 1~3개의 단어 제출
  const responses = [];
  for (const p of createdParticipants) {
    const wordCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < wordCount; j++) {
      const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      responses.push({
        wordcloud_id: wordcloudId,
        participant_id: p.id,
        word: randomWord,
      });
    }
  }

  // 데이터를 20개씩 나누어 전송 (한 번에 너무 많이 보내면 Realtime 부하 가능성)
  const chunkSize = 20;
  for (let i = 0; i < responses.length; i += chunkSize) {
    const chunk = responses.slice(i, i + chunkSize);
    const { error: rError } = await supabase
      .from('td_wordcloud_responses')
      .insert(chunk);

    if (rError) {
      console.error('❌ 응답 제출 실패:', rError);
    } else {
      process.stdout.write('.'); // 진행 표시
    }
    // 약간의 딜레이를 주어 순차적으로 들어오는 느낌 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✨ 시뮬레이션 완료! 총 응답 수:', responses.length);
}

// 워드클라우드 ID 자동 조회
async function getActiveWordCloud(sessionId: string) {
  const { data, error } = await supabase
    .from('td_wordclouds')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    console.error('❌ 활성 워드클라우드를 찾을 수 없습니다.');
    process.exit(1);
  }
  return data.id;
}

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('사용법: npx ts-node scripts/simulate-wordcloud.ts <session_id>');
  process.exit(1);
}

getActiveWordCloud(sessionId).then(wordcloudId => {
  simulate(sessionId, wordcloudId);
});
