import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import FloatingContact from './FloatingContact.jsx'
import CartDrawer from './CartDrawer.jsx'
import AnnouncementBar from './AnnouncementBar.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar /><Header /><main className="flex-1"><Outlet /></main><Footer /><CartDrawer /><FloatingContact />
    </div>
  )
}
