/** Hình cuộn nhựa nhìn từ phía trước: vòng nhựa có màu thật, độ dày vòng thể hiện lượng nhựa còn lại, lõi rỗng ở giữa.
 *  pct: 0..1 (còn lại / cuộn đầy). Không dùng ảnh ngoài nên nhẹ và luôn nét. */
export default function Spool({ hex = '#6b7280', pct = 1, size = 120, unknown = false, low = false }) {
  const p = Math.max(0, Math.min(1, pct)), hub = 19, maxR = 50
  const r = p > 0 ? hub + 3 + (maxR - hub - 3) * Math.sqrt(p) : 0 // diện tích cuộn ~ khối lượng → bán kính tỉ lệ căn bậc hai
  const rings = r > hub + 8 ? [0.35, 0.62, 0.84].map((t) => hub + 3 + (r - hub - 3) * t) : []
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Cuộn nhựa còn ${Math.round(p * 100)}%`} className="drop-shadow-[0_6px_6px_rgba(0,0,0,.45)]">
      <circle cx="60" cy="60" r="56" fill="#2b2f3a" stroke="#4a5163" strokeWidth="2" />
      {[0, 60, 120, 180, 240, 300].map((a) => <circle key={a} cx={60 + 40 * Math.cos((a * Math.PI) / 180)} cy={60 + 40 * Math.sin((a * Math.PI) / 180)} r="5" fill="#161920" />)}
      {r > 0 && (
        <>
          <circle cx="60" cy="60" r={r} fill={unknown ? '#4b5563' : hex} stroke="rgba(0,0,0,.35)" strokeWidth="1.5" strokeDasharray={unknown ? '4 3' : undefined} />
          {rings.map((x) => <circle key={x} cx="60" cy="60" r={x} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth="1" />)}
          <path d={`M ${60 - r * 0.8} ${60 - r * 0.45} A ${r * 0.92} ${r * 0.92} 0 0 1 ${60 + r * 0.25} ${60 - r * 0.88}`} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" />
        </>)}
      <circle cx="60" cy="60" r={hub} fill="#2b2f3a" stroke="#4a5163" strokeWidth="2" />
      <circle cx="60" cy="60" r="9" fill="#10131a" />
      {low && <circle cx="60" cy="60" r="56" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 5" />}
      {unknown && r > 0 && <text x="60" y="66" textAnchor="middle" fontSize="14" fill="#d1d5db" opacity=".0">?</text>}
    </svg>
  )
}
