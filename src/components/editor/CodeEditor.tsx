'use client';

import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useRef, useState } from 'react';
import { Clipboard, ClipboardPaste, Trash2, CheckSquare, Copy } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [copied, setCopied] = useState(false);

  function handleEditorMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = editor;

    // 컨텍스트 메뉴 비활성화 (태블릿 친화적)
    editor.updateOptions({
      contextmenu: false,
    });
  }

  // 전체 선택
  function handleSelectAll() {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    
    const fullRange = model.getFullModelRange();
    editorRef.current.setSelection(fullRange);
    editorRef.current.focus();
  }

  // 전체 삭제
  function handleClearAll() {
    if (readOnly) return;
    if (!confirm('코드를 전체 삭제하시겠습니까?')) return;
    onChange('');
  }

  // 복사
  async function handleCopy() {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    
    let textToCopy = code;
    if (selection && model && !selection.isEmpty()) {
      textToCopy = model.getValueInRange(selection);
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('복사에 실패했습니다.');
    }
  }

  // 붙여넣기
  async function handlePaste() {
    if (readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!editorRef.current) {
        onChange(text);
        return;
      }

      const selection = editorRef.current.getSelection();
      if (selection) {
        editorRef.current.executeEdits('paste', [{
          range: selection,
          text: text,
          forceMoveMarkers: true,
        }]);
      } else {
        // 커서 위치에 삽입
        const position = editorRef.current.getPosition();
        if (position) {
          editorRef.current.executeEdits('paste', [{
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: text,
            forceMoveMarkers: true,
          }]);
        }
      }
      editorRef.current.focus();
    } catch {
      alert('붙여넣기에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200">
      {/* 태블릿 친화적 툴바 */}
      <div className="flex items-center gap-1 border-b bg-zinc-50 px-2 py-1.5">
        <span className="mr-2 text-xs font-medium text-zinc-500">편집 도구</span>
        <button
          type="button"
          onClick={handleSelectAll}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
          title="전체 선택"
        >
          <CheckSquare size={14} />
          <span className="hidden sm:inline">전체선택</span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
          title="복사"
        >
          {copied ? <Clipboard size={14} className="text-emerald-600" /> : <Copy size={14} />}
          <span className="hidden sm:inline">{copied ? '복사됨!' : '복사'}</span>
        </button>
        <button
          type="button"
          onClick={handlePaste}
          disabled={readOnly}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
          title="붙여넣기"
        >
          <ClipboardPaste size={14} />
          <span className="hidden sm:inline">붙여넣기</span>
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={readOnly}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          title="전체 삭제"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">전체삭제</span>
        </button>
      </div>

      {/* 에디터 */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={code}
          onChange={onChange}
          onMount={handleEditorMount}
          theme="vs-light"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            contextmenu: false, // 우클릭 메뉴 비활성화
            quickSuggestions: false, // 자동완성 비활성화 (태블릿에서 방해됨)
            suggestOnTriggerCharacters: false,
            parameterHints: { enabled: false },
            tabCompletion: 'off',
            acceptSuggestionOnEnter: 'off',
            // 터치 친화적 설정
            scrollbar: {
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12,
            },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
