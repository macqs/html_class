export interface SeatLayout {
  rows: number;
  cols: number;
  labels: string[][];
}

export interface SeatLayoutPreset extends SeatLayout {
  name: string;
  capacity: number;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  instructor_id: string;
  seat_layout: SeatLayout;
  template_id?: string;
  status: 'active' | 'ended';
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
