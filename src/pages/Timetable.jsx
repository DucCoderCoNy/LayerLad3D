import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { formatVND } from '../data/products.js'
import { useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'
import { Field, btn, inp } from '../components/ui.jsx'
import { Swatches, hexOf } from './Keychain.jsx'

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN', '8', '9', '10']

/** Thời khóa biểu module: chọn số cột (ngày/môn) × số tiết (hàng) và màu. Giá = giá nền + giá mỗi ô × số ô */
export default function Timetable() {
  useTitle('Thời khóa biểu module', 'Thời khóa biểu ghép ô kiểu Lego, tùy chọn số ô, số tiết và màu.')
  const { addConfigured } = useCart(), [st] = useStore('settings')
  const [cols, setCols] = useState(6), [rows, setRows] = useState(5), [frame, setFrame] = useState('Đen'), [cell, setCell] = useState('Trắng'), [ink, setInk] = useState('Cam'), [qty, setQty] = useState(1)
  const price = st.ttBase + st.ttPerCell * cols * rows
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v) || lo))
  const add = () => addConfigured({ id: 'cfg-timetable', name: `Thời khóa biểu module ${cols}×${rows}`, price, color: `Khung ${frame} · ô ${cell} · chữ ${ink}`, hue: 'from-accent to-amber-400', cfg: { cols, rows, frame, cell, ink } }, qty)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Thời khóa biểu module</h1>
      <p className="mt-2 text-zinc-400">Ô ghép/tháo như Lego, đổi lịch học trong vài giây. Chọn kích thước và màu rồi xem trước.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="layers overflow-x-auto rounded-3xl border border-white/10 bg-ink-800 p-6 lg:col-span-3">
          <div className="mx-auto w-fit rounded-2xl p-2 shadow-xl" style={{ background: hexOf(frame) }}>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(44px, 64px))` }}>
              {Array.from({ length: cols }, (_, c) => <div key={'h' + c} className="grid h-8 place-items-center rounded-md text-xs font-bold" style={{ background: hexOf(ink), color: ['Trắng', 'Vàng'].includes(ink) ? '#000' : '#fff' }}>{DAYS[c]}</div>)}
              {Array.from({ length: cols * rows }, (_, i) => <div key={i} className="grid aspect-square place-items-center rounded-md text-[10px]" style={{ background: hexOf(cell), color: hexOf(ink) }}>{Math.floor(i / cols) + 1}</div>)}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">Hình minh họa: {cols} cột × {rows} tiết = {cols * rows} ô.</p>
        </div>
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số cột (ngày / môn)"><input type="number" min="1" max="10" value={cols} onChange={(e) => setCols(clamp(e.target.value, 1, 10))} className={inp} /></Field>
            <Field label="Số tiết (hàng)"><input type="number" min="1" max="12" value={rows} onChange={(e) => setRows(clamp(e.target.value, 1, 12))} className={inp} /></Field>
          </div>
          <Field label={`Màu khung: ${frame}`}><Swatches value={frame} onChange={setFrame} /></Field>
          <Field label={`Màu ô: ${cell}`}><Swatches value={cell} onChange={setCell} /></Field>
          <Field label={`Màu chữ nổi / tiêu đề: ${ink}`}><Swatches value={ink} onChange={setInk} /></Field>
          <Field label="Số lượng"><input type="number" min="1" max="99" value={qty} onChange={(e) => setQty(clamp(e.target.value, 1, 99))} className={`${inp} w-28`} /></Field>
          <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
            <p className="text-sm text-zinc-400">Nền {formatVND(st.ttBase)} + {cols * rows} ô × {formatVND(st.ttPerCell)}</p>
            <p className="mt-1 font-display text-3xl font-bold text-accent">{formatVND(price * qty)}</p>
            <button onClick={add} className={`${btn} mt-4 w-full`}>Thêm vào giỏ hàng</button>
          </div>
        </div>
      </div>
    </div>
  )
}
