import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supa, useStore } from '../../lib/store.js'
import { DataTable, inp, td } from '../../components/ui.jsx'

const Row = ({ u, self, orders, onRole, onBan, onDel }) => (
  <tr>
    <td className={`${td} font-medium text-white`}>{u.name}</td><td className={td}>{u.email}</td><td className={td}>{u.phone || '—'}</td>
    <td className={td}>{orders}</td>
    <td className={td}><select disabled={self} value={u.role} onChange={(e) => onRole(e.target.value)} className={`${inp} w-32`}><option value="customer">Khách</option><option value="admin">Admin</option></select></td>
    <td className={td}><button disabled={self} onClick={onBan} className={`rounded-full px-3 py-1 text-xs ${u.banned ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{u.banned ? 'Đã khóa' : 'Hoạt động'}</button></td>
    <td className={td}>{!self && onDel && <button onClick={onDel} className="text-xs text-zinc-500 hover:text-red-400">Xóa</button>}</td>
  </tr>
)
const Head = ({ n, children }) => (
  <div className="space-y-5"><h1 className="font-display text-3xl font-bold text-white">Người dùng ({n})</h1>
    <DataTable heads={['Tên', 'Email', 'SĐT', 'Đơn', 'Vai trò', 'Trạng thái', '']}>{children}</DataTable></div>
)

/** Chế độ server: đọc/sửa bảng profiles (xóa hẳn tài khoản làm trong Supabase → Authentication; ở đây dùng Khóa) */
function RemoteUsers() {
  const { user: me } = useAuth(), [orders] = useStore('orders'), [list, setList] = useState([])
  const load = async () => { const { data } = await supa.from('profiles').select('*').order('created_at'); setList(data || []) }
  useEffect(() => { load() }, [])
  const patch = async (id, d) => { const { error } = await supa.from('profiles').update(d).eq('id', id); error ? alert(error.message) : load() }
  return <Head n={list.length}>{list.map((u) => <Row key={u.id} u={u} self={u.id === me.id} orders={orders.filter((o) => o.userId === u.id).length}
    onRole={(role) => patch(u.id, { role })} onBan={() => patch(u.id, { banned: !u.banned })} />)}</Head>
}

function LocalUsers() {
  const { user: me } = useAuth(), [users, setUsers] = useStore('users'), [orders] = useStore('orders')
  const patch = (id, d) => setUsers((c) => c.map((u) => (u.id === id ? { ...u, ...d } : u)))
  return <Head n={users.length}>{users.map((u) => <Row key={u.id} u={u} self={u.id === me.id} orders={orders.filter((o) => o.userId === u.id).length}
    onRole={(role) => patch(u.id, { role })} onBan={() => patch(u.id, { banned: !u.banned })}
    onDel={() => confirm(`Xóa ${u.email}?`) && setUsers((c) => c.filter((x) => x.id !== u.id))} />)}</Head>
}
export default supa ? RemoteUsers : LocalUsers
