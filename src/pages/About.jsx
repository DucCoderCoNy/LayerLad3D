import { Link } from 'react-router-dom'
import { SITE } from '../data/site.js'
import { useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'

/** Trang giới thiệu. Nội dung chung chung, hãy sửa lại bằng câu chuyện thật của xưởng (ảnh, năm thành lập, ai làm...) */
export default function About() {
  useTitle('Về LayerLab 3D', 'LayerLab 3D là xưởng in 3D FDM nhận in theo yêu cầu, bán móc khóa, thời khóa biểu module và đồ dùng nhỏ.')
  const [st] = useStore('settings')
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Về {st.storeName || SITE.name}</h1>
      <p className="mt-4 leading-relaxed text-zinc-300">{SITE.name} là xưởng {SITE.tagline.toLowerCase()}. Bên mình làm đồ dùng nhỏ như móc khóa, thời khóa biểu ghép module, clicker, và nhận in các chi tiết theo file STL/3MF của bạn.</p>
      <h2 className="mt-10 font-display text-2xl font-bold text-white">Máy in của xưởng</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-300">{SITE.printers.map((p) => <li key={p}>{p}</li>)}</ul>
      <h2 className="mt-10 font-display text-2xl font-bold text-white">Đặt hàng hoạt động thế nào</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-zinc-300">
        <li>Chọn sản phẩm có sẵn, hoặc tải file STL/3MF để in theo yêu cầu.</li>
        <li>Xem giá ngay trên web. Với in theo file, giá là ước tính và xưởng xác nhận lại sau khi kiểm tra file.</li>
        <li>Hàng có sẵn thanh toán COD hoặc chuyển khoản; hàng làm riêng chuyển khoản 100% trước khi in.</li>
        <li>Theo dõi tình trạng đơn ở trang <Link to="/tra-cuu" className="text-accent hover:underline">Tra cứu đơn</Link>.</li>
      </ol>
      <div className="mt-10 flex flex-wrap gap-3"><Link to="/custom" className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950">In theo yêu cầu</Link><Link to="/lien-he" className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20">Liên hệ</Link></div>
    </div>
  )
}
