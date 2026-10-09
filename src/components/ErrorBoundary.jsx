import { Component } from 'react'

/** Bắt lỗi giao diện bất ngờ: thay vì trắng trang, hiện thông báo thân thiện + cách thoát */
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-5 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-bold text-white">Có lỗi xảy ra</h1>
          <p className="mt-3 text-zinc-400">Trang gặp sự cố ngoài ý muốn. Giỏ hàng của bạn vẫn được giữ. Hãy tải lại trang; nếu vẫn lỗi, nhắn Zalo cho xưởng để được hỗ trợ.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => location.reload()} className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950">Tải lại trang</button>
            <a href="/" className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white">Về trang chủ</a>
          </div>
        </div>
      </div>
    )
  }
}
