import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronRight, BarChart3, Boxes, CalendarClock, CalendarDays, Contact, Images, Palette, Newspaper, Tags, Calculator, ClipboardList, FileUp, LayoutDashboard, Package, Printer, Settings, Users, Wallet } from 'lucide-react'
import { supa, useStore } from '../../lib/store.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { btn } from '../../components/ui.jsx'

// Menu gom nhóm: mục có `items` là nhóm (rê chuột / bấm để xổ danh sách), mục không có là liên kết đơn
const MENU = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { label: 'Bán hàng', icon: ClipboardList, items: [['/admin/orders', 'Đơn hàng', ClipboardList], ['/admin/receivables', 'Công nợ & thu tiền', Wallet], ['/admin/customers', 'Khách hàng', Contact], ['/admin/insights', 'Phân tích bán hàng', BarChart3], ['/admin/requests', 'Yêu cầu báo giá', FileUp]] },
  { label: 'Sản phẩm', icon: Boxes, items: [['/admin/products', 'Sản phẩm', Boxes], ['/admin/categories', 'Danh mục', Tags], ['/admin/colors', 'Màu nhựa', Palette]] },
  { label: 'Xưởng in', icon: Printer, items: [['/admin/workshop-home', 'Tổng quan xưởng', LayoutDashboard], ['/admin/workshop-board', 'Bảng công việc', ClipboardList], ['/admin/workshop', 'Đơn xưởng', Printer], ['/admin/printers', 'Máy in', Printer], ['/admin/queue', 'Hàng đợi in', CalendarClock], ['/admin/calendar', 'Lịch in', CalendarDays]] },
  { label: 'Kho & tài chính', icon: Wallet, items: [['/admin/stock', 'Kho nhựa & vật tư', Package], ['/admin/cash', 'Thu chi', Wallet], ['/admin/report', 'Báo cáo tháng', BarChart3], ['/admin/costing', 'Giá vốn & sao lưu', Calculator]] },
  { label: 'Nội dung', icon: Newspaper, items: [['/admin/posts', 'Bài viết', Newspaper], ['/admin/showcase', 'Thư viện & đánh giá', Images]] },
  { label: 'Hệ thống', icon: Settings, items: [['/admin/users', 'Người dùng', Users], ['/admin/settings', 'Cài đặt', Settings]] },
]

