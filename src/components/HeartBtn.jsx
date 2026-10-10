import { Heart } from 'lucide-react'
import { useWish } from '../context/WishlistContext.jsx'

/** Nút yêu thích. Có `label` thì hiện dạng chữ (trang chi tiết), không thì dạng nút tròn trên thẻ sản phẩm */
export default function HeartBtn({ id, name = 'sản phẩm', label = false }) {
  const { has, toggle } = useWish(), on = has(id)
  if (label) return <button type="button" aria-pressed={on} onClick={() => toggle(id)} className="text-accent hover:underline">{on ? '♥ Đã lưu vào yêu thích' : '♡ Lưu vào yêu thích'}</button>
  return (
    <button type="button" aria-pressed={on} aria-label={on ? `Bỏ ${name} khỏi yêu thích` : `Thêm ${name} vào yêu thích`} onClick={() => toggle(id)}
      className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-ink-950/70 text-white backdrop-blur transition hover:bg-ink-950">
      <Heart size={18} className={on ? 'fill-accent text-accent' : ''} />
    </button>
  )
}
