import { createContext, useContext, useEffect, useState } from 'react'
import { getStore, setRole, supa, uid, useStore } from '../lib/store.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

/** Chế độ 1 máy (chưa có .env): tài khoản giả lập trong localStorage, chỉ để demo */
function LocalAuth({ children }) {
  const [sid, setSid] = useState(() => localStorage.getItem('ll3d:session'))
  const [users, setUsers] = useStore('users')
  const user = users.find((u) => u.id === sid && !u.banned) || null
  const start = (id) => { localStorage.setItem('ll3d:session', id); setSid(id) }
  const login = async (email, pw) => {
    const u = getStore('users').find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === pw)
    if (!u) throw new Error('Email hoặc mật khẩu không đúng')
    if (u.banned) throw new Error('Tài khoản đã bị khóa')
    start(u.id)
  }
  const register = async (name, email, pw, phone) => {
    if (getStore('users').some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Email đã được đăng ký')
    const u = { id: uid('u'), name, email: email.trim(), password: pw, phone, role: 'customer', banned: false, createdAt: Date.now() }
    setUsers((c) => [...c, u]); start(u.id)
  }
  const logout = () => { localStorage.removeItem('ll3d:session'); setSid(null) }
  return <AuthContext.Provider value={{ user, ready: true, login, register, logout }}>{children}</AuthContext.Provider>
}

/** Chế độ server: Supabase Auth (mật khẩu được mã hóa), vai trò lấy từ bảng profiles */
function SupaAuth({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false)
  const loadProfile = async (session, retry = true) => {
    if (!session) { setUser(null); setRole(null); setReady(true); return }
    const { data } = await supa.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    if (!data && retry) { await new Promise((r) => setTimeout(r, 700)); return loadProfile(session, false) } // chờ trigger tạo hồ sơ
    if (data?.banned) { await supa.auth.signOut(); setUser(null); setRole(null); setReady(true); return }
    const u = data || { id: session.user.id, name: session.user.email, email: session.user.email, role: 'customer' }
    setUser(u); setRole(u.role || 'customer'); setReady(true)
  }
  useEffect(() => {
    supa.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => setTimeout(() => loadProfile(session), 0))
    return () => sub.subscription.unsubscribe()
  }, [])
  const login = async (email, pw) => {
    const { error } = await supa.auth.signInWithPassword({ email: email.trim(), password: pw })
    if (error) throw new Error('Email hoặc mật khẩu không đúng')
  }
  const register = async (name, email, pw, phone) => {
    const { data, error } = await supa.auth.signUp({ email: email.trim(), password: pw, options: { data: { name, phone } } })
    if (error) throw new Error(/registered/i.test(error.message) ? 'Email đã được đăng ký' : error.message)
    if (!data.session) throw new Error('Đã gửi email xác nhận, hãy kiểm tra hộp thư rồi đăng nhập')
  }
  const logout = () => supa.auth.signOut()
  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>
}

export const AuthProvider = supa ? SupaAuth : LocalAuth
