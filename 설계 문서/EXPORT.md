# 산출물 및 리포트 생성

## 1. 개요

연수 종료 시 자동으로 생성되는 산출물:

**참가자용:**
- 개인 작품 모음 (HTML 파일들)
- 개인 활동 리포트
- QR 코드로 모바일 전송

**강사용:**
- 전체 세션 통계
- 참가자별 활동 요약
- 우수 작품 모음
- Excel 다운로드

## 2. 참가자 산출물 시스템

### 2.1 개인 리포트 페이지

`app/participant/[sessionId]/report/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

export default function ParticipantReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [participant, setParticipant] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const participantId = localStorage.getItem('participantId');
    if (participantId) {
      loadReport(participantId);
      generateQRCode();
    }
  }, []);

  async function loadReport(participantId: string) {
    // 참가자 정보
    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single();

    setParticipant(participantData);

    // 작품 목록
    const { data: worksData } = await supabase
      .from('code_works')
      .select('*')
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false });

    setWorks(worksData || []);

    // 통계
    const { data: statsData } = await supabase
      .rpc('get_participant_summary', { participant_uuid: participantId });

    setStats(statsData);
  }

  async function generateQRCode() {
    const url = window.location.href;
    const qrUrl = await QRCode.toDataURL(url);
    setQrCodeUrl(qrUrl);
  }

  async function downloadWork(work: any) {
    const blob = new Blob([work.code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participant.nickname}_${work.title}_${work.created_at}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAllWorks() {
    // ZIP 생성은 JSZip 라이브러리 사용 (npm install jszip)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    works.forEach((work) => {
      zip.file(`${work.title}_${work.version}.html`, work.code);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participant.nickname}_작품모음.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!participant) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">🎉 연수 완료!</h1>
            <p className="text-gray-600">{participant.nickname}님의 활동 리포트</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.code_works_count}
                </div>
                <div className="text-sm text-gray-600">작성한 작품</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.validations_count}
                </div>
                <div className="text-sm text-gray-600">코드 검증</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats.help_requests_count}
                </div>
                <div className="text-sm text-gray-600">도움 요청</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.total_code_lines || 0}
                </div>
                <div className="text-sm text-gray-600">작성한 코드 줄</div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-4 text-center">
              📱 모바일로 보기
            </h3>
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
              )}
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              QR 코드를 스캔하여 모바일에서 확인하세요
            </p>
          </div>
        </div>

        {/* Works List */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">📦 내가 만든 작품들</h2>
            <button
              onClick={downloadAllWorks}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={18} />
              전체 다운로드 (ZIP)
            </button>
          </div>

          <div className="space-y-4">
            {works.map((work) => (
              <div
                key={work.id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{work.title}</h3>
                    <div className="text-sm text-gray-600">
                      버전 {work.version} · {new Date(work.created_at).toLocaleString('ko-KR')}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {work.code.split('\n').length} 줄 · {work.code.length} 글자
                    </div>
                  </div>
                  <button
                    onClick={() => downloadWork(work)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <Download size={16} />
                    다운로드
                  </button>
                </div>
              </div>
            ))}
          </div>

          {works.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              작성한 작품이 없습니다
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
          <h2 className="text-2xl font-bold mb-4">💬 피드백</h2>
          <textarea
            placeholder="연수에 대한 의견을 남겨주세요..."
            className="w-full h-32 px-4 py-3 border rounded-lg resize-none"
          />
          <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            제출하기
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2.2 작품 자동 저장 (Supabase Storage)

`lib/storage.ts`:

```typescript
import { supabase } from './supabase';

