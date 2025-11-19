# 데이터베이스 스키마 및 설정

## 1. Supabase SQL Editor 접속

1. Supabase 대시보드 접속 (https://app.supabase.com)
2. 프로젝트 선택
3. 좌측 메뉴에서 "SQL Editor" 클릭
4. "New Query" 클릭

## 2. 데이터베이스 스키마 생성

아래 SQL을 복사해서 SQL Editor에 붙여넣고 "Run" 클릭:

```sql
-- =====================================================
-- 연수 관리 시스템 스키마
-- =====================================================

-- 1. sessions (연수 세션)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  instructor_id TEXT NOT NULL,
  seat_layout JSONB NOT NULL,
  template_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. participants (참가자)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  seat_position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'help_needed')),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, seat_position)
);

-- 3. code_works (작품 저장소)
CREATE TABLE code_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. help_requests (도움 요청)
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  code_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. code_validations (코드 검증 기록)
CREATE TABLE code_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  validation_result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. templates (템플릿)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. example_codes (예제 코드 라이브러리)
CREATE TABLE example_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. activity_logs (활동 로그)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 인덱스 생성 (성능 최적화)
-- =====================================================

CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_status ON participants(session_id, status);
CREATE INDEX idx_code_works_participant ON code_works(participant_id);
CREATE INDEX idx_help_requests_session ON help_requests(participant_id, status);
CREATE INDEX idx_help_requests_pending ON help_requests(status) WHERE status = 'pending';
CREATE INDEX idx_activity_logs_session ON activity_logs(session_id, created_at DESC);
CREATE INDEX idx_code_validations_participant ON code_validations(participant_id);

-- =====================================================
-- 트리거: updated_at 자동 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 트리거: 참가자 활동 시 last_active 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_participant_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE participants
  SET last_active = NOW()
  WHERE id = NEW.participant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_active_on_code_work
AFTER INSERT ON code_works
FOR EACH ROW
EXECUTE FUNCTION update_participant_last_active();

CREATE TRIGGER update_last_active_on_help_request
AFTER INSERT ON help_requests
FOR EACH ROW
EXECUTE FUNCTION update_participant_last_active();

-- =====================================================
-- Row Level Security (RLS) 설정
-- =====================================================

-- sessions: 모두 읽기 가능, 생성/수정은 제한
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON sessions FOR UPDATE USING (true);

-- participants: 모두 읽기/쓰기 가능
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage participants" ON participants FOR ALL USING (true);

-- code_works: 모두 읽기/쓰기 가능
ALTER TABLE code_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage code works" ON code_works FOR ALL USING (true);

-- help_requests: 모두 읽기/쓰기 가능
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage help requests" ON help_requests FOR ALL USING (true);

-- code_validations: 모두 읽기/쓰기 가능
ALTER TABLE code_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage validations" ON code_validations FOR ALL USING (true);

-- templates: 모두 읽기/쓰기 가능
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage templates" ON templates FOR ALL USING (true);

-- example_codes: 모두 읽기 가능
ALTER TABLE example_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view example codes" ON example_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can create example codes" ON example_codes FOR INSERT WITH CHECK (true);

-- activity_logs: 모두 읽기 가능
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activity logs" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can create activity logs" ON activity_logs FOR INSERT WITH CHECK (true);
```

## 3. Realtime 설정

Realtime 기능을 활성화하려면 다음 SQL 실행:

```sql
-- =====================================================
-- Realtime Publication 설정
-- =====================================================

-- 모든 테이블에 대해 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE help_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE code_works;
```

또는 Supabase 대시보드에서:
1. "Database" → "Replication" 선택
2. "supabase_realtime" publication 선택
3. 다음 테이블 활성화:
   - ✅ participants
   - ✅ help_requests
   - ✅ activity_logs
   - ✅ code_works

## 4. 샘플 데이터 삽입 (테스트용)

```sql
-- =====================================================
-- 샘플 데이터
-- =====================================================

-- 샘플 세션
INSERT INTO sessions (title, date, instructor_id, seat_layout, status)
VALUES (
  '초등 특수교사 LLM HTML 기초 연수',
  NOW() + INTERVAL '1 day',
  'instructor-001',
  '{"rows": 8, "cols": 10, "labels": [
    ["A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8", "A-9", "A-10"],
    ["B-1", "B-2", "B-3", "B-4", "B-5", "B-6", "B-7", "B-8", "B-9", "B-10"],
    ["C-1", "C-2", "C-3", "C-4", "C-5", "C-6", "C-7", "C-8", "C-9", "C-10"],
    ["D-1", "D-2", "D-3", "D-4", "D-5", "D-6", "D-7", "D-8", "D-9", "D-10"],
    ["E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9", "E-10"],
    ["F-1", "F-2", "F-3", "F-4", "F-5", "F-6", "F-7", "F-8", "F-9", "F-10"],
    ["G-1", "G-2", "G-3", "G-4", "G-5", "G-6", "G-7", "G-8", "G-9", "G-10"],
    ["H-1", "H-2", "H-3", "H-4", "H-5", "H-6", "H-7", "H-8", "H-9", "H-10"]
  ]}'::jsonb,
  'active'
);

-- 샘플 예제 코드
INSERT INTO example_codes (title, description, code, difficulty, order_index)
VALUES 
(
  '기본 HTML 구조',
  '가장 기본적인 HTML 문서 구조입니다.',
  '<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>내 첫 웹페이지</title>
</head>
<body>
  <h1>안녕하세요!</h1>
  <p>이것은 내 첫 HTML 페이지입니다.</p>
</body>
</html>',
  'basic',
  1
),
(
  '버튼 클릭 카운터',
  '버튼을 클릭할 때마다 숫자가 증가하는 간단한 카운터입니다.',
  '<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>클릭 카운터</title>
  <style>
    body { 
      font-family: Arial; 
      text-align: center; 
      padding: 50px; 
    }
    button { 
      font-size: 24px; 
      padding: 20px 40px; 
      cursor: pointer; 
    }
    #count { 
      font-size: 48px; 
      margin: 20px; 
    }
  </style>
</head>
<body>
  <h1>클릭 카운터</h1>
  <div id="count">0</div>
  <button onclick="increment()">클릭!</button>
  
  <script>
    let count = 0;
    function increment() {
      count++;
      document.getElementById("count").innerText = count;
    }
  </script>
</body>
</html>',
  'basic',
  2
),
(
  '색상 변경 도구',
  '버튼을 클릭하면 배경색이 랜덤하게 바뀝니다.',
  '<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>색상 변경기</title>
  <style>
    body { 
      font-family: Arial; 
      text-align: center; 
      padding: 50px;
      transition: background-color 0.3s;
    }
    button { 
      font-size: 20px; 
      padding: 15px 30px; 
      cursor: pointer; 
    }
  </style>
</head>
<body>
  <h1>배경색 변경기</h1>
  <button onclick="changeColor()">색상 바꾸기</button>
  <p id="colorCode">#FFFFFF</p>
  
  <script>
    function changeColor() {
      const randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
      document.body.style.backgroundColor = randomColor;
      document.getElementById("colorCode").innerText = randomColor;
    }
  </script>
</body>
</html>',
  'intermediate',
  3
);
```

## 5. 데이터베이스 함수 (저장 프로시저)

```sql
-- =====================================================
-- 유용한 데이터베이스 함수들
-- =====================================================

-- 세션의 참가자 통계
CREATE OR REPLACE FUNCTION get_session_stats(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_participants', COUNT(*),
    'working', COUNT(*) FILTER (WHERE status = 'working'),
    'help_needed', COUNT(*) FILTER (WHERE status = 'help_needed'),
    'idle', COUNT(*) FILTER (WHERE status = 'idle')
  ) INTO result
  FROM participants
  WHERE session_id = session_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 참가자의 활동 요약
CREATE OR REPLACE FUNCTION get_participant_summary(participant_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'code_works_count', (
      SELECT COUNT(*) FROM code_works WHERE participant_id = participant_uuid
    ),
    'validations_count', (
      SELECT COUNT(*) FROM code_validations WHERE participant_id = participant_uuid
    ),
    'help_requests_count', (
      SELECT COUNT(*) FROM help_requests WHERE participant_id = participant_uuid
    ),
    'total_code_lines', (
      SELECT SUM(LENGTH(code) - LENGTH(REPLACE(code, E'\n', '')) + 1)
      FROM code_works 
      WHERE participant_id = participant_uuid
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## 6. 데이터 확인

스키마가 정상적으로 생성되었는지 확인:

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 샘플 세션 확인
SELECT * FROM sessions;

-- 예제 코드 확인
SELECT id, title, difficulty FROM example_codes ORDER BY order_index;
```

## 7. Storage 버킷 생성 (작품 파일 저장용)

Supabase 대시보드에서:

1. 좌측 메뉴 "Storage" 클릭
2. "Create a new bucket" 클릭
3. 버킷 설정:
   - **Name**: `code-works`
   - **Public bucket**: ✅ 체크
   - **File size limit**: 10MB
   - **Allowed MIME types**: `text/html`
4. "Create bucket" 클릭

또는 SQL로:

```sql
-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('code-works', 'code-works', true);

-- Storage Policy 설정
CREATE POLICY "Anyone can upload code works"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'code-works');

CREATE POLICY "Anyone can view code works"
ON storage.objects FOR SELECT
USING (bucket_id = 'code-works');
```

## 8. 데이터베이스 다이어그램

```
┌──────────────┐
│   sessions   │
│──────────────│
│ id (PK)      │─┐
│ title        │ │
│ date         │ │
│ seat_layout  │ │
│ status       │ │
└──────────────┘ │
                 │
                 │ 1:N
                 │
┌──────────────┐ │
│ participants │ │
│──────────────│ │
│ id (PK)      │◄┘
│ session_id   │─┬─────────────┐
│ nickname     │ │             │
│ seat_position│ │             │
│ status       │ │             │
└──────────────┘ │             │
                 │             │
         ┌───────┴───────┐     │
         │1:N            │1:N  │1:N
         │               │     │
┌────────▼───────┐ ┌─────▼─────▼──┐ ┌──────────────────┐
│  code_works    │ │help_requests  │ │code_validations  │
│────────────────│ │───────────────│ │──────────────────│
│ id (PK)        │ │ id (PK)       │ │ id (PK)          │
│ participant_id │ │ participant_id│ │ participant_id   │
│ code           │ │ message       │ │ code             │
│ is_final       │ │ status        │ │ validation_result│
└────────────────┘ └───────────────┘ └──────────────────┘
```

## ✅ 체크리스트

데이터베이스 설정이 완료되었는지 확인:

- [ ] 모든 테이블 생성됨 (8개)
- [ ] 인덱스 생성됨
- [ ] 트리거 설정됨
- [ ] RLS 정책 적용됨
- [ ] Realtime 활성화됨
- [ ] 샘플 데이터 삽입됨
- [ ] Storage 버킷 생성됨
- [ ] 데이터베이스 함수 생성됨

## 🔧 문제 해결

### RLS 오류
```
Error: new row violates row-level security policy
```
- RLS 정책이 올바르게 설정되었는지 확인
- 개발 중에는 RLS를 일시적으로 비활성화 가능:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Realtime 동작 안 함
- Supabase 대시보드 → Database → Replication에서 테이블 활성화 확인
- 브라우저 콘솔에서 WebSocket 연결 상태 확인

## 다음 단계

데이터베이스 설정이 완료되었습니다! 이제 다음 문서를 진행하세요:

👉 **[PARTICIPANT.md](./PARTICIPANT.md)** - 참가자 화면 구현
