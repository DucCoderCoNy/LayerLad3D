import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { supa, useStore } from '../../lib/store.js'
import { orderOut } from '../../lib/rel.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { downloadCSV, printSlips } from '../../lib/export.js'
import { Badge, DataTable, Field, Modal, ORDER_STATUS, PAY_STATUS, btn, btn2, inp, td } from '../../components/ui.jsx'

const FLOW = ['new', 'confirmed', 'preparing', 'printing', 'finishing', 'shipping', 'done', 'cancelled']
const PAGE = 20
const dt = (d, end) => new Date(d + (end ? 'T23:59:59' : 'T00:00:00')).toISOString()
const withFilters = (q, f) => {
  if (f.status) q = q.eq('status', f.status)
  if (f.pay) q = q.eq('payment_status', f.pay)
  if (f.from) q = q.gte('created_at', dt(f.from))
  if (f.to) q = q.lte('created_at', dt(f.to, true))
  const s = f.q.trim().replace(/[,()%*]/g, '')
  if (s) q = q.or(`code.ilike.%${s}%,phone_norm.ilike.%${s}%,customer_name.ilike.%${s}%`)
  return q
}

/** Quản lý đơn hàng: lọc theo trạng thái / thanh toán / khoảng ngày, phân trang, xem file khách gửi, đổi trạng thái, in phiếu, xuất CSV */
export default function AdminOrdersV2() {
  const [st] = useStore('settings'), [f, setF] = useState({ status: '', pay: '', from: '', to: '', q: '' }), [page, setPage] = useState(0), [sel, setSel] = useState(null)
  const list = useAsync(async () => {
    const { data, error, count } = await withFilters(supa.from('orders').select('*, order_items(name,color,qty,unit_price)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1), f)
    if (error) throw error
    return { rows: data, count }
  }, [f, page])
  const set = (k, v) => { setF((c) => ({ ...c, [k]: v })); setPage(0) }
  const rows = list.data?.rows || [], pages = Math.max(1, Math.ceil((list.data?.count || 0) / PAGE))
  const exportAll = async () => {
    const data = must(await withFilters(supa.from('orders').select('*, order_items(name,color,qty,unit_price)').order('created_at', { ascending: false }).limit(2000), f))
    downloadCSV('don-hang.csv', [['Mã', 'Ngày', 'Khách', 'SĐT', 'Địa chỉ', 'Sản phẩm', 'Thanh toán', 'TT thanh toán', 'Phí ship', 'Tổng', 'Trạng thái', 'Mã vận đơn'],
      ...data.map((o) => [o.code, new Date(o.created_at).toLocaleString('vi-VN'), o.customer_name, o.phone, o.address, o.order_items.map((i) => `${i.name} (${i.color || ''}) x${i.qty}`).join('; '),
        o.payment_method === 'bank' ? 'Chuyển khoản' : 'COD', PAY_STATUS[o.payment_status]?.[0], o.ship_fee, o.total, ORDER_STATUS[o.status]?.[0], o.tracking_code || ''])])
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Đơn hàng <span className="text-base font-normal text-zinc-500">({list.data?.count ?? '…'})</span></h1>
        <div className="flex gap-2"><button onClick={() => printSlips(rows.map(orderOut), st)} className={`${btn2} flex items-center gap-1`}><Printer size={15} />In phiếu trang này</button>
          <button onClick={exportAll} className={`${btn2} flex items-center gap-1`}><Download size={15} />Xuất Excel</button></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Mã đơn / SĐT / tên" className={`${inp} lg:col-span-2`} />
        <select value={f.status} onChange={(e) => set('status', e.target.value)} className={inp}><option value="">Mọi trạng thái</option>{FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s][0]}</option>)}</select>
        <select value={f.pay} onChange={(e) => set('pay', e.target.value)} className={inp}><option value="">Mọi thanh toán</option>{Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className={inp} title="Từ ngày" />
        <input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} className={inp} title="Đến ngày" />
      </div>
      {list.error && <p className="text-red-400">Lỗi tải đơn: {list.error.message}</p>}
      <DataTable heads={['Mã', 'Ngày', 'Khách', 'Tổng', 'Thanh toán', 'Trạng thái']} empty={list.loading ? 'Đang tải…' : 'Không có đơn phù hợp'}>
        {rows.map((o) => (
          <tr key={o.id} onClick={() => setSel(o.id)} className="cursor-pointer">
            <td className={`${td} font-medium text-white`}>{o.code}</td><td className={td}>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
            <td className={td}>{o.customer_name}<br /><span className="text-xs text-zinc-500">{o.phone}</span></td><td className={td}>{formatVND(o.total)}</td>
            <td className={td}>{o.payment_method === 'bank' ? 'CK' : 'COD'} · <Badge map={PAY_STATUS} v={o.payment_status} /></td><td className={td}><Badge map={ORDER_STATUS} v={o.status} /></td>
          </tr>))}
      </DataTable>
      <div className="flex items-center justify-center gap-3 text-sm text-zinc-300">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40">← Trước</button><span>Trang {page + 1}/{pages}</span>
        <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40">Sau →</button>
      </div>
      {sel && <OrderDetail id={sel} st={st} onClose={() => setSel(null)} onChanged={list.reload} />}
    </div>
  )
}

