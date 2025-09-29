import { config } from "../config.js";

export async function loadAllowedAddresses() {
  if (config.allowedAddressesEnv.length) {
    return new Set(config.allowedAddressesEnv);
  }
  try {
    const res = await fetch(config.hardhatRpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_accounts",
        params: []
      })
    });
    const json = await res.json();
    const list = (json.result || []).map(a => a.toLowerCase());
    return new Set(list);
  } catch {
    return new Set();
  }
}
