import { useState } from 'react'
import { KEYS, getStore, write } from '../../lib/store.js'
import { DEFSET as useSetDefaults, SET_FIELDS, num } from '../../lib/workshop.js'
import { btn, btn2, Field, inp } from '../../components/ui.jsx'
import { Card, useWset } from './wui.jsx'

/** Thông số giá/giá vốn của xưởng + sao lưu TOÀN BỘ dữ liệu web (sản phẩm, đơn, người dùng, xưởng) */
export default function AdminCosting() {
  const S = useWset()
  const [f, setF] = useState(S), [msg, setMsg] = useState('')
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }
  const exportAll = () => {
    const data = Object.fromEntries(KEYS.map((k) => [k, getStore(k)]))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
    a.download = `sao-luu-layerlab-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const importAll = (e) => {
    const file = e.target.files[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => { try {
      const d = JSON.parse(r.result)
      if (!d.products && d.orders && d.cash && d.stock) { // file sao lưu của công cụ quan-ly-in3d.html cũ
        if (!confirm('Nhập dữ liệu xưởng từ file sao lưu cũ? (đơn xưởng, kho, thu chi, thông số giá sẽ bị thay)')) return
        write('wo', d.orders); write('ws', d.stock); write('wc', d.cash); write('wset', { ...useSetDefaults, ...d.set }); return flash('Đã nhập dữ liệu xưởng cũ')
      }
      if (!d.products) throw 0
      if (!confirm('Thay TOÀN BỘ dữ liệu hiện tại bằng file sao lưu này?')) return
      KEYS.forEach((k) => d[k] !== undefined && write(k, d[k])); flash('Đã khôi phục dữ liệu')
    } catch { alert('File không hợp lệ.') } }
    r.readAsText(file)
  }
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Giá vốn & sao lưu</h1>
      <Card title="Thông số giá và giá vốn (dùng cho Đơn xưởng)">
        <div className="grid gap-3 sm:grid-cols-2">{SET_FIELDS.map(([k, l]) => <Field key={k} label={l}><input type="number" step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: num(e.target.value) })} className={inp} /></Field>)}</div>
        <div className="mt-4 flex items-center gap-3"><button className={btn} onClick={() => { write('wset', f); flash('Đã lưu') }}>Lưu thông số</button>{msg && <span className="text-sm text-neon">{msg}</span>}</div>
      </Card>
      <Card title="Sao lưu dữ liệu">
        <p className="mb-3 text-sm text-zinc-400">Dữ liệu đang nằm trong trình duyệt của máy này. Xoá dữ liệu duyệt web sẽ mất hết, hãy xuất sao lưu mỗi tuần. Nút nhập cũng đọc được file sao lưu từ công cụ quan-ly-in3d.html cũ của bạn.</p>
        <div className="flex flex-wrap gap-3"><button onClick={exportAll} className={btn}>Xuất file sao lưu</button>
          <label className={`${btn2} cursor-pointer`}>Nhập file sao lưu<input type="file" accept=".json" onChange={importAll} className="hidden" /></label></div>
      </Card>
    </div>
  )
}
