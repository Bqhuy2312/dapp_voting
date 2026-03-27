export function getElectionStatus(startTime, endTime, now = Date.now()) {
  const startTimestamp = Number(startTime);
  const endTimestamp = Number(endTime);

  if (!endTimestamp) {
    return {
      phase: "unknown",
      isEnded: false,
      isUpcoming: false,
      isActive: false,
      label: "Không rõ thời gian",
      countdown: "Chưa có thời gian kết thúc",
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
      parts.push(`${days} ngày`);
    }

    if (hours > 0 || days > 0) {
      parts.push(`${hours} giờ`);
    }

    parts.push(`${minutes} phút`);
    parts.push(`${seconds} giây`);

    return {
      phase: "upcoming",
      isEnded: false,
      isUpcoming: true,
      isActive: false,
      label: "Sắp diễn ra",
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
      label: "Đã kết thúc",
      countdown: "Đã hết thời gian",
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (days > 0) {
    parts.push(`${days} ngày`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours} giờ`);
  }

  parts.push(`${minutes} phút`);
  parts.push(`${seconds} giây`);

  return {
    phase: "active",
    isEnded: false,
    isUpcoming: false,
    isActive: true,
    label: "Đang diễn ra",
    countdown: parts.join(" "),
  };
}
