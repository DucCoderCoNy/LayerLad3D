import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { zaloLink } from '../../lib/orderTools.js'
import { BLANK, PKG, SRC, ST, calc, stStyle, fmtDT, isDone, num, owed, planAll, printerOf, today, uid } from '../../lib/workshop.js'
import { dueState, printJobSheet, quoteText } from '../../lib/workshopTools.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'
import { Kpi, Tag, useWset } from './wui.jsx'
import { FinishModal, WasteModal } from './workshopModals.jsx'

const DUE = { late: ['Quá hạn', 'bg-red-500/20 text-red-300'], today: ['Hạn hôm nay', 'bg-amber-500/20 text-amber-300'], soon: ['Sắp đến hạn', 'bg-yellow-500/15 text-yellow-300'] }
const SORTS = [['new', 'Mới nhất'], ['due', 'Hạn giao gần nhất'], ['prio', 'Đơn gấp trước'], ['owed', 'Còn nợ nhiều nhất'], ['profit', 'Lãi gộp cao nhất']]
const monthKey = () => today().slice(0, 7)

/** Đơn xưởng: tổng quan nhanh, lọc & sắp xếp, đổi trạng thái ngay trên dòng, thu tiền nhanh, chi tiết đơn, nhân bản, in phiếu xưởng, soạn báo giá, thao tác nhiều đơn. */
export default function WorkshopOrders() {
  const [orders, setWo] = useStore('wo'), [stock, setStock] = useStore('ws'), [, setCash] = useStore('wc'), [printers] = useStore('printers')
  const S = useWset()
  const [fil, setFil] = useState(''), [q, setQ] = useState(''), [pf, setPf] = useState(''), [sf, setSf] = useState(''), [sort, setSort] = useState('new'), [flags, setFlags] = useState({ rush: false, owed: false, late: false })
  const [f, setF] = useState(null), [touched, setTouched] = useState(false), [detail, setDetail] = useState(null), [pay, setPay] = useState(null), [fin, setFin] = useState(null), [waste, setWaste] = useState(null)
  const [pick, setPick] = useState([]), [bulk, setBulk] = useState({ status: '', printer: '' }), [msg, setMsg] = useState('')
  const ex = f && orders.find((x) => x.id === f.id)
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const c = f ? calc(f, S, stock) : null
  const price = f ? (touched ? num(f.price) : c.sug) : 0
  const pName = (o) => printers.find((p) => p.id === printerOf(o, printers))?.name || ''
  const patch = (id, d) => setWo((x) => x.map((o) => (o.id === id ? { ...o, ...d } : o)))
  const hist = (o, text) => [...(o.history || []), { t: Date.now(), text }].slice(-60)
  const cash = (o, d) => d && setCash((x) => [...x, { id: uid('c'), date: today(), type: d > 0 ? 'in' : 'out', cat: d > 0 ? 'Thu đơn hàng' : 'Hoàn tiền khách', amount: Math.abs(d), note: `${o.cust} · ${o.name}`, orderId: o.id }])

  const sched = useMemo(() => { const m = new Map(); planAll(orders, S, printers).forEach(({ plan }) => plan.forEach((x) => m.set(x.o.id, x))); return m }, [orders, S, printers])
  const counts = useMemo(() => Object.fromEntries(ST.map((s) => [s, orders.filter((o) => o.status === s).length])), [orders])
  const month = monthKey(), mo = orders.filter((o) => o.status !== 'Huỷ' && (o.date || '').startsWith(month))
  const kpi = { running: counts['Đang in'], queue: counts['Chờ in'] + counts['Đã cọc'], quote: counts['Báo giá'], owed: orders.reduce((t, o) => t + owed(o), 0), rev: mo.reduce((t, o) => t + num(o.price), 0), profit: mo.reduce((t, o) => t + (num(o.price) - num(o.cost)), 0), late: orders.filter((o) => dueState(o) === 'late').length }

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const l = orders.filter((o) => (!fil || o.status === fil) && (!pf || printerOf(o, printers) === pf) && (!sf || o.src === sf)
      && (!flags.rush || o.prio == 1) && (!flags.owed || owed(o) > 0) && (!flags.late || dueState(o) === 'late')
      && (!ql || `${o.cust} ${o.name} ${o.phone || ''} ${o.colors || ''} ${o.file || ''}`.toLowerCase().includes(ql)))
    const by = { new: (a, b) => (b.date || '').localeCompare(a.date || '') || (b.q || 0) - (a.q || 0), due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'), prio: (a, b) => (b.prio == 1) - (a.prio == 1) || (a.due || '9999').localeCompare(b.due || '9999'), owed: (a, b) => owed(b) - owed(a), profit: (a, b) => (b.price - b.cost) - (a.price - a.cost) }
    return [...l].sort(by[sort])
  }, [orders, fil, pf, sf, flags, q, sort, printers])

  /** Đổi trạng thái ngay trên dòng. Xong → hỏi gram/giờ thực tế để trừ đúng nhựa; Đang in → ghi giờ bắt đầu. */
  const setStatus = (o, to, silent = false) => { // silent = thao tác hàng loạt: đã xác nhận 1 lần nên không hỏi lại từng đơn
    if (to === o.status) return
    if (['Hoàn thành', 'Đã giao'].includes(to) && !isDone(o)) return setFin({ o, to })
    if (to === 'Huỷ' && !silent && !confirm(`Hủy đơn "${o.name}" của ${o.cust}?`)) return
    if (to === 'Đang in') {
      if (!silent && orders.some((y) => y.status === 'Đang in' && y.id !== o.id && printerOf(y, printers) === printerOf(o, printers)) && !confirm('Máy này đang có đơn "Đang in". Vẫn chuyển đơn này sang đang in?')) return
      return patch(o.id, { status: to, startedAt: o.startedAt || Date.now(), history: hist(o, `Trạng thái: ${o.status} → ${to}`) })
    }
    patch(o.id, { status: to, startedAt: isDone(o) ? o.startedAt : 0, history: hist(o, `Trạng thái: ${o.status} → ${to}`) })
  }
  const doPay = () => {
    const amt = Math.round(+pay.amount || 0); if (!amt) return
    const o = pay.o, next = o.status === 'Báo giá' && amt > 0 ? 'Đã cọc' : o.status
    cash(o, amt); patch(o.id, { paid: num(o.paid) + amt, status: next, history: hist(o, `${amt > 0 ? 'Thu' : 'Hoàn'} ${$(Math.abs(amt))}${pay.note ? ` – ${pay.note}` : ''}${next !== o.status ? ' · chuyển sang Đã cọc' : ''}`) })
    setMsg(`Đã ghi nhận ${$(Math.abs(amt))} và ghi vào Thu chi.`); setPay(null)
  }
  const clone = (o) => { const n = { ...o, id: uid('wo'), date: today(), status: 'Báo giá', paid: 0, deducted: false, startedAt: 0, q: Date.now(), history: [{ t: Date.now(), text: `Nhân bản từ đơn ngày ${o.date}` }], chk: {}, note: o.note }; ['gReal', 'hReal', 'finishedAt', 'wasteG', 'wasteN'].forEach((k) => delete n[k]); setWo((x) => [n, ...x]); setDetail(null); setMsg(`Đã nhân bản đơn "${o.name}" thành đơn Báo giá mới ở đầu danh sách.`) }
  const del = (o) => confirm('Xoá đơn này? Các khoản thu chi đã ghi vẫn được giữ lại.') && (setWo((x) => x.filter((y) => y.id !== o.id)), setDetail(null), setPick((p) => p.filter((i) => i !== o.id)))
  const copy = (t, ok) => navigator.clipboard?.writeText(t).then(() => setMsg(ok), () => setMsg('Không copy được, hãy thử lại.'))

  const open = (o) => { setDetail(null); setTouched(!!o); setF(o ? { ...o } : { ...BLANK, id: '' }) }
  const save = () => {
    const prev = ex?.paid || 0
    const o = { ...(ex || { deducted: false, q: Date.now() }), ...f, id: ex?.id || uid('wo'), cust: f.cust.trim() || 'Khách lẻ', name: f.name.trim() || '(chưa đặt tên)',
      g: num(f.g), h: num(f.h), min: num(f.min), col: num(f.col), rush: num(f.rush), paint: num(f.paint), other: num(f.other), infill: num(f.infill), price, paid: num(f.paid), cost: c.cost }
    if (!ex) o.history = [{ t: Date.now(), text: 'Tạo đơn' }]
    else if (ex.status !== o.status) o.history = hist(ex, `Trạng thái: ${ex.status} → ${o.status}`)
    if (o.status === 'Đang in') { if (!o.startedAt) o.startedAt = Date.now() } else if (!isDone(o)) o.startedAt = 0
    cash(o, o.paid - prev)
    if (isDone(o) && !o.deducted && o.spool && o.g > 0) { setStock((x) => x.map((s) => (s.id === o.spool ? { ...s, qty: Math.max(0, s.qty - o.g) } : s))); o.deducted = true }
    setWo((x) => (ex ? x.map((y) => (y.id === o.id ? o : y)) : [o, ...x])); setF(null)
  }

  const allPicked = list.length > 0 && list.every((o) => pick.includes(o.id))
  const bulkApply = () => {
    const sel = orders.filter((o) => pick.includes(o.id))
    if (bulk.status) { if (['Hoàn thành', 'Đã giao'].includes(bulk.status)) return alert('Đơn cần nhập gram/giờ thực tế để trừ kho nên hãy chuyển "Hoàn thành" từng đơn.'); if (!confirm(`Đổi ${sel.length} đơn sang "${bulk.status}"?`)) return; sel.forEach((o) => setStatus(o, bulk.status, true)) }
    if (bulk.printer) setWo((x) => x.map((o) => (pick.includes(o.id) ? { ...o, printer: bulk.printer === '__auto' ? '' : bulk.printer } : o)))
    setPick([]); setBulk({ status: '', printer: '' })
  }
  const exportCsv = () => downloadCSV('don-xuong.csv', [['Ngày', 'Khách', 'SĐT', 'Nguồn', 'Mẫu', 'Màu', 'Gram', 'Giờ in', 'Máy', 'Hạn giao', 'Trạng thái', 'Giá', 'Đã thu', 'Còn nợ', 'Giá vốn', 'Lãi gộp'],
    ...list.map((o) => [o.date, o.cust, o.phone || '', o.src, o.name, o.colors || '', o.g, o.h, pName(o), o.due || '', o.status, o.price, o.paid, owed(o), Math.round(o.cost), Math.round(o.price - o.cost)])])

  const I = (k, l, type = 'text', x = {}) => <Field key={k} label={l}><input type={type} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={inp} {...x} /></Field>
  const Sel = (k, l, opts) => <Field key={k} label={l}><select value={f[k]} onChange={(e) => set(k, e.target.value)} className={inp}>{opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></Field>
  const chip = (on, s) => `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${on ? `font-semibold ${s ? stStyle(s).chipOn : 'bg-accent text-ink-950'}` : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`
  const d = detail && orders.find((x) => x.id === detail), dsch = d && sched.get(d.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Đơn xưởng</h1>
        <Link to="/admin/workshop-board" className={btn2}>Bảng công việc</Link>
        <button onClick={exportCsv} className={btn2}>Xuất Excel (CSV)</button>
        <button onClick={() => open()} className={`${btn} flex items-center gap-1`}><Plus size={16} />Đơn mới</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi l="Đang in" v={kpi.running} cls={kpi.running ? 'text-accent' : ''} /><Kpi l="Chờ in / đã cọc" v={kpi.queue} /><Kpi l="Báo giá chưa chốt" v={kpi.quote} />
        <Kpi l="Quá hạn giao" v={kpi.late} cls={kpi.late ? 'text-red-400' : ''} /><Kpi l="Còn phải thu" v={$(kpi.owed)} cls={kpi.owed ? 'text-amber-300' : ''} /><Kpi l={`Lãi gộp tháng ${month.slice(5)}`} v={$(kpi.profit)} cls={kpi.profit < 0 ? 'text-red-400' : 'text-emerald-400'} />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          <button onClick={() => setFil('')} className={chip(!fil)}>Tất cả ({orders.length})</button>
          {ST.map((s) => <button key={s} onClick={() => setFil(fil === s ? '' : s)} className={chip(fil === s, s)}><i className={`h-2 w-2 rounded-full ${fil === s ? 'bg-ink-950/60' : stStyle(s).dot}`} />{s} ({counts[s]})</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm khách, SĐT, mẫu, màu, file…" aria-label="Tìm đơn xưởng" className={`${inp} w-60`} />
          {printers.length > 1 && <select value={pf} onChange={(e) => setPf(e.target.value)} aria-label="Lọc theo máy" className={`${inp} w-40`}><option value="">Mọi máy</option>{printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          <select value={sf} onChange={(e) => setSf(e.target.value)} aria-label="Lọc theo nguồn" className={`${inp} w-40`}><option value="">Mọi nguồn</option>{SRC.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp" className={`${inp} w-48`}>{SORTS.map(([k, l]) => <option key={k} value={k}>Xếp: {l}</option>)}</select>
          {[['rush', 'Chỉ đơn gấp'], ['owed', 'Còn nợ'], ['late', 'Quá hạn']].map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-xs text-zinc-300"><input type="checkbox" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} className="accent-orange-500" />{l}</label>)}
        </div>
      </div>
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      {pick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <b className="text-white">Đã chọn {pick.length} đơn</b>
          <select value={bulk.status} onChange={(e) => setBulk({ ...bulk, status: e.target.value })} aria-label="Đổi trạng thái hàng loạt" className={`${inp} w-44`}><option value="">Đổi trạng thái…</option>{ST.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={bulk.printer} onChange={(e) => setBulk({ ...bulk, printer: e.target.value })} aria-label="Gán máy hàng loạt" className={`${inp} w-44`}><option value="">Gán máy…</option><option value="__auto">Tự chọn máy</option>{printers.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={bulkApply} disabled={!bulk.status && !bulk.printer} className={btn}>Áp dụng</button>
          <button onClick={() => setPick([])} className="ml-auto text-zinc-400">Bỏ chọn</button>
        </div>)}

      <DataTable heads={['', 'Khách / Mẫu', 'Máy & dự kiến', 'g / giờ', 'Trạng thái', 'Giá', 'Đã thu', 'Lãi gộp', '']} empty="Không có đơn nào phù hợp. Bấm “Đơn mới” hoặc chuyển từ đơn web.">
        {list.map((o) => { const ds = dueState(o), sc = sched.get(o.id), debt = owed(o); return (
          <tr key={o.id} onClick={() => setDetail(o.id)} className={`cursor-pointer border-l-4 hover:bg-white/5 ${stStyle(o.status).bar} ${o.status === 'Huỷ' ? 'opacity-60' : ''}`}>
            <td className={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Chọn ${o.name}`} checked={pick.includes(o.id)} onChange={(e) => setPick((p) => (e.target.checked ? [...p, o.id] : p.filter((i) => i !== o.id)))} className="accent-orange-500" /></td>
            <td className={td}><span className="font-medium text-white">{o.cust}</span>{o.prio == 1 && <span className="ml-1 rounded bg-red-500/20 px-1.5 text-xs text-red-300">Gấp</span>}{ds && <span className={`ml-1 rounded px-1.5 text-xs ${DUE[ds][1]}`}>{DUE[ds][0]}</span>}
              <br /><small className="text-zinc-500">{o.name}{o.colors && ` · ${o.colors}`}{o.due && ` · hạn ${o.due.split('-').reverse().join('/')}`} · {o.src}</small></td>
            <td className={td}>{pName(o) || '—'}{sc && <small className={`block ${sc.late ? 'text-red-300' : 'text-zinc-500'}`}>{sc.run ? 'đang in, xong' : 'dự kiến xong'} {fmtDT(sc.e)}</small>}</td>
            <td className={td}>{o.g} / {o.h}</td>
            <td className={td} onClick={(e) => e.stopPropagation()}><select value={o.status} onChange={(e) => setStatus(o, e.target.value)} aria-label={`Trạng thái đơn ${o.name}`} className={`rounded border px-2 py-1 text-xs font-medium ${stStyle(o.status).sel}`}>{ST.map((s) => <option key={s} className="bg-ink-900 text-white">{s}</option>)}</select></td>
            <td className={td}>{$(o.price)}</td>
            <td className={td} onClick={(e) => e.stopPropagation()}>{$(o.paid)}{debt > 0 && <button onClick={() => setPay({ o, amount: debt, note: '' })} className="block text-xs text-amber-300 hover:underline">Thu {$(debt)}</button>}</td>
            <td className={`${td} ${o.price < o.cost ? 'text-red-400' : ''}`}>{$(o.price - o.cost)}</td>
            <td className={`${td} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}><button onClick={() => open(o)} className="px-2 text-sm text-accent">Sửa</button></td>
          </tr>) })}
      </DataTable>
      {list.length > 0 && <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={allPicked} onChange={(e) => setPick(e.target.checked ? list.map((o) => o.id) : [])} className="accent-orange-500" />Chọn tất cả {list.length} đơn đang hiển thị</label>}

      {d && (
        <Modal title={`${d.cust} · ${d.name}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Tag s={d.status} />{d.prio == 1 && <span className="rounded bg-red-500/20 px-1.5 text-xs text-red-300">Gấp</span>}{dueState(d) && <span className={`rounded px-1.5 text-xs ${DUE[dueState(d)][1]}`}>{DUE[dueState(d)][0]}</span>}<span className="text-zinc-500">{d.src} · nhận ngày {d.date}</span></div>
            <div className="grid gap-2 rounded-xl bg-ink-900 p-3 text-zinc-300 sm:grid-cols-2">
              <span>Khách: <b className="text-white">{d.cust}</b>{d.phone && <> · <a href={zaloLink(d.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent"><MessageCircle size={13} />{d.phone}</a></>}</span><span>Hạn giao: <b className="text-white">{d.due ? d.due.split('-').reverse().join('/') : '—'}</b></span>
              <span>Màu: {d.colors || '—'}</span><span>Layer {d.layer}mm · infill {d.infill}%</span>
              <span>Nhựa: <b className="text-white">{d.g}g</b>{d.gReal ? ` (thực ${d.gReal}g)` : ''} · {d.h}h{d.hReal ? ` (thực ${d.hReal}h)` : ''}</span><span>Máy: <b className="text-white">{pName(d) || '—'}</b>{dsch && <small className={dsch.late ? ' text-red-300' : ' text-zinc-500'}> · {dsch.run ? 'đang in, xong' : 'dự kiến xong'} {fmtDT(dsch.e)}</small>}</span>
              {d.file && <span className="sm:col-span-2">File: {d.file}</span>}{d.note && <span className="italic text-zinc-400 sm:col-span-2">{d.note}</span>}
              {d.wasteN > 0 && <span className="text-red-300 sm:col-span-2">Đã in lỗi {d.wasteN} lần (hao {d.wasteG}g)</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Giá chốt', $(d.price), 'text-white'], ['Đã thu', $(d.paid), 'text-emerald-400'], ['Còn nợ', $(owed(d)), owed(d) ? 'text-amber-300' : 'text-zinc-500'], ['Lãi gộp', $(d.price - d.cost), d.price < d.cost ? 'text-red-400' : 'text-emerald-400']].map(([l, v, cl]) => <div key={l} className="rounded-xl bg-ink-900 p-3"><p className="text-xs text-zinc-500">{l}</p><b className={`text-base ${cl}`}>{v}</b></div>)}</div>
            <label className="block text-zinc-400">Đổi trạng thái<select value={d.status} onChange={(e) => { setStatus(d, e.target.value); }} className={`${inp} mt-1 w-56`}>{ST.map((s) => <option key={s}>{s}</option>)}</select></label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => open(d)} className={btn}>Sửa đơn</button>
              {owed(d) > 0 && <button onClick={() => { setPay({ o: d, amount: owed(d), note: '' }); setDetail(null) }} className={btn2}>Thu tiền</button>}
              <button onClick={() => printJobSheet(d, pName(d))} className={btn2}>In phiếu xưởng</button>
              <button onClick={() => copy(quoteText(d, d.price, S), 'Đã copy tin báo giá – dán vào Zalo/Messenger.')} className={`${btn2} flex items-center gap-1`}><Copy size={14} />Copy báo giá</button>
              <button onClick={() => clone(d)} className={btn2}>Nhân bản</button>
              <button onClick={() => { setWaste({ order: d.id, printer: printerOf(d, printers) }); setDetail(null) }} className={btn2}>Báo in lỗi</button>
              <button onClick={() => del(d)} className={`${btn2} ml-auto flex items-center gap-1 text-red-400`}><Trash2 size={14} />Xoá</button>
            </div>
            {d.history?.length > 0 && <details className="text-xs text-zinc-500"><summary className="cursor-pointer">Lịch sử đơn ({d.history.length})</summary><ul className="mt-2 space-y-1">{[...d.history].reverse().map((h, i) => <li key={i}>{new Date(h.t).toLocaleString('vi-VN')} – {h.text}</li>)}</ul></details>}
          </div>
        </Modal>)}

      {pay && (
        <Modal title={`Thu tiền: ${pay.o.cust}`} onClose={() => setPay(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-zinc-400">{pay.o.name} · giá {$(pay.o.price)} · đã thu {$(pay.o.paid)} · <b className="text-amber-300">còn nợ {$(owed(pay.o))}</b></p>
            <Field label="Số tiền thu (₫) – số âm = hoàn lại"><input type="number" step="1000" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={inp} autoFocus /></Field>
            <Field label="Ghi chú"><input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="VD: cọc 50%, chuyển khoản" className={inp} /></Field>
            <p className="text-xs text-zinc-500">Khoản thu tự ghi vào Thu chi.{pay.o.status === 'Báo giá' && ' Đơn đang "Báo giá" sẽ tự chuyển sang "Đã cọc".'}</p>
            <div className="flex justify-end gap-2"><button onClick={() => setPay(null)} className={btn2}>Hủy</button><button onClick={doPay} className={btn}>Ghi nhận</button></div>
          </div>
        </Modal>)}

      {f && (
        <Modal title={ex ? 'Sửa đơn xưởng' : 'Đơn xưởng mới'} onClose={() => setF(null)} wide>
          <datalist id="wo-custs">{[...new Set(orders.map((o) => o.cust))].map((n) => <option key={n} value={n} />)}</datalist>
          <div className="grid gap-3 sm:grid-cols-2">
            {I('date', 'Ngày', 'date')}{Sel('src', 'Nguồn', SRC)}{I('cust', 'Khách', 'text', { list: 'wo-custs' })}{I('phone', 'Số điện thoại (để nhắn Zalo)', 'tel')}{I('name', 'Tên mẫu')}
            {Sel('status', 'Trạng thái', ST)}
            <div className="sm:col-span-2">{I('file', 'File in (tên file hoặc link)')}</div>
            {I('colors', 'Màu in (ghi rõ từng phần)')}{Sel('layer', 'Layer (mm)', ['0.28', '0.2', '0.12', '0.08'])}
            {I('infill', 'Infill (%)', 'number')}{I('due', 'Hạn giao', 'date')}{Sel('printer', 'Máy in', [['', '— tự chọn máy đầu tiên —'], ...printers.filter((p) => p.active).map((p) => [p.id, p.name])])}{Sel('prio', 'Ưu tiên', [['0', 'Thường'], ['1', 'Gấp']])}
            {Sel('pkg', 'Gói in', Object.entries(PKG).map(([k, v]) => [k, v[0]]))}
            {Sel('spool', 'Cuộn nhựa dùng', [['', '— chưa chọn —'], ...stock.filter((s) => s.kind === 'filament').map((s) => [s.id, `${[s.brand, s.name].filter(Boolean).join(' ')}${s.color ? ' · ' + s.color : ''} (còn ${Math.round(s.qty)}g)`])])}
            {I('g', 'Gram (cả support)', 'number')}{I('h', 'Giờ in', 'number')}{I('min', 'Phút làm tay', 'number')}
            {Sel('col', 'Phụ phí đa màu', [[0, '1 màu'], [15000, '2 màu +15k'], [30000, '3 màu +30k'], [45000, '4+ màu +45k']])}
            {Sel('rush', 'Hàng gấp', [[0, 'Không'], [40000, 'Gấp +40k']])}{I('paint', 'Sơn / hoàn thiện (đ)', 'number')}{I('other', 'Phụ phí khác (đ)', 'number')}
          </div>
          <div className="my-4 rounded-xl bg-accent/10 p-3 text-sm text-zinc-200">
            Theo gram: {$(c.byG)} · Theo công thức: {$(c.byF)} · Tối thiểu: {$(S.min)} → lấy cao nhất {$(c.base)}<br />
            Phụ phí: {$(c.extra)} · <b>Giá gợi ý: {$(c.sug)}</b> · Giá vốn: {$(c.cost)} · Lãi gộp: <b className={price < c.cost ? 'text-red-400' : 'text-emerald-400'}>{$(price - c.cost)}</b>
            {price < c.cost && <span className="text-red-400"> (giá thấp hơn giá vốn!)</span>}
            {num(f.g) > 0 && num(f.h) > 0 && num(f.g) / num(f.h) < 12 && <><br /><span className="text-amber-400">g/giờ dưới 12: mẫu nhẹ nhưng in lâu, nên dùng giá công thức.</span></>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Giá chốt (đ)"><input type="number" step="1000" value={touched ? f.price : c.sug} onChange={(e) => { setTouched(true); set('price', e.target.value) }} className={inp} /></Field>
            {I('paid', 'Đã thu (đ)', 'number', { min: 0, step: 1000 })}
            <div className="flex items-end"><button type="button" onClick={() => copy(quoteText(f, price, S), 'Đã copy tin báo giá – dán vào Zalo/Messenger.')} className={`${btn2} flex w-full items-center justify-center gap-1`}><Copy size={14} />Copy tin báo giá</button></div>
            <div className="sm:col-span-3"><Field label="Ghi chú"><textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field></div>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu đơn</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
      {fin && <FinishModal order={fin.o} toStatus={fin.to} onClose={() => setFin(null)} />}
      {waste && <WasteModal preset={waste} onClose={() => setWaste(null)} />}
    </div>
  )
}
