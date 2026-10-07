import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Field, btn, inp } from '../components/ui.jsx'

export default function Auth() {
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const [reg, setReg] = useState(false), [f, setF] = useState({ name: '', email: '', pw: '', phone: '' }), [err, setErr] = useState('')
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/account'} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    try { reg ? await register(f.name, f.email, f.pw, f.phone) : await login(f.email, f.pw); nav('/account') } catch (x) { setErr(x.message) }
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 px-5 py-20">
      <h1 className="font-display text-3xl font-bold text-white">{reg ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
      {reg && <Field label="Họ tên"><input required value={f.name} onChange={set('name')} className={inp} /></Field>}
      <Field label="Email"><input required type="email" value={f.email} onChange={set('email')} className={inp} /></Field>
      {reg && <Field label="Số điện thoại"><input value={f.phone} onChange={set('phone')} className={inp} /></Field>}
      <Field label="Mật khẩu"><input required type="password" minLength={6} value={f.pw} onChange={set('pw')} className={inp} /></Field>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button className={`${btn} w-full`}>{reg ? 'Đăng ký' : 'Đăng nhập'}</button>
      <button type="button" onClick={() => { setReg(!reg); setErr('') }} className="w-full text-sm text-zinc-400 hover:text-accent">{reg ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button>
    </form>
  )
}
