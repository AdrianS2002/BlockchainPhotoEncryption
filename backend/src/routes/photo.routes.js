import { Router } from "express";
import multer from "multer";
import { PhotoService } from "../services/photo.service.js";
import { getFees, unlockStatus, payToUnlock } from "../chain/contract.js";
import { config } from "../config.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const r = Router();
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parseJSON = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

r.get("/health", (req, res) => res.json({ ok: true }));

r.get("/fees", ah(async (_req, res) => {
  const { sendFeeWei, decryptFeeWei } = await getFees();
  res.json({ contract: config.contractAddress, sendFeeWei: sendFeeWei.toString(), decryptFeeWei: decryptFeeWei.toString() });
}));

r.post("/", upload.single("file"), ah(async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ error: "file required" });
  const out = await PhotoService.upload({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    ownerAddress: req.body.ownerAddress,
    recipients: parseJSON(req.body.recipients ?? "[]", []),
    isPrivate: req.body.isPrivate === "true" || req.body.isPrivate === true,
    senderPrivateKeyHex: req.body.senderPrivateKeyHex,
    recipientPublicKeys: parseJSON(req.body.recipientPublicKeys ?? "{}", {}),
    callOnchain: req.body.callOnchain === "false" ? false : true,
  });
  res.status(201).json(out);
}));

r.post("/:id/share", ah(async (req, res) => {
  const photoId = Number(req.params.id);
  const out = await PhotoService.shareExisting({
    photoId,
    ownerAddress: req.body.ownerAddress,
    ownerPrivateKeyHex: req.body.ownerPrivateKeyHex,
    ownerPublicKeyUncompressedHex: req.body.ownerPublicKeyUncompressedHex,
    recipients: parseJSON(req.body.recipients ?? "[]", []),
    recipientPublicKeys: parseJSON(req.body.recipientPublicKeys ?? "{}", {}),
    callOnchain: req.body.callOnchain === "false" ? false : true,
  });
  res.json(out);
}));


r.get("/owned/:address", ah(async (req, res) => res.json({ items: await PhotoService.listOwned(req.params.address) })));
r.get("/inbox/:address", ah(async (req, res) => res.json({ items: await PhotoService.listInbox(req.params.address) })));

r.get("/:id/status/:address", ah(async (req, res) => {
  const { paid, decryptFeeWei } = await unlockStatus(Number(req.params.id), req.params.address);
  res.json({ paid, decryptFeeWei: decryptFeeWei.toString() });
}));

r.post("/:id/pay", ah(async (req, res) => {
  const out = await payToUnlock({ fromPrivateKey: req.body.privateKey, photoId: Number(req.params.id) });
  res.json(out);
}));

r.get("/:id/key/:address", ah(async (req, res) => {
  try {
    const data = await PhotoService.keyForRecipientEnforcingPayment(Number(req.params.id), req.params.address);
    res.json(data);
  } catch (e) {
    if (e.code === "UNLOCK_FEE_REQUIRED") {
      const { decryptFeeWei } = await getFees();
      return res.status(403).json({
        error: "unlock_fee_required",
        message: "Plătește taxa de deblocare pe contract înainte de a primi cheia.",
        contract: config.contractAddress,
        decryptFeeWei: decryptFeeWei.toString(),
        photoId: Number(req.params.id),
        address: req.params.address,
      });
    }
    throw e;
  }
}));

r.get("/:id/download", ah(async (req, res) => {
  const { blob, photo } = await PhotoService.downloadEncrypted(Number(req.params.id), req.query.as);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${photo.id}.bin"`);
  res.send(blob);
}));


r.put("/:id", ah(async (req, res) => res.json({ photo: await PhotoService.touch(Number(req.params.id), { enc_status: req.body.enc_status, iv_base64: req.body.iv_base64 }) })));
r.delete("/:id", ah(async (req, res) => res.json({ ok: await PhotoService.remove(Number(req.params.id)) })));

export const photosRouter = r;
