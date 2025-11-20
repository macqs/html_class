import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface SourceItem {
  id: string;
  subject: string;
  code: string;
  content: string;
  type: 'radio' | 'match' | 'drag' | 'category';
}

interface ExampleInsert {
  title: string;
  description: string;
  code: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  order_index: number;
}

const TOOL_LABEL_MAP: Record<SourceItem['type'], string> = {
  radio: '선택형',
  match: '짝짓기',
  drag: '배열형',
  category: '분류형',
};

const DIFFICULTY_MAP: Record<SourceItem['type'], ExampleInsert['difficulty']> = {
  radio: 'basic',
  match: 'basic',
  drag: 'intermediate',
  category: 'intermediate',
};

function shorten(text: string, limit = 120) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit)}…`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('⛔️ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 없습니다.');
    process.exit(1);
  }

  const root = process.cwd();
  const jsonPath = path.join(root, '프롬프트용 md', '선정된_도구_30개.json');
  const htmlDir = path.join(root, '프롬프트용 md', 'HTML_도구_실습용');

  const sourceItems = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as SourceItem[];
  const htmlFiles = fs.readdirSync(htmlDir);

  const examples: ExampleInsert[] = sourceItems.map((item, index) => {
    const filePrefix = `${item.id.padStart(2, '0')}_`;
    const htmlFile = htmlFiles.find((file) => file.startsWith(filePrefix));

    if (!htmlFile) {
      throw new Error(`HTML 파일을 찾을 수 없습니다: ${filePrefix}*`);
    }

    const code = fs.readFileSync(path.join(htmlDir, htmlFile), 'utf-8');
    const toolLabel = TOOL_LABEL_MAP[item.type] ?? item.type;
    const difficulty = DIFFICULTY_MAP[item.type] ?? 'basic';

    return {
      title: `[${item.subject}-${toolLabel}] ${item.code}`,
      description: shorten(item.content),
      code,
      difficulty,
      order_index: index + 1,
    };
  });

  const supabase = createClient(supabaseUrl, serviceKey);

  // 기존 데이터를 모두 비운 뒤 삽입 (시드용)
  const { error: deleteError } = await supabase.from('td_example_codes').delete().gt('order_index', -1);
  if (deleteError) {
    console.error('⛔️ 기존 예제 삭제 실패', deleteError);
    process.exit(1);
  }

  const { error: insertError } = await supabase.from('td_example_codes').insert(examples);
  if (insertError) {
    console.error('⛔️ 예제 등록 실패', insertError);
    process.exit(1);
  }

  console.log(`✅ 총 ${examples.length}개의 예제를 td_example_codes 테이블에 삽입했습니다.`);
}

main().catch((error) => {
  console.error('⛔️ unexpected error', error);
  process.exit(1);
});
