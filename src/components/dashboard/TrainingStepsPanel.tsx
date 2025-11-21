'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';

type StepId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6';

interface TrainingStep {
  id: StepId;
  title: string;
  duration: string;
  summary: string;
  details: string;
}

const TRAINING_STEPS: TrainingStep[] = [
  {
    id: 'step1',
    title: 'STEP 1. 성취기준 선택',
    duration: '약 5분',
    summary: '준비된 성취기준 목록에서 오늘 활동에 맞는 코드를 고릅니다.',
    details: '워크시트 STEP 1 — 번호/코드/선택 이유를 간단히 기록하도록 안내하세요.',
  },
  {
    id: 'step2',
    title: 'STEP 2. HTML 도구 수정 계획',
    duration: '약 10분',
    summary: '선택한 도구 파일을 열어 질문·선택지·정답 표시 위치를 정리합니다.',
    details: '워크시트 STEP 2 — 지시문/선택지 표와 학생 맞춤화 항목을 점검합니다.',
  },
  {
    id: 'step3',
    title: 'STEP 3. 실제 코드 수정',
    duration: '약 15분',
    summary: 'VSCode/브라우저에서 HTML을 직접 수정하고 저장까지 확인합니다.',
    details: '워크시트 STEP 3 체크리스트(수정 포인트, 저장, 미리보기)를 따라갑니다.',
  },
  {
    id: 'step4',
    title: 'STEP 4. ChatGPT로 개선',
    duration: '선택 10분',
    summary: '필요 시 제공된 프롬프트 템플릿으로 LLM 개선을 요청합니다.',
    details: '워크시트 STEP 4 — 실제로 작성한 프롬프트와 결과 평가를 기록합니다.',
  },
  {
    id: 'step5',
    title: 'STEP 5. 수업 적용 계획',
    duration: '약 5분',
    summary: '적용 일정·대상·준비물을 정리해 바로 수업에 쓸 수 있게 합니다.',
    details: '워크시트 STEP 5 — 진행 시간표와 평가 계획을 간단히 적도록 유도합니다.',
  },
  {
    id: 'step6',
    title: 'STEP 6. 성찰 및 확산',
    duration: '약 5분',
    summary: '연수에서 배운 점과 확산 아이디어를 공유하며 마무리합니다.',
    details: '워크시트 STEP 6 — 어려웠던 점, 추가 도구 아이디어, 공유 계획을 기록합니다.',
  },
];

export default function TrainingStepsPanel() {
  const [completedSteps, setCompletedSteps] = useState<Record<StepId, boolean>>({} as Record<StepId, boolean>);

  const toggleStep = (stepId: StepId) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">연수 진행 단계</p>
          <h3 className="text-lg font-bold text-zinc-900">워크시트 STEP 1~6 빠른 체크</h3>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          <ClipboardCheck size={14} className="inline-block" /> 전체 {TRAINING_STEPS.length}단계
        </span>
      </div>

      <ol className="space-y-3">
        {TRAINING_STEPS.map((step) => (
          <li key={step.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                checked={Boolean(completedSteps[step.id])}
                onChange={() => toggleStep(step.id)}
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{step.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">{step.duration}</span>
                </div>
                <p className="text-sm text-zinc-700">{step.summary}</p>
                <p className="text-xs text-zinc-500">{step.details}</p>
              </div>
            </label>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-zinc-500">체크 상태는 현재 브라우저에서만 유지됩니다.</p>
    </div>
  );
}
