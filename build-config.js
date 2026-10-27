// Chạy tự động khi Vercel build (xem vercel.json).
// 1) Chép các file trang web vào thư mục "public" (thư mục Vercel đưa lên mạng).
// 2) Lấy địa chỉ + khóa CÔNG KHAI của Supabase từ Environment Variables
//    rồi ghi ra public/config.js cho trang web dùng.
const fs = require("fs");
const path = require("path");

const OUT = "public";
const FILES = ["index.html", "styles.css", "app.js"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.error(`❌ Không thấy file ${f} trong repo. Hãy kiểm tra lại đã đẩy đủ file chưa.`);
    process.exit(1);
  }
  fs.copyFileSync(f, path.join(OUT, f));
}
console.log(`✅ Đã chép ${FILES.join(", ")} vào ${OUT}/`);

const pick = (...names) => {
  for (const n of names) {
    const v = (process.env[n] || "").trim();
    if (v) return { name: n, value: v };
  }
  return null;
};

const url = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const key = pick(
  "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_KEY"
);

if (!url || !key) {
  console.log("⚠️  Chưa thấy SUPABASE_URL / SUPABASE_ANON_KEY trong Environment Variables.");
  console.log("    Dùng config.js có sẵn trong repo.");
  if (fs.existsSync("config.js")) fs.copyFileSync("config.js", path.join(OUT, "config.js"));
  else fs.writeFileSync(path.join(OUT, "config.js"), "window.KPI_CONFIG = {};\n");
  process.exit(0);
}

// Chặn nhầm khóa bí mật: khóa này có toàn quyền, tuyệt đối không được lộ ra trang web.
function isSecret(k) {
  if (k.startsWith("sb_secret_")) return true;
  if (k.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString("utf8"));
      return payload.role === "service_role";
    } catch (e) { return false; }
  }
  return false;
}
if (isSecret(key.value)) {
  console.error(`❌ ${key.name} đang chứa khóa BÍ MẬT (secret/service_role). Hãy dùng khóa publishable hoặc anon.`);
  process.exit(1);
}
if (!/^https:\/\/.+/.test(url.value)) {
  console.error(`❌ ${url.name} phải bắt đầu bằng https:// (đang là: ${url.value}).`);
  process.exit(1);
}

fs.writeFileSync(path.join(OUT, "config.js"),
`// Tự tạo khi build trên Vercel từ ${url.name} và ${key.name}. Đừng sửa tay.
window.KPI_CONFIG = {
  supabaseUrl: ${JSON.stringify(url.value)},
  supabaseKey: ${JSON.stringify(key.value)}
};
`);
console.log(`✅ Đã tạo config.js từ ${url.name} và ${key.name}.`);
