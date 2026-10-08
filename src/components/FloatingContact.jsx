import { MessageCircle, Phone } from 'lucide-react'
import { useStore } from '../lib/store.js'
import { SITE } from '../data/site.js'

/** Nút liên hệ nhanh nổi góc phải dưới: Zalo, Messenger (nếu có), gọi điện */
export default function FloatingContact() {
  const [st] = useStore('settings')
  const tel = (st.phone || '').replace(/[^\d+]/g, '')
  const cls = 'grid h-12 w-12 place-items-center rounded-full shadow-lg shadow-black/40 transition hover:scale-110'
  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-3">
      <a href={st.zalo || SITE.zalo} target="_blank" rel="noreferrer" aria-label="Chat Zalo" className={`${cls} bg-[#0068ff] text-xs font-bold text-white`}>Zalo</a>
      {st.messenger && <a href={st.messenger} target="_blank" rel="noreferrer" aria-label="Chat Messenger" className={`${cls} bg-[#a033ff] text-white`}><MessageCircle size={22} /></a>}
      {tel && <a href={`tel:${tel}`} aria-label="Gọi điện" className={`${cls} bg-neon text-ink-950`}><Phone size={22} /></a>}
    </div>
  )
}
