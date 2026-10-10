import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => { const f = () => setShow(window.scrollY > 700); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])
  if (!show) return null
  return <button aria-label="Lên đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 left-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur hover:bg-accent hover:text-ink-950 md:bottom-5 md:left-5"><ArrowUp size={20} /></button>
}
