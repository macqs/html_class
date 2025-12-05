export interface SeatLayout {
  rows: number;
  cols: number;
  labels: string[][];
  aisleAfterCol?: number; // 중앙 통로: 이 열 뒤에 통로 배치 (0-indexed)
}

export interface SeatLayoutPreset extends SeatLayout {
  name: string;
  capacity: number;
}

export type SessionMode = 'html' | 'wordcloud';

export interface Session {
  id: string;
  title: string;
  date: string;
  instructor_id: string;
  seat_layout: SeatLayout;
  session_code?: string;
  template_id?: string;
  status: 'active' | 'ended';
  mode: SessionMode;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  nickname: string;
  seat_position: string;
  status: 'idle' | 'working' | 'help_needed';
  last_active: string;
  created_at: string;
}

export interface CodeWork {
  id: string;
  participant_id: string;
  title: string;
  code: string;
  version: number;
  is_final: boolean;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  participant_id: string;
  participant?: Participant;
  message: string;
  code_snapshot: string;
  status: 'pending' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ExampleCode {
  id: string;
  template_id?: string;
  title: string;
  description: string;
  code: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  order_index: number;
}

export interface LiveExampleItem {
  id: string;
  title: string;
  description?: string;
  code: string;
  type: 'broadcast' | 'excellent';
  timestamp: string;
}

export interface TemplateConfig {
  seat_layout: SeatLayout;
  example_codes: ExampleCode[];
  steps: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  config: TemplateConfig;
  created_by: string;
  created_at: string;
}

export interface RealtimeEvent {
  type: 'status_change' | 'help_request' | 'broadcast' | 'code_update';
  participant_id?: string;
  data: unknown;
  timestamp: string;
}

export interface ValidationResponse {
  success: boolean;
  validation: string;
  errors?: string[];
}

// 워드클라우드 활동
export interface WordCloud {
  id: string;
  session_id: string;
  question: string;
  is_active: boolean;
  max_words_per_user: number;
  created_at: string;
  ended_at?: string;
}

// 워드클라우드 응답
export interface WordCloudResponse {
  id: string;
  wordcloud_id: string;
  participant_id: string;
  word: string;
  created_at: string;
}

// 워드클라우드 단어 집계
export interface WordCount {
  text: string;
  value: number;
}
