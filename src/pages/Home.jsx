import { Link } from 'react-router-dom'
import Hero from '../components/home/Hero.jsx'
import FeaturedProducts from '../components/home/FeaturedProducts.jsx'
import { LatestPosts, Reviews, Tools } from '../components/home/Extras.jsx'
import { useTitle } from '../lib/seo.js'
import Process from '../components/home/Process.jsx'

export default function Home() {
  useTitle()
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <Tools />
      <Process />
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="layers-dark flex flex-col items-start justify-between gap-5 rounded-3xl bg-accent p-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">Có file STL trong tay rồi?</h2>
            <p className="mt-1 text-ink-950/80">Tải lên là có báo giá, không cần đăng ký tài khoản.</p>
          </div>
          <Link to="/custom" className="rounded-xl bg-ink-950 px-6 py-3 font-semibold text-white hover:bg-ink-800">Tải file lên</Link>
        </div>
      </section>
      <Reviews />
      <LatestPosts />
      <div className="pb-4" />
    </>
  )
}
