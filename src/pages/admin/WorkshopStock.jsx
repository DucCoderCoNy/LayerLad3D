import { useMemo, useState } from 'react'
import { AlertTriangle, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { num, stockCost, today, uid } from '../../lib/workshop.js'
import Spool from '../../components/Spool.jsx'
import { Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'
import { Kpi } from './wui.jsx'

const MATS = ['PLA', 'PETG', 'ABS']
const fmtG = (g) => (g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${Math.round(g)} g`)
const capOf = (s) => Math.max(num(s.cap) || 1000, s.qty) // cuộn đầy (mặc định 1kg); không bao giờ nhỏ hơn số đang có
const isLow = (s) => s.min > 0 && s.qty <= s.min

/** Kho nhựa dạng giá để cuộn (mỗi loại nhựa một kệ, cuộn hiện đúng màu + lượng còn lại) và tủ vật tư. */
export default function WorkshopStock() {
  const [stock, setStock] = useStore('ws'), [, setCash] = useStore('wc'), [colors] = useStore('colors')
  const [f, setF] = useState(null), [re, setRe] = useState(null), [q, setQ] = useState(''), [mat, setMat] = useState('all'), [onlyLow, setOnlyLow] = useState(false)
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const hexOf = (name) => colors.find((c) => c.name === name)?.hex
  const spend = (kind, amount, note) => amount > 0 && setCash((c) => [...c, { id: uid('c'), date: today(), type: 'out', cat: kind === 'filament' ? 'Mua nhựa' : 'Vật tư', amount, note }])

  const fil = stock.filter((s) => s.kind === 'filament'), sup = stock.filter((s) => s.kind === 'supply')
  const stats = useMemo(() => ({
    spools: fil.length, grams: fil.reduce((t, s) => t + s.qty, 0), value: fil.reduce((t, s) => t + (s.qty * s.price) / 1000, 0), low: fil.filter(isLow).length + sup.filter(isLow).length,
  }), [stock])
  const order = (s) => colors.findIndex((c) => c.name === s.color)
  const shown = fil.filter((s) => (!onlyLow || isLow(s)) && (mat === 'all' || (s.material || '') === (mat === 'none' ? '' : mat)) && (!q.trim() || `${s.name} ${s.color} ${s.material}`.toLowerCase().includes(q.trim().toLowerCase())))
  const shelves = [...MATS, ''].map((m) => ({ m, items: shown.filter((s) => (s.material || '') === m).sort((a, b) => (order(a) < 0 ? 99 : order(a)) - (order(b) < 0 ? 99 : order(b)) || a.name.localeCompare(b.name)) }))

  const blankFil = (material = 'PLA') => ({ kind: 'filament', name: '', qty: 1000, cap: 1000, unit: 'g', price: 175000, min: 200, material, color: colors.find((c) => c.active)?.name || '', rec: true })
  const save = () => {
    const auto = f.kind === 'filament' ? [f.material, f.color].filter(Boolean).join(' ') : ''
    const v = { kind: f.kind, name: f.name.trim() || auto || '(chưa đặt tên)', qty: num(f.qty), unit: f.kind === 'filament' ? 'g' : f.unit || 'cái', price: num(f.price), min: num(f.min),
      material: f.kind === 'filament' ? f.material || '' : '', color: f.kind === 'filament' ? f.color || '' : '', cap: f.kind === 'filament' ? num(f.cap) || 1000 : 0 }
    if (f.id) setStock((c) => c.map((s) => (s.id === f.id ? { ...s, ...v } : s)))
    else { const s = { id: uid('s'), ...v }; setStock((c) => [...c, s]); if (f.rec && s.qty > 0) spend(s.kind, Math.round(stockCost(s, s.qty)), s.name) }
    setF(null)
  }
  const doRestock = () => {
    const qn = num(re.qty); if (!qn) return
    setStock((c) => c.map((x) => (x.id === re.s.id ? { ...x, qty: x.qty + qn } : x)))
    if (re.rec) spend(re.s.kind, num(re.cost), 'Nhập thêm: ' + re.s.name)
    setRe(null)
  }
  const del = (s) => confirm(`Xóa "${s.name}" khỏi kho?`) && setStock((c) => c.filter((x) => x.id !== s.id))
  const openRestock = (s) => { const qty = s.kind === 'filament' ? 1000 : 10; setRe({ s, qty, cost: Math.round(stockCost(s, qty)), rec: true }) }

  const Actions = ({ s }) => (
    <div className="mt-2 flex justify-center gap-1">
      <button onClick={() => openRestock(s)} title="Nhập thêm" aria-label={`Nhập thêm ${s.name}`} className="rounded-md bg-white/5 p-1.5 text-neon hover:bg-white/10"><PackagePlus size={15} /></button>
      <button onClick={() => setF({ ...s, cap: s.cap || capOf(s) })} title="Sửa" aria-label={`Sửa ${s.name}`} className="rounded-md bg-white/5 p-1.5 text-accent hover:bg-white/10"><Pencil size={15} /></button>
      <button onClick={() => del(s)} title="Xóa" aria-label={`Xóa ${s.name}`} className="rounded-md bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-red-400"><Trash2 size={15} /></button>
    </div>
  )
  const tag = (s) => (s.qty <= 0 ? <b className="rounded bg-red-500/20 px-1.5 text-[10px] text-red-300">HẾT</b> : isLow(s) ? <b className="rounded bg-amber-500/20 px-1.5 text-[10px] text-amber-300">SẮP HẾT</b> : null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Kho nhựa & vật tư</h1>
        <button onClick={() => setF(blankFil())} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm cuộn nhựa</button>
        <button onClick={() => setF({ kind: 'supply', name: '', qty: 10, unit: 'cái', price: 5000, min: 3, rec: true })} className={`${btn2} flex items-center gap-1`}><Plus size={16} />Thêm vật tư</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi l="Số cuộn nhựa" v={stats.spools} /><Kpi l="Tổng khối lượng nhựa" v={fmtG(stats.grams)} /><Kpi l="Giá trị nhựa trong kho" v={$(stats.value)} /><Kpi l="Cần nhập thêm" v={stats.low} cls={stats.low ? 'text-amber-400' : ''} />
      </div>
      {stats.low > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"><AlertTriangle size={16} />Cần nhập thêm:
          {[...fil, ...sup].filter(isLow).map((s) => <span key={s.id} className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs">{s.name} ({s.kind === 'filament' ? fmtG(s.qty) : `${s.qty} ${s.unit}`})</span>)}</p>)}

      <div className="flex flex-wrap items-center gap-2">
        {[['all', 'Tất cả'], ...MATS.map((m) => [m, m]), ['none', 'Chưa phân loại']].map(([k, l]) => <button key={k} onClick={() => setMat(k)} className={`rounded-full px-3 py-1.5 text-xs ${mat === k ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{l}</button>)}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-zinc-300"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-orange-500" />Chỉ cuộn sắp hết</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên / màu…" aria-label="Tìm trong kho" className={`${inp} ml-auto w-48`} />
      </div>

      {/* Các kệ nhựa: mỗi loại một kệ gỗ, cuộn đặt trên kệ */}
      {shelves.filter((s) => s.items.length || (mat === 'all' && s.m && !q && !onlyLow)).map(({ m, items }) => (
        <section key={m || 'none'} aria-label={`Kệ ${m || 'chưa phân loại'}`}>
          <div className="mb-1 flex items-baseline gap-3 px-1"><h2 className="font-display text-lg font-bold text-white">Kệ {m || 'chưa phân loại'}</h2>
            <span className="text-xs text-zinc-500">{items.length} cuộn · {fmtG(items.reduce((t, s) => t + s.qty, 0))}</span></div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-900 to-ink-800 px-2 pt-4">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
              {items.map((s) => {
                const hex = hexOf(s.color), pct = s.qty / capOf(s)
                return (
                  <div key={s.id} className="flex flex-col items-center">
                    <div className="px-2 pb-0 text-center">
                      <div className="mx-auto w-fit"><Spool hex={hex} unknown={!hex} pct={pct} low={isLow(s)} size={116} /></div>
                    </div>
                    <div className="mt-1 h-3 w-full bg-gradient-to-b from-[#6b4a2f] to-[#3d2916] shadow-[0_3px_0_#2a1a0c]" aria-hidden />
                    <div className="w-full px-2 pb-3 pt-2 text-center">
                      <p className="truncate text-sm font-semibold text-white" title={s.name}>{s.name}</p>
                      <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400"><i className="inline-block h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: hex || '#4b5563' }} />{s.color || 'Chưa chọn màu'} · {s.material || '—'}</p>
                      <p className="mt-1 text-sm font-bold text-white">{fmtG(s.qty)} <span className="text-xs font-normal text-zinc-500">/ {fmtG(capOf(s))}</span></p>
                      <div className="mx-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${s.qty <= 0 ? 'bg-red-500' : isLow(s) ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.round(Math.min(1, pct) * 100)}%` }} /></div>
                      <p className="mt-1 text-[11px] text-zinc-500">{$(s.price)}/kg {tag(s)}</p>
                      <Actions s={s} />
                    </div>
                  </div>)
              })}
              {m && mat !== 'none' && !q && !onlyLow && (
                <button onClick={() => setF(blankFil(m))} className="m-2 grid min-h-48 place-items-center rounded-xl border-2 border-dashed border-white/15 p-3 text-center text-sm text-zinc-500 hover:border-accent hover:text-accent"><span><Plus className="mx-auto" />Thêm cuộn {m}</span></button>)}
            </div>
          </div>
        </section>))}
      {fil.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-500">Chưa có cuộn nhựa nào. Bấm "Thêm cuộn nhựa" để bắt đầu.</p>}

      <section aria-label="Vật tư">
        <h2 className="mb-2 px-1 font-display text-lg font-bold text-white">Tủ vật tư <span className="text-xs font-normal text-zinc-500">(hộp, băng keo, sơn, giấy nhám, nozzle…)</span></h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sup.map((s) => { const pct = Math.min(1, s.qty / (s.min > 0 ? s.min * 3 : Math.max(s.qty, 1))); return (
            <div key={s.id} className={`rounded-xl border bg-ink-800 p-4 ${isLow(s) ? 'border-amber-500/40' : 'border-white/10'}`}>
              <p className="truncate font-semibold text-white" title={s.name}>{s.name} {tag(s)}</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{s.qty} <span className="text-sm font-normal text-zinc-500">{s.unit}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${s.qty <= 0 ? 'bg-red-500' : isLow(s) ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.round(pct * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-zinc-500">{$(s.price)}/{s.unit}{s.min > 0 && ` · cảnh báo ≤ ${s.min}`}</p>
              <Actions s={s} />
            </div>) })}
          {sup.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">Chưa có vật tư nào.</p>}
        </div>
      </section>

      {f && (
        <Modal title={f.id ? 'Sửa mục kho' : f.kind === 'filament' ? 'Thêm cuộn nhựa' : 'Thêm vật tư'} onClose={() => setF(null)}>
          {f.kind === 'filament' && <div className="mb-4 flex items-center gap-4 rounded-xl bg-ink-900 p-3"><Spool hex={hexOf(f.color)} unknown={!hexOf(f.color)} pct={num(f.qty) / Math.max(num(f.cap) || 1000, num(f.qty), 1)} size={72} /><p className="text-sm text-zinc-400">Xem trước cuộn: màu <b className="text-white">{f.color || 'chưa chọn'}</b>, còn <b className="text-white">{fmtG(num(f.qty))}</b>.</p></div>}
          <div className="grid gap-3 sm:grid-cols-2">
            {f.kind === 'filament' && <Field label="Loại nhựa"><select value={f.material || ''} onChange={(e) => set('material', e.target.value)} className={inp}><option value="">— chưa phân loại —</option>{MATS.map((m) => <option key={m}>{m}</option>)}</select></Field>}
            {f.kind === 'filament' && <Field label="Màu (quản lý ở mục Màu nhựa)"><select value={f.color || ''} onChange={(e) => set('color', e.target.value)} className={inp}><option value="">— chưa chọn —</option>{colors.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>}
            <div className="sm:col-span-2"><Field label={f.kind === 'filament' ? `Tên / hãng (để trống = "${[f.material, f.color].filter(Boolean).join(' ') || 'PLA Đen'}")` : 'Tên vật tư'}><input value={f.name} onChange={(e) => set('name', e.target.value)} className={inp} placeholder={f.kind === 'filament' ? 'VD: eSUN PLA+ Đen' : 'VD: Hộp carton nhỏ'} /></Field></div>
            <Field label={f.kind === 'filament' ? 'Khối lượng còn lại (g)' : 'Số lượng còn'}><input type="number" min="0" value={f.qty} onChange={(e) => set('qty', e.target.value)} className={inp} /></Field>
            {f.kind === 'filament' ? <Field label="Khối lượng cuộn khi đầy (g)"><input type="number" min="100" value={f.cap} onChange={(e) => set('cap', e.target.value)} className={inp} /></Field>
              : <Field label="Đơn vị"><input value={f.unit} onChange={(e) => set('unit', e.target.value)} className={inp} /></Field>}
            <Field label={f.kind === 'filament' ? 'Giá nhập (₫ / kg)' : 'Giá nhập (₫ / đơn vị)'}><input type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} className={inp} /></Field>
            <Field label={f.kind === 'filament' ? 'Cảnh báo khi còn ≤ (g)' : 'Cảnh báo khi còn ≤'}><input type="number" min="0" value={f.min} onChange={(e) => set('min', e.target.value)} className={inp} /></Field>
            {!f.id && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.rec} onChange={(e) => set('rec', e.target.checked)} className="accent-orange-500" />Ghi khoản chi mua vào Thu chi ({$(Math.round(stockCost({ kind: f.kind, price: num(f.price) }, num(f.qty))))})</label>}
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}

      {re && (
        <Modal title={`Nhập thêm: ${re.s.name}`} onClose={() => setRe(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={re.s.kind === 'filament' ? 'Số gram nhập thêm (1 cuộn = 1000)' : `Số ${re.s.unit} nhập thêm`}><input type="number" min="1" value={re.qty} onChange={(e) => setRe({ ...re, qty: e.target.value, cost: Math.round(stockCost(re.s, num(e.target.value))) })} className={inp} /></Field>
            <Field label="Số tiền đã chi (₫)"><input type="number" min="0" value={re.cost} onChange={(e) => setRe({ ...re, cost: e.target.value })} className={inp} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={re.rec} onChange={(e) => setRe({ ...re, rec: e.target.checked })} className="accent-orange-500" />Ghi khoản chi vào Thu chi</label>
            <p className="text-sm text-zinc-400 sm:col-span-2">Sau khi nhập: <b className="text-white">{re.s.kind === 'filament' ? fmtG(re.s.qty + num(re.qty)) : `${re.s.qty + num(re.qty)} ${re.s.unit}`}</b></p>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={doRestock} className={btn}>Nhập kho</button><button onClick={() => setRe(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
    </div>
  )
}