/** Nhóm menu: rê chuột (máy tính) hoặc bấm (điện thoại) để xổ danh sách. Danh sách dùng vị trí cố định nên không bị cắt bởi thanh cuộn. */
function Group({ g, badges = {} }) {
  const [pos, setPos] = useState(null), timer = useRef(null), { pathname } = useLocation()
  const active = g.items.some(([to]) => pathname.startsWith(to))
  const show = (el) => { clearTimeout(timer.current); const r = el.getBoundingClientRect(), wide = window.innerWidth >= 768; setPos(wide ? { top: Math.min(r.top, window.innerHeight - g.items.length * 44 - 24), left: r.right + 4 } : { top: r.bottom + 4, left: Math.max(8, r.left) }) }
  const hide = () => { timer.current = setTimeout(() => setPos(null), 150) }
  useEffect(() => setPos(null), [pathname])
  const Icon = g.icon
  return (
    <div onMouseEnter={(e) => show(e.currentTarget)} onMouseLeave={hide}>
      <button type="button" onClick={(e) => (pos ? setPos(null) : show(e.currentTarget.parentElement))} aria-expanded={!!pos}
        className={`flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm ${active ? 'bg-white/10 font-semibold text-white' : 'text-zinc-300 hover:bg-white/10'}`}>
        <Icon size={18} />{g.label}{g.items.some(([to]) => badges[to]) && <b className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-ink-950">{g.items.reduce((n, [to]) => n + (badges[to] || 0), 0)}</b>}<ChevronRight size={14} className="ml-auto hidden md:block" />
      </button>
      {pos && (
        <div style={{ position: 'fixed', top: pos.top, left: pos.left }} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hide}
          className="z-50 min-w-52 rounded-xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
          {g.items.map(([to, l, I]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-accent font-semibold text-ink-950' : 'text-zinc-200 hover:bg-white/10'}`}><I size={16} />{l}{badges[to] > 0 && <b className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-ink-950">{badges[to]}</b>}</NavLink>))}
        </div>)}
    </div>
  )
}

/** Khung trang quản trị + chặn người không phải admin */
export default function AdminLayout() {
  const { user, logout, ready } = useAuth()
  const [orders] = useStore('orders'), [reqs] = useStore('requests')
  const fresh = orders.filter((o) => o.status === 'new').length, pend = reqs.filter((r) => r.status === 'pending').length
  const badges = { '/admin/orders': fresh, '/admin/requests': pend }
  const [sound, setSound] = useState(() => localStorage.getItem('ll3d:sound') !== 'off'), seen = useRef(null)
  useEffect(() => { // có đơn mới → kêu "ting" + hiện số đơn trên tiêu đề tab
    document.title = fresh ? `(${fresh}) Đơn mới – Quản trị` : 'Quản trị – LayerLab 3D'
    if (seen.current !== null && orders.length > seen.current && sound) {
      try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.15, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.6); o.start(); o.stop(a.currentTime + 0.6) } catch { /* trình duyệt chặn âm thanh khi chưa tương tác */ }
    }
    if (orders.length || seen.current === null) seen.current = orders.length
  }, [orders.length, fresh, sound])
  if (!ready) return null
  // Bản build production mà chưa cấu hình Supabase = chế độ demo (mật khẩu admin lộ trong README) -> chặn
  if (import.meta.env.PROD && !supa && import.meta.env.VITE_ALLOW_DEMO !== 'true') return (
    <div className="grid min-h-screen place-items-center px-5 text-center"><div className="max-w-md">
      <h1 className="font-display text-2xl font-bold text-white">Chưa cấu hình máy chủ</h1>
      <p className="mt-2 text-zinc-400">Trang quản trị bị khóa vì web đang ở chế độ demo (dữ liệu lưu trong trình duyệt, ai cũng sửa được). Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY rồi deploy lại.</p>
      <Link to="/" className={`${btn} mt-5 inline-block`}>Về cửa hàng</Link></div></div>
  )
  if (user?.role !== 'admin') return (
    <div className="grid min-h-screen place-items-center text-center"><div>
      <h1 className="font-display text-2xl font-bold text-white">Khu vực quản trị</h1>
      <p className="mt-2 text-zinc-400">Bạn cần đăng nhập bằng tài khoản quản trị.</p>
      <Link to="/login" className={`${btn} mt-5 inline-block`}>Đăng nhập</Link></div></div>
  )
  const cls = ({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-accent text-ink-950 font-semibold' : 'text-zinc-300 hover:bg-white/10'}`
  return (
    <div className="min-h-screen md:flex">
      <aside className="shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto border-b border-white/10 bg-ink-900 p-4 md:w-60 md:border-b-0 md:border-r">
        <Link to="/" className="mb-4 block font-display text-lg font-bold text-white">← Về cửa hàng</Link>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">{MENU.map((m) => (m.items ? <Group key={m.label} g={m} badges={badges} /> : <NavLink key={m.to} to={m.to} end={m.end} className={cls}><m.icon size={18} />{m.label}</NavLink>))}</nav>
        <button onClick={() => { const v = !sound; setSound(v); localStorage.setItem('ll3d:sound', v ? 'on' : 'off') }} className="mt-4 block text-sm text-zinc-500 hover:text-white">{sound ? '🔔 Âm báo đơn mới: bật' : '🔕 Âm báo đơn mới: tắt'}</button>
        <button onClick={logout} className="mt-2 text-sm text-zinc-500 hover:text-white">Đăng xuất ({user.name})</button>
      </aside>
      <section className="min-w-0 flex-1 p-5 md:p-8"><Outlet /></section>
    </div>
  )
}
