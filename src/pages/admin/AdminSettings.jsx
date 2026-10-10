import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BANKS } from '../../data/banks.js'
import { resetAll, seedRemote, supa, getStore, write, useStore } from '../../lib/store.js'
import { qrUrl } from '../../lib/payments.js'
import { RULE_DEFAULTS } from '../../lib/rules.js'
import { TEMPLATE_DEFS, TEMPLATE_VARS, fillTemplate, templateVars } from '../../lib/orderTools.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Field, btn, btn2, inp } from '../../components/ui.jsx'
import { formatVND } from '../../data/products.js'

const TABS = [['shop', 'Cửa hàng'], ['pay', 'Thanh toán & giao hàng'], ['price', 'Giá in'], ['notice', 'Thông báo & mở bán'], ['rules', 'Quy tắc & cảnh báo'], ['msg', 'Tin nhắn mẫu'], ['account', 'Tài khoản & dữ liệu']]

// Khóa lồng nhau viết dạng "nhóm|khóa" (vì tên khóa con có thể chứa dấu chấm, vd layerMult|0.12)
const getK = (o, k) => { const [a, b] = k.split('|'); return b === undefined ? o[a] : o[a]?.[b] }
const setK = (o, k, v) => { const [a, b] = k.split('|'); return b === undefined ? { ...o, [a]: v } : { ...o, [a]: { ...(o[a] || {}), [b]: v } } }
const noAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()
const isUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol) } catch { return false } }

const SAMPLE = { id: 'DH123ABC', createdAt: Date.now(), status: 'new', total: 185000, subtotal: 160000, ship: 25000, discount: 0, customer: { name: 'Minh', phone: '0900000000', payment: 'bank' }, items: [{ name: 'Móc khóa tên Alex', color: 'Đen', qty: 2 }, { name: 'In theo yêu cầu: gia-do.stl', color: 'Trắng', qty: 1, cfg: { estimate: true } }], trackingCode: 'GHN123456', shipProvider: 'GHN', trackingUrl: 'https://donhang.ghn.vn/?order_code=GHN123456' }

// Phải khai báo NGOÀI hàm render, nếu không mỗi lần gõ phím ô nhập bị tạo lại và mất con trỏ
const Group = ({ title, hint, children }) => <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5"><legend className="px-2 font-semibold text-accent">{title}</legend>{children}{hint && <p className="text-xs text-zinc-500">{hint}</p>}</fieldset>

