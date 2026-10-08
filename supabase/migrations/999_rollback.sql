-- Gỡ toàn bộ phần quan hệ mới (001 + 002). KHÔNG đụng `records` nên web cũ không bị ảnh hưởng.
-- ⚠ Xóa luôn dữ liệu đã nhập vào các bảng mới (đơn mới, kho nhựa, ...). Chỉ chạy khi chắc chắn.
drop view if exists public.customer_stats, public.filament_stock;
drop function if exists public.admin_set_order_status(uuid, text), public.track_order_v2(text, text), public.place_order_v2(jsonb), public.gen_order_code();
drop table if exists public.settings, public.reviews, public.blog_posts, public.expenses, public.print_queue, public.printers, public.filament_inventory,
  public.uploaded_files, public.order_items, public.orders, public.customers, public.product_colors, public.product_images,
  public.products, public.colors, public.categories cascade;
drop function if exists public.orders_paid_at(), public.normalize_phone(text), public.set_updated_at();
