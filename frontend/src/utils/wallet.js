export function formatWalletAddress(address) {
  // Rút gọn địa chỉ ví để hiển thị gọn hơn trên giao diện.
  if (!address) {
    return "";
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
