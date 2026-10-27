import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVND as $ } from '../../data/products.js'
import { copyText } from '../../lib/clipboard.js'
import { uid, useStore } from '../../lib/store.js'
import { num } from '../../lib/workshop.js'
import { rulesOf } from '../../lib/rules.js'
import { KIND_LABEL, logMoves, prodMove, reorderList, reorderText, stockMove } from '../../lib/warehouse.js'
import { safeUrl } from '../../components/OrderTracking.jsx'
import { Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'
import { Card } from './wui.jsx'

const fmtG = (g) => (g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${Math.round(g)} g`)
const fmtDays = (d) => (d == null ? '—' : d > 365 ? '> 1 năm' : `~${Math.max(0, Math.round(d))} ngày`)

/** Tổng quan kho: số liệu nhanh, danh sách CẦN MUA (dự báo ngày hết theo lượng dùng 30 ngày), nhập thành phẩm tự trừ nhựa, nhà cung cấp, nhật ký gần đây. */
export default function AdminWarehouse() {
  const [ws] = useStore('ws'), [products, setProducts] = useStore('products'), [, setStock] = useStore('ws'), [moves] = useStore('wmove'), [suppliers, setSup] = useStore('suppliers'), [colors] = useStore('colors'), [st, setSt] = useStore('settings')
  const [prod, setProd] = useState(null), [sup, setSupForm] = useState(null), [supOpen, setSupOpen] = useState(false), [sel, setSel] = useState(null), [msg, setMsg] = useState('')
  const rules = rulesOf(st), min = num(st.stockMinDefault) || 1000
  const fil = ws.filter((s) => s.kind === 'filament'), supplies = ws.filter((s) => s.kind === 'supply')
  const hexOf = (k) => colors.find((c) => c.name === k.split('|')[1])?.hex

  const need = useMemo(() => reorderList({ ws, moves, suppliers, min }), [ws, moves, suppliers, min])
  const chosen = sel || need.map((r) => r.key)
  const lowSup = supplies.filter((s) => s.min > 0 && s.qty <= s.min), lowProd = products.filter((p) => p.active && p.stock <= rules.lowStock)
  const stats = { spools: fil.filter((s) => s.qty > 0).length, grams: fil.reduce((t, s) => t + s.qty, 0), value: fil.reduce((t, s) => t + (s.qty * s.price) / 1000, 0), supVal: supplies.reduce((t, s) => t + s.qty * s.price, 0), prodVal: products.reduce((t, p) => t + p.stock * p.price, 0) }
  const buyCost = need.filter((r) => chosen.includes(r.key)).reduce((t, r) => t + r.cost, 0)
  const copy = (t, ok) => copyText(t).then((done) => setMsg(done ? ok : 'Không copy được. Hãy bôi đen nội dung và copy thủ công.'))

  /* ---- Nhập thành phẩm ---- */
  const openProd = (p) => setProd({ pid: p?.id || products.find((x) => x.active)?.id || '', qty: 10, spool: '', grams: '', deduct: true })
  const cur = prod && products.find((p) => p.id === prod.pid)
  const spoolOptions = cur ? [...fil].filter((s) => s.qty > 0).sort((a, b) => ((a.material === cur.material ? 0 : 1) - (b.material === cur.material ? 0 : 1)) || a.qty - b.qty) : []
  const gPer = prod ? (prod.grams === '' ? num(cur?.grams) : num(prod.grams)) : 0, needG = gPer * num(prod?.qty), sp = prod && fil.find((s) => s.id === prod.spool)
  const doProd = () => {
    const q = Math.round(num(prod.qty)); if (!cur || q < 1) return alert('Chọn sản phẩm và nhập số lượng ≥ 1.')
    const moves = [prodMove(cur, q, 'Sản xuất thành phẩm', cur.stock + q, { note: `In thêm ${q} cái` })]
    if (prod.deduct && sp && needG > 0) {
      if (needG > sp.qty && !confirm(`Cần ${Math.round(needG)}g nhưng cuộn "${sp.name}" chỉ còn ${Math.round(sp.qty)}g. Vẫn ghi nhận (cuộn về 0)?`)) return
      setStock((c) => c.map((s) => (s.id === sp.id ? { ...s, qty: Math.max(0, s.qty - needG) } : s)))
      moves.push(stockMove(sp, -Math.min(sp.qty, needG), 'Xuất cho đơn xưởng', Math.max(0, sp.qty - needG), { note: `Sản xuất ${q} × ${cur.name}`, ref: cur.id }))
    }
    setProducts((c) => c.map((p) => (p.id === cur.id ? { ...p, stock: p.stock + q } : p))); logMoves(moves)
    setMsg(`Đã nhập ${q} × ${cur.name} vào kho thành phẩm${prod.deduct && sp && needG > 0 ? ` và trừ ${Math.round(needG)}g nhựa` : ''}.`); setProd(null)
  }

  /* ---- Nhà cung cấp ---- */
  const saveSup = () => {
    if (!sup.name.trim()) return alert('Nhập tên nhà cung cấp.')
    if (sup.link && !safeUrl(sup.link)) return alert('Link phải bắt đầu bằng https://')
    const e = { ...sup, name: sup.name.trim(), link: sup.link ? safeUrl(sup.link) : '' }
    setSup((c) => (e.id ? c.map((x) => (x.id === e.id ? e : x)) : [...c, { ...e, id: uid('sup') }])); setSupForm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Tổng quan kho</h1>
        <button onClick={() => openProd()} className={btn}>Nhập thành phẩm</button>
        <button onClick={() => setSupOpen(true)} className={btn2}>Nhà cung cấp ({suppliers.length})</button>
        <Link to="/admin/stocktake" className={btn2}>Kiểm kho</Link>
      </div>
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[['Cuộn nhựa còn', `${stats.spools} cuộn`, `${fmtG(stats.grams)}`, ''], ['Giá trị nhựa', $(stats.value), 'theo giá nhập', ''], ['Giá trị vật tư', $(stats.supVal), `${supplies.length} loại`, ''], ['Thành phẩm tồn', $(stats.prodVal), 'theo giá bán', ''], ['Cần mua / bổ sung', need.length + lowSup.length + lowProd.length, `${need.length} nhựa · ${lowSup.length} vật tư · ${lowProd.length} thành phẩm`, need.length + lowSup.length + lowProd.length ? 'text-amber-300' : '']].map(([l, v, sub, c]) => (
          <div key={l} className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${c || 'text-white'}`}>{v}</p><p className="text-[11px] text-zinc-500">{sub}</p></div>))}
      </div>

      <Card title="Nhựa cần mua">
        <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="text-zinc-400">Tồn tối thiểu mỗi loại/màu (g)<input type="number" min="0" step="100" defaultValue={min} onBlur={(e) => num(e.target.value) !== min && setSt({ ...st, stockMinDefault: Math.max(0, num(e.target.value)) })} className={`${inp} mt-1 w-32`} /></label>
          <p className="max-w-xl text-xs text-zinc-500">Cần mua khi tổng nhựa của một loại/màu (cộng mọi hãng) thấp hơn mức này, hoặc dự kiến hết trong chưa tới 14 ngày theo lượng đã dùng 30 ngày qua (từ nhật ký xuất kho).</p>
        </div>
        {need.length === 0 ? <p className="text-sm text-emerald-400">✓ Nhựa đang đủ: mọi loại/màu đều trên mức tối thiểu và chưa có loại nào sắp hết trong 14 ngày.</p> : (
          <>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs text-zinc-500"><tr><th className="py-2" /><th>Loại / màu</th><th>Còn</th><th>Dùng/ngày</th><th>Dự kiến hết</th><th>Đề xuất mua</th><th>Hãng gợi ý · NCC</th><th className="text-right">Ước tính</th></tr></thead><tbody>
              {need.map((r) => (
                <tr key={r.key} className="border-t border-white/5">
                  <td className="py-2"><input type="checkbox" aria-label={`Chọn ${r.label}`} checked={chosen.includes(r.key)} onChange={(e) => setSel(e.target.checked ? [...chosen, r.key] : chosen.filter((k) => k !== r.key))} className="accent-orange-500" /></td>
                  <td className="text-white"><span className="mr-2 inline-block h-3 w-3 rounded-full border border-white/30 align-middle" style={{ background: hexOf(r.key) || '#4b5563' }} />{r.label}</td>
                  <td>{fmtG(r.total)}<small className="block text-zinc-500">{r.spools} cuộn</small></td><td>{r.perDay > 0 ? `${Math.round(r.perDay)} g` : '—'}</td>
                  <td className={r.daysLeft != null && r.daysLeft < 7 ? 'font-semibold text-red-300' : r.daysLeft != null && r.daysLeft < 14 ? 'text-amber-300' : ''}>{fmtDays(r.daysLeft)}</td>
                  <td><b className="text-white">{r.buy} cuộn</b></td><td>{r.brand || '—'}{r.supplier && <small className="block text-zinc-500">{r.supplier.name}{r.supplier.contact && ` · ${r.supplier.contact}`}</small>}</td>
                  <td className="text-right">{r.cost ? $(r.cost) : '—'}</td></tr>))}
            </tbody></table></div>
            <div className="mt-3 flex flex-wrap items-center gap-3"><button disabled={!chosen.length} onClick={() => copy(reorderText(need.filter((r) => chosen.includes(r.key)), st.storeName), 'Đã copy danh sách đặt hàng – dán vào Zalo gửi nhà cung cấp.')} className={btn}>Copy danh sách đặt hàng</button><span className="text-sm text-zinc-400">Ước tính cần chi: <b className="text-white">{$(buyCost)}</b></span></div>
          </>)}
        {(lowSup.length > 0 || lowProd.length > 0) && (
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
            <div><p className="mb-1 text-zinc-400">Vật tư sắp hết</p>{lowSup.length ? <ul className="space-y-0.5">{lowSup.map((s) => <li key={s.id} className="text-amber-200">• {s.name}: còn {s.qty} {s.unit}</li>)}</ul> : <p className="text-zinc-600">—</p>}</div>
            <div><p className="mb-1 text-zinc-400">Thành phẩm sắp hết</p>{lowProd.length ? <ul className="space-y-0.5">{lowProd.map((p) => <li key={p.id} className="flex items-center gap-2 text-amber-200">• {p.name}: còn {p.stock}<button onClick={() => openProd(p)} className="text-xs text-accent hover:underline">nhập thêm</button></li>)}</ul> : <p className="text-zinc-600">—</p>}</div>
          </div>)}
      </Card>

      <Card title="Hoạt động kho gần đây">
        {moves.length === 0 ? <p className="text-sm text-zinc-500">Chưa có ghi nhận nào. Từ giờ mỗi lần nhập kho, trừ nhựa cho đơn, in lỗi, kiểm kho… đều được ghi lại ở đây.</p> : (
          <ul className="space-y-1.5 text-sm">{[...moves].reverse().slice(0, 8).map((m) => <li key={m.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-ink-900 px-3 py-2"><span className="text-zinc-500">{new Date(m.t).toLocaleString('vi-VN')}</span><span className="text-white">{m.name}</span><span className={m.delta > 0 ? 'text-emerald-400' : 'text-red-300'}>{m.delta > 0 ? '+' : ''}{m.delta} {m.unit}</span><span className="text-zinc-400">{m.reason}</span><span className="ml-auto text-xs text-zinc-500">{KIND_LABEL[m.kind]}</span></li>)}</ul>)}
        <Link to="/admin/warehouse-log" className="mt-3 inline-block text-sm text-accent">Xem toàn bộ lịch sử →</Link>
      </Card>

      {prod && (
        <Modal title="Nhập thành phẩm (in sẵn để bán)" onClose={() => setProd(null)}>
          <div className="space-y-3 text-sm">
            <Field label="Sản phẩm"><select value={prod.pid} onChange={(e) => setProd({ ...prod, pid: e.target.value, grams: '' })} className={inp}>{products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} (tồn {p.stock})</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Số lượng in thêm"><input type="number" min="1" value={prod.qty} onChange={(e) => setProd({ ...prod, qty: e.target.value })} className={inp} /></Field>
              <Field label="Nhựa mỗi cái (g)"><input type="number" min="0" value={prod.grams === '' ? cur?.grams || 0 : prod.grams} onChange={(e) => setProd({ ...prod, grams: e.target.value })} className={inp} /></Field></div>
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={prod.deduct} onChange={(e) => setProd({ ...prod, deduct: e.target.checked })} className="accent-orange-500" />Trừ nhựa khỏi cuộn trong kho</label>
            {prod.deduct && <Field label="Cuộn nhựa đã dùng"><select value={prod.spool} onChange={(e) => setProd({ ...prod, spool: e.target.value })} className={inp}><option value="">— chưa chọn (không trừ) —</option>{spoolOptions.map((s) => <option key={s.id} value={s.id}>{[s.brand, s.name].filter(Boolean).join(' ')} · {s.material || '?'} {s.color || ''} (còn {Math.round(s.qty)}g)</option>)}</select></Field>}
            <p className="rounded-lg bg-ink-900 p-3 text-zinc-300">Sau khi ghi: tồn kho <b className="text-white">{cur ? cur.stock : 0} → {cur ? cur.stock + Math.round(num(prod.qty)) : 0}</b> cái{prod.deduct && sp && needG > 0 && <> · cuộn "{sp.name}" <b className="text-white">{Math.round(sp.qty)}g → {Math.max(0, Math.round(sp.qty - needG))}g</b></>}{prod.deduct && !sp && needG > 0 && <span className="text-amber-300"> · chưa chọn cuộn nên sẽ không trừ nhựa</span>}</p>
            <div className="flex justify-end gap-2"><button onClick={() => setProd(null)} className={btn2}>Hủy</button><button onClick={doProd} className={btn}>Ghi nhận</button></div>
          </div>
        </Modal>)}

      {supOpen && (
        <Modal title="Nhà cung cấp" onClose={() => { setSupOpen(false); setSupForm(null) }} wide>
          <div className="space-y-4 text-sm">
            <ul className="space-y-2">{suppliers.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-900 p-3"><div className="min-w-0 flex-1"><b className="text-white">{s.name}</b>{s.brands && <span className="ml-2 text-xs text-zinc-400">Hãng: {s.brands}</span>}<p className="text-xs text-zinc-500">{[s.contact, s.note].filter(Boolean).join(' · ')}</p></div>
                {safeUrl(s.link) && <a href={safeUrl(s.link)} target="_blank" rel="noopener noreferrer" className="text-accent">Mở link</a>}
                <button onClick={() => setSupForm(s)} className="text-accent">Sửa</button><button onClick={() => confirm(`Xóa nhà cung cấp "${s.name}"?`) && setSup((c) => c.filter((x) => x.id !== s.id))} className="text-zinc-500 hover:text-red-400">Xóa</button></li>))}
              {suppliers.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-5 text-center text-zinc-500">Chưa có nhà cung cấp. Thêm để danh sách "Nhựa cần mua" gợi ý nơi đặt.</li>}</ul>
            {sup ? (
              <fieldset className="space-y-3 rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">{sup.id ? 'Sửa' : 'Thêm'} nhà cung cấp</legend>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="Tên"><input value={sup.name} onChange={(e) => setSupForm({ ...sup, name: e.target.value })} className={inp} autoFocus /></Field><Field label="Liên hệ (SĐT / Zalo)"><input value={sup.contact || ''} onChange={(e) => setSupForm({ ...sup, contact: e.target.value })} className={inp} /></Field>
                  <Field label="Hãng nhựa họ bán (cách nhau bằng dấu phẩy)"><input value={sup.brands || ''} onChange={(e) => setSupForm({ ...sup, brands: e.target.value })} placeholder="eSUN, Polymaker" className={inp} /></Field><Field label="Link cửa hàng (tùy chọn)"><input value={sup.link || ''} onChange={(e) => setSupForm({ ...sup, link: e.target.value })} placeholder="https://…" className={inp} /></Field>
                  <div className="sm:col-span-2"><Field label="Ghi chú"><input value={sup.note || ''} onChange={(e) => setSupForm({ ...sup, note: e.target.value })} placeholder="Giá tốt khi mua 5 cuộn, giao 2 ngày…" className={inp} /></Field></div></div>
                <div className="flex gap-2"><button onClick={saveSup} className={btn}>Lưu</button><button onClick={() => setSupForm(null)} className={btn2}>Hủy</button></div></fieldset>
            ) : <button onClick={() => setSupForm({ name: '', contact: '', brands: '', link: '', note: '' })} className={btn}>+ Thêm nhà cung cấp</button>}
          </div>
        </Modal>)}
    </div>
  )
}
