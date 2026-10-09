// Dữ liệu mẫu. Sau này có thể thay bằng API.
export const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'keychain', label: 'Móc khóa' },
  { id: 'study', label: 'Đồ dùng học tập' },
  { id: 'toy', label: 'Đồ chơi / Clicker' },
]

export const COLORS = ['Trắng', 'Đen', 'Đỏ', 'Custom']

export const PRODUCTS = [
  { id: 'tkb-lego', name: 'Thời khóa biểu module kiểu Lego', category: 'study', price: 129000, hot: true, hue: 'from-accent to-amber-400',
    desc: 'Bộ ô ghép 7 môn × 5 tiết, ghép/tháo như Lego, đổi lịch học trong 10 giây. In PLA, mặt chữ nổi khác màu.' },
  { id: 'mk-ten', name: 'Móc khóa tên cá nhân hóa', category: 'keychain', price: 39000, hot: true, hue: 'from-neon to-cyan-500',
    desc: 'Khắc nổi tên (hỗ trợ tiếng Việt có dấu), chọn 2 màu đế/chữ. Thành phẩm trong 1–2 ngày.' },
  { id: 'clicker-pro', name: 'Clicker Fidget bấm êm', category: 'toy', price: 89000, hot: true, hue: 'from-fuchsia-500 to-orange-400',
    desc: 'Clicker in PETG, tiếng "tách" gọn, cầm vừa tay. Giảm căng thẳng giờ ôn thi.' },
  { id: 'mk-logo', name: 'Móc khóa logo lớp / CLB', category: 'keychain', price: 45000, hot: false, hue: 'from-sky-400 to-indigo-500',
    desc: 'Đặt theo logo của lớp hoặc câu lạc bộ, giảm giá khi đặt từ 20 chiếc.' },
  { id: 'gia-sach', name: 'Giá đỡ điện thoại gấp gọn', category: 'study', price: 69000, hot: false, hue: 'from-lime-400 to-emerald-500',
    desc: 'Giá đỡ gấp phẳng bỏ vừa túi, 3 góc nghiêng, dùng cho học online.' },
  { id: 'fidget-spin', name: 'Fidget Spinner trục bi', category: 'toy', price: 59000, hot: false, hue: 'from-rose-500 to-red-400',
    desc: 'Quay êm nhờ vòng bi 608, in PLA nhiều màu.' },
]

export const formatVND = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(+n || 0)) + '₫'
