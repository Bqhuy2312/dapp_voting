import API from "./api";

// Upload ảnh lên backend và có thể bắt buộc ảnh phải lên được Cloudinary.
export async function uploadImage(file, options = {}) {
  const { requireCloud = false } = options;

  if (!file) {
    return "";
  }

  const formData = new FormData();
  formData.append("image", file);

  const res = await API.post("/upload", formData);
  const imageUrl = String(res?.data?.url || "").trim();
  const isCloudinaryUrl = imageUrl.startsWith("https://res.cloudinary.com/");

  if (!imageUrl) {
    throw new Error("Upload ảnh thất bại, backend không trả về URL ảnh.");
  }

  if (requireCloud && !isCloudinaryUrl) {
    throw new Error("Ảnh chưa được tải lên Cloudinary. Vui lòng kiểm tra lại cấu hình cloud.");
  }

  return imageUrl;
}
