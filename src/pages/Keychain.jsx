import { useState } from 'react'
import { Check } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatVND } from '../data/products.js'
import { useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'
import { Field, btn, inp } from '../components/ui.jsx'

export const PALETTE = [
  ['Trắng', '#f4f4f5'], ['Đen', '#18181b'], ['Đỏ', '#ef4444'], ['Cam', '#ff6a13'], ['Vàng', '#facc15'],
  ['Xanh lá', '#22c55e'], ['Xanh dương', '#3b82f6'], ['Tím', '#8b5cf6'], ['Hồng', '#ec4899'],
]
export const hexOf = (n) => PALETTE.find((c) => c[0] === n)?.[1] || '#888'
export const Swatches = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {PALETTE.map(([n, h]) => (
      <button type="button" key={n} title={n} onClick={() => onChange(n)} style={{ background: h }}
        className={`grid h-9 w-9 place-items-center rounded-full border-2 ${value === n ? 'border-accent' : 'border-white/20'}`}>
        {value === n && <Check size={16} className={['Trắng', 'Vàng'].includes(n) ? 'text-black' : 'text-white'} />}
      </button>))}
  </div>
)

/** Móc khóa tùy biến: nhập tên, chọn màu đế/chữ, xem trước ngay. Giá = giá đế + giá mỗi ký tự (cấu hình ở Admin → Cài đặt) */
export default function Keychain() {
  useTitle('Tùy biến móc khóa', 'Thiết kế móc khóa in 3D theo tên của bạn, xem trước ngay.')
  const { addConfigured } = useCart(), [st] = useStore('settings')
  const [text, setText] = useState('LAYERLAB'), [base, setBase] = useState('Cam'), [ink, setInk] = useState('Đen'), [shape, setShape] = useState('pill'), [qty, setQty] = useState(1)
  const clean = text.trim(), chars = clean.replace(/\s/g, '').length
  const price = st.keychainBase + st.keychainPerChar * chars
  const w = Math.max(150, clean.length * 26 + 90), h = 90, r = shape === 'pill' ? 45 : shape === 'rect' ? 12 : 8
  const b = hexOf(base), t = hexOf(ink)
  const add = () => clean && addConfigured({ id: 'cfg-keychain', name: `Móc khóa: ${clean}`, price, color: `Đế ${base} · chữ ${ink}`, hue: 'from-neon to-cyan-500', cfg: { text: clean, base, ink, shape } }, qty)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Tùy biến móc khóa</h1>
      <p className="mt-2 text-zinc-400">Gõ tên, chọn màu, xem trước ngay. Hỗ trợ tiếng Việt có dấu.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="layers grid min-h-72 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-ink-800 p-6">
          <svg viewBox={`-10 -10 ${w + 20} ${h + 28}`} className="w-full max-w-md" role="img" aria-label="Xem trước móc khóa">
            <rect x="0" y="8" width={w} height={h} rx={r} fill="#000" opacity=".35" />
            <rect x="0" y="0" width={w} height={h} rx={r} fill={b} />
            <rect x="4" y="4" width={w - 8} height={h - 8} rx={Math.max(r - 4, 4)} fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="2" />
            <circle cx="24" cy={h / 2} r="9" fill="#101318" /><circle cx="24" cy={h / 2} r="9" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="3" />
            <text x={w / 2 + 14} y={h / 2 + 11} textAnchor="middle" fontSize="34" fontWeight="700" fontFamily="'Space Grotesk','Be Vietnam Pro',sans-serif" fill="#000" opacity=".3" dx="2" dy="2">{clean || '...'}</text>
            <text x={w / 2 + 14} y={h / 2 + 11} textAnchor="middle" fontSize="34" fontWeight="700" fontFamily="'Space Grotesk','Be Vietnam Pro',sans-serif" fill={t}>{clean || '...'}</text>
          </svg>
          <p className="mt-2 text-xs text-zinc-500">Hình minh họa; thành phẩm có thể chênh nhẹ về tỷ lệ chữ.</p>
        </div>
        <div className="space-y-5">
          <Field label={`Tên / chữ trên móc khóa (${clean.length}/20)`}><input maxLength={20} value={text} onChange={(e) => setText(e.target.value)} className={inp} /></Field>
          <Field label="Hình dạng"><div className="flex gap-2">{[['pill', 'Bo tròn'], ['rect', 'Chữ nhật bo góc'], ['sharp', 'Vuông góc']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setShape(k)} className={`rounded-lg border px-3 py-2 text-sm ${shape === k ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-zinc-400'}`}>{l}</button>))}</div></Field>
          <Field label={`Màu đế: ${base}`}><Swatches value={base} onChange={setBase} /></Field>
          <Field label={`Màu chữ: ${ink}`}><Swatches value={ink} onChange={setInk} /></Field>
          {base === ink && <p className="text-sm text-amber-400">Màu chữ trùng màu đế sẽ rất khó đọc, hãy chọn màu khác.</p>}
          <Field label="Số lượng"><input type="number" min="1" max="99" value={qty} onChange={(e) => setQty(Math.min(99, Math.max(1, +e.target.value || 1)))} className={`${inp} w-28`} /></Field>
          <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
            <p className="text-sm text-zinc-400">Đế {formatVND(st.keychainBase)} + {chars} ký tự × {formatVND(st.keychainPerChar)}</p>
            <p className="mt-1 font-display text-3xl font-bold text-accent">{formatVND(price * qty)}</p>
            <button disabled={!clean} onClick={add} className={`${btn} mt-4 w-full`}>Thêm vào giỏ hàng</button>
          </div>
        </div>
      </div>
    </div>
  )
}
