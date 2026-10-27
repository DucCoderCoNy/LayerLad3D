import { useMemo, useState } from 'react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { num } from '../../lib/workshop.js'
import { logMoves, prodMove, stockMove } from '../../lib/warehouse.js'
import { btn, btn2, inp } from '../../components/ui.jsx'

const TABS = [['filament', 'Nhựa (cân cuộn)'], ['supply', 'Vật tư'], ['product', 'Thành phẩm']]

/** Kiểm kho: nhập số đếm/cân thực tế, hệ thống so với số trong máy, rồi điều chỉnh một lần và ghi nhật ký "Kiểm kho".
 *  Với nhựa có thể cân cả cuộn (trừ vỏ cuộn) rồi tự quy ra gram nhựa. */
export default function AdminStocktake() {
  const [ws, setStock] = useStore('ws'), [products, setProducts] = useStore('products'), [colors] = useStore('colors'), [st, setSt] = useStore('settings')
  const [tab, setTab] = useState('filament'), [vals, setVals] = useState({}), [mode, setMode] = useState('gross'), [msg, setMsg] = useState(''), [hideEmpty, setHideEmpty] = useState(false)
  const tare = Number.isFinite(+st.spoolTare) && st.spoolTare !== '' && st.spoolTare != null ? +st.spoolTare : 200
  const hexOf = (n) => colors.find((c) => c.name === n)?.hex

  const items = useMemo(() => {
    if (tab === 'product') return products.map((p) => ({ id: p.id, kind: 'product', name: p.name, sub: p.active ? '' : '(ẩn)', sys: p.stock, unit: 'cái', price: 0, raw: p }))
    return ws.filter((s) => s.kind === tab).map((s) => ({ id: s.id, kind: tab, name: [s.brand, s.name].filter(Boolean).join(' '), sub: tab === 'filament' ? [s.material, s.color].filter(Boolean).join(' · ') : '', color: s.color, sys: s.qty, unit: tab === 'filament' ? 'g' : s.unit || 'cái', price: tab === 'filament' ? s.price / 1000 : s.price, raw: s }))
  }, [tab, ws, products])
  const shown = items.filter((i) => !hideEmpty || i.sys > 0)
  const actual = (it) => { const v = vals[it.id]; if (v === undefined || v === '') return null; const x = num(v); return it.kind === 'filament' && mode === 'gross' ? Math.max(0, x - tare) : x }
  const diffs = items.map((it) => ({ it, a: actual(it) })).filter((x) => x.a != null).map((x) => ({ ...x, d: Math.round((x.a - x.it.sys) * 10) / 10 }))
  const changed = diffs.filter((x) => x.d !== 0)
  const money = changed.reduce((t, x) => t + x.d * (x.it.price || 0), 0)

  const apply = () => {
    if (!changed.length) return
    const moves = []
    const f = changed.filter((x) => x.it.kind !== 'product'), p = changed.filter((x) => x.it.kind === 'product')
    if (f.length) { const m = Object.fromEntries(f.map((x) => [x.it.id, x.a])); setStock((c) => c.map((s) => (m[s.id] != null ? { ...s, qty: m[s.id] } : s))); f.forEach((x) => moves.push(stockMove(x.it.raw, x.d, 'Kiểm kho', x.a, { note: `Hệ thống ${x.it.sys} → thực tế ${x.a}` }))) }
    if (p.length) { const m = Object.fromEntries(p.map((x) => [x.it.id, x.a])); setProducts((c) => c.map((q) => (m[q.id] != null ? { ...q, stock: m[q.id] } : q))); p.forEach((x) => moves.push(prodMove(x.it.raw, x.d, 'Kiểm kho', x.a, { note: `Hệ thống ${x.it.sys} → thực tế ${x.a}` }))) }
    logMoves(moves); setMsg(`Đã điều chỉnh ${changed.length} mục và ghi vào lịch sử kho.`); setVals((v) => { const n = { ...v }; changed.forEach((x) => delete n[x.it.id]); return n })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Kiểm kho</h1></div>
      <p className="text-sm text-zinc-400">Đếm hoặc cân thực tế rồi nhập vào cột "Thực tế". Mục nào để trống sẽ không bị đổi. Bấm "Áp dụng" để cập nhật kho một lần – mọi chênh lệch được ghi vào lịch sử.</p>
      <div className="flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setMsg('') }} className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{l}</button>)}</div>
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      {tab === 'filament' && (
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-ink-800 p-4 text-sm">
          <div className="flex overflow-hidden rounded-lg border border-white/10" role="group" aria-label="Cách nhập">{[['gross', 'Cân cả cuộn (trừ vỏ)'], ['net', 'Nhập gram nhựa còn lại']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`px-3 py-2 ${mode === k ? 'bg-accent font-semibold text-ink-950' : 'text-zinc-300 hover:bg-white/10'}`}>{l}</button>)}</div>
          {mode === 'gross' && <label className="text-zinc-400">Khối lượng vỏ cuộn rỗng (g)<input type="number" min="0" defaultValue={tare} onBlur={(e) => setSt({ ...st, spoolTare: Math.max(0, num(e.target.value)) })} className={`${inp} mt-1 w-32`} /></label>}
          <p className="max-w-md text-xs text-zinc-500">{mode === 'gross' ? 'Đặt cả cuộn lên cân, nhập số cân được; hệ thống trừ vỏ để ra gram nhựa. Cân vỏ rỗng của hãng bạn dùng một lần (thường khoảng 150–250 g) để có số đúng.' : 'Nhập trực tiếp số gram nhựa còn lại nếu bạn đã trừ vỏ.'}</p>
        </div>)}
      <div className="flex flex-wrap items-center gap-3 text-sm"><label className="flex items-center gap-1.5 text-zinc-300"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="accent-orange-500" />Ẩn mục đang = 0</label><button onClick={() => setVals(Object.fromEntries(items.map((i) => [i.id, i.kind === 'filament' && mode === 'gross' ? String(Math.round(i.sys + tare)) : String(i.sys)])))} className="text-accent hover:underline">Điền sẵn bằng số hệ thống</button><button onClick={() => setVals({})} className="text-zinc-400 hover:text-white">Xóa hết ô đã nhập</button></div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-ink-800 text-zinc-400"><tr><th className="px-4 py-3 font-medium">Mục</th><th className="px-4 py-3 font-medium">Hệ thống</th><th className="px-4 py-3 font-medium">{tab === 'filament' && mode === 'gross' ? 'Cân thực tế (cả cuộn, g)' : 'Thực tế'}</th><th className="px-4 py-3 font-medium">Chênh lệch</th></tr></thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-white/5">
            {shown.map((it) => { const a = actual(it), d = a == null ? null : Math.round((a - it.sys) * 10) / 10, big = d != null && it.sys > 0 && Math.abs(d) / it.sys > 0.1; return (
              <tr key={it.id}>
                <td className="px-4 py-2.5 text-white">{it.kind === 'filament' && <i className="mr-2 inline-block h-3 w-3 rounded-full border border-white/30 align-middle" style={{ background: hexOf(it.color) || '#4b5563' }} />}{it.name}{it.sub && <small className="block text-zinc-500">{it.sub}</small>}</td>
                <td className="px-4 py-2.5">{Math.round(it.sys * 10) / 10} {it.unit}</td>
                <td className="px-4 py-2.5"><input type="number" min="0" step={it.kind === 'filament' ? 1 : 1} aria-label={`Thực tế ${it.name}`} value={vals[it.id] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [it.id]: e.target.value }))} className={`${inp} w-36`} />{a != null && it.kind === 'filament' && mode === 'gross' && <small className="ml-2 text-zinc-500">= {Math.round(a)} g nhựa</small>}</td>
                <td className={`px-4 py-2.5 font-medium ${d == null ? 'text-zinc-600' : d === 0 ? 'text-emerald-400' : big ? 'text-red-300' : 'text-amber-300'}`}>{d == null ? '—' : d === 0 ? '✓ khớp' : `${d > 0 ? '+' : ''}${d} ${it.unit}`}</td>
              </tr>) })}
            {shown.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-zinc-500">Không có mục nào để kiểm.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-ink-900/95 p-4 backdrop-blur">
        <p className="text-sm text-zinc-300">Đã nhập {diffs.length} mục · <b className="text-white">{changed.length}</b> mục lệch{money !== 0 && <> · giá trị lệch <b className={money < 0 ? 'text-red-300' : 'text-emerald-400'}>{money > 0 ? '+' : ''}{$(money)}</b></>}</p>
        <button onClick={apply} disabled={!changed.length} className={`${btn} ml-auto disabled:opacity-40`}>Áp dụng {changed.length || ''} điều chỉnh</button>
      </div>
    </div>
  )
}
