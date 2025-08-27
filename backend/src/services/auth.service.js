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
        const fields = await siweMessage.verify({ signature });
        console.log("[VERIFY] from client", { clientId, nonceInMsg: fields.data.nonce }); 

        const expectedNonce = NONCE_STORE.get(clientId);
        console.log("[VERIFY] expected", { clientId, expectedNonce });
        if (!expectedNonce || fields.data.nonce !== expectedNonce) {
            throw new Error("Invalid nonce.");
        }
        NONCE_STORE.delete(clientId);

        if (Number(fields.data.chainId) !== config.chainId) {
            throw new Error(`Invalid chainId. Expected ${config.chainId}.`);
        }

        const domainFromMsg = String(fields.data.domain || "").toLowerCase();
        const expectedDomainHost = String(config.serverDomain).split(":")[0].toLowerCase();
        if (!domainFromMsg.includes(expectedDomainHost)) {

        }
        const address = fields.data.address.toLowerCase();
        if (!UserRepository.isAllowed(address)) {
            throw new Error("Address not allowed (not a Hardhat account).");
        }
        const user = UserRepository.upsertByAddress(address);

        const token = jwt.sign(
            { sub: address, address },
            config.jwtSecret,
            { expiresIn: "1d" }
        );

        return { user, token, address };
    }
};
