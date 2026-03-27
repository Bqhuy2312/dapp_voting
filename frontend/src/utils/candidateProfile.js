export function formatCandidateBirthInputValue(birthDate) {
  if (!birthDate) {
    return "";
  }

  const date = new Date(birthDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCandidateAge(birthDate) {
  if (!birthDate) {
    return "";
  }

  const date = new Date(birthDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < date.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : "";
}

export function formatCandidateBirthLabel(birthDate) {
  if (!birthDate) {
    return "Chưa cập nhật";
  }

  const date = new Date(birthDate);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  const age = getCandidateAge(birthDate);
  const formatted = date.toLocaleDateString("vi-VN");

  return age === "" ? formatted : `${formatted} (${age} tuổi)`;
}
