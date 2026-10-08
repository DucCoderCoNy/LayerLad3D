import { Link } from 'react-router-dom'
export default function ComingSoon({ title, text }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-32 text-center">
      <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-zinc-400">{text || "Trang bạn tìm không tồn tại hoặc đã được chuyển đi."}</p>
      <Link to="/" className="mt-6 inline-block text-accent hover:underline">Về trang chủ</Link>
    </div>
  )
}
