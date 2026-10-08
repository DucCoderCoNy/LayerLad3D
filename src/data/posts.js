// Bài viết mẫu (nạp lần đầu). Sau đó quản lý trong Admin → Bài viết.
export const POST_CATS = [
  { id: 'vat-lieu', label: 'Vật liệu' },
  { id: 'ky-thuat', label: 'Kỹ thuật in 3D' },
  { id: 'huong-dan', label: 'Hướng dẫn' },
  { id: 'tin-xuong', label: 'Tin từ xưởng' },
]
const t = Date.now()
export const POSTS = [
  { id: 'pla-la-gi', title: 'PLA là gì? Vì sao đa số đồ in 3D dùng PLA', category: 'vat-lieu', cover: '', published: true, createdAt: t - 5e5,
    excerpt: 'PLA là loại nhựa dễ in, nhiều màu, giá rẻ – lựa chọn mặc định cho móc khóa, mô hình và đồ trang trí.',
    content: `PLA (polylactic acid) là nhựa sinh học làm từ tinh bột ngô hoặc mía. Đây là loại nhựa phổ biến nhất trong in 3D FDM vì dễ in và cho bề mặt đẹp.

## Ưu điểm

- Dễ in, ít cong vênh, không cần buồng kín.
- Nhiều màu, nhiều dòng đặc biệt (silk, matte, đổi màu).
- Giá thấp, chi tiết sắc nét.

## Nhược điểm

- Mềm ở khoảng 55–60°C: để trong xe dưới nắng có thể biến dạng.
- Giòn hơn PETG, chịu va đập và uốn kém hơn.

## Thông số in tham khảo

Nhiệt độ đầu in khoảng 190–220°C, bàn in 0–60°C tùy máy và loại nhựa. Thông số cụ thể nên theo khuyến nghị in trên cuộn nhựa của hãng.

## Phù hợp với

Móc khóa, thời khóa biểu module, mô hình trưng bày, đồ trang trí. Không phù hợp cho chi tiết đặt ngoài nắng nóng hoặc chịu lực lớn.` },
  { id: 'petg-la-gi', title: 'PETG: bền hơn PLA, khi nào nên chọn?', category: 'vat-lieu', cover: '', published: true, createdAt: t - 4e5,
    excerpt: 'PETG dai, chịu nhiệt và chịu nước tốt hơn PLA, đổi lại khó in hơn một chút.',
    content: `PETG là biến thể của loại nhựa làm chai nước, cân bằng giữa độ dễ in của PLA và độ bền của ABS.

## Ưu điểm

- Dai, ít gãy giòn, chịu va đập tốt hơn PLA.
- Chịu nhiệt khoảng 70–80°C, chịu nước và nhiều hóa chất tốt hơn.
- Bề mặt hơi bóng, bám bàn in rất chắc.

## Nhược điểm

- Dễ ra "tơ" (stringing) nếu cài đặt chưa chuẩn.
- Hút ẩm khá nhiều: nhựa ẩm sẽ nổ lụp bụp, bề mặt xấu. Nên bảo quản kín, sấy nếu cần.
- Khó đánh bóng, khó sơn hơn PLA.

## Thông số in tham khảo

Đầu in khoảng 230–250°C, bàn in 70–85°C. Hãy ưu tiên thông số của nhà sản xuất cuộn nhựa.

## Phù hợp với

Clicker, giá đỡ điện thoại, chi tiết chịu lực nhẹ, vật dụng hay tiếp xúc nước hoặc để ngoài trời nhẹ.` },
  { id: 'abs-asa', title: 'ABS và ASA: chịu nhiệt tốt nhưng đòi hỏi máy in phù hợp', category: 'vat-lieu', cover: '', published: true, createdAt: t - 3e5,
    excerpt: 'ABS chịu nhiệt khoảng 100°C và bền va đập, nhưng dễ cong vênh và cần buồng in kín.',
    content: `ABS là nhựa kỹ thuật quen thuộc (vỏ đồ chơi Lego làm từ ABS). ASA là phiên bản tương tự nhưng chống tia UV tốt hơn, hợp đồ đặt ngoài trời.

## Ưu điểm

- Chịu nhiệt khoảng 100°C.
- Bền, chịu va đập, có thể mài, dán và xử lý bề mặt bằng hơi acetone.

## Nhược điểm

- Co ngót mạnh nên dễ cong vênh, tách lớp: cần bàn in nóng và **buồng in kín**.
- Khi in có mùi khó chịu: cần thông gió tốt.

## Thông số in tham khảo

Đầu in khoảng 230–260°C, bàn in 90–110°C.

## Đặt in bằng ABS/ASA

Không phải máy in nào cũng in ABS ổn định. Khi bạn chọn ABS trong form "In theo yêu cầu", xưởng sẽ kiểm tra khả năng và báo giá riêng.` },
  { id: 'do-day-lop-va-infill', title: 'Độ dày lớp, infill và số vách: chỉnh thế nào cho đúng?', category: 'ky-thuat', cover: '', published: true, createdAt: t - 2e5,
    excerpt: 'Ba thông số quyết định chất lượng, độ bền, thời gian và giá của món đồ in 3D.',
    content: `## Độ dày lớp (layer height)

- 0.2 mm: mức chuẩn, cân bằng giữa đẹp và nhanh.
- 0.1–0.12 mm: bề mặt mịn, chi tiết nhỏ rõ hơn nhưng thời gian in có thể gấp đôi.
- 0.28 mm: in nhanh, thấy rõ vân lớp, hợp chi tiết thô hoặc bản thử.

## Infill (độ đặc bên trong)

- 10–15%: đồ trang trí, mô hình.
- 20–30%: vật dụng thông thường.
- 50% trở lên: chi tiết chịu lực.

Tăng infill làm tăng lượng nhựa và thời gian in, vì thế giá cũng tăng theo.

## Số vách (wall / perimeter)

Với nhiều chi tiết, tăng số vách từ 2 lên 3–4 giúp bền hơn rõ rệt so với việc chỉ tăng infill.

## Hướng đặt khi in

Vật in yếu nhất ở chiều giữa các lớp (trục Z). Với chi tiết chịu kéo hoặc uốn, nên đặt sao cho lực không kéo tách các lớp ra.` },
  { id: 'chon-nhua-nao', title: 'PLA, PETG, ABS, TPU: so sánh nhanh để chọn đúng nhựa', category: 'huong-dan', cover: '', published: true, createdAt: t - 1e5,
    excerpt: 'Không có nhựa tốt nhất, chỉ có nhựa hợp nhất với mục đích sử dụng của bạn.',
    content: `## Chọn theo nhu cầu

- **Đồ trang trí, móc khóa, mô hình:** PLA.
- **Đồ dùng hằng ngày, cần dai và chịu nước:** PETG.
- **Chịu nhiệt cao, chịu va đập:** ABS hoặc ASA (đặt ngoài trời nên chọn ASA).
- **Cần mềm, đàn hồi (ốp, đệm, vòng đeo):** TPU.

## Bảng so sánh ngắn

- **PLA:** dễ in nhất, chịu nhiệt thấp (khoảng 55–60°C), giòn.
- **PETG:** dễ in vừa, chịu nhiệt khoảng 70–80°C, dai.
- **ABS/ASA:** khó in, chịu nhiệt khoảng 100°C, bền va đập.
- **TPU:** in chậm, mềm dẻo, cần cài đặt riêng.

Chưa chắc nên chọn loại nào? Cứ ghi mục đích sử dụng vào ghi chú khi gửi yêu cầu in, xưởng sẽ tư vấn.` },
]
