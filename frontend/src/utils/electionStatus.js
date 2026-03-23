export function getElectionStatus(startTime, endTime, now = Date.now()) {
  const startTimestamp = Number(startTime);
  const endTimestamp = Number(endTime);

  if (!endTimestamp) {
    return {
      phase: "unknown",
      isEnded: false,
      isUpcoming: false,
      isActive: false,
      label: "Khong ro thoi gian",
      countdown: "Chua co thoi gian ket thuc",
    };
  }

  if (startTimestamp && now < startTimestamp) {
    const diff = startTimestamp - now;
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];

    if (days > 0) {
      parts.push(`${days} ngay`);
    }

    if (hours > 0 || days > 0) {
      parts.push(`${hours} gio`);
    }

    parts.push(`${minutes} phut`);
    parts.push(`${seconds} giay`);

    return {
      phase: "upcoming",
      isEnded: false,
      isUpcoming: true,
      isActive: false,
      label: "Sap dien ra",
      countdown: parts.join(" "),
    };
  }

  const diff = endTimestamp - now;

  if (diff <= 0) {
    return {
      phase: "ended",
      isEnded: true,
      isUpcoming: false,
      isActive: false,
      label: "Da ket thuc",
      countdown: "Da het thoi gian",
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days} ngay`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours} gio`);
  }

  parts.push(`${minutes} phut`);
  parts.push(`${seconds} giay`);

  return {
    phase: "active",
    isEnded: false,
    isUpcoming: false,
    isActive: true,
    label: "Dang dien ra",
    countdown: parts.join(" "),
  };
}
