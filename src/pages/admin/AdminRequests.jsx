import { useState } from 'react'
import { formatVND } from '../../data/products.js'
import { supa, useStore } from '../../lib/store.js'
import { addWorkshopOrder } from '../../lib/bridge.js'
import { Badge, DataTable, Modal, REQ_STATUS, btn, btn2, inp, td } from '../../components/ui.jsx'

/** Quản lý yêu cầu in theo yêu cầu: xem thông số, nhập giá chính thức, đổi trạng thái */
export default function AdminRequests() {
  const [reqs, setReqs] = useStore('requests')
  const [sel, setSel] = useState(null)
  const r = reqs.find((x) => x.id === sel)
  const toWorkshop = (r) => { addWorkshopOrder({ src: 'Theo yêu cầu', cust: r.name, name: r.fileName, file: r.fileName, colors: r.color, infill: r.infill, g: r.grams, h: r.hours, price: r.quote ?? r.estimate, status: 'Chờ in', note: `Yêu cầu web ${r.id}${r.note ? ': ' + r.note : ''}` }); patch(r.id, { wo: true }) }
  const patch = (id, d) => setReqs((c) => c.map((x) => (x.id === id ? { ...x, ...d } : x)))
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold text-white">Yêu cầu in theo yêu cầu</h1>
      <DataTable heads={['Mã', 'Khách', 'File', 'Vật liệu', 'Ước tính', 'Báo giá', 'Trạng thái']} empty="Chưa có yêu cầu">
        {reqs.map((x) => (
          <tr key={x.id} onClick={() => setSel(x.id)} className="cursor-pointer">
            <td className={`${td} font-medium text-white`}>{x.id}</td><td className={td}>{x.name}</td><td className={td}>{x.fileName}</td><td className={td}>{x.material} · {x.color}</td>
            <td className={td}>{formatVND(x.estimate)}</td><td className={td}>{x.quote != null ? formatVND(x.quote) : '—'}</td><td className={td}><Badge map={REQ_STATUS} v={x.status} /></td></tr>))}
      </DataTable>
      {r && (
        <Modal title={`Yêu cầu ${r.id}`} onClose={() => setSel(null)} wide>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-ink-900 p-3 text-zinc-300">{r.name} · {r.phone} {r.email && `· ${r.email}`}<br />File: <b>{r.fileName}</b><br />
              {r.material} · {r.color} · infill {r.infill}% · SL {r.qty} · ~{r.grams}g · ~{r.hours}h{r.design && ' · cần thiết kế'}{r.note && <><br /><i className="text-zinc-500">{r.note}</i></>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-zinc-400">Giá báo chính thức (₫)<input type="number" step="1000" defaultValue={r.quote ?? r.estimate} id="quote" className={`${inp} mt-1`} /></label>
              <label className="text-zinc-400">Trạng thái<select value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })} className={`${inp} mt-1`}>{Object.entries(REQ_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
            </div>
            <label className="block text-zinc-400">Ghi chú gửi khách<textarea id="note" rows={2} defaultValue={r.adminNote} className={`${inp} mt-1`} /></label>
            <div className="flex gap-2">
              <button className={btn} onClick={() => patch(r.id, { quote: +document.getElementById('quote').value, adminNote: document.getElementById('note').value, status: r.status === 'pending' ? 'quoted' : r.status })}>Lưu báo giá</button>
              {r.filePath && supa && <button className={btn2} onClick={async () => { const { data, error } = await supa.storage.from('stl-files').createSignedUrl(r.filePath, 300); error ? alert(error.message) : window.open(data.signedUrl) }}>Tải file STL</button>}
              <button disabled={r.wo} className={btn2} onClick={() => toWorkshop(r)}>{r.wo ? 'Đã chuyển sang xưởng' : 'Tạo đơn xưởng'}</button>
              <button className={`${btn2} ml-auto text-red-400`} onClick={() => confirm('Xóa yêu cầu?') && (setReqs((c) => c.filter((x) => x.id !== r.id)), setSel(null))}>Xóa</button>
            </div>
          </div>
        </Modal>)}
    </div>
  )
}
