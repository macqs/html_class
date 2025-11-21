import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

interface PreviewPageProps {
  params: Promise<{ codeWorkId: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { codeWorkId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('td_code_works')
    .select('code, title, created_at')
    .eq('id', codeWorkId)
    .single();

  if (!data) {
    notFound();
  }

  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{data.title || 'HTML 미리보기'}</title>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: data.code }} />
      </body>
    </html>
  );
}
