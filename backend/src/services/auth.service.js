import { SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config.js";
import { UserRepository } from "../repository/user.repository.js";

const NONCE_STORE = new Map();

export const AuthService = {
  getNonce(headers) {
    const clientId = headers["x-client-id"] || crypto.randomUUID();
    const nonce = crypto.randomUUID().replace(/-/g, "");
    NONCE_STORE.set(clientId, nonce);
    console.log("[NONCE] set", { clientId, nonce });
    return { clientId, nonce };
  },

  async verifySiwe({ message, signature, clientId }) {

    const siweMessage = new SiweMessage(message);
    const { data } = await siweMessage.verify({ signature });

    const expectedNonce = NONCE_STORE.get(clientId);
    if (!expectedNonce || data.nonce !== expectedNonce) {
      throw new Error("Invalid nonce.");
    }
    NONCE_STORE.delete(clientId);


    if (Number(data.chainId) !== config.chainId) {
      throw new Error(`Invalid chainId. Expected ${config.chainId}.`);
    }

    const domainFromMsg = String(data.domain || "").toLowerCase();
    const expectedDomainHost = String(config.serverDomain).split(":")[0].toLowerCase();
    if (expectedDomainHost && !domainFromMsg.includes(expectedDomainHost)) {

      console.warn("[VERIFY] domain mismatch (continuing)", { domainFromMsg, expectedDomainHost });
    }

    const address = String(data.address).toLowerCase();

    if (!UserRepository.isAllowed(address)) {
      throw new Error("Address not allowed (not in allowlist).");
    }

    
    await UserRepository.upsertByAddress(address);
    const user = await UserRepository.getByAddress(address);

    const token = jwt.sign(
      { sub: address, ethAddress: address },
      config.jwtSecret,
      { expiresIn: "1d" }
    );

    return { user, token, address };
  }
};
