import { Link } from 'react-router-dom'
import { SITE } from '../../data/site.js'

/** Hình minh hoạ móc khóa: chữ "nổi" bằng chồng text-shadow, mô phỏng chữ đùn lên khỏi đế */
function KeychainArt() {
  const extrude = Array.from({ length: 8 }, (_, i) => `${i + 1}px ${i + 1}px 0 #c9ccd1`).join(',')
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="layers-dark relative flex h-44 -rotate-3 items-center rounded-[28px] bg-accent pl-20 shadow-[0_30px_60px_-20px_rgba(255,106,19,.55)]">
        <span className="absolute left-5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-ink-950 ring-4 ring-accent-soft" />
        <span className="font-display text-6xl font-bold text-white" style={{ textShadow: extrude }}>AN</span>
      </div>
      {/* Thời khóa biểu module: lưới ô ghép */}
      <div className="absolute -bottom-10 -right-2 grid rotate-6 grid-cols-4 gap-1 rounded-xl bg-ink-800 p-2 ring-1 ring-white/10">
        {['bg-neon', 'bg-accent', 'bg-white', 'bg-neon', 'bg-white', 'bg-neon', 'bg-accent', 'bg-white'].map((c, i) => (
          <i key={i} className={`layers-dark h-7 w-9 rounded-md ${c}`} />
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="layers absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Ý tưởng của bạn, <span className="text-accent">in từng lớp</span> thành thật.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-zinc-400">
            Móc khóa khắc tên, thời khóa biểu ghép module, clicker giải stress, hoặc gửi file STL/OBJ để in theo ý bạn.
            Nhựa PLA và PETG, in trên {SITE.printers.join(' và ')}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/custom" className="rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 transition hover:bg-accent-soft">Đặt in ngay</Link>
            <Link to="/shop" className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-neon hover:text-neon">Khám phá sản phẩm</Link>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            {[['1–3 ngày', 'in xong đơn nhỏ'], ['PLA · PETG', 'nhiều màu'], ['Từ 39.000₫', 'móc khóa tên']].map(([a, b]) => (
              <div key={a}><dt className="font-display text-lg font-bold text-white">{a}</dt><dd className="text-zinc-500">{b}</dd></div>
            ))}
          </dl>
        </div>
        <KeychainArt />
      </div>
    </section>
  )
}