function OrderDetail({ id, st, onClose, onChanged }) {
  const d = useAsync(async () => must(await supa.from('orders').select('*, order_items(*), uploaded_files(*)').eq('id', id).single()), [id])
  const [msg, setMsg] = useState(''), [track, setTrack] = useState(null)
  const o = d.data
  const run = async (fn, ok) => { setMsg(''); try { await fn(); d.reload(); onChanged(); if (ok) setMsg(ok) } catch (e) { setMsg('Lỗi: ' + (e.message || e)) } }
  const setStatus = (s) => run(async () => must(await supa.rpc('admin_set_order_status', { p_order: id, p_status: s })))
  const setPay = (p) => run(async () => must(await supa.from('orders').update({ payment_status: p }).eq('id', id)))
  const saveTrack = () => run(async () => must(await supa.from('orders').update({ shipping_provider: track.p || null, tracking_code: track.c || null }).eq('id', id)), 'Đã lưu vận đơn')
  const download = async (path) => { const { data, error } = await supa.storage.from('stl-files').createSignedUrl(path, 300); error ? setMsg('Không tạo được link tải: ' + error.message) : window.open(data.signedUrl, '_blank') }
  const toQueue = (it) => run(async () => {
    const g = Number(it.options?.grams) || null, h = Number(it.options?.hours) || null
    must(await supa.from('print_queue').insert({ order_id: id, order_item_id: it.id, est_grams: g && g * it.qty, est_hours: h && h * it.qty }))
  }, 'Đã đưa vào hàng đợi in (xem mục Máy in & lịch in)')
  return (
    <Modal title={o ? `Đơn ${o.code}` : 'Đang tải…'} onClose={onClose} wide>
      {d.error && <p className="text-red-400">{d.error.message}</p>}
      {o && (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-ink-900 p-3"><p className="text-xs text-zinc-500">Khách</p><b className="text-white">{o.customer_name}</b> · {o.phone}<br />{o.address}{o.note && <p className="mt-1 text-amber-300">Ghi chú: {o.note}</p>}</div>
            <div className="rounded-xl bg-ink-900 p-3 text-zinc-300"><p className="text-xs text-zinc-500">Thanh toán</p>{o.payment_method === 'bank' ? 'Chuyển khoản' : 'COD'} · Tổng <b className="text-accent">{formatVND(o.total)}</b> (ship {formatVND(o.ship_fee)})</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trạng thái đơn"><select value={o.status} onChange={(e) => setStatus(e.target.value)} className={inp}>{FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s][0]}</option>)}</select></Field>
            <Field label="Trạng thái thanh toán (quản lý riêng)"><select value={o.payment_status} onChange={(e) => setPay(e.target.value)} className={inp}>{Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Field>
          </div>
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">{o.order_items.map((it) => {
            const files = o.uploaded_files.filter((x) => x.order_item_id === it.id), op = it.options || {}
            return (
              <li key={it.id} className="space-y-1 p-3">
                <div className="flex justify-between gap-3"><b className="text-white">{it.name}</b><span>{formatVND(it.unit_price)} × {it.qty}</span></div>
                <p className="text-zinc-500">{it.color}{op.material && ` · ${op.material} · ${op.layer_height}mm · infill ${op.infill}% · ~${op.grams}g · ~${op.hours}h (ước tính)`}{op.text && ` · chữ "${op.text}"`}</p>
                {op.note && <p className="text-amber-300">Khách ghi: {op.note}</p>}
                {op.design && <p className="text-sky-300">Khách cần hỗ trợ thiết kế</p>}
                <div className="flex flex-wrap gap-2 pt-1">{files.map((x) => <button key={x.id} onClick={() => download(x.path)} className={btn2}>Tải file {x.original_name || x.path.split('/').pop()}{x.size_bytes ? ` (${(x.size_bytes / 1048576).toFixed(1)}MB)` : ''}</button>)}
                  <button onClick={() => toQueue(it)} className={btn2}>Đưa vào hàng đợi in</button></div>
              </li>) })}</ul>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <Field label="Đơn vị vận chuyển"><input value={track?.p ?? o.shipping_provider ?? ''} onChange={(e) => setTrack({ p: e.target.value, c: track?.c ?? o.tracking_code ?? '' })} placeholder="GHN / GHTK / ..." className={inp} /></Field>
            <Field label="Mã vận đơn"><input value={track?.c ?? o.tracking_code ?? ''} onChange={(e) => setTrack({ c: e.target.value, p: track?.p ?? o.shipping_provider ?? '' })} className={inp} /></Field>
            <button disabled={!track} onClick={saveTrack} className={btn}>Lưu vận đơn</button>
          </div>
          {msg && <p className={msg.startsWith('Lỗi') ? 'text-red-400' : 'text-emerald-400'}>{msg}</p>}
          <div className="flex justify-end"><button onClick={() => printSlips([orderOut(o)], st)} className={`${btn2} flex items-center gap-1`}><Printer size={15} />In phiếu giao hàng</button></div>
        </div>)}
    </Modal>
  )
}