export async function uploadWorkToStorage(
  participantId: string,
  filename: string,
  code: string
): Promise<string | null> {
  try {
    const blob = new Blob([code], { type: 'text/html' });
    const file = new File([blob], filename, { type: 'text/html' });

    const { data, error } = await supabase.storage
      .from('code-works')
      .upload(`${participantId}/${filename}`, file, {
        upsert: true,
      });

    if (error) throw error;

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from('code-works')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

export async function getParticipantWorks(participantId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('code-works')
    .list(participantId);

  if (error || !data) return [];

  return data.map(file => 
    supabase.storage.from('code-works').getPublicUrl(`${participantId}/${file.name}`).data.publicUrl
  );
}
```

## 3. 강사 리포트 시스템

### 3.1 세션 종료 및 리포트 생성

`app/api/sessions/[sessionId]/report/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;

  try {
    // 세션 정보
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    // 참가자 정보 및 통계
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId);

    // 각 참가자의 상세 통계
    const participantStats = await Promise.all(
      participants?.map(async (p) => {
        const { data: summary } = await supabase
          .rpc('get_participant_summary', { participant_uuid: p.id });

        return {
          ...p,
          stats: summary,
        };
      }) || []
    );

    // 도움 요청 통계
    const { data: helpRequests } = await supabase
      .from('help_requests')
      .select('*, participant:participants(nickname)')
      .in('participant_id', participants?.map(p => p.id) || []);

    // 활동 로그
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    // 우수 작품 (코드 줄 수 기준 TOP 5)
    const topWorks = participantStats
      .sort((a, b) => (b.stats?.total_code_lines || 0) - (a.stats?.total_code_lines || 0))
      .slice(0, 5);

    const report = {
      session,
      summary: {
        totalParticipants: participants?.length || 0,
        totalCodeWorks: participantStats.reduce((sum, p) => sum + (p.stats?.code_works_count || 0), 0),
        totalValidations: participantStats.reduce((sum, p) => sum + (p.stats?.validations_count || 0), 0),
        totalHelpRequests: helpRequests?.length || 0,
        averageCodeLines: Math.round(
          participantStats.reduce((sum, p) => sum + (p.stats?.total_code_lines || 0), 0) / (participants?.length || 1)
        ),
      },
      participants: participantStats,
      helpRequests,
      activityLogs,
      topWorks,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: '리포트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

### 3.2 강사 리포트 페이지

`app/instructor/[sessionId]/report/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Users, Code, HelpCircle, Award } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InstructorReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const response = await fetch(`/api/sessions/${sessionId}/report`);
    const data = await response.json();
    setReport(data);
  }

  function exportToExcel() {
    if (!report) return;

    const wb = XLSX.utils.book_new();

    // 전체 통계 시트
    const summaryData = [
      ['항목', '값'],
      ['총 참가자', report.summary.totalParticipants],
      ['작성된 작품', report.summary.totalCodeWorks],
      ['코드 검증', report.summary.totalValidations],
      ['도움 요청', report.summary.totalHelpRequests],
      ['평균 코드 줄 수', report.summary.averageCodeLines],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, '전체 통계');

    // 참가자별 통계 시트
    const participantData = [
      ['닉네임', '좌석', '작품 수', '검증 횟수', '도움 요청', '코드 줄 수'],
      ...report.participants.map((p: any) => [
        p.nickname,
        p.seat_position,
        p.stats?.code_works_count || 0,
        p.stats?.validations_count || 0,
        p.stats?.help_requests_count || 0,
        p.stats?.total_code_lines || 0,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(participantData);
    XLSX.utils.book_append_sheet(wb, ws2, '참가자별 통계');

    // 다운로드
    XLSX.writeFile(wb, `연수리포트_${report.session.title}_${new Date().toLocaleDateString()}.xlsx`);
  }

  if (!report) {
    return <div className="flex items-center justify-center h-screen">리포트 생성 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">연수 리포트</h1>
            <p className="text-gray-600 mt-2">{report.session.title}</p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Excel 다운로드
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <Users className="text-blue-600 mb-2" size={32} />
            <div className="text-3xl font-bold">{report.summary.totalParticipants}</div>
            <div className="text-sm text-gray-600">참가자</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <Code className="text-green-600 mb-2" size={32} />
            <div className="text-3xl font-bold">{report.summary.totalCodeWorks}</div>
            <div className="text-sm text-gray-600">작성된 작품</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <HelpCircle className="text-orange-600 mb-2" size={32} />
            <div className="text-3xl font-bold">{report.summary.totalHelpRequests}</div>
            <div className="text-sm text-gray-600">도움 요청</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-3xl font-bold">{report.summary.totalValidations}</div>
            <div className="text-sm text-gray-600">코드 검증</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-3xl font-bold">{report.summary.averageCodeLines}</div>
            <div className="text-sm text-gray-600">평균 코드 줄</div>
          </div>
        </div>

        {/* Top Works */}
        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="text-yellow-500" />
            우수 참가자 TOP 5
          </h2>
          <div className="space-y-3">
            {report.topWorks.map((p: any, index: number) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                  <div>
                    <div className="font-bold">{p.nickname}</div>
                    <div className="text-sm text-gray-600">{p.seat_position}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{p.stats?.total_code_lines || 0} 줄</div>
                  <div className="text-sm text-gray-600">
                    작품 {p.stats?.code_works_count}개
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participant Table */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">참가자별 상세 통계</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">닉네임</th>
                  <th className="text-left py-3 px-4">좌석</th>
                  <th className="text-center py-3 px-4">작품</th>
                  <th className="text-center py-3 px-4">검증</th>
                  <th className="text-center py-3 px-4">도움 요청</th>
                  <th className="text-center py-3 px-4">코드 줄</th>
                </tr>
              </thead>
              <tbody>
                {report.participants.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.nickname}</td>
                    <td className="py-3 px-4">{p.seat_position}</td>
                    <td className="py-3 px-4 text-center">{p.stats?.code_works_count || 0}</td>
                    <td className="py-3 px-4 text-center">{p.stats?.validations_count || 0}</td>
                    <td className="py-3 px-4 text-center">{p.stats?.help_requests_count || 0}</td>
                    <td className="py-3 px-4 text-center">{p.stats?.total_code_lines || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 4. 필요한 패키지 설치

```bash
# QR Code 생성
npm install qrcode
npm install -D @types/qrcode

# ZIP 파일 생성
npm install jszip

# Excel 생성
npm install xlsx
```

## ✅ 체크리스트

- [ ] 참가자 리포트 페이지 구현
- [ ] 작품 다운로드 기능
- [ ] ZIP 일괄 다운로드
- [ ] QR 코드 생성
- [ ] 강사 리포트 API 구현
- [ ] 강사 리포트 페이지 구현
- [ ] Excel 내보내기 기능
- [ ] Supabase Storage 설정

## 다음 단계

👉 **[DEPLOY.md](./DEPLOY.md)** - 배포 가이드
