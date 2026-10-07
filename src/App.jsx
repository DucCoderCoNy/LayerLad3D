import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Checkout, { OrderDone } from './pages/Checkout.jsx'
import Custom from './pages/Custom.jsx'
import Auth from './pages/Auth.jsx'
import Account from './pages/Account.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminRequests from './pages/admin/AdminRequests.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import WorkshopOrders from './pages/admin/WorkshopOrders.jsx'
import WorkshopQueue from './pages/admin/WorkshopQueue.jsx'
import WorkshopStock from './pages/admin/WorkshopStock.jsx'
import WorkshopCash from './pages/admin/WorkshopCash.jsx'
import AdminCosting from './pages/admin/AdminCosting.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:id" element={<ProductDetail />} />
        <Route path="custom" element={<Custom />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:id" element={<OrderDone />} />
        <Route path="login" element={<Auth />} />
        <Route path="account" element={<Account />} />
        <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="workshop" element={<WorkshopOrders />} />
        <Route path="queue" element={<WorkshopQueue />} />
        <Route path="stock" element={<WorkshopStock />} />
        <Route path="cash" element={<WorkshopCash />} />
        <Route path="costing" element={<AdminCosting />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
