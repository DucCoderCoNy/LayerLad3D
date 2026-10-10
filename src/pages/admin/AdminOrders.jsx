import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Download, FileBox, MessageCircle } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { supa, useStore } from '../../lib/store.js'
import { downloadCSV, printSlips } from '../../lib/export.js'
import { addWorkshopOrder } from '../../lib/bridge.js'
import { deductForOrder, restoreForOrder, usageOf } from '../../lib/filament.js'
import { dayKey, inRange } from '../../lib/finance.js'
import ManualOrder from './ManualOrder.jsx'
import { safeUrl } from '../../components/OrderTracking.jsx'
import { PAY_METHODS, addPayment, dueOf, methodLabel, paidOf, resync } from '../../lib/receivables.js'
import { needsPriceConfirm, orderCost, templates, zaloLink } from '../../lib/orderTools.js'
import { SHIPPING_PROVIDERS } from '../../lib/payments.js'
import DateRange from '../../components/DateRange.jsx'
import { Badge, DataTable, FLOW, Modal, ORDER_STATUS, PAY_STATUS, btn, btn2, inp, payStatusOf, td } from '../../components/ui.jsx'

const PAGE = 20

export default function AdminOrders() {
  const [orders, setOrders] = useStore('orders'), [products, setProducts] = useStore('products'), [st] = useStore('settings')
  const [sp] = useSearchParams(), [wset] = useStore('wset'), [stock] = useStore('ws')
  const [sel, setSel] = useState(null), [filter, setFilter] = useState(sp.get('status') || ''), [payF, setPayF] = useState(sp.get('pay') || ''), [need, setNeed] = useState(sp.get('need') === 'price'), [pick, setPick] = useState([]), [manual, setManual] = useState(false), [bulk, setBulk] = useState(''), [q, setQ] = useState(''), [range, setRange] = useState(['', '']), [page, setPage] = useState(1), [msg, setMsg] = useState('')
  const o = orders.find((x) => x.id === sel)
  const createManual = (n) => { // trừ tồn kho cho sản phẩm chọn từ kho, rồi thêm đơn vào đầu danh sách
    setProducts((c) => c.map((p) => { const q = n.items.filter((i) => i.id === p.id).reduce((t, i) => t + i.qty, 0); return q ? { ...p, stock: Math.max(0, p.stock - q) } : p }))
    setOrders((c) => [n, ...c]); setManual(false); setSel(n.id); setMsg('Đã tạo đơn. Khách tra cứu được bằng mã đơn + số điện thoại.')
  }
  const patch = (id, d) => setOrders((c) => c.map((x) => (x.id === id ? { ...x, ...d } : x)))
  /** Ghi lịch sử thao tác của đơn (ai/lúc nào/đổi gì) */
  const hist = (o, text) => [...(o.history || []), { t: Date.now(), text }].slice(-50)
  const qtyOf = (o, id) => o.items.filter((i) => i.id === id).reduce((n, i) => n + i.qty, 0)

  /** Đổi trạng thái đơn.
   *  - Hủy: cộng lại tồn kho; khôi phục: trừ lại.  - Hoàn thành: tự trừ nhựa trong kho (1 lần).  - Rời khỏi Hoàn thành/Hủy: hoàn lại nhựa đã trừ. */
  const setStatus = (o, status) => {
    const d = { status, history: hist(o, `Trạng thái: ${ORDER_STATUS[o.status]?.[0]} → ${ORDER_STATUS[status]?.[0]}`) }
    if (status === 'cancelled' && !o.restocked) { setProducts((c) => c.map((p) => (qtyOf(o, p.id) ? { ...p, stock: p.stock + qtyOf(o, p.id) } : p))); d.restocked = true }
    if (status !== 'cancelled' && o.restocked) { setProducts((c) => c.map((p) => (qtyOf(o, p.id) ? { ...p, stock: Math.max(0, p.stock - qtyOf(o, p.id)) } : p))); d.restocked = false }
    if (o.deducted && status !== 'done') { restoreForOrder(o); d.deducted = false; d.deductLog = [] }
    if (status === 'done' && !o.deducted) {
      const r = deductForOrder(o); d.deducted = r.log.length > 0; d.deductLog = r.log
      const used = r.log.reduce((s, l) => s + l.g, 0)
      setMsg([used ? `Đã trừ ${used}g nhựa khỏi kho.` : usageOf(o, products).length ? '' : 'Đơn này không khai báo lượng nhựa nên không trừ kho.', r.missing.length ? `Không tìm được cuộn phù hợp: ${r.missing.join('; ')}. Hãy kiểm tra Kho nhựa.` : ''].filter(Boolean).join(' '))
    } else setMsg('')
    if (status === 'done' && payStatusOf(o) === 'unpaid' && o.customer?.payment === 'cod') setMsg((m) => (m + ' Đơn COD đã hoàn thành: nhớ đánh dấu "Đã thanh toán" khi nhận tiền.').trim())
    patch(o.id, d)
  }
  /** Đổi nhanh trạng thái thanh toán: "Đã thanh toán" = ghi nhận thu nốt phần còn thiếu; "Chưa thanh toán"/"Hoàn tiền" = xóa số đã thu (có ghi bút toán đảo để còn dấu vết) */
  const setPay = (o, ps) => {
    const from = PAY_STATUS[payStatusOf(o)][0], h = (t) => hist(o, `Thanh toán: ${from} → ${PAY_STATUS[ps][0]}${t || ''}`)
    if (ps === 'paid') return patch(o.id, { ...addPayment(o, { amount: dueOf(o), method: o.customer?.payment === 'bank' ? 'bank' : 'cod', note: 'Đánh dấu đã thanh toán' }), history: h() })
    const back = paidOf(o) > 0 ? [...(o.payments || []), { t: Date.now(), amount: -paidOf(o), method: 'other', note: ps === 'refunded' ? 'Hoàn tiền' : 'Đặt lại chưa thanh toán' }] : o.payments
    patch(o.id, { payStatus: ps, paid: false, paidAmount: 0, payments: back, history: h() })
  }
  const pay = (o, p) => { const amt = Math.round(+p.amount || 0); if (!amt) return; patch(o.id, { ...addPayment(o, p), history: hist(o, `${amt > 0 ? 'Thu' : 'Hoàn'} ${formatVND(Math.abs(amt))} (${methodLabel(p.method)})${p.note ? ` – ${p.note}` : ''}`) }) }
  const discount = (o, v, note) => { const d = Math.max(0, Math.round(+v || 0)), total = Math.max(0, (o.subtotal || 0) + (o.ship || 0) - d); patch(o.id, { discount: d, discountNote: note.trim().slice(0, 120), total, ...resync(o, total), history: hist(o, `Giảm giá ${formatVND(d)}${note ? ` (${note})` : ''} → tổng ${formatVND(total)}`) }) }
  /** Xác nhận giá chốt cho món in theo yêu cầu sau khi đã kiểm tra file; tính lại tổng đơn (giữ nguyên phí ship) */
  const confirmPrice = (o, idx, price) => {
    const v = Math.max(0, Math.round(+price || 0)); if (!v) return
    const items = o.items.map((i, k) => (k === idx ? { ...i, price: v, cfg: { ...i.cfg, estimate: false } } : i)), subtotal = items.reduce((t, i) => t + i.price * i.qty, 0)
    const total = Math.max(0, subtotal + (o.ship || 0) - (o.discount || 0))
    patch(o.id, { items, subtotal, total, ...resync(o, total), history: hist(o, `Chốt giá "${o.items[idx].name}": ${formatVND(o.items[idx].price)} → ${formatVND(v)} / sp`) })
  }
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => setMsg('Đã copy tin nhắn – dán vào Zalo/Messenger.'), () => setMsg('Không copy được, hãy bôi đen và copy thủ công.'))
  const bulkSet = () => { if (!bulk || !pick.length || !confirm(`Đổi ${pick.length} đơn sang "${ORDER_STATUS[bulk][0]}"?`)) return; orders.filter((x) => pick.includes(x.id) && x.status !== bulk).forEach((x) => setStatus(x, bulk)); setPick([]); setBulk('') }

  const shown = useMemo(() => orders.filter((x) => (!filter || x.status === filter) && (!payF || payStatusOf(x) === payF) && (!need || needsPriceConfirm(x)) && inRange(dayKey(x.createdAt), range[0], range[1])
    && (!q.trim() || `${x.id} ${x.customer?.name} ${x.customer?.phone}`.toLowerCase().includes(q.trim().toLowerCase()))), [orders, filter, payF, need, range, q])
  const pages = Math.max(1, Math.ceil(shown.length / PAGE)), cur = Math.min(page, pages)
  const dl = async (path) => { if (!supa) return alert('Chế độ demo (1 máy) không lưu file thật'); const { data, error } = await supa.storage.from('stl-files').createSignedUrl(path, 300); error ? alert(error.message) : window.open(data.signedUrl) }

  const exportXls = () => downloadCSV('don-hang.csv', [['Mã', 'Ngày', 'Khách', 'SĐT', 'Địa chỉ', 'Sản phẩm', 'Thanh toán', 'TT thanh toán', 'Phí ship', 'Giảm giá', 'Tổng', 'Đã thu', 'Còn lại', 'Trạng thái', 'Mã vận đơn'],
    ...shown.map((x) => [x.id, new Date(x.createdAt).toLocaleDateString('vi-VN'), x.customer.name, x.customer.phone, x.customer.address, x.items.map((i) => `${i.name} (${i.color}) x${i.qty}`).join('; '), x.customer.payment === 'bank' ? 'Chuyển khoản' : 'COD', PAY_STATUS[payStatusOf(x)][0], x.ship, x.discount || 0, x.total, paidOf(x), dueOf(x), ORDER_STATUS[x.status]?.[0] || x.status, x.trackingCode || ''])])
  const toWorkshop = (o) => { addWorkshopOrder({ src: 'Website', cust: o.customer.name, name: o.items.map((i) => `${i.name} ×${i.qty}`).join(', '), colors: [...new Set(o.items.map((i) => i.color))].join(', '), g: Math.round(o.items.reduce((s, i) => s + (i.cfg?.grams || 0) * i.qty, 0)), h: +o.items.reduce((s, i) => s + (i.cfg?.hours || 0) * i.qty, 0).toFixed(1), price: o.total, paid: payStatusOf(o) === 'paid' ? o.total : 0, status: payStatusOf(o) === 'paid' ? 'Đã cọc' : 'Chờ in', note: `Đơn web ${o.id} · ${o.customer.phone}` }); patch(o.id, { wo: true }) }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Đơn hàng</h1>
        <div className="flex flex-wrap gap-2"><button onClick={() => setManual(true)} className={btn}>+ Tạo đơn thủ công</button><button onClick={() => printSlips(shown, st)} className={btn2}>In phiếu giao ({shown.length})</button><button onClick={exportXls} className={btn2}>Xuất Excel (CSV)</button></div>
      </div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-4">
        <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} />
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Tìm mã đơn / tên / SĐT" className={`${inp} w-60`} />
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1) }} className={`${inp} w-48`}><option value="">Mọi trạng thái đơn</option>{Object.entries(ORDER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={payF} onChange={(e) => { setPayF(e.target.value); setPage(1) }} className={`${inp} w-52`}><option value="">Mọi trạng thái thanh toán</option>{Object.entries(PAY_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={need} onChange={(e) => { setNeed(e.target.checked); setPage(1) }} className="accent-orange-500" />Chỉ đơn cần xác nhận giá in</label>
        </div>
      </div>
      {pick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <b className="text-white">Đã chọn {pick.length} đơn</b>
          <select value={bulk} onChange={(e) => setBulk(e.target.value)} className={`${inp} w-48`}><option value="">Đổi trạng thái sang…</option>{[...FLOW, 'cancelled'].map((k) => <option key={k} value={k}>{ORDER_STATUS[k][0]}</option>)}</select>
          <button onClick={bulkSet} disabled={!bulk} className={btn}>Áp dụng</button><button onClick={() => printSlips(orders.filter((x) => pick.includes(x.id)), st)} className={btn2}>In phiếu giao</button><button onClick={() => setPick([])} className="ml-auto text-zinc-400">Bỏ chọn</button>
        </div>)}
      <DataTable heads={['', 'Mã', 'Ngày', 'Khách', 'Thanh toán', 'Tổng', 'Trạng thái đơn']} empty="Không có đơn nào trong bộ lọc">
        {shown.slice((cur - 1) * PAGE, cur * PAGE).map((x) => (
          <tr key={x.id} onClick={() => { setSel(x.id); setMsg('') }} className="cursor-pointer">
            <td className={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Chọn ${x.id}`} checked={pick.includes(x.id)} onChange={(e) => setPick((c) => (e.target.checked ? [...c, x.id] : c.filter((y) => y !== x.id)))} className="accent-orange-500" /></td>
            <td className={`${td} font-medium text-white`}>{x.id}{needsPriceConfirm(x) && <span className="ml-1 rounded bg-amber-500/20 px-1.5 text-[10px] text-amber-300">cần chốt giá</span>}{x.items.some((i) => i.cfg?.filePath) && <FileBox size={14} className="ml-1 inline text-neon" aria-label="Có file STL/3MF" />}</td>
            <td className={td}>{new Date(x.createdAt).toLocaleDateString('vi-VN')}</td><td className={td}>{x.customer.name}</td>
            <td className={td}>{x.customer.payment === 'bank' ? 'CK' : 'COD'} · <Badge map={PAY_STATUS} v={payStatusOf(x)} />{dueOf(x) > 0 && paidOf(x) > 0 && <small className="block text-amber-300">còn {formatVND(dueOf(x))}</small>}</td>
            <td className={td}>{formatVND(x.total)}</td><td className={td}><Badge map={ORDER_STATUS} v={x.status} /></td></tr>))}
      </DataTable>
      {pages > 1 && <div className="flex items-center justify-center gap-3 text-sm"><button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className={btn2}>‹</button>Trang {cur}/{pages} ({shown.length} đơn)<button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className={btn2}>›</button></div>}
      {manual && <ManualOrder onClose={() => setManual(false)} onCreate={createManual} />}
      {o && (
        <Modal title={`Đơn ${o.id}${o.manual ? ` · ${o.source || 'thủ công'}` : ''}`} onClose={() => setSel(null)} wide>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-ink-900 p-3 text-zinc-300">{o.customer.name} · {o.customer.phone}<br />{o.customer.address}{o.customer.note && <><br /><i className="text-zinc-500">Ghi chú: {o.customer.note}</i></>}</div>
            <ul className="space-y-3">{o.items.map((i, k) => (
              <li key={i.key || k}>
                <div className="flex justify-between"><span>{i.name} ({i.color}) × {i.qty}</span><span>{formatVND(i.price * i.qty)}</span></div>
                {i.cfg?.material && (
                  <div className="mt-1 rounded-lg bg-ink-900 p-2 text-xs text-zinc-400">
                    {i.cfg.material} · layer {i.cfg.layer}mm · infill {i.cfg.infill}% · ~{i.cfg.grams}g · ~{i.cfg.hours}h / sp{i.cfg.dims?.length ? ` · ${i.cfg.dims.join('×')}mm` : ''}{i.cfg.design && ' · cần thiết kế'}
                    {i.cfg.estimate ? <span className="ml-1 text-amber-300">(giá ước tính – cần xác nhận)</span> : <span className="ml-1 text-emerald-400">(đã chốt giá)</span>}{i.cfg.note && <><br /><i>Ghi chú: {i.cfg.note}</i></>}
                    {i.cfg.estimate && <span className="mt-2 flex items-center gap-2"><input type="number" step="1000" id={`cp-${o.id}-${k}`} defaultValue={i.price} aria-label="Giá chốt mỗi sản phẩm" className={`${inp} w-32`} /><button onClick={() => confirmPrice(o, k, document.getElementById(`cp-${o.id}-${k}`).value)} className={btn}>Chốt giá / sp</button></span>}
                    {i.cfg.filePath && <button onClick={() => dl(i.cfg.filePath)} className="mt-2 flex items-center gap-1 text-neon"><Download size={14} />Tải {i.cfg.fileName || 'file'} ({(i.cfg.fileSize / 1048576).toFixed(1)} MB)</button>}
                  </div>)}
              </li>))}</ul>
            <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white"><span>Tổng (gồm ship {formatVND(o.ship)}{o.discount > 0 && `, giảm ${formatVND(o.discount)}`})</span><span className="text-accent">{formatVND(o.total)}</span></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-zinc-400">Trạng thái đơn
                <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className={`${inp} mt-1`}>{[...FLOW, 'cancelled'].map((k) => <option key={k} value={k}>{ORDER_STATUS[k][0]}</option>)}</select></label>
              <label className="text-zinc-400">Trạng thái thanh toán <span className="text-zinc-600">(tách riêng)</span>
                <select value={payStatusOf(o)} onChange={(e) => setPay(o, e.target.value)} className={`${inp} mt-1`}>{Object.entries(PAY_STATUS).filter(([k]) => k !== 'partial' || payStatusOf(o) === 'partial').map(([k, [l]]) => <option key={k} value={k} disabled={k === 'partial'}>{l}</option>)}</select></label>
            </div>
            <PayPanel key={o.id + paidOf(o) + (o.discount || 0) + o.total} o={o} onPay={(p) => pay(o, p)} onDiscount={(v, n) => discount(o, v, n)} />
            <ShipForm key={o.id + (o.shippedAt || '')} o={o} onSave={(d) => { patch(o.id, { ...d, shippedAt: Date.now(), history: hist(o, `Vận chuyển: ${d.shipProvider || '—'} · mã ${d.trackingCode || '—'}`) }); setMsg('Đã lưu thông tin vận chuyển – khách thấy ngay trong Tài khoản và Tra cứu đơn.') }} />
            {(() => { const c = orderCost(o, products, wset, stock); return c && <p className="rounded-lg bg-ink-900 p-3 text-xs text-zinc-400">Giá vốn ước tính (nhựa + máy + đóng gói){c.partial ? ', chỉ phần món có khai báo gram' : ''}: <b className="text-zinc-200">{formatVND(c.cost)}</b> · Lãi gộp ước tính (chưa tính ship): <b className={c.profit < 0 ? 'text-red-400' : 'text-emerald-400'}>{formatVND(c.profit)}</b>{c.profit < 0 && ' – đơn đang lỗ!'}</p> })()}
            <details className="rounded-lg bg-ink-900 p-3">
              <summary className="cursor-pointer text-zinc-300">Tin nhắn mẫu gửi khách</summary>
              <div className="mt-3 space-y-3">{templates(o, st).map((t) => (
                <div key={t.label}><div className="mb-1 flex items-center gap-2"><b className="text-white">{t.label}</b><button onClick={() => copy(t.text)} className="flex items-center gap-1 text-xs text-neon"><Copy size={12} />Copy</button></div><p className="whitespace-pre-line rounded bg-ink-800 p-2 text-xs text-zinc-400">{t.text}</p></div>))}
                <a href={zaloLink(o.customer.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent"><MessageCircle size={14} />Mở Zalo của khách ({o.customer.phone})</a></div>
            </details>
            {msg && <p className="rounded-lg bg-accent/10 p-3 text-accent">{msg}</p>}
            {o.deducted && <p className="text-xs text-zinc-500">Đã trừ nhựa: {o.deductLog?.map((l) => `${l.name} −${l.g}g`).join(', ')}</p>}
            {o.history?.length > 0 && <details className="text-xs text-zinc-500"><summary className="cursor-pointer">Lịch sử đơn ({o.history.length})</summary><ul className="mt-2 space-y-1">{[...o.history].reverse().map((h, k) => <li key={k}>{new Date(h.t).toLocaleString('vi-VN')} – {h.text}</li>)}</ul></details>}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => printSlips([o], st)} className={btn2}>In phiếu giao</button>
              <button disabled={o.wo} onClick={() => toWorkshop(o)} className={btn2}>{o.wo ? 'Đã chuyển sang xưởng' : 'Tạo đơn xưởng'}</button>
              <button onClick={() => confirm('Xóa đơn này?') && (setOrders((c) => c.filter((x) => x.id !== o.id)), setSel(null))} className={`${btn2} ml-auto text-red-400`}>Xóa đơn</button>
            </div>
          </div>
        </Modal>)}
    </div>
  )
}

/** Nhập thông tin vận chuyển để khách theo dõi: đơn vị, mã vận đơn, link tra cứu của đơn vị vận chuyển, ghi chú hiển thị cho khách */
function ShipForm({ o, onSave }) {
  const [f, setF] = useState({ shipProvider: o.shipProvider || '', trackingCode: o.trackingCode || '', trackingUrl: o.trackingUrl || '', shipNote: o.shipNote || '' })
  const [err, setErr] = useState(''), set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const save = () => {
    const url = f.trackingUrl.trim()
    if (url && !safeUrl(url)) return setErr('Link theo dõi phải bắt đầu bằng http:// hoặc https://')
    setErr(''); onSave({ shipProvider: f.shipProvider, trackingCode: f.trackingCode.trim(), trackingUrl: url ? safeUrl(url) : '', shipNote: f.shipNote.trim().slice(0, 300) })
  }
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 p-3">
      <legend className="px-2 text-zinc-300">Vận chuyển (khách xem được)</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-zinc-400">Đơn vị vận chuyển<select value={f.shipProvider} onChange={(e) => set('shipProvider', e.target.value)} className={`${inp} mt-1`}>{SHIPPING_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label className="text-zinc-400">Mã vận đơn<input value={f.trackingCode} onChange={(e) => set('trackingCode', e.target.value)} className={`${inp} mt-1`} /></label>
        <label className="text-zinc-400 sm:col-span-2">Link theo dõi đơn của đơn vị vận chuyển (dán link họ gửi cho bạn)<input value={f.trackingUrl} onChange={(e) => set('trackingUrl', e.target.value)} placeholder="https://…" className={`${inp} mt-1`} /></label>
        <label className="text-zinc-400 sm:col-span-2">Ghi chú cho khách (tùy chọn)<input value={f.shipNote} maxLength={300} onChange={(e) => set('shipNote', e.target.value)} placeholder="VD: Đã bàn giao cho GHN lúc 15:00, dự kiến giao 2–3 ngày" className={`${inp} mt-1`} /></label>
      </div>
      {err && <p className="text-red-400">{err}</p>}
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} className={btn}>Lưu thông tin vận chuyển</button>
        {o.status !== 'shipping' && o.status !== 'done' && o.status !== 'cancelled' && <span className="text-xs text-zinc-500">Nhớ chuyển trạng thái đơn sang "Đang giao" nếu đã gửi hàng.</span>}</div>
    </fieldset>
  )
}

/** Thu tiền (cả đặt cọc / trả nhiều lần) và giảm giá cho đơn */
function PayPanel({ o, onPay, onDiscount }) {
  const due = dueOf(o), [f, setF] = useState({ amount: due || '', method: o.customer?.payment === 'bank' ? 'bank' : 'cash', note: '' }), [d, setD] = useState({ v: o.discount || '', note: o.discountNote || '' })
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 p-3">
      <legend className="px-2 text-zinc-300">Thanh toán & giảm giá</legend>
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-ink-900 p-2"><p className="text-[11px] text-zinc-500">Tổng đơn</p><b className="text-white">{formatVND(o.total)}</b></div><div className="rounded-lg bg-ink-900 p-2"><p className="text-[11px] text-zinc-500">Đã thu</p><b className="text-emerald-400">{formatVND(paidOf(o))}</b></div><div className="rounded-lg bg-ink-900 p-2"><p className="text-[11px] text-zinc-500">Còn lại</p><b className={due > 0 ? 'text-amber-300' : 'text-zinc-400'}>{formatVND(due)}</b></div></div>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="text-zinc-400 sm:col-span-1">Số tiền thu<input type="number" step="1000" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-zinc-400">Hình thức<select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className={`${inp} mt-1`}>{PAY_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-zinc-400">Ghi chú<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="VD: cọc 50%" className={`${inp} mt-1`} /></label>
        <button type="button" onClick={() => onPay(f)} className={`${btn} self-end`}>Ghi nhận thu</button>
      </div>
      <p className="text-[11px] text-zinc-500">Nhập số âm để ghi hoàn lại / chỉnh sai. Thu đủ thì đơn tự chuyển "Đã thanh toán", thu một phần là "Đã đặt cọc".</p>
      {o.payments?.length > 0 && <ul className="space-y-0.5 text-xs text-zinc-500">{[...o.payments].reverse().map((p, i) => <li key={i}>{new Date(p.t).toLocaleString('vi-VN')} · <b className={p.amount < 0 ? 'text-red-300' : 'text-zinc-300'}>{p.amount > 0 ? '+' : ''}{formatVND(p.amount)}</b> · {methodLabel(p.method)}{p.note && ` · ${p.note}`}</li>)}</ul>}
      <div className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4">
        <label className="text-zinc-400">Giảm giá (₫)<input type="number" min="0" step="1000" value={d.v} onChange={(e) => setD({ ...d, v: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="text-zinc-400 sm:col-span-2">Lý do<input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="VD: khách quen, đặt nhiều" className={`${inp} mt-1`} /></label>
        <button type="button" onClick={() => onDiscount(d.v, d.note)} className={`${btn2} self-end`}>Áp dụng giảm giá</button>
      </div>
    </fieldset>
  )
}
