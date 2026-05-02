import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { queryChatGPT } from '@/lib/engines/chatgpt';
import { queryGemini } from '@/lib/engines/gemini';
import { queryPerplexity } from '@/lib/engines/perplexity';

const ENGINES = ['chatgpt', 'gemini', 'perplexity'] as const;
type Engine = typeof ENGINES[number];

function countMentions(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((sum, kw) => {
    const matches = lower.match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return sum + (matches?.length ?? 0);
  }, 0);
}

async function callEngine(engine: Engine, query: string): Promise<string> {
  if (engine === 'chatgpt') return queryChatGPT(query);
  if (engine === 'gemini') return queryGemini(query);
  return queryPerplexity(query);
}

export async function POST(req: NextRequest) {
  const { engines = ENGINES } = await req.json().catch(() => ({}));

  const [{ data: queries }, { data: brands }] = await Promise.all([
    supabase.from('queries').select('*').eq('active', true),
    supabase.from('brands').select('*'),
  ]);

  if (!queries?.length) return NextResponse.json({ error: '활성 쿼리 없음' }, { status: 400 });
  if (!brands?.length) return NextResponse.json({ error: '브랜드 없음' }, { status: 400 });

  const results: object[] = [];

  for (const engine of engines as Engine[]) {
    const hasKey =
      (engine === 'chatgpt' && process.env.OPENAI_API_KEY) ||
      (engine === 'gemini' && process.env.GOOGLE_AI_API_KEY) ||
      (engine === 'perplexity' && process.env.PERPLEXITY_API_KEY);
    if (!hasKey) continue;

    for (const query of queries) {
      let response = '';
      let engineError = '';
      try {
        response = await callEngine(engine, query.text);
      } catch (e) {
        engineError = String(e);
      }

      for (const brand of brands) {
        const keywords: string[] = [brand.name, ...(brand.keywords ?? [])];
        const count = response ? countMentions(response, keywords) : 0;
        results.push({
          query_id: query.id,
          brand_id: brand.id,
          engine,
          mentioned: count > 0,
          mention_count: count,
          response_excerpt: response.slice(0, 500) || engineError,
          ran_at: new Date().toISOString(),
        });
      }
    }
  }

  if (results.length) {
    await supabase.from('scan_results').insert(results);
  }

  return NextResponse.json({ ok: true, count: results.length });
}

export async function GET() {
  const { data, error } = await supabase
    .from('scan_results')
    .select('*, queries(text), brands(name, is_own)')
    .order('ran_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
