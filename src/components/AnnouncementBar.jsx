import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '../lib/store.js'
import { safeUrl } from './OrderTracking.jsx'

const TONE = { info: 'bg-sky-600 text-white', promo: 'bg-accent text-ink-950', warn: 'bg-red-600 text-white' }
const today = () => new Date().toISOString().slice(0, 10)

/** Thanh thông báo đầu trang: ưu tiên "tạm ngưng nhận đơn", nếu không thì hiện thông báo/khuyến mãi (có thể đặt ngày hết hạn). Khách tắt được trong phiên hiện tại. */
export default function AnnouncementBar() {
  const [st] = useStore('settings'), [hidden, setHidden] = useState(() => sessionStorage.getItem('ll3d:ann') || '')
  const closed = !!st.shopClosed
  const text = closed ? `${st.closedMessage || 'Cửa hàng đang tạm ngưng nhận đơn.'}${st.reopenDate ? ` Dự kiến mở lại ${st.reopenDate.split('-').reverse().join('/')}.` : ''}` : st.announceOn && st.announceText && (!st.announceUntil || st.announceUntil >= today()) ? st.announceText : ''
  if (!text) return null
  const key = text + (st.announceLink || '')
  if (!closed && hidden === key) return null
  const link = st.announceLink?.startsWith('/') ? st.announceLink : safeUrl(st.announceLink)
  const cls = closed ? TONE.warn : TONE[st.announceTone] || TONE.info
  const body = <span className="font-medium">{text}{link && !closed && <span className="ml-2 underline">Xem ngay →</span>}</span>
  return (
    <div className={`${cls} relative px-10 py-2 text-center text-sm`} role="status">
      {link && !closed ? (link.startsWith('/') ? <Link to={link}>{body}</Link> : <a href={link} target="_blank" rel="noopener noreferrer">{body}</a>) : body}
      {!closed && <button onClick={() => { sessionStorage.setItem('ll3d:ann', key); setHidden(key) }} aria-label="Đóng thông báo" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"><X size={16} /></button>}
    </div>
  )
}
