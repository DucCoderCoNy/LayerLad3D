import { Link } from 'react-router-dom'
import { NAV, SITE } from '../data/site.js'
import { Logo } from './Header.jsx'
import { useStore } from '../lib/store.js'

export default function Footer() {
  const [st] = useStore('settings')
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-zinc-400">
            {SITE.tagline} bằng nhựa PLA và PETG trên máy {SITE.printers.join(' và ')}.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Khám phá</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-accent">{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Liên hệ</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>{st.phone}</li><li>{st.email}</li>
            <li><a className="hover:text-accent" href={SITE.zalo} target="_blank" rel="noreferrer">Nhắn Zalo</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {st.storeName}. Mọi quyền được bảo lưu.
      </div>
    </footer>
  )
}
