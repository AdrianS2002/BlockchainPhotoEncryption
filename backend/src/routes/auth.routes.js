import express from "express";
import { AuthService } from "../services/auth.service.js";

export const authRouter = express.Router();

authRouter.get("/nonce", async (req, res) => {
  const { clientId, nonce } = AuthService.getNonce(req.headers);
  res.setHeader("x-client-id", clientId);
  res.json({ nonce, clientId });
});

authRouter.post("/verify", async (req, res) => {
  try {
    const { message, signature, clientId } = req.body;
    const { token, address, user } = await AuthService.verifySiwe({ message, signature, clientId });
    res
      .cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false })
      .json({ ok: true, address, token, user });
  } catch (e) {
    res.status(400).json({ error: e?.message || "SIWE verify failed" });
  }
});

