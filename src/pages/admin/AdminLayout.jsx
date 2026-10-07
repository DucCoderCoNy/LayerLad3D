import { Link, NavLink, Outlet } from 'react-router-dom'
import { Boxes, CalendarClock, Calculator, ClipboardList, FileUp, LayoutDashboard, Package, Printer, Settings, Users, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { btn } from '../../components/ui.jsx'

const LINKS = [
  ['/admin', 'Tổng quan', LayoutDashboard, true], ['/admin/products', 'Sản phẩm', Boxes], ['/admin/orders', 'Đơn hàng', ClipboardList],
  ['/admin/requests', 'Yêu cầu báo giá', FileUp],
  ['/admin/workshop', 'Đơn xưởng', Printer], ['/admin/queue', 'Lịch in', CalendarClock], ['/admin/stock', 'Kho nhựa & vật tư', Package], ['/admin/cash', 'Thu chi', Wallet], ['/admin/costing', 'Giá vốn & sao lưu', Calculator],
  ['/admin/users', 'Người dùng', Users], ['/admin/settings', 'Cài đặt', Settings],
]

/** Khung trang quản trị + chặn người không phải admin */
export default function AdminLayout() {
  const { user, logout, ready } = useAuth()
  if (!ready) return null
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
        <nav className="flex gap-1 overflow-x-auto md:flex-col">{LINKS.map(([to, l, Icon, end]) => <NavLink key={to} to={to} end={end} className={cls}><Icon size={18} />{l}</NavLink>)}</nav>
        <button onClick={logout} className="mt-4 text-sm text-zinc-500 hover:text-white">Đăng xuất ({user.name})</button>
      </aside>
      <section className="min-w-0 flex-1 p-5 md:p-8"><Outlet /></section>
    </div>
  )
}
