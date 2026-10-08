import { Link, useParams } from 'react-router-dom'
import { Mail, MapPin, Phone, Clock } from 'lucide-react'
import { FAQ, POLICIES } from '../data/pages.js'
import { SITE } from '../data/site.js'
import { useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'
import Prose from '../components/Prose.jsx'

export function Policy() {
  const { slug } = useParams(), cur = POLICIES.find((p) => p.slug === slug) || POLICIES[0]
  useTitle(cur.title)
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 md:grid-cols-4">
      <nav className="space-y-1 md:col-span-1">{POLICIES.map((p) => (
        <Link key={p.slug} to={`/chinh-sach/${p.slug}`} className={`block rounded-lg px-3 py-2 text-sm ${p.slug === cur.slug ? 'bg-accent text-ink-950 font-semibold' : 'text-zinc-300 hover:bg-white/10'}`}>{p.title}</Link>))}</nav>
      <article className="md:col-span-3"><h1 className="mb-6 font-display text-3xl font-bold text-white">{cur.title}</h1><Prose text={cur.text} /></article>
    </div>
  )
}

export function Faq() {
  useTitle('Câu hỏi thường gặp')
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Câu hỏi thường gặp</h1>
      <div className="mt-8 space-y-3">{FAQ.map(([q, a]) => (
        <details key={q} className="group rounded-xl border border-white/10 bg-ink-800 p-4">
          <summary className="cursor-pointer font-medium text-white marker:text-accent">{q}</summary>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a}</p>
        </details>))}</div>
    </div>
  )
}

export function Contact() {
  useTitle('Liên hệ')
  const [st] = useStore('settings')
  const rows = [
    [Phone, 'Điện thoại', st.phone, `tel:${(st.phone || '').replace(/[^\d+]/g, '')}`], [Mail, 'Email', st.email, `mailto:${st.email}`],
    [null, 'Zalo', 'Nhắn Zalo', st.zalo || SITE.zalo], st.messenger && [null, 'Messenger', 'Nhắn Messenger', st.messenger],
    st.address && [MapPin, 'Địa chỉ', st.address], st.hours && [Clock, 'Giờ làm việc', st.hours],
  ].filter(Boolean)
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Liên hệ</h1>
      <p className="mt-2 text-zinc-400">Cần tư vấn vật liệu, báo giá số lượng lớn hay hỗ trợ file? Nhắn bên mình bất cứ lúc nào.</p>
      <ul className="mt-8 space-y-3">{rows.map(([Icon, l, v, href]) => (
        <li key={l} className="flex items-center gap-4 rounded-xl border border-white/10 bg-ink-800 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-sm font-bold text-accent">{Icon ? <Icon size={20} /> : l[0]}</span>
          <div><p className="text-xs text-zinc-500">{l}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-white hover:text-accent">{v}</a> : <p className="text-white">{v}</p>}</div>
        </li>))}</ul>
      <p className="mt-6 text-sm text-zinc-500">Xem thêm: <Link to="/faq" className="text-accent">Câu hỏi thường gặp</Link> · <Link to="/tra-cuu" className="text-accent">Tra cứu đơn hàng</Link></p>
    </div>
  )
}
