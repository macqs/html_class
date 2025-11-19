import { createClient } from '@/lib/supabase-server';
import ExampleManager from './ExampleManager';
import type { ExampleCode } from '@/types';

export default async function ExamplesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('td_example_codes').select('*').order('order_index');

  return <ExampleManager initialExamples={(data as ExampleCode[]) ?? []} />;
}
