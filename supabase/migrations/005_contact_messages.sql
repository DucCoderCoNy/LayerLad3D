-- =====================================================================
-- Migration 005 – Tin nhắn liên hệ từ trang Liên hệ (khách gửi, admin xử lý). Chạy lại nhiều lần an toàn.
-- Yêu cầu: đã chạy 001 (hàm is_admin).
-- =====================================================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  phone text check (phone is null or length(phone) <= 20),
  email text check (email is null or length(email) <= 120),
  message text not null check (length(trim(message)) between 5 and 2000),
  status text not null default 'new' check (status in ('new','read','done')),
  admin_note text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);

alter table public.contact_messages enable row level security;
drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());
-- Ai cũng gửi được tin nhắn mới (không đọc lại được). Không cho tự đặt trạng thái / ghi chú / gắn tài khoản của người khác.
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages for insert to anon, authenticated
  with check (status = 'new' and admin_note is null and (user_id is null or user_id = auth.uid()));
