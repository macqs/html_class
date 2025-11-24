'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, Edit2, Eye, Plus, RefreshCw, Trash2, X } from 'lucide-react';

import type { ExampleCode } from '@/types';
import { supabase } from '@/lib/supabase';
import PreviewFrame from '@/components/editor/PreviewFrame';

interface ExampleManagerProps {
  initialExamples: ExampleCode[];
}

interface FormState {
  title: string;
  description: string;
  code: string;
  difficulty: ExampleCode['difficulty'];
  orderIndex: string;
}

const difficultyLabels: Record<ExampleCode['difficulty'], { label: string; color: string }> = {
  basic: { label: '기초', color: 'bg-emerald-100 text-emerald-800' },
  intermediate: { label: '중급', color: 'bg-amber-100 text-amber-800' },
  advanced: { label: '고급', color: 'bg-rose-100 text-rose-800' },
};

const emptyForm: FormState = {
  title: '',
  description: '',
  code: '',
  difficulty: 'basic',
  orderIndex: '1',
};

export default function ExampleManager({ initialExamples }: ExampleManagerProps) {
  const [examples, setExamples] = useState(initialExamples);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<ExampleCode | null>(null);
  const [previewExample, setPreviewExample] = useState<ExampleCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function openCreateModal() {
    setEditingExample(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(example: ExampleCode) {
    setEditingExample(example);
    setForm({
      title: example.title,
      description: example.description ?? '',
      code: example.code,
      difficulty: example.difficulty,
      orderIndex: String(example.order_index ?? '') ?? '1',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(emptyForm);
    setEditingExample(null);
  }

  function handleFieldChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openPreviewModal(example: ExampleCode) {
    setPreviewExample(example);
  }

  function closePreviewModal() {
    setPreviewExample(null);
  }

  async function refreshExamples() {
    setIsRefreshing(true);
    const { data, error } = await supabase.from('td_example_codes').select('*').order('order_index');
    if (error) {
      alert('예제 목록을 불러오지 못했습니다.');
      setIsRefreshing(false);
      return;
    }
    setExamples(data ?? []);
    setIsRefreshing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.code.trim()) {
      alert('제목과 코드는 필수입니다.');
      return;
    }

    setIsSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      code: form.code,
      difficulty: form.difficulty,
      order_index: Number(form.orderIndex) || 0,
    } as const;

    if (editingExample) {
      const { error } = await supabase.from('td_example_codes').update(payload).eq('id', editingExample.id);
      if (error) {
        alert('예제를 수정하지 못했습니다.');
        setIsSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('td_example_codes').insert(payload);
      if (error) {
        alert('예제를 생성하지 못했습니다.');
        setIsSaving(false);
        return;
      }
    }

    await refreshExamples();
    setIsSaving(false);
    closeModal();
  }

  async function handleDelete(example: ExampleCode) {
    if (!confirm(`"${example.title}" 예제를 삭제하시겠습니까?`)) return;

    const { error } = await supabase.from('td_example_codes').delete().eq('id', example.id);
    if (error) {
      alert('예제를 삭제하지 못했습니다.');
      return;
    }

    await refreshExamples();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-3xl bg-white px-8 py-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">예제 관리</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">TD Example Library</h1>
            <button
              type="button"
              onClick={refreshExamples}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> 새로고침
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
            >
              <Plus size={16} /> 새 예제 만들기
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            강의 중 배포할 예제 코드를 미리 등록·편집할 수 있습니다. 난이도와 순서를 지정해 일관된 커리큘럼을 유지하세요.
          </p>
        </header>

        {examples.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
            <BookOpen size={48} className="text-slate-300" />
            <p className="mt-6 text-lg font-semibold text-slate-800">등록된 예제가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500">새 예제를 만들어 강의 시간을 절약해보세요.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              <Plus size={16} /> 첫 예제 작성
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {examples.map((example) => (
              <article key={example.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">정렬 순서 #{example.order_index ?? 0}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{example.title}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${difficultyLabels[example.difficulty].color}`}>
                    {difficultyLabels[example.difficulty].label}
                  </span>
                </div>
                {example.description && <p className="mt-2 text-sm text-slate-600">{example.description}</p>}
                <div className="mt-4 flex-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed">
                    <code>{example.code}</code>
                  </pre>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(example)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit2 size={14} /> 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => openPreviewModal(example)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Eye size={14} /> 미리보기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(example)}
                    className="flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} /> 삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-600">{editingExample ? '예제 수정' : '새 예제 등록'}</p>
                <h3 className="text-2xl font-bold text-slate-900">{editingExample ? editingExample.title : '예제 정보 입력'}</h3>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">제목</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFieldChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="예: HTML 기본 구조"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">설명</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFieldChange}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="예제에 대한 요약 설명"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">난이도</label>
                  <div className="relative">
                    <select
                      name="difficulty"
                      value={form.difficulty}
                      onChange={handleFieldChange}
                      className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="basic">기초</option>
                      <option value="intermediate">중급</option>
                      <option value="advanced">고급</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">정렬 순서</label>
                  <input
                    type="number"
                    name="orderIndex"
                    min="0"
                    value={form.orderIndex}
                    onChange={handleFieldChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">코드</label>
                <textarea
                  name="code"
                  value={form.code}
                  onChange={handleFieldChange}
                  rows={10}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="<!DOCTYPE html> ..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? '저장 중...' : editingExample ? '예제 업데이트' : '예제 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewExample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closePreviewModal}>
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600">예제 미리보기</p>
                <h3 className="text-2xl font-bold text-slate-900">{previewExample.title}</h3>
                {previewExample.description && <p className="mt-1 text-sm text-slate-600">{previewExample.description}</p>}
              </div>
              <button type="button" onClick={closePreviewModal} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-600">원본 코드</p>
                <pre className="max-h-[28rem] overflow-auto rounded-lg bg-white/70 p-3 font-mono text-xs leading-relaxed text-slate-800">
                  <code>{previewExample.code}</code>
                </pre>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-600">렌더링 미리보기</p>
                <div className="h-[28rem] rounded-2xl border border-slate-200">
                  <PreviewFrame code={previewExample.code} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
