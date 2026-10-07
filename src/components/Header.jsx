import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ShoppingBag, User, X } from 'lucide-react'
import { NAV, SITE } from '../data/site.js'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useStore } from '../lib/store.js'

export function Logo() {
  const [st] = useStore('settings')
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-white">
      {/* Biểu tượng 3 lớp xếp chồng */}
      <span className="flex h-8 w-8 flex-col justify-center gap-[3px] rounded-lg bg-accent p-1.5">
        <i className="h-[3px] rounded bg-ink-950" /><i className="h-[3px] rounded bg-ink-950" /><i className="h-[3px] rounded bg-ink-950" />
      </span>
      {st.storeName}
    </Link>
  )
}

export default function Header() {
  const [menu, setMenu] = useState(false)
  const { count, setOpen } = useCart()
  const { user } = useAuth()
  const link = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? 'text-accent' : 'text-zinc-300 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden gap-1 md:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>{n.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && <Link to="/admin" className="hidden rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent sm:block">Quản trị</Link>}
          <Link to={user ? '/account' : '/login'} className="flex items-center gap-1.5 rounded-lg p-2 text-sm text-zinc-200 hover:bg-white/10"><User size={20} /><span className="hidden sm:inline">{user ? user.name.split(' ').pop() : 'Đăng nhập'}</span></Link>
          <button onClick={() => setOpen(true)} aria-label="Giỏ hàng" className="relative rounded-lg p-2 text-zinc-200 hover:bg-white/10">
            <ShoppingBag size={22} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink-950">{count}</span>}
          </button>
          <button onClick={() => setMenu(!menu)} aria-label="Menu" className="rounded-lg p-2 hover:bg-white/10 md:hidden">
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {menu && (
        <nav className="flex flex-col border-t border-white/10 px-5 py-2 md:hidden">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link} onClick={() => setMenu(false)}>{n.label}</NavLink>)}
        </nav>
      )}
    </header>
  )
}
