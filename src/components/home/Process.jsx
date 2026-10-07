import { Calculator, Package, Upload } from 'lucide-react'

const STEPS = [
  { icon: Upload, title: 'Gửi yêu cầu hoặc file', text: 'Tải file STL/OBJ, chọn vật liệu, màu và độ đặc. Chưa có file? Mô tả ý tưởng, bên mình hỗ trợ thiết kế.' },
  { icon: Calculator, title: 'Nhận báo giá', text: 'Giá tính theo gram nhựa, thời gian in và phí chỉnh file. Bạn xác nhận rồi mới in, trong vòng vài giờ.' },
  { icon: Package, title: 'In xong, nhận hàng', text: 'Hậu xử lý gọn gàng, đóng gói cẩn thận, giao tận nơi hoặc nhận tại cửa hàng.' },
]

export default function Process() {
  return (
    <section className="border-y border-white/10 bg-ink-900">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl font-bold text-white">Đặt in chỉ với 3 bước</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-white/10 bg-ink-800 p-6">
              <span className="absolute right-5 top-4 font-display text-5xl font-bold text-white/5">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 text-neon"><Icon size={24} /></span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
