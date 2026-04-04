const API_ORIGIN = "http://localhost:5000";

function buildPlaceholder(label) {
  const text = encodeURIComponent(String(label || "Chưa có ảnh").slice(0, 30));
  // Tạo ảnh placeholder SVG để dùng khi election hoặc candidate chưa có ảnh.
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#bfdbfe" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)" />
      <rect x="250" y="120" width="300" height="200" rx="24" fill="#eff6ff" stroke="#60a5fa" stroke-width="10" />
      <circle cx="335" cy="190" r="34" fill="#93c5fd" />
      <path d="M282 292c30-44 62-66 96-66 30 0 50 13 78 42l28 24H282z" fill="#60a5fa" />
      <text x="400" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1d4ed8">${text}</text>
    </svg>`,
  )}`;
}

export function resolveImageUrl(image) {
  // Chuẩn hóa đường dẫn ảnh local hoặc URL tuyệt đối thành URL có thể render được.
  const raw = String(image || "").trim();

  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, "/");
  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return `${API_ORIGIN}${withLeadingSlash}`;
}

export function resolveImageUrlWithFallback(image, label) {
  // Trả về ảnh thật nếu có, ngược lại dùng placeholder sinh tự động.
  return resolveImageUrl(image) || buildPlaceholder(label);
}
