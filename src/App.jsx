import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Checkout, { OrderDone } from './pages/Checkout.jsx'
import Custom from './pages/Custom.jsx'
import Keychain from './pages/Keychain.jsx'
import Timetable from './pages/Timetable.jsx'
import Design from './pages/Design.jsx'
import Track from './pages/Track.jsx'
import News, { Post } from './pages/News.jsx'
import Gallery from './pages/Gallery.jsx'
import { Contact, Faq, Policy } from './pages/Info.jsx'
import Auth from './pages/Auth.jsx'
import Account from './pages/Account.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

// Khu quản trị tải riêng (lazy) để khách không phải tải mã admin
const L = (f) => lazy(f)
const AdminLayout = L(() => import('./pages/admin/AdminLayout.jsx'))
const Dashboard = L(() => import('./pages/admin/Dashboard.jsx'))
const AdminProducts = L(() => import('./pages/admin/AdminProducts.jsx'))
const AdminCategories = L(() => import('./pages/admin/AdminCategories.jsx'))
const AdminOrders = L(() => import('./pages/admin/AdminOrders.jsx'))
const AdminRequests = L(() => import('./pages/admin/AdminRequests.jsx'))
const AdminPosts = L(() => import('./pages/admin/AdminPosts.jsx'))
const AdminShowcase = L(() => import('./pages/admin/AdminShowcase.jsx'))
const AdminReport = L(() => import('./pages/admin/AdminReport.jsx'))
const AdminUsers = L(() => import('./pages/admin/AdminUsers.jsx'))
const AdminSettings = L(() => import('./pages/admin/AdminSettings.jsx'))
const WorkshopOrders = L(() => import('./pages/admin/WorkshopOrders.jsx'))
const WorkshopQueue = L(() => import('./pages/admin/WorkshopQueue.jsx'))
const WorkshopStock = L(() => import('./pages/admin/WorkshopStock.jsx'))
const WorkshopCash = L(() => import('./pages/admin/WorkshopCash.jsx'))
const AdminCosting = L(() => import('./pages/admin/AdminCosting.jsx'))
const AdminInsights = L(() => import('./pages/admin/AdminInsights.jsx'))
const AdminColors = L(() => import('./pages/admin/AdminColors.jsx'))
const AdminPrinters = L(() => import('./pages/admin/AdminPrinters.jsx'))
const AdminCalendar = L(() => import('./pages/admin/AdminCalendar.jsx'))
const AdminCustomers = L(() => import('./pages/admin/AdminCustomers.jsx'))

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-zinc-500">Đang tải…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:id" element={<ProductDetail />} />
          <Route path="thiet-ke" element={<Design />} />
          <Route path="thiet-ke/moc-khoa" element={<Keychain />} />
          <Route path="thiet-ke/thoi-khoa-bieu" element={<Timetable />} />
          <Route path="custom" element={<Custom />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:id" element={<OrderDone />} />
          <Route path="tra-cuu" element={<Track />} />
          <Route path="tin-tuc" element={<News />} />
          <Route path="tin-tuc/:id" element={<Post />} />
          <Route path="thu-vien" element={<Gallery />} />
          <Route path="faq" element={<Faq />} />
          <Route path="lien-he" element={<Contact />} />
          <Route path="chinh-sach/:slug" element={<Policy />} />
          <Route path="login" element={<Auth />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="showcase" element={<AdminShowcase />} />
          <Route path="report" element={<AdminReport />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="workshop" element={<WorkshopOrders />} />
          <Route path="queue" element={<WorkshopQueue />} />
          <Route path="insights" element={<AdminInsights />} />
          <Route path="colors" element={<AdminColors />} />
          <Route path="printers" element={<AdminPrinters />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="stock" element={<WorkshopStock />} />
          <Route path="cash" element={<WorkshopCash />} />
          <Route path="costing" element={<AdminCosting />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
