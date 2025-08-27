let ALLOWLIST = new Set();
const USERS = new Map(); 
console.log("User repository initialized", USERS);
export const UserRepository = {
  setAllowlist(addressSet) {
    ALLOWLIST = addressSet;
  },

  isAllowed(address) {
    return ALLOWLIST.has(address.toLowerCase());
  },

  upsertByAddress(address) {
    const key = address.toLowerCase();
    if (!USERS.has(key)) {
      USERS.set(key, { address: key, createdAt: new Date().toISOString() });
    }
    return USERS.get(key);
  },

  getAllUsers() {
    return Array.from(USERS.values());
  }
};
