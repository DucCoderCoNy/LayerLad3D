// Biểu đồ cột dùng chung cho Admin: trục tiền, đường lưới, số tiền trên đầu cột, tooltip khi rê chuột.
// Chiều cao cột tính bằng pixel (không dùng %) nên không bị xẹp như khi khung cha không có chiều cao cố định.
import { formatVND } from '../data/products.js'

/** 1.234.567 → "1,2tr"; 950.000 → "950k"; 2.100.000.000 → "2,1 tỷ" */
export const compactVND = (n) => {
  const a = Math.abs(n), s = n < 0 ? '-' : '', f = (x) => String(+x.toFixed(1)).replace('.', ',')
  if (a >= 1e9) return `${s}${f(a / 1e9)} tỷ`
  if (a >= 1e6) return `${s}${f(a / 1e6)}tr`
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)}k`
  return `${s}${Math.round(a)}`
}
// Làm tròn trần lên mốc đẹp (1 / 2 / 2,5 / 5 / 10 × 10^n) để trục có số tròn
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), r = v / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p }

/** data: [{ key, label, values: number[] }]; series: [{ name, color }] (màu là class Tailwind, vd 'bg-accent') */
export default function BarChart({ data, series, height = 200, minColW = 44 }) {
  const top = niceMax(Math.max(...data.flatMap((d) => d.values), 0)), ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top)
  const showVals = data.length <= 14, px = (v) => (v > 0 ? Math.max(3, Math.round((v / top) * height)) : 0)
  const total = data.flatMap((d) => d.values).reduce((a, b) => a + b, 0)
  return (
    <div>
      {series.length > 1 && <p className="mb-3 flex flex-wrap gap-4 text-sm text-zinc-400">{series.map((s) => <span key={s.name}><i className={`mr-1 inline-block h-3 w-3 rounded ${s.color}`} />{s.name}</span>)}</p>}
      <div className="flex">
        <div className="relative mr-2 w-12 shrink-0 text-right text-[10px] text-zinc-500" style={{ height }}>
          {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: (t / top) * height }}>{compactVND(t)}</span>)}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pt-4">
          <div className="relative" style={{ minWidth: data.length * minColW }}>
            <div className="absolute inset-x-0 top-0" style={{ height }} aria-hidden>
              {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-white/5" style={{ bottom: (t / top) * height }} />)}
            </div>
            <div className="relative flex items-end gap-2" style={{ height }}>
              {data.map((d) => (
                <div key={d.key} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${d.label}\n${d.values.map((v, i) => `${series[i].name}: ${formatVND(v)}`).join('\n')}`}>
                  {d.values.map((v, i) => (
                    <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                      {showVals && v !== 0 && <span className="mb-0.5 whitespace-nowrap text-[10px] font-medium text-zinc-300">{compactVND(v)}</span>}
                      <div className={`w-full rounded-t ${series[i].color}`} style={{ height: px(v) }} />
                    </div>))}
                </div>))}
            </div>
            <div className="mt-1 flex gap-2">{data.map((d) => <span key={d.key} className="flex-1 truncate text-center text-[10px] text-zinc-500">{d.label}</span>)}</div>
          </div>
        </div>
      </div>
      {total === 0 && <p className="mt-3 text-center text-sm text-zinc-500">Chưa có số liệu trong khoảng thời gian này.</p>}
    </div>
  )
}
