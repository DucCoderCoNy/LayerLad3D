// Màu nhựa mặc định (Admin → Quản lý màu có thể thêm/sửa/xóa). Tên màu được lưu vào đơn hàng, nên đổi tên màu không ảnh hưởng đơn cũ.
export const DEFAULT_COLORS = [
  { id: 'c-trang', name: 'Trắng', hex: '#f5f5f5', active: true, sort: 1 },
  { id: 'c-den', name: 'Đen', hex: '#1c1c1c', active: true, sort: 2 },
  { id: 'c-do', name: 'Đỏ', hex: '#e03131', active: true, sort: 3 },
  { id: 'c-xd', name: 'Xanh dương', hex: '#1c7ed6', active: true, sort: 4 },
  { id: 'c-xl', name: 'Xanh lá', hex: '#2f9e44', active: true, sort: 5 },
  { id: 'c-vang', name: 'Vàng', hex: '#fab005', active: true, sort: 6 },
  { id: 'c-cam', name: 'Cam', hex: '#f76707', active: true, sort: 7 },
  { id: 'c-xam', name: 'Xám', hex: '#868e96', active: true, sort: 8 },
]
export const CUSTOM_COLOR = 'Màu khác (ghi chú)'
