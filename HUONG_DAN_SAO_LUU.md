# Bật sao lưu tự động hằng tuần cho EasySupport

Làm **một lần**, khoảng 10 phút. Sau đó hệ thống tự chạy:

- **08:00 sáng Chủ nhật**: sao lưu toàn bộ dữ liệu vào một kho GitHub **riêng tư**, giữ 52 bản gần nhất (khoảng 1 năm).
- **08:00 sáng Thứ 4**: “đánh thức” Supabase để không bị tạm dừng khi cả đội nghỉ dài ngày (Tết, lễ).

Mỗi bản sao lưu gồm:

| File | Dùng để |
|---|---|
| `du_lieu.json` | Khôi phục **ngay trên web** (Cài đặt → Khôi phục từ file): KPI và danh mục |
| `co_so_du_lieu.sql.gz` | Bản **đầy đủ** mọi bảng (cả công việc, kế hoạch, nhật ký), dùng khi cần dựng lại toàn bộ |
| `README.md` | Ghi số dòng KPI, số nhân viên, số công việc của bản đó |

---

## Bước 1. Lấy chuỗi kết nối Supabase (3 phút)

1. Vào **supabase.com**, mở project `baocaohotro`.
2. Bấm nút **Connect** ở phía trên trang.
3. Ở tab **Connection String**, chọn:
   - **Type**: `URI`
   - **Method**: **`Session pooler`** ⚠️ Đừng chọn *Direct connection*, vì GitHub không kết nối được kiểu đó.
4. Chép chuỗi, có dạng:
   `postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
5. Thay `[YOUR-PASSWORD]` bằng **mật khẩu cơ sở dữ liệu** (bỏ cả dấu ngoặc vuông).
   - Quên mật khẩu này: **Project Settings → Database → Reset database password**. Nên đặt mật khẩu **chỉ gồm chữ và số**, tránh ký tự đặc biệt.
   - Đổi mật khẩu cơ sở dữ liệu **không ảnh hưởng** tới web, vì web dùng khóa khác.

## Bước 2. Tạo kho GitHub riêng tư (2 phút)

1. Vào **github.com**, bấm **＋ → New repository**.
2. **Repository name**: `easysupport-sao-luu`.
3. Chọn **Private** ⚠️ **Bắt buộc riêng tư**, vì bản sao lưu chứa số liệu và email của cả đội.
4. Tick **Add a README file**, bấm **Create repository**.

## Bước 3. Cất chuỗi kết nối vào GitHub (1 phút)

1. Trong kho vừa tạo: **Settings → Secrets and variables → Actions**.
2. Bấm **New repository secret**:
   - **Name**: `SUPABASE_DB_URL`
   - **Secret**: dán chuỗi kết nối ở Bước 1 (đã thay mật khẩu).
3. Bấm **Add secret**. Chuỗi được GitHub cất kín, không ai xem lại được, kể cả cậu.

## Bước 4. Thêm file chạy tự động (2 phút)

1. Quay về trang chính của kho, bấm **Add file → Create new file**.
2. Ô tên file, gõ chính xác: `.github/workflows/sao-luu.yml` (gõ dấu `/` thì GitHub tự tạo thư mục).
3. Dán **toàn bộ** nội dung file `sao-luu.yml` tớ gửi.
4. Bấm **Commit changes…**, rồi bấm **Commit changes** lần nữa.

## Bước 5. Chạy thử ngay (2 phút)

1. Vào tab **Actions** của kho. Nếu GitHub hỏi thì bấm bật Actions.
2. Bên trái chọn **Sao lưu EasySupport**, bên phải bấm **Run workflow → Run workflow**.
3. Đợi khoảng 1–2 phút, thấy **dấu tích xanh ✅** là thành công.
4. Kiểm tra:
   - Trong kho có thư mục `sao-luu/<ngày hôm nay>/` với 3 file.
   - Trên web, Admin vào **Cài đặt** thấy dòng **“🤖 Sao lưu tự động gần nhất: …”** màu xanh.

### Nếu báo lỗi (dấu ❌)
Bấm vào lần chạy bị lỗi, xem dòng đỏ:

| Thông báo | Cách sửa |
|---|---|
| `Chưa khai báo secret SUPABASE_DB_URL` | Làm lại Bước 3, kiểm tra **Name** đúng chữ hoa |
| `password authentication failed` | Sai mật khẩu ở Bước 1. Đặt lại mật khẩu cơ sở dữ liệu, rồi sửa secret |
| `Network is unreachable` hoặc `could not translate host name` | Đang dùng **Direct connection**. Lấy lại chuỗi kiểu **Session pooler** |
| `Tenant or user not found` | Chuỗi chép thiếu phần `postgres.xxxxxx` trước dấu `:` |

GitHub cũng **tự gửi email** cho cậu mỗi khi lịch tự động chạy lỗi. Ngoài ra, nếu quá 9 ngày chưa có bản mới, mục Cài đặt trên web sẽ chuyển **màu vàng** để nhắc.

---

## Khôi phục khi cần

### Cách nhanh: trên web (KPI và danh mục)
1. Trong kho GitHub, mở thư mục ngày muốn quay về, bấm `du_lieu.json`, rồi bấm nút **Download raw file** (⬇).
2. Trên web, Admin vào **Cài đặt → Sao lưu và khôi phục**, chọn file vừa tải, bấm **Khôi phục từ file**.
   Những tháng có trong file sẽ **ghi đè** số liệu hiện tại.

### Khôi phục toàn bộ (công việc, kế hoạch, nhật ký…)
Dùng file `co_so_du_lieu.sql.gz`. Việc này cần thao tác kỹ thuật trên Supabase, khi nào cần cứ nhắn tớ, tớ hướng dẫn theo đúng tình huống.

---

## Lưu ý
- Kho sao lưu **phải luôn để riêng tư**. Chỉ mời người thật sự tin cậy (Settings → Collaborators).
- Chạy tự động **miễn phí**: mỗi lần khoảng 1–2 phút, trong khi kho riêng tư được dùng tới 2.000 phút mỗi tháng.
- Lịch của GitHub đôi khi **trễ vài chục phút** so với 08:00, là chuyện bình thường.
- Muốn sao lưu ngay, ví dụ trước khi sửa lớn: tab **Actions → Sao lưu EasySupport → Run workflow**.
