-- 워드클라우드 활동 테이블
CREATE TABLE IF NOT EXISTS td_wordclouds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES td_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_words_per_user INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 워드클라우드 응답 테이블
CREATE TABLE IF NOT EXISTS td_wordcloud_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordcloud_id UUID NOT NULL REFERENCES td_wordclouds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES td_participants(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_wordclouds_session ON td_wordclouds(session_id);
CREATE INDEX IF NOT EXISTS idx_wordcloud_responses_wordcloud ON td_wordcloud_responses(wordcloud_id);
CREATE INDEX IF NOT EXISTS idx_wordcloud_responses_participant ON td_wordcloud_responses(participant_id);

-- RLS 활성화
ALTER TABLE td_wordclouds ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_wordcloud_responses ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 읽기/쓰기 가능 (세션 기반 인증 사용)
CREATE POLICY "Allow all for wordclouds" ON td_wordclouds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for wordcloud_responses" ON td_wordcloud_responses FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE td_wordclouds;
ALTER PUBLICATION supabase_realtime ADD TABLE td_wordcloud_responses;
