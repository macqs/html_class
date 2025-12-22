'use client';

import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useRef, useState, useEffect } from 'react';
import { 
  Clipboard, ClipboardPaste, Trash2, CheckSquare, Copy, 
  Settings, Minus, Square, X, FileText 
} from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [copied, setCopied] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

  function handleEditorMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = editor;

    // 컨텍스트 메뉴 비활성화 (태블릿 친화적)
    editor.updateOptions({
      contextmenu: false,
      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace", // 메모장 느낌 폰트
    });

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
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
    if (!confirm('내용을 모두 지우시겠습니까?')) return;
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
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#f3f3f3] shadow-sm">
      {/* 윈도우 11 메모장 스타일 헤더 (Mica 효과 흉내) */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-2">
           <div className="ml-2 flex items-center gap-2 rounded-t-lg bg-white px-3 py-1.5 shadow-sm">
              <FileText size={14} className="text-blue-500" />
              <span className="text-xs font-medium text-zinc-700">제목 없음.html</span>
              <button className="ml-2 rounded p-0.5 hover:bg-zinc-100">
                <X size={12} className="text-zinc-400" />
              </button>
           </div>
           <button className="rounded p-1 hover:bg-[#e9e9e9]">
             <span className="text-xl font-light text-zinc-500 leading-none mb-2">+</span>
           </button>
        </div>
        <div className="mb-1 mr-2 flex gap-4 text-zinc-400">
          <Minus size={14} />
          <Square size={12} />
          <X size={14} />
        </div>
      </div>

      {/* 메뉴바 & 툴바 통합 영역 */}
      <div className="flex items-center gap-1 border-b border-[#e5e5e5] bg-white px-2 py-1.5">
        <div className="mr-4 flex gap-3 px-2 text-xs text-zinc-600">
          <span className="cursor-default hover:text-black">파일(F)</span>
          <span className="cursor-default hover:text-black">편집(E)</span>
          <span className="cursor-default hover:text-black">보기(V)</span>
        </div>
        
        <div className="h-4 w-px bg-zinc-300 mx-1"></div>

        <button
          type="button"
          onClick={handleSelectAll}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          title="전체 선택"
        >
          <CheckSquare size={14} />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          title="복사"
        >
          {copied ? <Clipboard size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
        <button
          type="button"
          onClick={handlePaste}
          disabled={readOnly}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          title="붙여넣기"
        >
          <ClipboardPaste size={14} />
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={readOnly}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          title="전체 삭제"
        >
          <Trash2 size={14} />
        </button>

        <div className="flex-1"></div>
        <Settings size={14} className="text-zinc-400 mr-2" />
      </div>

      {/* 에디터 */}
      <div className="relative flex-1 bg-white">
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
            fontSize: 15,
            fontFamily: "'Consolas', 'Monaco', monospace",
            lineNumbers: 'on', // 사용성 위해 유지하되 스타일은 메모장 느낌
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            contextmenu: false,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            parameterHints: { enabled: false },
            tabCompletion: 'off',
            acceptSuggestionOnEnter: 'off',
            scrollbar: {
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12,
              useShadows: false,
            },
            padding: { top: 8, bottom: 8 },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: 'none',
          }}
        />
      </div>

      {/* 상태 표시줄 */}
      <div className="flex items-center justify-end gap-6 border-t border-[#e5e5e5] bg-[#f3f3f3] px-3 py-1 text-[10px] text-zinc-500 select-none">
        <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
        <span>100%</span>
        <span>Windows (CRLF)</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
