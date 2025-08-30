export function toAddress(s) {
  if (typeof s !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(s)) {
    throw new Error("Invalid address");
  }
  return s.toLowerCase();
}
