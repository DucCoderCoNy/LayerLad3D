/** Danh sách xếp hạng có thanh ngang (chiều rộng theo % của giá trị lớn nhất). rows: [{ k, v, sub? }] */
export default function Rank({ rows, fmt, empty = 'Chưa có dữ liệu' }) {
  const max = Math.max(...rows.map((r) => r.v), 1)
  if (!rows.length) return <p className="text-sm text-zinc-500">{empty}</p>
  return (
    <ol className="space-y-2.5">{rows.map((r, i) => (
      <li key={r.k} className="text-sm">
        <div className="flex justify-between gap-3"><span className="truncate text-zinc-200"><b className="mr-2 text-zinc-500">{i + 1}</b>{r.k}</span><span className="shrink-0 text-white">{fmt(r.v)}{r.sub && <small className="ml-2 text-zinc-500">{r.sub}</small>}</span></div>
        <div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (r.v / max) * 100)}%` }} /></div>
      </li>))}</ol>
  )
}
