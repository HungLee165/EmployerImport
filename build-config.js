// Chạy tự động khi Vercel build (xem vercel.json).
// Lấy địa chỉ + khóa CÔNG KHAI của Supabase từ Environment Variables
// rồi ghi ra config.js cho trang web dùng.
const fs = require("fs");

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
  console.log("    Giữ nguyên config.js hiện có.");
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

fs.writeFileSync("config.js",
`// Tự tạo khi build trên Vercel từ ${url.name} và ${key.name}. Đừng sửa tay.
window.KPI_CONFIG = {
  supabaseUrl: ${JSON.stringify(url.value)},
  supabaseKey: ${JSON.stringify(key.value)}
};
`);
console.log(`✅ Đã tạo config.js từ ${url.name} và ${key.name}.`);
