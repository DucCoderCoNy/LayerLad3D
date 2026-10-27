import { useMemo, useState } from 'react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { FIXED_CATS, inRange, presetRange } from '../../lib/finance.js'
import { ACCOUNTS, accountLabel, buildLedger, dueRecurring } from '../../lib/ledger.js'
import { num, today, uid } from '../../lib/workshop.js'
import DateRange from '../../components/DateRange.jsx'
import Rank from '../../components/Rank.jsx'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const CATS = { in: ['Thu đơn hàng', 'Thu khác'], out: ['Mua nhựa', 'Vật tư', 'Tiền điện', 'Phí sàn / ship', 'Thiết bị / linh kiện', 'Bảo trì máy', 'Quảng cáo', ...FIXED_CATS, 'Khác'] }
export const sumC = (a) => a.reduce((s, c) => s + c.amount, 0)
const monthNow = () => today().slice(0, 7)

/** Thu chi: sổ tiền (lọc theo ngày/loại/danh mục/tài khoản, sửa, nhân bản, xuất CSV, gồm tiền thu từ đơn web) và Chi phí định kỳ hàng tháng. */
export default function WorkshopCash() {
  const [wc, setCash] = useStore('wc'), [orders] = useStore('orders'), [recurring, setRec] = useStore('recurring')
  const [tab, setTab] = useState('ledger'), [range, setRange] = useState(() => presetRange('month'))
  const [type, setType] = useState(''), [cat, setCat] = useState(''), [acc, setAcc] = useState(''), [q, setQ] = useState(''), [web, setWeb] = useState(true)
  const [f, setF] = useState(null), [r, setR] = useState(null), [msg, setMsg] = useState('')
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))

  const all = useMemo(() => buildLedger({ orders, wc }), [orders, wc])
  const rows = useMemo(() => all.filter((x) => inRange(x.date, range[0], range[1]) && (web || x.src !== 'web') && (!type || x.type === type) && (!cat || x.cat === cat) && (!acc || x.account === acc)
    && (!q.trim() || `${x.cat} ${x.note}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, range, web, type, cat, acc, q])
  const inn = sumC(rows.filter((x) => x.type === 'in')), out = sumC(rows.filter((x) => x.type === 'out'))
  const byCat = useMemo(() => { const m = {}; rows.filter((x) => x.type === 'out').forEach((x) => { m[x.cat] = (m[x.cat] || 0) + x.amount }); return Object.entries(m).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 6) }, [rows])
  const catOptions = [...new Set([...CATS.in, ...CATS.out, 'Thu đơn web', 'Hoàn tiền khách', ...all.map((x) => x.cat).filter(Boolean)])]

  const add = (t) => setF({ type: t, date: today(), cat: CATS[t][0], amount: '', note: '', account: 'cash' })
  const edit = (x) => setF({ ...x.raw, account: x.raw.account || 'cash', amount: x.raw.amount })
  const save = () => {
    if (!(num(f.amount) > 0)) return alert('Nhập số tiền lớn hơn 0.')
    if (!f.date) return alert('Chọn ngày.')
    const e = { ...f, amount: num(f.amount), note: f.note.trim() }
    setCash((c) => (e.id ? c.map((y) => (y.id === e.id ? { ...y, ...e } : y)) : [...c, { ...e, id: uid('c') }])); setF(null)
  }
  const clone = (x) => setF({ ...x.raw, id: undefined, date: today(), recurId: undefined, recurMonth: undefined, orderId: undefined })
  const del = (x) => confirm('Xoá khoản này?') && setCash((c) => c.filter((y) => y.id !== x.id))
  const exportCsv = () => downloadCSV('thu-chi.csv', [['Ngày', 'Loại', 'Danh mục', 'Tài khoản', 'Ghi chú', 'Số tiền', 'Nguồn'], ...rows.map((x) => [x.date, x.type === 'in' ? 'Thu' : 'Chi', x.cat, accountLabel(x.account), x.note, x.amount, x.src === 'web' ? 'Đơn web (tự động)' : 'Nhập tay'])])

  /* ---- Chi phí định kỳ ---- */
  const due = useMemo(() => dueRecurring(recurring, wc), [recurring, wc])
  const monthly = recurring.filter((x) => x.active).reduce((t, x) => t + num(x.amount), 0)
  const postDue = () => { setCash((c) => [...c, ...due.map(({ r: x, m, date }) => ({ id: uid('c'), date, type: 'out', cat: x.cat, amount: num(x.amount), note: `${x.name} (định kỳ ${m})`, account: x.account || 'bank', recurId: x.id, recurMonth: m }))]); setMsg(`Đã ghi ${due.length} khoản chi định kỳ vào sổ.`) }
  const newRec = () => setR({ name: '', cat: FIXED_CATS[0], amount: '', day: 1, account: 'bank', from: monthNow(), active: true })
  const saveRec = () => {
    if (!r.name.trim()) return alert('Nhập tên khoản chi.'); if (!(num(r.amount) > 0)) return alert('Nhập số tiền lớn hơn 0.')
    const e = { ...r, name: r.name.trim(), amount: num(r.amount), day: Math.min(28, Math.max(1, Math.round(num(r.day)) || 1)) }
    setRec((c) => (e.id ? c.map((y) => (y.id === e.id ? e : y)) : [...c, { ...e, id: uid('r') }])); setR(null)
  }
  const chip = (on) => `rounded-full px-4 py-1.5 text-sm ${on ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Thu chi</h1>
        <button onClick={() => add('in')} className={btn}>+ Khoản thu</button><button onClick={() => add('out')} className={btn2}>+ Khoản chi</button>
      </div>
      <div className="flex gap-2"><button onClick={() => setTab('ledger')} className={chip(tab === 'ledger')}>Sổ thu chi</button><button onClick={() => setTab('recurring')} className={chip(tab === 'recurring')}>Chi phí định kỳ{due.length > 0 && <b className="ml-1.5 rounded-full bg-red-500 px-1.5 text-xs text-white">{due.length}</b>}</button></div>
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      {tab === 'ledger' && (
        <>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-4">
            <DateRange value={range} onChange={setRange} />
            <div className="flex flex-wrap items-center gap-2">
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Lọc theo loại" className={`${inp} w-32`}><option value="">Thu + Chi</option><option value="in">Chỉ thu</option><option value="out">Chỉ chi</option></select>
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Lọc theo danh mục" className={`${inp} w-48`}><option value="">Mọi danh mục</option>{catOptions.map((c) => <option key={c}>{c}</option>)}</select>
              <select value={acc} onChange={(e) => setAcc(e.target.value)} aria-label="Lọc theo tài khoản" className={`${inp} w-40`}><option value="">Mọi tài khoản</option>{ACCOUNTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm ghi chú…" aria-label="Tìm trong sổ" className={`${inp} w-48`} />
              <label className="flex items-center gap-1.5 text-xs text-zinc-300"><input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} className="accent-orange-500" />Gồm tiền thu từ đơn web (tự động)</label>
              <button onClick={exportCsv} className={`${btn2} ml-auto`}>Xuất Excel (CSV)</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['Tổng thu', $(inn), 'text-emerald-400'], ['Tổng chi', $(out), 'text-red-400'], ['Chênh lệch', $(inn - out), inn - out < 0 ? 'text-red-400' : 'text-white'], ['Số khoản', rows.length, 'text-white']].map(([l, v, c]) => <div key={l} className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${c}`}>{v}</p></div>)}
          </div>
          {byCat.length > 0 && <div className="rounded-2xl border border-white/10 bg-ink-800 p-5"><p className="mb-3 text-sm text-zinc-400">Chi nhiều nhất theo danh mục</p><Rank rows={byCat} fmt={$} /></div>}
          <DataTable heads={['Ngày', 'Loại', 'Danh mục', 'Tài khoản', 'Ghi chú', 'Số tiền', '']} empty="Không có khoản nào trong bộ lọc.">
            {rows.map((x) => (
              <tr key={x.id}><td className={td}>{x.date.split('-').reverse().join('/')}</td><td className={`${td} ${x.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{x.type === 'in' ? 'Thu' : 'Chi'}</td>
                <td className={td}>{x.cat}{x.src === 'web' && <small className="block text-zinc-500">tự động từ đơn web</small>}{x.recur && <small className="block text-zinc-500">định kỳ</small>}</td>
                <td className={td}>{accountLabel(x.account)}</td><td className={`${td} max-w-64 truncate`} title={x.note}>{x.note}</td>
                <td className={`${td} whitespace-nowrap ${x.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{x.type === 'in' ? '+' : '−'}{$(x.amount)}</td>
                <td className={`${td} whitespace-nowrap text-right`}>{x.src === 'manual' ? <><button onClick={() => edit(x)} className="px-1.5 text-sm text-accent">Sửa</button><button onClick={() => clone(x)} className="px-1.5 text-sm text-zinc-400 hover:text-white">Nhân bản</button><button onClick={() => del(x)} className="px-1.5 text-sm text-zinc-500 hover:text-red-400">Xoá</button></> : <span className="text-xs text-zinc-600">sửa trong đơn</span>}</td></tr>))}
          </DataTable>
        </>)}

      {tab === 'recurring' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Khai báo các khoản chi cố định mỗi tháng (thuê chỗ, internet, phần mềm, lương…). Khi tới ngày, bấm một nút để ghi vào sổ – hệ thống không tự ghi để tránh sai số. Các khoản này được tính vào <b className="text-white">chi phí cố định</b> và điểm hòa vốn ở Tổng quan tài chính.</p>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-ink-800 p-4"><div><p className="text-xs text-zinc-500">Tổng chi phí cố định / tháng</p><b className="font-display text-2xl text-white">{$(monthly)}</b></div><button onClick={newRec} className={`${btn} ml-auto`}>+ Thêm khoản định kỳ</button></div>
          {due.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold">Có {due.length} khoản đến hạn chưa ghi vào sổ ({$(due.reduce((t, d) => t + num(d.r.amount), 0))}):</p>
              <ul className="mt-1 space-y-0.5">{due.map((d) => <li key={d.r.id + d.m}>• {d.r.name} – {$(d.r.amount)} – {d.date.split('-').reverse().join('/')}</li>)}</ul>
              <button onClick={postDue} className={`${btn} mt-3`}>Ghi {due.length} khoản vào sổ</button>
            </div>)}
          <DataTable heads={['Khoản chi', 'Nhóm', 'Mỗi tháng', 'Ngày', 'Tài khoản', 'Từ tháng', 'Trạng thái', '']} empty="Chưa có khoản định kỳ nào. Thêm tiền thuê chỗ, internet… để biết điểm hòa vốn.">
            {recurring.map((x) => (
              <tr key={x.id} className={x.active ? '' : 'opacity-50'}><td className={`${td} font-medium text-white`}>{x.name}</td><td className={td}>{x.cat}</td><td className={td}>{$(x.amount)}</td><td className={td}>Ngày {x.day}</td><td className={td}>{accountLabel(x.account)}</td><td className={td}>{x.from || '—'}</td><td className={td}>{x.active ? 'Đang chạy' : 'Tạm dừng'}</td>
                <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => setR(x)} className="px-1.5 text-sm text-accent">Sửa</button><button onClick={() => confirm(`Xóa khoản "${x.name}"? Các khoản đã ghi vào sổ vẫn giữ nguyên.`) && setRec((c) => c.filter((y) => y.id !== x.id))} className="px-1.5 text-sm text-zinc-500 hover:text-red-400">Xoá</button></td></tr>))}
          </DataTable>
        </div>)}

      {f && (
        <Modal title={`${f.id ? 'Sửa' : 'Thêm'} ${f.type === 'in' ? 'khoản thu' : 'khoản chi'}`} onClose={() => setF(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} className={inp} /></Field>
            <Field label="Loại"><select value={f.type} onChange={(e) => { set('type', e.target.value); set('cat', CATS[e.target.value][0]) }} className={inp}><option value="in">Thu</option><option value="out">Chi</option></select></Field>
            <Field label="Danh mục"><select value={f.cat} onChange={(e) => set('cat', e.target.value)} className={inp}>{[...new Set([...CATS[f.type], f.cat])].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Tài khoản (tiền vào/ra ở đâu)"><select value={f.account || 'cash'} onChange={(e) => set('account', e.target.value)} className={inp}>{ACCOUNTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Số tiền (đ)"><input type="number" min="0" step="1000" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inp} autoFocus /></Field>
            <Field label="Ghi chú"><input value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
      {r && (
        <Modal title={r.id ? 'Sửa khoản định kỳ' : 'Thêm khoản định kỳ'} onClose={() => setR(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Tên khoản chi"><input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="VD: Thuê mặt bằng, Gói internet" className={inp} autoFocus /></Field></div>
            <Field label="Nhóm"><select value={r.cat} onChange={(e) => setR({ ...r, cat: e.target.value })} className={inp}>{[...FIXED_CATS, 'Bảo trì máy', 'Quảng cáo', 'Khác'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Số tiền mỗi tháng (đ)"><input type="number" min="0" step="1000" value={r.amount} onChange={(e) => setR({ ...r, amount: e.target.value })} className={inp} /></Field>
            <Field label="Ngày trả trong tháng (1–28)"><input type="number" min="1" max="28" value={r.day} onChange={(e) => setR({ ...r, day: e.target.value })} className={inp} /></Field>
            <Field label="Tài khoản"><select value={r.account || 'bank'} onChange={(e) => setR({ ...r, account: e.target.value })} className={inp}>{ACCOUNTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Bắt đầu từ tháng"><input type="month" value={r.from || ''} onChange={(e) => setR({ ...r, from: e.target.value })} className={inp} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-300"><input type="checkbox" checked={r.active} onChange={(e) => setR({ ...r, active: e.target.checked })} className="accent-orange-500" />Đang chạy</label>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={saveRec} className={btn}>Lưu</button><button onClick={() => setR(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
    </div>
  )
}
