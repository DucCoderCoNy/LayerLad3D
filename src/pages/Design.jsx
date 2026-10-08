import { Link } from 'react-router-dom'
import { FileUp, KeyRound, Table2 } from 'lucide-react'
import { useTitle } from '../lib/seo.js'

export const TOOLS = [
  { to: '/thiet-ke/moc-khoa', icon: KeyRound, title: 'Tùy biến móc khóa', text: 'Gõ tên, chọn màu, xem trước ngay.' },
  { to: '/thiet-ke/thoi-khoa-bieu', icon: Table2, title: 'Thời khóa biểu module', text: 'Chọn số cột, số tiết và màu, ra giá liền.' },
  { to: '/custom', icon: FileUp, title: 'In theo file của bạn', text: 'Tải STL/3MF, chọn vật liệu, màu, layer height và nhận giá ước tính.' },
]
export function ToolCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {TOOLS.map(({ to, icon: Icon, title, text }) => (
        <Link key={to} to={to} className="group rounded-2xl border border-white/10 bg-ink-800 p-6 transition hover:border-accent/60">
          <Icon className="text-accent" size={30} />
          <h3 className="mt-4 font-display text-xl font-bold text-white group-hover:text-accent">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{text}</p>
        </Link>))}
    </div>
  )
}
export default function Design() {
  useTitle('Tự thiết kế')
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Tự thiết kế</h1>
      <p className="mb-8 mt-2 text-zinc-400">Chọn công cụ phù hợp: có xem trước và báo giá ngay.</p>
      <ToolCards />
    </div>
  )
}
