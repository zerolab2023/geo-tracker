'use client';

import { useState, useEffect, useCallback } from 'react';

type Brand = { id: string; name: string; keywords: string[]; is_own: boolean };
type Query = { id: string; text: string; category: string; active: boolean };
type ScanResult = {
  id: string; engine: string; mentioned: boolean; mention_count: number;
  response_excerpt: string; ran_at: string;
  queries: { text: string };
  brands: { name: string; is_own: boolean };
};

const ENGINE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  chatgpt:    { label: 'ChatGPT',    color: '#10a37f', bg: '#f0fdf4' },
  gemini:     { label: 'Gemini',     color: '#4285f4', bg: '#eff6ff' },
  perplexity: { label: 'Perplexity', color: '#7c3aed', bg: '#f5f3ff' },
};

function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }

function EngineTag({ engine }: { engine: string }) {
  const e = ENGINE_LABELS[engine] ?? { label: engine, color: '#888', bg: '#f5f5f5' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: e.color, background: e.bg, padding: '2px 8px', borderRadius: 999 }}>
      {e.label}
    </span>
  );
}

export default function Home() {
  const [tab, setTab] = useState<'dashboard' | 'queries' | 'brands' | 'scan'>('dashboard');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanEngines, setScanEngines] = useState({ chatgpt: true, gemini: true, perplexity: true });
  const [scanMsg, setScanMsg] = useState('');

  // Brand form
  const [newBrand, setNewBrand] = useState('');
  const [newBrandKw, setNewBrandKw] = useState('');
  const [newBrandOwn, setNewBrandOwn] = useState(false);

  // Query form
  const [newQuery, setNewQuery] = useState('');
  const [newQueryCat, setNewQueryCat] = useState('');

  const loadAll = useCallback(async () => {
    const [b, q, r] = await Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/queries').then(r => r.json()),
      fetch('/api/scan').then(r => r.json()),
    ]);
    setBrands(Array.isArray(b) ? b : []);
    setQueries(Array.isArray(q) ? q : []);
    setResults(Array.isArray(r) ? r : []);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function addBrand() {
    if (!newBrand.trim()) return;
    await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBrand.trim(), keywords: newBrandKw.split(',').map(k => k.trim()).filter(Boolean), is_own: newBrandOwn }),
    });
    setNewBrand(''); setNewBrandKw(''); setNewBrandOwn(false);
    loadAll();
  }

  async function deleteBrand(id: string) {
    await fetch('/api/brands', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadAll();
  }

  async function addQuery() {
    if (!newQuery.trim()) return;
    await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newQuery.trim(), category: newQueryCat.trim() }),
    });
    setNewQuery(''); setNewQueryCat('');
    loadAll();
  }

  async function toggleQuery(id: string, active: boolean) {
    await fetch('/api/queries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) });
    loadAll();
  }

  async function deleteQuery(id: string) {
    await fetch('/api/queries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadAll();
  }

  async function runScan() {
    setScanning(true); setScanMsg('');
    const engines = Object.entries(scanEngines).filter(([, v]) => v).map(([k]) => k);
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engines }),
    });
    const data = await res.json();
    setScanMsg(data.ok ? `완료 — 결과 ${data.count}건 저장됨` : data.error ?? '오류');
    setScanning(false);
    loadAll();
    setTab('dashboard');
  }

  // Compute visibility scores
  const ownBrands = brands.filter(b => b.is_own);
  const competitorBrands = brands.filter(b => !b.is_own);

  function visibilityByBrandEngine(brandId: string, engine?: string) {
    const rows = results.filter(r => r.brands?.name && brands.find(b => b.id === brandId)?.name === r.brands.name && (engine ? r.engine === engine : true));
    const total = rows.length;
    const mentioned = rows.filter(r => r.mentioned).length;
    return { total, mentioned, pct: pct(mentioned, total) };
  }

  const recentResults = results.slice(0, 30);

  const S = {
    page: { minHeight: '100vh', background: '#f9f9f9' } as React.CSSProperties,
    nav: { background: 'white', borderBottom: '1px solid #ebebeb', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, position: 'sticky', top: 0, zIndex: 10 } as React.CSSProperties,
    logo: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 28 },
    logoIcon: { width: 28, height: 28, borderRadius: 8, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 },
    logoName: { fontWeight: 700, fontSize: 15, color: '#111' },
    tabBtn: (active: boolean) => ({ padding: '16px 14px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#111' : '#888', background: 'none', border: 'none', borderBottom: active ? '2px solid #111' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 } as React.CSSProperties),
    runBtn: { marginLeft: 'auto', background: '#111', color: 'white', fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer' },
    body: { maxWidth: 960, margin: '0 auto', padding: '28px 24px' } as React.CSSProperties,
    card: { background: 'white', border: '1px solid #ebebeb', borderRadius: 14, padding: 20 } as React.CSSProperties,
    cardTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 } as React.CSSProperties,
    h2: { fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16 } as React.CSSProperties,
    input: { width: '100%', border: '1px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111', background: 'white', outline: 'none' } as React.CSSProperties,
    addBtn: { background: '#111', color: 'white', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
    tag: (color: string, bg: string) => ({ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 999, display: 'inline-block' }) as React.CSSProperties,
    deleteBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: 4 } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={S.logoIcon}>G</div>
          <span style={S.logoName}>GEO Tracker</span>
        </div>
        {(['dashboard', 'queries', 'brands', 'scan'] as const).map(t => (
          <button key={t} style={S.tabBtn(tab === t)} onClick={() => setTab(t)}>
            {{ dashboard: '대시보드', queries: '쿼리', brands: '브랜드', scan: '스캔 실행' }[t]}
          </button>
        ))}
        <button style={S.runBtn} onClick={() => { setTab('scan'); }}>
          스캔 실행 →
        </button>
      </nav>

      <div style={S.body}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={S.h2}>브랜드 가시성</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {brands.map(brand => {
                  const overall = visibilityByBrandEngine(brand.id);
                  return (
                    <div key={brand.id} style={S.card}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{brand.name}</span>
                          {brand.is_own && <span style={{ ...S.tag('#15803d', '#f0fdf4'), marginLeft: 8 }}>내 브랜드</span>}
                        </div>
                        <span style={{ fontSize: 28, fontWeight: 800, color: overall.pct >= 50 ? '#15803d' : overall.pct >= 25 ? '#d97706' : '#dc2626' }}>
                          {overall.pct}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {Object.keys(ENGINE_LABELS).map(engine => {
                          const v = visibilityByBrandEngine(brand.id, engine);
                          const e = ENGINE_LABELS[engine];
                          return (
                            <div key={engine} style={{ flex: 1, textAlign: 'center', background: e.bg, borderRadius: 8, padding: '8px 4px' }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: e.color, marginBottom: 4 }}>{e.label}</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: e.color }}>{v.pct}%</div>
                              <div style={{ fontSize: 10, color: '#aaa' }}>{v.mentioned}/{v.total}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {brands.length === 0 && (
                  <div style={{ color: '#aaa', fontSize: 14, padding: 20 }}>브랜드를 먼저 등록하세요</div>
                )}
              </div>
            </div>

            {ownBrands.length > 0 && competitorBrands.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>경쟁사 비교</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', color: '#888', fontWeight: 600 }}>브랜드</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', color: '#10a37f', fontWeight: 600 }}>ChatGPT</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', color: '#4285f4', fontWeight: 600 }}>Gemini</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', color: '#7c3aed', fontWeight: 600 }}>Perplexity</th>
                      <th style={{ textAlign: 'center', padding: '8px 0', color: '#888', fontWeight: 600 }}>전체</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map(brand => {
                      const overall = visibilityByBrandEngine(brand.id);
                      return (
                        <tr key={brand.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                          <td style={{ padding: '10px 0', fontWeight: brand.is_own ? 700 : 400, color: brand.is_own ? '#111' : '#555' }}>
                            {brand.name} {brand.is_own && '★'}
                          </td>
                          {Object.keys(ENGINE_LABELS).map(engine => {
                            const v = visibilityByBrandEngine(brand.id, engine);
                            return (
                              <td key={engine} style={{ textAlign: 'center', padding: '10px 0', fontWeight: 600, color: v.pct >= 50 ? '#15803d' : v.pct >= 25 ? '#d97706' : '#dc2626' }}>
                                {v.total ? `${v.pct}%` : '—'}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', padding: '10px 0', fontWeight: 700, color: overall.pct >= 50 ? '#15803d' : overall.pct >= 25 ? '#d97706' : '#dc2626' }}>
                            {overall.total ? `${overall.pct}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {recentResults.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>최근 스캔 결과</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {recentResults.map(r => (
                    <div key={r.id} style={{ ...S.row, alignItems: 'flex-start' }}>
                      <EngineTag engine={r.engine} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>{r.queries?.text}</div>
                        <div style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{r.brands?.name}</span>
                          {r.mentioned
                            ? <span style={S.tag('#15803d', '#f0fdf4')}>언급 {r.mention_count}회</span>
                            : <span style={S.tag('#dc2626', '#fef2f2')}>미언급</span>}
                        </div>
                        {r.response_excerpt && (
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            {r.response_excerpt.slice(0, 120)}...
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#ccc', flexShrink: 0 }}>
                        {new Date(r.ran_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUERIES ── */}
        {tab === 'queries' && (
          <div>
            <h2 style={S.h2}>쿼리 관리</h2>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.cardTitle}>쿼리 추가</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...S.input, flex: 3 }} placeholder="쿼리 입력 (예: 스타트업 조직관리 툴 추천해줘)" value={newQuery} onChange={e => setNewQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuery()} />
                <input style={{ ...S.input, flex: 1 }} placeholder="카테고리 (선택)" value={newQueryCat} onChange={e => setNewQueryCat(e.target.value)} />
                <button style={S.addBtn} onClick={addQuery}>추가</button>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>쿼리 목록 ({queries.length})</div>
              {queries.map(q => (
                <div key={q.id} style={S.row}>
                  <input type="checkbox" checked={q.active} onChange={e => toggleQuery(q.id, e.target.checked)} style={{ cursor: 'pointer' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, color: q.active ? '#111' : '#bbb' }}>{q.text}</span>
                    {q.category && <span style={{ ...S.tag('#6366f1', '#f5f3ff'), marginLeft: 8 }}>{q.category}</span>}
                  </div>
                  <button style={S.deleteBtn} onClick={() => deleteQuery(q.id)}>✕</button>
                </div>
              ))}
              {queries.length === 0 && <div style={{ color: '#aaa', fontSize: 14 }}>쿼리를 추가하세요</div>}
            </div>
          </div>
        )}

        {/* ── BRANDS ── */}
        {tab === 'brands' && (
          <div>
            <h2 style={S.h2}>브랜드 / 경쟁사 관리</h2>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.cardTitle}>브랜드 추가</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <input style={{ ...S.input, flex: '1 1 180px' }} placeholder="브랜드명 (예: Pulse AI)" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
                <input style={{ ...S.input, flex: '2 1 240px' }} placeholder="추가 키워드, 쉼표 구분 (예: pulse-ai, 펄스)" value={newBrandKw} onChange={e => setNewBrandKw(e.target.value)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={newBrandOwn} onChange={e => setNewBrandOwn(e.target.checked)} />
                  내 브랜드
                </label>
                <button style={S.addBtn} onClick={addBrand}>추가</button>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>등록된 브랜드 ({brands.length})</div>
              {brands.map(b => (
                <div key={b.id} style={S.row}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{b.name}</span>
                    {b.is_own && <span style={{ ...S.tag('#15803d', '#f0fdf4'), marginLeft: 8 }}>내 브랜드</span>}
                    {b.keywords?.length > 0 && (
                      <span style={{ fontSize: 12, color: '#aaa', marginLeft: 8 }}>+ {b.keywords.join(', ')}</span>
                    )}
                  </div>
                  <button style={S.deleteBtn} onClick={() => deleteBrand(b.id)}>✕</button>
                </div>
              ))}
              {brands.length === 0 && <div style={{ color: '#aaa', fontSize: 14 }}>브랜드를 추가하세요</div>}
            </div>
          </div>
        )}

        {/* ── SCAN ── */}
        {tab === 'scan' && (
          <div>
            <h2 style={S.h2}>스캔 실행</h2>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.cardTitle}>엔진 선택</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {Object.entries(ENGINE_LABELS).map(([key, e]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `1px solid ${scanEngines[key as keyof typeof scanEngines] ? e.color : '#e5e5e5'}`, borderRadius: 10, background: scanEngines[key as keyof typeof scanEngines] ? e.bg : 'white' }}>
                    <input type="checkbox" checked={scanEngines[key as keyof typeof scanEngines]} onChange={ev => setScanEngines(s => ({ ...s, [key]: ev.target.checked }))} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: e.color }}>{e.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.cardTitle}>스캔 범위</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                활성 쿼리 <strong>{queries.filter(q => q.active).length}개</strong> × 브랜드 <strong>{brands.length}개</strong> × 선택 엔진 <strong>{Object.values(scanEngines).filter(Boolean).length}개</strong>
                {' = '}
                <strong>{queries.filter(q => q.active).length * brands.length * Object.values(scanEngines).filter(Boolean).length}건</strong> 결과
              </div>
            </div>
            <button
              onClick={runScan}
              disabled={scanning}
              style={{ background: scanning ? '#ccc' : '#111', color: 'white', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 10, border: 'none', cursor: scanning ? 'default' : 'pointer', width: '100%' }}
            >
              {scanning ? '스캔 중...' : '스캔 시작 →'}
            </button>
            {scanMsg && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                {scanMsg}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
