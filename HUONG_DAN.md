# Hướng dẫn: Vercel + Supabase

Trang web chạy trên **Vercel** (https://baocaohotronamdinh.vercel.app), số liệu lưu ở **Supabase**.
Khóa kết nối nằm trong **Environment Variables** của Vercel, không ghi vào code. Mỗi lần build, Vercel tự tạo `config.js`.

```
Người dùng ──► Vercel (index.html, app.js…) ──► Supabase (cơ sở dữ liệu)
                     ▲ build-config.js đọc SUPABASE_URL + SUPABASE_ANON_KEY
```

## Các file trong repo

| File | Vai trò |
|---|---|
| `index.html`, `styles.css`, `app.js` | Trang web |
| `config.js` | Vercel tự ghi đè khi build. Cứ để nguyên trong repo |
| `build-config.js` | Script Vercel chạy khi build để tạo `config.js` |
| `vercel.json` | Báo Vercel chạy script trên |
| `.vercelignore` | Không đưa `supabase_setup.sql`, `HUONG_DAN.md` lên web |
| `supabase_setup.sql` | Dán vào SQL Editor của Supabase (chỉ chạy 1 lần) |

> ⚠️ Đừng sửa mã nhập liệu **trong file `supabase_setup.sql` trong repo**. Nếu repo GitHub để công khai, ai cũng đọc được. Chỉ đổi mã khi đã dán vào SQL Editor của Supabase.

---

## Bước 1. Đẩy các file mới lên repo

Copy `build-config.js`, `vercel.json`, `.vercelignore` cùng các file đã cập nhật vào repo, rồi commit và push.
`.vercelignore` bắt đầu bằng dấu chấm nên có thể bị ẩn trong thư mục, cần bật “hiện file ẩn” để thấy.

## Bước 2. Tạo Supabase project

Chọn **một** trong hai cách.

**Cách A: tạo ngay trong Vercel (khóa tự điền, khuyên dùng)**
1. Vào Vercel → project **baocaohotronamdinh** → tab **Storage**.
2. Bấm **Create Database**, chọn **Supabase**, rồi làm theo hướng dẫn trên màn hình. Chọn gói **Free**, vùng **Singapore**.
3. Ở bước kết nối, chọn project `baocaohotronamdinh`. Vercel sẽ tự thêm các biến `SUPABASE_URL`, `SUPABASE_ANON_KEY`… vào project.

**Cách B: đã có project trên supabase.com**
1. Trong Supabase, bấm **Connect** (hoặc **Project Settings → API Keys**). Copy **Project URL** và **Publishable key** (`sb_publishable_…`). Nếu không có thì dùng khóa **anon public** (`eyJ…`).
2. Vào Vercel → project → **Settings → Environment Variables**, thêm 2 biến, tick đủ *Production, Preview, Development*:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | khóa publishable hoặc anon |

> ❌ Không dán khóa **secret / service_role** vào đây. Nếu lỡ dán, build sẽ tự báo lỗi để chặn lại.

## Bước 3. Tạo bảng dữ liệu

1. Mở Supabase. Với cách A, vào Vercel → Storage → bấm vào database → **Open in Supabase**.
2. Chọn **SQL Editor → New query**. Dán toàn bộ `supabase_setup.sql`.
3. Ở dòng `values (1, '1234')`, đổi `1234` thành **mã nhập liệu** của cậu.
4. Bấm **Run**. Thấy **Success** là xong.

## Bước 4. Build lại trên Vercel

Biến môi trường chỉ có tác dụng ở **lần build sau**. Vào Vercel → **Deployments** → bấm **⋯** ở bản mới nhất → **Redeploy**. Hoặc push một commit bất kỳ cũng được.

Trong log build, tìm dòng:
```
✅ Đã tạo config.js từ SUPABASE_URL và SUPABASE_ANON_KEY.
```

## Bước 5. Kiểm tra

Mở https://baocaohotronamdinh.vercel.app:
- Góc trên có **chấm xanh** và dòng **“Dữ liệu chung, cập nhật …”** là đã nối thành công. 🎉
- Bấm **＋ Nhập KPI hôm nay**, nhập thử rồi bấm Lưu. Trang sẽ hỏi mã nhập liệu.
- Mở trang trên điện thoại hoặc máy khác, số vừa nhập sẽ hiện ở đó.

---

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| Vẫn hiện “Chưa nối cơ sở dữ liệu chung” | Biến môi trường chưa vào bản build. Kiểm tra lại tên biến, rồi **Redeploy**. Xem log build có dòng ✅ chưa |
| Log build báo ⚠️ “Chưa thấy SUPABASE_URL…” | Tên biến sai, hoặc chưa tick môi trường *Production* |
| Build báo ❌ “khóa BÍ MẬT” | Đang dùng nhầm khóa secret. Đổi sang khóa publishable hoặc anon |
| “Không tải được dữ liệu từ Supabase” | Chưa chạy `supabase_setup.sql`, hoặc project Supabase đang bị tạm dừng (bấm **Restore**) |
| Lưu báo “Sai mã nhập liệu” | Kiểm tra mã trong Supabase: SQL Editor → `select pin from kpi_secret;` |

## Dùng hằng ngày

- **Đổi mã nhập liệu:** SQL Editor → `update public.kpi_secret set pin = 'MA_MOI' where id = 1;`
- **Xem hoặc sửa số liệu gốc:** Supabase → **Table Editor → kpi_rows**
- **Đưa số liệu cũ vào:** trên trang, chọn **Nhập KPI → Tải tệp Excel**
- **Sao lưu:** trên trang, chọn **Cài đặt → Tải file sao lưu**, mỗi tuần hoặc mỗi tháng một lần. Gói Free của Supabase không tự sao lưu để khôi phục được.
- Project Free bị **tạm dừng nếu cả tuần không ai dùng**. Nếu bị dừng, vào Supabase bấm **Restore**, dữ liệu vẫn còn.
