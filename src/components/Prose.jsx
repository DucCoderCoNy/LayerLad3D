/** Hiển thị nội dung bài viết viết kiểu đơn giản: "## Tiêu đề", "### Tiêu đề nhỏ", "- gạch đầu dòng", **in đậm**, cách đoạn bằng dòng trống */
const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((t, i) => (t.length > 4 && t.startsWith('**') && t.endsWith('**') ? <b key={i} className="text-white">{t.slice(2, -2)}</b> : t))
export default function Prose({ text }) {
  return (
    <div className="space-y-4 leading-relaxed text-zinc-300">
      {(text || '').split(/\n{2,}/).map((b, i) => {
        const L = b.split('\n')
        if (b.startsWith('## ')) return <h2 key={i} className="pt-4 font-display text-2xl font-bold text-white">{b.slice(3)}</h2>
        if (b.startsWith('### ')) return <h3 key={i} className="pt-2 font-display text-xl font-semibold text-white">{b.slice(4)}</h3>
        if (L.every((l) => l.startsWith('- '))) return <ul key={i} className="list-disc space-y-1 pl-6">{L.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>
        return <p key={i}>{inline(b)}</p>
      })}
    </div>
  )
}
