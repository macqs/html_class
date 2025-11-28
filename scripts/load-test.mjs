/**
 * 80명 동시 접속 부하 테스트 스크립트
 * 
 * 테스트 항목:
 * 1. Supabase Realtime WebSocket 연결 (80개 동시)
 * 2. 참가자 등록 (DB INSERT)
 * 3. 코드 저장 (DB UPDATE)
 * 4. 도움 요청 (DB INSERT)
 * 5. 코드 검증 API (Gemini API 호출)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const NUM_PARTICIPANTS = 80;
const TEST_SESSION_ID = process.argv[2] || null;

// 테스트 결과 저장
const results = {
  realtimeConnections: { success: 0, failed: 0, latencies: [] },
  participantRegistration: { success: 0, failed: 0, latencies: [] },
  codeSave: { success: 0, failed: 0, latencies: [] },
  helpRequest: { success: 0, failed: 0, latencies: [] },
  codeValidation: { success: 0, failed: 0, latencies: [] },
};

// 유틸리티 함수
function generateSeatPosition(index) {
  const row = String.fromCharCode(65 + Math.floor(index / 10)); // A, B, C...
  const col = (index % 10) + 1;
  return `${row}-${col}`;
}

function generateNickname(index) {
  const names = ['참가자', '선생님', '교사', '연수생'];
  return `${names[index % names.length]}${index + 1}`;
}

function generateSampleCode(index) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>참가자 ${index + 1}의 작품</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}; }
  </style>
</head>
<body>
  <h1>안녕하세요! 저는 참가자 ${index + 1}입니다.</h1>
  <p>이것은 테스트 코드입니다. 시간: ${new Date().toISOString()}</p>
</body>
</html>`;
}

async function measureLatency(fn) {
  const start = performance.now();
  try {
    await fn();
    return { success: true, latency: performance.now() - start };
  } catch (error) {
    return { success: false, latency: performance.now() - start, error: error.message };
  }
}

// 1. 세션 생성 또는 기존 세션 사용
async function getOrCreateSession() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  if (TEST_SESSION_ID) {
    const { data } = await supabase
      .from('td_sessions')
      .select('*')
      .eq('id', TEST_SESSION_ID)
      .single();
    
    if (data) {
      console.log(`📌 기존 세션 사용: ${TEST_SESSION_ID}`);
      return data;
    }
  }
  
  // 새 세션 생성
  function generateSeatLabels(rows, cols) {
    const labels = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c++) {
        labels.push(`${rowLabel}-${c}`);
      }
    }
    return labels;
  }

  const sessionCode = `TEST${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from('td_sessions')
    .insert({
      session_code: sessionCode,
      title: '80명 부하 테스트 세션',
      seat_layout: { rows: 8, cols: 10, labels: generateSeatLabels(8, 10) },
      status: 'active',
      date: new Date().toISOString(),
      instructor_id: 'load-test-instructor',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 세션 생성 실패:', error.message);
    process.exit(1);
  }

  console.log(`✅ 새 세션 생성: ${data.id} (코드: ${sessionCode})`);
  return data;
}

// 2. Realtime 연결 테스트
async function testRealtimeConnections(sessionId) {
  console.log('\n🔌 Realtime 연결 테스트 시작...');
  
  const connections = [];
  const connectionPromises = [];

  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const channelName = `session:${sessionId}:broadcast`;
    
    const promise = measureLatency(async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('연결 타임아웃')), 10000);
        
        const channel = supabase.channel(channelName)
          .on('broadcast', { event: 'test' }, () => {})
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              connections.push({ supabase, channel });
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              reject(new Error(`연결 실패: ${status}`));
            }
          });
      });
    });

    connectionPromises.push(promise);
    
    // 연결 간 약간의 지연 (너무 빠른 연결 시도 방지)
    if (i % 10 === 9) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  const connectionResults = await Promise.all(connectionPromises);
  
  connectionResults.forEach(result => {
    if (result.success) {
      results.realtimeConnections.success++;
      results.realtimeConnections.latencies.push(result.latency);
    } else {
      results.realtimeConnections.failed++;
      console.error(`  ❌ ${result.error}`);
    }
  });

  console.log(`  ✅ 성공: ${results.realtimeConnections.success}/${NUM_PARTICIPANTS}`);
  console.log(`  ❌ 실패: ${results.realtimeConnections.failed}/${NUM_PARTICIPANTS}`);
  
  if (results.realtimeConnections.latencies.length > 0) {
    const avg = results.realtimeConnections.latencies.reduce((a, b) => a + b, 0) / results.realtimeConnections.latencies.length;
    const max = Math.max(...results.realtimeConnections.latencies);
    console.log(`  ⏱️  평균 연결 시간: ${avg.toFixed(0)}ms, 최대: ${max.toFixed(0)}ms`);
  }

  return connections;
}

// 3. 참가자 등록 테스트
async function testParticipantRegistration(sessionId) {
  console.log('\n👥 참가자 등록 테스트 시작...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const participantIds = [];
  
  const registrationPromises = [];
  
  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const promise = measureLatency(async () => {
      const { data, error } = await supabase
        .from('td_participants')
        .insert({
          session_id: sessionId,
          nickname: generateNickname(i),
          seat_position: generateSeatPosition(i),
          status: 'idle',
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      participantIds.push(data.id);
      return data;
    });
    
    registrationPromises.push(promise);
  }

  const registrationResults = await Promise.all(registrationPromises);
  
  registrationResults.forEach(result => {
    if (result.success) {
      results.participantRegistration.success++;
      results.participantRegistration.latencies.push(result.latency);
    } else {
      results.participantRegistration.failed++;
      console.error(`  ❌ ${result.error}`);
    }
  });

  console.log(`  ✅ 성공: ${results.participantRegistration.success}/${NUM_PARTICIPANTS}`);
  console.log(`  ❌ 실패: ${results.participantRegistration.failed}/${NUM_PARTICIPANTS}`);
  
  if (results.participantRegistration.latencies.length > 0) {
    const avg = results.participantRegistration.latencies.reduce((a, b) => a + b, 0) / results.participantRegistration.latencies.length;
    const max = Math.max(...results.participantRegistration.latencies);
    console.log(`  ⏱️  평균 등록 시간: ${avg.toFixed(0)}ms, 최대: ${max.toFixed(0)}ms`);
  }

  return participantIds;
}

// 4. 코드 저장 테스트 (동시에 80명이 코드 저장)
async function testCodeSave(participantIds) {
  console.log('\n💾 코드 저장 테스트 시작 (동시 80명)...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const savePromises = participantIds.map((id, index) => 
    measureLatency(async () => {
      const { error } = await supabase
        .from('td_participants')
        .update({ current_code: generateSampleCode(index) })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
    })
  );

  const saveResults = await Promise.all(savePromises);
  
  saveResults.forEach(result => {
    if (result.success) {
      results.codeSave.success++;
      results.codeSave.latencies.push(result.latency);
    } else {
      results.codeSave.failed++;
      console.error(`  ❌ ${result.error}`);
    }
  });

  console.log(`  ✅ 성공: ${results.codeSave.success}/${NUM_PARTICIPANTS}`);
  console.log(`  ❌ 실패: ${results.codeSave.failed}/${NUM_PARTICIPANTS}`);
  
  if (results.codeSave.latencies.length > 0) {
    const avg = results.codeSave.latencies.reduce((a, b) => a + b, 0) / results.codeSave.latencies.length;
    const max = Math.max(...results.codeSave.latencies);
    console.log(`  ⏱️  평균 저장 시간: ${avg.toFixed(0)}ms, 최대: ${max.toFixed(0)}ms`);
  }
}

// 5. 도움 요청 테스트 (20명 동시 요청)
async function testHelpRequests(participantIds) {
  console.log('\n🆘 도움 요청 테스트 시작 (20명 동시)...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const testCount = 20; // 20명만 동시 요청
  
  const helpPromises = participantIds.slice(0, testCount).map((id, index) => 
    measureLatency(async () => {
      const { error } = await supabase
        .from('td_help_requests')
        .insert({
          participant_id: id,
          message: `도움이 필요합니다! (테스트 ${index + 1})`,
          code_snapshot: generateSampleCode(index),
        });
      
      if (error) throw new Error(error.message);
      
      // 상태 업데이트
      await supabase
        .from('td_participants')
        .update({ status: 'help_needed' })
        .eq('id', id);
    })
  );

  const helpResults = await Promise.all(helpPromises);
  
  helpResults.forEach(result => {
    if (result.success) {
      results.helpRequest.success++;
      results.helpRequest.latencies.push(result.latency);
    } else {
      results.helpRequest.failed++;
      console.error(`  ❌ ${result.error}`);
    }
  });

  console.log(`  ✅ 성공: ${results.helpRequest.success}/${testCount}`);
  console.log(`  ❌ 실패: ${results.helpRequest.failed}/${testCount}`);
  
  if (results.helpRequest.latencies.length > 0) {
    const avg = results.helpRequest.latencies.reduce((a, b) => a + b, 0) / results.helpRequest.latencies.length;
    const max = Math.max(...results.helpRequest.latencies);
    console.log(`  ⏱️  평균 요청 시간: ${avg.toFixed(0)}ms, 최대: ${max.toFixed(0)}ms`);
  }
}

// 6. 코드 검증 API 테스트 (순차적으로 5명만 - API Rate Limit 고려)
async function testCodeValidation(participantIds) {
  console.log('\n🔍 코드 검증 API 테스트 시작 (5명 순차)...');
  console.log('  ⚠️  Gemini API Rate Limit으로 인해 순차 실행');
  
  const testCount = 5;
  
  for (let i = 0; i < testCount; i++) {
    const result = await measureLatency(async () => {
      const response = await fetch(`${BASE_URL}/api/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generateSampleCode(i),
          participantId: participantIds[i],
        }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      return response.json();
    });

    if (result.success) {
      results.codeValidation.success++;
      results.codeValidation.latencies.push(result.latency);
      console.log(`  ✅ ${i + 1}번째 검증 완료: ${result.latency.toFixed(0)}ms`);
    } else {
      results.codeValidation.failed++;
      console.error(`  ❌ ${i + 1}번째 검증 실패: ${result.error}`);
    }
    
    // Rate Limit 방지를 위한 딜레이
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`  ✅ 성공: ${results.codeValidation.success}/${testCount}`);
  console.log(`  ❌ 실패: ${results.codeValidation.failed}/${testCount}`);
  
  if (results.codeValidation.latencies.length > 0) {
    const avg = results.codeValidation.latencies.reduce((a, b) => a + b, 0) / results.codeValidation.latencies.length;
    const max = Math.max(...results.codeValidation.latencies);
    console.log(`  ⏱️  평균 검증 시간: ${avg.toFixed(0)}ms, 최대: ${max.toFixed(0)}ms`);
  }
}

// 7. 정리 (테스트 데이터 삭제)
async function cleanup(sessionId, participantIds) {
  console.log('\n🧹 테스트 데이터 정리 중...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // 도움 요청 삭제
  await supabase
    .from('td_help_requests')
    .delete()
    .in('participant_id', participantIds);
  
  // 코드 검증 기록 삭제
  await supabase
    .from('td_code_validations')
    .delete()
    .in('participant_id', participantIds);
  
  // 참가자 삭제
  await supabase
    .from('td_participants')
    .delete()
    .eq('session_id', sessionId);
  
  // 세션 삭제 (새로 만든 경우에만)
  if (!TEST_SESSION_ID) {
    await supabase
      .from('td_sessions')
      .delete()
      .eq('id', sessionId);
  }
  
  console.log('  ✅ 정리 완료');
}

// 결과 요약 출력
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 부하 테스트 결과 요약');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Realtime 연결', data: results.realtimeConnections, total: NUM_PARTICIPANTS },
    { name: '참가자 등록', data: results.participantRegistration, total: NUM_PARTICIPANTS },
    { name: '코드 저장', data: results.codeSave, total: NUM_PARTICIPANTS },
    { name: '도움 요청', data: results.helpRequest, total: 20 },
    { name: '코드 검증', data: results.codeValidation, total: 5 },
  ];

  tests.forEach(test => {
    const successRate = ((test.data.success / test.total) * 100).toFixed(1);
    const avgLatency = test.data.latencies.length > 0 
      ? (test.data.latencies.reduce((a, b) => a + b, 0) / test.data.latencies.length).toFixed(0)
      : '-';
    
    console.log(`\n${test.name}:`);
    console.log(`  성공률: ${successRate}% (${test.data.success}/${test.total})`);
    console.log(`  평균 응답시간: ${avgLatency}ms`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  우려 사항 및 권장 사항');
  console.log('='.repeat(60));
  
  const concerns = [];
  
  if (results.realtimeConnections.failed > 0) {
    concerns.push('🔴 Realtime 연결 실패 발생 - Supabase 플랜 확인 필요');
  }
  
  if (results.realtimeConnections.latencies.length > 0) {
    const maxLatency = Math.max(...results.realtimeConnections.latencies);
    if (maxLatency > 5000) {
      concerns.push(`🟡 Realtime 연결 지연 (최대 ${(maxLatency/1000).toFixed(1)}초) - 네트워크 상태 확인`);
    }
  }
  
  if (results.codeSave.latencies.length > 0) {
    const avgLatency = results.codeSave.latencies.reduce((a, b) => a + b, 0) / results.codeSave.latencies.length;
    if (avgLatency > 1000) {
      concerns.push(`🟡 코드 저장 지연 (평균 ${(avgLatency/1000).toFixed(1)}초) - DB 성능 확인`);
    }
  }
  
  if (results.codeValidation.failed > 0) {
    concerns.push('🔴 코드 검증 API 실패 - Gemini API Rate Limit 확인');
  }
  
  if (results.codeValidation.latencies.length > 0) {
    const avgLatency = results.codeValidation.latencies.reduce((a, b) => a + b, 0) / results.codeValidation.latencies.length;
    if (avgLatency > 5000) {
      concerns.push(`🟡 코드 검증 지연 (평균 ${(avgLatency/1000).toFixed(1)}초) - 80명 동시 사용 시 큐잉 필요`);
    }
  }
  
  if (concerns.length === 0) {
    console.log('\n✅ 모든 테스트가 정상 범위 내에서 완료되었습니다.');
  } else {
    concerns.forEach(c => console.log(`\n${c}`));
  }
  
  console.log('\n📋 80명 동시 사용 시 권장 사항:');
  console.log('  1. 코드 검증은 동시에 많이 요청되지 않도록 UI에서 쓰로틀링');
  console.log('  2. 도움 요청은 쿨다운(예: 30초) 적용 권장');
  console.log('  3. 코드 자동 저장 간격을 5초 이상으로 설정');
  console.log('  4. Supabase 프로젝트가 Pro 플랜인지 확인 (무료 플랜은 연결 제한)');
  console.log('  5. 네트워크 환경이 안정적인지 사전 확인');
}

// 메인 실행
async function main() {
  console.log('🚀 80명 동시 접속 부하 테스트 시작');
  console.log(`   테스트 대상: ${BASE_URL}`);
  console.log(`   참가자 수: ${NUM_PARTICIPANTS}명`);
  console.log('');

  let session;
  let participantIds = [];
  let connections = [];

  try {
    // 세션 준비
    session = await getOrCreateSession();
    
    // 테스트 실행
    connections = await testRealtimeConnections(session.id);
    participantIds = await testParticipantRegistration(session.id);
    await testCodeSave(participantIds);
    await testHelpRequests(participantIds);
    await testCodeValidation(participantIds);
    
    // 결과 요약
    printSummary();
    
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error.message);
  } finally {
    // Realtime 연결 정리
    for (const { supabase, channel } of connections) {
      try {
        await channel.unsubscribe();
      } catch {}
    }
    
    // 테스트 데이터 정리
    if (session && participantIds.length > 0) {
      await cleanup(session.id, participantIds);
    }
  }
}

main();
