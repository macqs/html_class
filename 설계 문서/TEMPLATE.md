# 템플릿 시스템 구현

## 1. 템플릿 시스템 개요

연수 설정(좌석 배치, 예제 코드, 진행 단계)을 템플릿으로 저장하고 재사용할 수 있습니다.

**템플릿 구성 요소:**
- 좌석 배치 (행×열)
- 예제 코드 세트
- 진행 단계
- 연수 설명

## 2. 템플릿 관리 페이지

### 2.1 템플릿 목록 페이지

`app/instructor/templates/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Template } from '@/types';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTemplates(data);
    setIsLoading(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;

    await supabase.from('templates').delete().eq('id', id);
    loadTemplates();
  }

  async function duplicateTemplate(template: Template) {
    const name = prompt('새 템플릿 이름:', `${template.name} (복사본)`);
    if (!name) return;

    await supabase.from('templates').insert({
      name,
      description: template.description,
      config: template.config,
      created_by: 'instructor', // 실제로는 로그인 정보 사용
    });

    loadTemplates();
  }

  async function createSessionFromTemplate(template: Template) {
    const title = prompt('연수 제목을 입력하세요:', template.name);
    if (!title) return;

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        title,
        date: new Date().toISOString(),
        instructor_id: 'instructor', // 실제로는 로그인 정보 사용
        seat_layout: template.config.seat_layout,
        template_id: template.id,
        status: 'active',
      })
      .select()
      .single();

    if (data) {
      router.push(`/instructor/${data.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">템플릿 관리</h1>
            <p className="text-gray-600 mt-2">
              연수 설정을 템플릿으로 저장하고 재사용하세요
            </p>
          </div>
          <button
            onClick={() => router.push('/instructor/templates/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            새 템플릿
          </button>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">저장된 템플릿이 없습니다</p>
            <button
              onClick={() => router.push('/instructor/templates/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              첫 템플릿 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const config = template.config as any;
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div>
                      좌석: {config.seat_layout.rows} × {config.seat_layout.cols} 
                      ({config.seat_layout.rows * config.seat_layout.cols}석)
                    </div>
                    <div>
                      예제 코드: {config.example_codes?.length || 0}개
                    </div>
                    <div>
                      진행 단계: {config.steps?.length || 0}단계
                    </div>
                    <div className="text-xs text-gray-500">
                      생성일: {formatDate(template.created_at)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => createSessionFromTemplate(template)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                    >
                      세션 시작
                    </button>
                    <button
                      onClick={() => router.push(`/instructor/templates/${template.id}`)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition"
                      title="수정"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded transition"
                      title="복제"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2.2 템플릿 생성/수정 페이지

`app/instructor/templates/new/page.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateSeatLabels } from '@/lib/utils';
import { Plus, Trash2, Save } from 'lucide-react';

export default function NewTemplatePage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(10);
  const [exampleCodes, setExampleCodes] = useState<Array<{
    title: string;
    description: string;
    code: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
  }>>([]);
  const [steps, setSteps] = useState<string[]>(['']);

  async function saveTemplate() {
    if (!name) {
      alert('템플릿 이름을 입력하세요.');
      return;
    }

    const seatLayout = {
      rows,
      cols,
      labels: generateSeatLabels(rows, cols),
    };

    const config = {
      seat_layout: seatLayout,
      example_codes: exampleCodes,
      steps: steps.filter(s => s.trim()),
    };

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        description,
        config,
        created_by: 'instructor',
      })
      .select()
      .single();

    if (error) {
      alert('템플릿 저장 실패: ' + error.message);
      return;
    }

    // 예제 코드를 example_codes 테이블에도 저장
    if (exampleCodes.length > 0) {
      const exampleCodesData = exampleCodes.map((ex, idx) => ({
        template_id: data.id,
        ...ex,
        order_index: idx,
      }));

      await supabase.from('example_codes').insert(exampleCodesData);
    }

    alert('템플릿이 저장되었습니다!');
    router.push('/instructor/templates');
  }

  function addExampleCode() {
    setExampleCodes([
      ...exampleCodes,
      {
        title: '',
        description: '',
        code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>예제</title>\n</head>\n<body>\n  \n</body>\n</html>',
        difficulty: 'basic',
      },
    ]);
  }

  function removeExampleCode(index: number) {
    setExampleCodes(exampleCodes.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps([...steps, '']);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">새 템플릿 만들기</h1>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <label className="block text-sm font-medium mb-2">템플릿 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 초등 특수교사 HTML 기초 3시간"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="템플릿 설명을 입력하세요"
              className="w-full px-4 py-2 border rounded-lg h-24"
            />
          </div>

          {/* 좌석 배치 */}
          <div>
            <label className="block text-sm font-medium mb-2">좌석 배치</label>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">행 (A, B, C...)</label>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  min="1"
                  max="26"
                  className="w-24 px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">열 (1, 2, 3...)</label>
                <input
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-24 px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <div className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg font-medium">
                  총 {rows × cols}석
                </div>
              </div>
            </div>
          </div>

          {/* 진행 단계 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">진행 단계</label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                단계 추가
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => {
                      const newSteps = [...steps];
                      newSteps[index] = e.target.value;
                      setSteps(newSteps);
                    }}
                    placeholder={`${index + 1}단계: HTML 기본 구조 익히기`}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => removeStep(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 예제 코드 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">예제 코드</label>
              <button
                onClick={addExampleCode}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                예제 추가
              </button>
            </div>

            <div className="space-y-4">
              {exampleCodes.map((example, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      예제 {index + 1}
                    </span>
                    <button
                      onClick={() => removeExampleCode(index)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={example.title}
                      onChange={(e) => {
                        const newExamples = [...exampleCodes];
                        newExamples[index].title = e.target.value;
                        setExampleCodes(newExamples);
                      }}
                      placeholder="제목"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />

                    <input
                      type="text"
                      value={example.description}
                      onChange={(e) => {
                        const newExamples = [...exampleCodes];
                        newExamples[index].description = e.target.value;
                        setExampleCodes(newExamples);
                      }}
                      placeholder="설명"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />

                    <select
                      value={example.difficulty}
                      onChange={(e) => {
                        const newExamples = [...exampleCodes];
                        newExamples[index].difficulty = e.target.value as any;
                        setExampleCodes(newExamples);
                      }}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="basic">기초</option>
                      <option value="intermediate">중급</option>
                      <option value="advanced">고급</option>
                    </select>

                    <textarea
                      value={example.code}
                      onChange={(e) => {
                        const newExamples = [...exampleCodes];
                        newExamples[index].code = e.target.value;
                        setExampleCodes(newExamples);
                      }}
                      placeholder="HTML 코드"
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono h-32"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={saveTemplate}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save size={18} />
              템플릿 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 3. 세션 생성 시 템플릿 선택

`app/instructor/new-session/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Template } from '@/types';
import { FileText } from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTemplates(data);
  }

  async function createSession() {
    if (!title || !selectedTemplate) {
      alert('제목과 템플릿을 선택하세요.');
      return;
    }

    const { data } = await supabase
      .from('sessions')
      .insert({
        title,
        date,
        instructor_id: 'instructor',
        seat_layout: selectedTemplate.config.seat_layout,
        template_id: selectedTemplate.id,
        status: 'active',
      })
      .select()
      .single();

    if (data) {
      router.push(`/instructor/${data.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">새 연수 세션 만들기</h1>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">연수 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2025년 초등 특수교사 LLM 활용 연수"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">시작 시간</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-4">템플릿 선택 *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const config = template.config as any;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`text-left p-4 border-2 rounded-lg transition ${
                      isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <h3 className="font-bold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="text-xs text-gray-500">
                      {config.seat_layout.rows}×{config.seat_layout.cols}석 / 
                      예제 {config.example_codes?.length || 0}개
                    </div>
                  </button>
                );
              })}

              {templates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2" />
                  <p>저장된 템플릿이 없습니다</p>
                  <button
                    onClick={() => router.push('/instructor/templates/new')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    템플릿 만들기
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={createSession}
              disabled={!title || !selectedTemplate}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              세션 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 4. 템플릿 내보내기/가져오기

### 4.1 템플릿 JSON 내보내기

```typescript
function exportTemplate(template: Template) {
  const json = JSON.stringify(template, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `template-${template.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 4.2 템플릿 가져오기

```typescript
async function importTemplate(file: File) {
  const text = await file.text();
  const template = JSON.parse(text);
  
  // ID 제거 (새로 생성)
  delete template.id;
  delete template.created_at;
  
  await supabase.from('templates').insert(template);
  loadTemplates();
}
```

## ✅ 체크리스트

- [ ] 템플릿 목록 페이지 구현
- [ ] 템플릿 생성 페이지 구현
- [ ] 템플릿 수정 기능
- [ ] 템플릿 복제 기능
- [ ] 템플릿 삭제 기능
- [ ] 세션 생성 시 템플릿 선택
- [ ] 템플릿 내보내기/가져오기

## 다음 단계

👉 **[EXPORT.md](./EXPORT.md)** - 산출물 및 리포트 생성
