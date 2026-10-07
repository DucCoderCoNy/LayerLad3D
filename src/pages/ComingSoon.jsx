import { Link } from 'react-router-dom'
export default function ComingSoon({ title }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-32 text-center">
      <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-zinc-400">Trang này sẽ được hoàn thiện ở bước tiếp theo.</p>
      <Link to="/" className="mt-6 inline-block text-accent hover:underline">Về trang chủ</Link>
    </div>
  )
}