/** Cài đặt hệ thống chia thành các tab. Mọi thay đổi chỉ áp dụng khi bấm "Lưu cài đặt"; có kiểm tra dữ liệu trước khi lưu và cảnh báo nếu rời trang khi chưa lưu. */
export default function AdminSettings() {
  const [st, setSt] = useStore('settings'), [users, setUsers] = useStore('users')
  const { user, logout } = useAuth()
  const [f, setF] = useState(st), [tab, setTab] = useState('shop'), [errs, setErrs] = useState([]), [saved, setSaved] = useState(false)
  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(st), [f, st])
  const set = (k, v) => { setSaved(false); setF((c) => setK(c, k, v)) }
  useEffect(() => { if (!dirty) return; const h = (e) => { e.preventDefault(); e.returnValue = '' }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h) }, [dirty])

  const validate = () => {
    const e = [], add = (tab, msg) => e.push({ tab, msg })
    if (!f.storeName?.trim()) add('shop', 'Chưa nhập tên cửa hàng')
    if (f.phone && !/^[0-9 +().-]{8,20}$/.test(f.phone)) add('shop', 'Số điện thoại không hợp lệ')
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) add('shop', 'Email không hợp lệ')
    if (f.zalo && !isUrl(f.zalo)) add('shop', 'Link Zalo phải bắt đầu bằng https://')
    if (f.messenger && !isUrl(f.messenger)) add('shop', 'Link Messenger phải bắt đầu bằng https://')
    if (f.bankId && !/^\d{6}$/.test(f.bankId)) add('pay', 'Mã ngân hàng (BIN) gồm đúng 6 chữ số')
    if (f.bankAccount && !/^\d{6,19}$/.test(f.bankAccount)) add('pay', 'Số tài khoản chỉ gồm 6–19 chữ số')
    for (const [k, l] of [['shipFee', 'Phí giao hàng'], ['freeShipOver', 'Miễn phí ship từ'], ['pricePerGram', 'Giá / gram'], ['pricePerHour', 'Giá / giờ in'], ['designFee', 'Phí thiết kế'], ['minCustomPrice', 'Giá tối thiểu']]) if (f[k] != null && !(Number(f[k]) >= 0)) add(k.includes('ship') || k.includes('Ship') ? 'pay' : 'price', `${l} không được âm`)
    for (const z of f.shipZones || []) { if (!z.name.trim()) add('pay', 'Có khu vực giao hàng chưa đặt tên'); if (!(Number(z.fee) >= 0)) add('pay', `Phí khu vực "${z.name}" không hợp lệ`) }
    for (const [g, o] of [['materialMult', f.materialMult || {}], ['layerMult', f.layerMult || {}]]) for (const [k, v] of Object.entries(o)) if (!(Number(v) > 0 && Number(v) <= 10)) add('price', `Hệ số ${g === 'layerMult' ? 'layer ' + k : k} phải trong khoảng 0–10`)
    if (f.announceLink && !(f.announceLink.startsWith('/') || isUrl(f.announceLink))) add('notice', 'Link thông báo phải bắt đầu bằng https:// hoặc /')
    if (f.announceOn && !f.announceText?.trim()) add('notice', 'Đã bật thanh thông báo nhưng chưa nhập nội dung')
    for (const [k, l] of [['bankHours', 'Nhắc chuyển khoản'], ['shippingDays', 'Đơn đang giao quá'], ['lapsedDays', 'Khách lâu chưa mua'], ['lowStock', 'Sản phẩm sắp hết']]) { const v = f.rules?.[k]; if (v != null && v !== '' && !(Number.isInteger(+v) && +v >= 1 && +v <= 3650)) add('rules', `"${l}" phải là số nguyên từ 1 đến 3650`) }
    return e
  }
  const save = () => { const e = validate(); setErrs(e); if (e.length) return setTab(e[0].tab); setSt(f); setSaved(true) }

  const input = (k, label, o = {}) => {
    const v = getK(f, k) ?? o.def ?? ''
    return <Field key={k} label={label}><input type={o.num ? 'number' : o.type || 'text'} min={o.num ? 0 : undefined} step={o.step} value={v} placeholder={o.ph} onChange={(e) => set(k, o.num ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)} className={inp} /></Field>
  }

  /* ---- Thanh toán: ngân hàng + QR thử ---- */
  const [qr, setQr] = useState(null), [qrAmt, setQrAmt] = useState(50000), [qrErr, setQrErr] = useState(false)
  const bankSel = BANKS.some(([b]) => b === f.bankId) ? f.bankId : 'other'

  /* ---- Tin nhắn mẫu ---- */
  const [act, setAct] = useState('confirm')
  const preview = (k) => { const def = TEMPLATE_DEFS.find((x) => x[0] === k)[2], tpl = f.msgTemplates?.[k]?.trim() ? f.msgTemplates[k] : def; return fillTemplate(tpl, templateVars(SAMPLE, f)) }

  /* ---- Tài khoản ---- */
  const [pw, setPw] = useState({ cur: '', n1: '', n2: '' }), [pwMsg, setPwMsg] = useState(null), [busy, setBusy] = useState(false), [dataMsg, setDataMsg] = useState('')
  const changePw = async () => {
    setPwMsg(null)
    if (pw.n1.length < 8) return setPwMsg(['err', 'Mật khẩu mới cần ít nhất 8 ký tự'])
    if (pw.n1 !== pw.n2) return setPwMsg(['err', 'Hai lần nhập mật khẩu mới chưa khớp'])
    setBusy(true)
    try {
      if (supa) { const { error } = await supa.auth.updateUser({ password: pw.n1 }); if (error) throw error }
      else { const me = getStore('users').find((u) => u.id === user?.id); if (!me || me.password !== pw.cur) throw new Error('Mật khẩu hiện tại không đúng'); setUsers((c) => c.map((u) => (u.id === me.id ? { ...u, password: pw.n1 } : u))) }
      setPw({ cur: '', n1: '', n2: '' }); setPwMsg(['ok', 'Đã đổi mật khẩu.'])
    } catch (x) { setPwMsg(['err', x.message || 'Không đổi được mật khẩu']) }
    setBusy(false)
  }
  const exportSettings = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ settings: st, wset: getStore('wset') }, null, 1)], { type: 'application/json' })); a.download = `cai-dat-layerlab-${new Date().toISOString().slice(0, 10)}.json`; a.click() }
  const importSettings = (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
    const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d.settings || typeof d.settings !== 'object' || !('storeName' in d.settings)) throw 0; if (!confirm('Thay cài đặt hiện tại bằng file này? (không ảnh hưởng sản phẩm, đơn hàng)')) return; setSt(d.settings); setF(d.settings); if (d.wset) write('wset', d.wset); setDataMsg('Đã nhập cài đặt.') } catch { setDataMsg('File không đúng định dạng cài đặt.') } }
    r.readAsText(file)
  }

  return (
    <div className="max-w-3xl space-y-5 pb-24">
      <h1 className="font-display text-3xl font-bold text-white">Cài đặt hệ thống</h1>
      <div className="flex gap-1 overflow-x-auto border-b border-white/10" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`whitespace-nowrap px-4 py-2 text-sm ${tab === k ? 'border-b-2 border-accent font-semibold text-white' : 'text-zinc-400 hover:text-white'}`}>{l}{errs.some((e) => e.tab === k) && <i className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-400" />}</button>)}
      </div>
      {errs.length > 0 && <ul className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{errs.map((e, i) => <li key={i}><button type="button" onClick={() => setTab(e.tab)} className="text-left underline-offset-2 hover:underline">• {e.msg} <span className="text-red-300/60">({TABS.find((t) => t[0] === e.tab)[1]})</span></button></li>)}</ul>}

      {tab === 'shop' && (
        <div className="space-y-5">
          <Group title="Thông tin cửa hàng">{input('storeName', 'Tên cửa hàng')}{input('phone', 'Số điện thoại')}{input('email', 'Email', { type: 'email' })}{input('address', 'Địa chỉ (tùy chọn)')}{input('hours', 'Giờ làm việc')}</Group>
          <Group title="Liên hệ nhanh (nút nổi, trang Liên hệ)">{input('zalo', 'Link Zalo', { ph: 'https://zalo.me/số-điện-thoại' })}{input('messenger', 'Link Messenger – để trống nếu không dùng', { ph: 'https://m.me/tên-trang' })}</Group>
          <Group title="Phiếu giao hàng in ra" hint="Dòng chữ này in ở cuối mỗi phiếu giao hàng (ví dụ lời cảm ơn, chính sách đổi trả ngắn gọn)."><Field label="Lời nhắn cuối phiếu"><textarea rows={2} maxLength={200} value={f.slipFooter || ''} onChange={(e) => set('slipFooter', e.target.value)} className={inp} placeholder="Cảm ơn bạn đã ủng hộ LayerLab 3D! Đổi trả trong 7 ngày nếu lỗi do nhà sản xuất." /></Field></Group>
        </div>)}

      {tab === 'pay' && (
        <div className="space-y-5">
          <Group title="Tài khoản nhận chuyển khoản (VietQR)" hint="Số tài khoản và tên chủ tài khoản phải đúng thì mã QR mới nhận tiền. Luôn bấm “Xem thử QR” rồi quét bằng app ngân hàng để kiểm tra trước khi bán.">
            <Field label="Ngân hàng"><select value={bankSel} onChange={(e) => set('bankId', e.target.value === 'other' ? '' : e.target.value)} className={inp}>{BANKS.map(([b, n]) => <option key={b} value={b}>{n} ({b})</option>)}<option value="other">Khác – nhập mã BIN</option></select></Field>
            {bankSel === 'other' && input('bankId', 'Mã ngân hàng (BIN, 6 chữ số)', { ph: '970xxx' })}
            {input('bankAccount', 'Số tài khoản')}
            <Field label="Tên chủ tài khoản (không dấu, viết hoa)"><div className="flex gap-2"><input value={f.bankHolder || ''} onChange={(e) => set('bankHolder', e.target.value)} className={inp} /><button type="button" onClick={() => set('bankHolder', noAccent(f.bankHolder || ''))} className={`${btn2} whitespace-nowrap`}>Bỏ dấu + viết hoa</button></div></Field>
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-ink-900 p-3">
              <Field label="Số tiền thử (₫)"><input type="number" min="1000" step="1000" value={qrAmt} onChange={(e) => setQrAmt(+e.target.value || 1000)} className={`${inp} w-36`} /></Field>
              <button type="button" onClick={() => { setQrErr(false); setQr(qrUrl(f, qrAmt, 'DHTEST')) }} className={btn2}>Xem thử QR</button>
              {qr && (qrErr ? <p className="text-sm text-red-300">Không tải được QR. Kiểm tra mã ngân hàng, số tài khoản và kết nối mạng.</p> : <img src={qr} alt="QR chuyển khoản thử" onError={() => setQrErr(true)} className="w-44 rounded-lg bg-white" />)}
            </div>
          </Group>
          <Group title="Phí giao hàng">
            {input('shipFee', 'Phí giao hàng chung (₫)', { num: true })}{input('freeShipOver', 'Miễn phí ship từ (₫)', { num: true })}
            <p className="pt-1 text-sm text-zinc-300">Phí theo khu vực</p>
            {(f.shipZones || []).map((z, i) => (
              <div key={z.id} className="flex gap-2"><input aria-label="Tên khu vực" value={z.name} onChange={(e) => set('shipZones', f.shipZones.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className={inp} /><input aria-label="Phí" type="number" min="0" value={z.fee} onChange={(e) => set('shipZones', f.shipZones.map((x, k) => (k === i ? { ...x, fee: +e.target.value } : x)))} className={`${inp} w-32`} /><button type="button" onClick={() => set('shipZones', f.shipZones.filter((_, k) => k !== i))} className="px-2 text-zinc-500 hover:text-red-400">Xóa</button></div>))}
            <button type="button" onClick={() => set('shipZones', [...(f.shipZones || []), { id: 'z' + Date.now().toString(36), name: 'Khu vực mới', fee: 30000 }])} className={btn2}>+ Thêm khu vực</button>
            <p className="text-xs text-zinc-500">Đơn đạt mức "Miễn phí ship từ" vẫn được miễn phí. Nếu xóa hết khu vực, hệ thống dùng phí chung.</p>
          </Group>
        </div>)}

      {tab === 'price' && (
        <div className="space-y-5">
          <Group title="Giá in theo yêu cầu" hint="Server tự tính lại giá theo các số này khi khách đặt hàng.">{input('pricePerGram', 'Giá / gram nhựa (₫)', { num: true })}{input('pricePerHour', 'Giá / giờ in (₫)', { num: true })}{input('designFee', 'Phí thiết kế / chỉnh file (₫)', { num: true })}{input('minCustomPrice', 'Giá tối thiểu / 1 món in theo yêu cầu (₫)', { num: true })}</Group>
          <Group title="Hệ số theo vật liệu & layer" hint="1 = giá gốc; 1.1 = đắt hơn 10%; 0.85 = rẻ hơn 15%.">
            <div className="grid gap-3 sm:grid-cols-2">{[['materialMult|PLA', 'Nhựa PLA', 1], ['materialMult|PETG', 'Nhựa PETG', 1.1], ['materialMult|ABS', 'Nhựa ABS', 1.2], ['layerMult|0.12', 'Layer 0.12 mm', 1.3], ['layerMult|0.16', 'Layer 0.16 mm', 1.15], ['layerMult|0.2', 'Layer 0.20 mm', 1], ['layerMult|0.28', 'Layer 0.28 mm', 0.85]].map(([k, l, d]) => input(k, l, { num: true, step: '0.05', def: d }))}</div>
          </Group>
          <Group title="Công cụ tùy biến">{input('keychainBase', 'Móc khóa: giá đế (₫)', { num: true })}{input('keychainPerChar', 'Móc khóa: giá mỗi ký tự (₫)', { num: true })}{input('ttBase', 'Thời khóa biểu: giá nền (₫)', { num: true })}{input('ttPerCell', 'Thời khóa biểu: giá mỗi ô (₫)', { num: true })}</Group>
          <p className="text-sm text-zinc-500">Giá vốn và thông số máy/điện của xưởng nằm ở <Link to="/admin/costing" className="text-accent">Giá vốn & sao lưu</Link>.</p>
        </div>)}

      {tab === 'notice' && (
        <div className="space-y-5">
          <Group title="Tạm ngưng nhận đơn" hint="Khi bật: thanh đỏ hiện trên mọi trang, nút Đặt hàng bị khóa. Khách vẫn xem web và thêm vào giỏ được. Lưu ý: đây là khóa trên giao diện web, chưa chặn ở phía server.">
            <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={!!f.shopClosed} onChange={(e) => set('shopClosed', e.target.checked)} className="accent-orange-500" />Tạm ngưng nhận đơn mới</label>
            <Field label="Lời nhắn cho khách"><input value={f.closedMessage || ''} maxLength={200} onChange={(e) => set('closedMessage', e.target.value)} placeholder="Xưởng nghỉ Tết, tạm ngưng nhận đơn mới." className={inp} /></Field>
            <Field label="Dự kiến mở lại"><input type="date" value={f.reopenDate || ''} onChange={(e) => set('reopenDate', e.target.value)} className={inp} /></Field>
          </Group>
          <Group title="Thanh thông báo / khuyến mãi đầu trang">
            <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={!!f.announceOn} onChange={(e) => set('announceOn', e.target.checked)} className="accent-orange-500" />Hiện thanh thông báo</label>
            <Field label="Nội dung"><input value={f.announceText || ''} maxLength={160} onChange={(e) => set('announceText', e.target.value)} placeholder="Giảm 10% cho đơn in từ 200k đến hết 30/10" className={inp} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Kiểu"><select value={f.announceTone || 'info'} onChange={(e) => set('announceTone', e.target.value)} className={inp}><option value="info">Thông tin (xanh)</option><option value="promo">Khuyến mãi (cam)</option><option value="warn">Quan trọng (đỏ)</option></select></Field>
              <Field label="Link khi bấm (tùy chọn)"><input value={f.announceLink || ''} onChange={(e) => set('announceLink', e.target.value)} placeholder="/shop hoặc https://…" className={inp} /></Field>
              <Field label="Hiển thị đến ngày"><input type="date" value={f.announceUntil || ''} onChange={(e) => set('announceUntil', e.target.value)} className={inp} /></Field>
            </div>
            {f.announceText && <div className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${{ info: 'bg-sky-600 text-white', promo: 'bg-accent text-ink-950', warn: 'bg-red-600 text-white' }[f.announceTone || 'info']}`}>{f.announceText}{f.announceLink && <span className="ml-2 underline">Xem ngay →</span>}</div>}
          </Group>
        </div>)}

      {tab === 'rules' && (
        <Group title="Ngưỡng cảnh báo" hint="Các cảnh báo này hiện ở “Việc cần làm hôm nay” (Tổng quan) và danh sách khách hàng. Để trống = dùng mặc định.">
          {[['rules|bankHours', 'Nhắc đơn chuyển khoản chưa thấy tiền sau (giờ)', RULE_DEFAULTS.bankHours], ['rules|shippingDays', 'Cảnh báo đơn “Đang giao” quá (ngày)', RULE_DEFAULTS.shippingDays], ['rules|lapsedDays', 'Khách “lâu chưa mua” sau (ngày)', RULE_DEFAULTS.lapsedDays], ['rules|lowStock', 'Sản phẩm “sắp hết hàng” khi tồn kho ≤', RULE_DEFAULTS.lowStock]].map(([k, l, d]) => input(k, l, { num: true, ph: `Mặc định ${d}` }))}
        </Group>)}

      {tab === 'msg' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Mẫu tin nhắn dùng ở chi tiết đơn hàng (nút Copy / Zalo). Dùng <b className="text-white">{'{biến}'}</b> để tự điền thông tin đơn. Để trống hoặc bấm “Khôi phục” để dùng mẫu mặc định.</p>
          <div className="flex flex-wrap gap-1.5">{TEMPLATE_VARS.map(([k, l]) => <button type="button" key={k} title={l} onClick={() => set(`msgTemplates|${act}`, `${f.msgTemplates?.[act] ?? TEMPLATE_DEFS.find((x) => x[0] === act)[2]}{${k}}`)} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/20">{`{${k}}`}</button>)}</div>
          {TEMPLATE_DEFS.map(([k, label, def]) => (
            <Group key={k} title={label}>
              <textarea rows={4} value={f.msgTemplates?.[k] ?? def} onFocus={() => setAct(k)} onChange={(e) => set(`msgTemplates|${k}`, e.target.value)} className={`${inp} font-mono text-xs`} aria-label={`Mẫu ${label}`} />
              <div className="flex items-center justify-between"><button type="button" onClick={() => setF((c) => { const m = { ...(c.msgTemplates || {}) }; delete m[k]; return { ...c, msgTemplates: m } })} className="text-xs text-zinc-400 hover:text-white">Khôi phục mặc định</button><span className="text-[11px] text-zinc-600">Biến lạ sẽ giữ nguyên chữ</span></div>
              <p className="whitespace-pre-line rounded-lg bg-ink-900 p-3 text-xs text-zinc-400"><b className="text-zinc-300">Xem thử:</b> {preview(k)}</p>
            </Group>))}
        </div>)}

      {tab === 'account' && (
        <div className="space-y-5">
          <Group title="Tài khoản đang đăng nhập"><p className="text-sm text-zinc-300">{user?.name || '—'} · {user?.email || '—'} · vai trò <b className="text-white">{user?.role === 'admin' ? 'Quản trị' : user?.role || '—'}</b></p>
            {supa && <button type="button" onClick={async () => { await supa.auth.signOut({ scope: 'global' }); logout() }} className={btn2}>Đăng xuất khỏi mọi thiết bị</button>}</Group>
          <Group title="Đổi mật khẩu" hint={supa ? 'Mật khẩu mới có hiệu lực ngay. Nên dùng mật khẩu dài, không trùng với tài khoản khác.' : 'Chế độ demo (1 máy): mật khẩu chỉ lưu trong trình duyệt này.'}>
            {!supa && <Field label="Mật khẩu hiện tại"><input type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} className={inp} /></Field>}
            <Field label="Mật khẩu mới (≥ 8 ký tự)"><input type="password" autoComplete="new-password" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} className={inp} /></Field>
            <Field label="Nhập lại mật khẩu mới"><input type="password" autoComplete="new-password" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} className={inp} /></Field>
            {pwMsg && <p className={`text-sm ${pwMsg[0] === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg[1]}</p>}
            <button type="button" disabled={busy} onClick={changePw} className={btn}>{busy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
          </Group>
          <Group title="Sao lưu & khôi phục" hint="Sao lưu toàn bộ dữ liệu (sản phẩm, đơn hàng, kho…) ở trang Giá vốn & sao lưu. Tại đây chỉ xuất/nhập riêng phần cài đặt.">
            <div className="flex flex-wrap gap-2"><button type="button" onClick={exportSettings} className={btn2}>Xuất cài đặt (JSON)</button><label className={`${btn2} cursor-pointer`}>Nhập cài đặt<input type="file" accept="application/json,.json" onChange={importSettings} className="hidden" /></label><Link to="/admin/costing" className={btn2}>Sao lưu toàn bộ dữ liệu →</Link></div>
            {dataMsg && <p className="text-sm text-accent">{dataMsg}</p>}
            <div className="border-t border-white/10 pt-3">{supa ? <button type="button" onClick={seedRemote} className={btn2}>Nạp sản phẩm mẫu lên server</button> : <button type="button" onClick={() => confirm('Xóa TOÀN BỘ dữ liệu (sản phẩm, đơn, người dùng) và khôi phục mặc định?') && resetAll()} className={`${btn2} text-red-400`}>Khôi phục dữ liệu mẫu</button>}</div>
          </Group>
        </div>)}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 px-5 py-3 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className={`text-sm ${dirty ? 'text-amber-300' : saved ? 'text-emerald-400' : 'text-zinc-500'}`}>{dirty ? '● Có thay đổi chưa lưu' : saved ? '✓ Đã lưu' : 'Chưa có thay đổi'}</span>
          <button type="button" disabled={!dirty} onClick={() => { setF(st); setErrs([]) }} className={`${btn2} ml-auto disabled:opacity-40`}>Hoàn tác</button>
          <button type="button" disabled={!dirty} onClick={save} className={`${btn} disabled:opacity-40`}>Lưu cài đặt</button>
        </div>
      </div>
    </div>
  )
}
