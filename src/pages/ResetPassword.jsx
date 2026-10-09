import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTitle } from '../lib/seo.js'
import { Field, btn, inp } from '../components/ui.jsx'

/** Trang đích của link "đặt lại mật khẩu" trong email (Supabase tự đăng nhập tạm bằng link đó) */
export default function ResetPassword() {
  useTitle('Đặt lại mật khẩu')
  const { user, ready, updatePassword } = useAuth(), nav = useNavigate()
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState(false)
  if (!ready) return <div className="py-32 text-center text-zinc-500">Đang kiểm tra liên kết…</div>
  if (!user) return <div className="py-32 text-center text-zinc-400">Liên kết không hợp lệ hoặc đã hết hạn. <Link to="/login" className="text-accent">Yêu cầu lại</Link></div>
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (pw !== pw2) return setErr('Hai mật khẩu chưa khớp')
    try { await updatePassword(pw); setOk(true); setTimeout(() => nav('/account'), 1500) } catch (x) { setErr(x.message) }
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 px-5 py-20">
      <h1 className="font-display text-3xl font-bold text-white">Đặt mật khẩu mới</h1>
      <Field label="Mật khẩu mới (tối thiểu 6 ký tự)"><input required type="password" minLength={6} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inp} /></Field>
      <Field label="Nhập lại mật khẩu"><input required type="password" minLength={6} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inp} /></Field>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      {ok && <p role="status" className="text-sm text-neon">Đã đổi mật khẩu. Đang chuyển về tài khoản…</p>}
      <button className={`${btn} w-full`}>Lưu mật khẩu</button>
    </form>
  )
}
