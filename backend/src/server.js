
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js"
import { authRouter } from "./routes/auth.routes.js";
import { jwtGuard } from "./middlewares/auth.middleware.js";
import { UserRepository } from "./repository/user.repository.js";
import { loadAllowedAddresses } from "./utils/allowlist.js";
import { ensureSchema } from "../src/utils/db/ensure-schema.js"
import { seedHardhatUsers } from "../src/utils/seed-hardhat-users.js";
import { usersRouter } from "./routes/users.routes.js";
import { photosRouter } from "./routes/photo.routes.js";
import { ensureDirs } from "./utils/fs.js";
const app = express();


app.set("trust proxy", 1);


app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());


app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  exposedHeaders: ["x-client-id"],
}));


app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/config", (req, res) => res.json({
  port: config.port,
  corsOrigin: config.corsOrigin,
  chainId: config.chainId,
}));


app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/photos", photosRouter);
app.get("/me", jwtGuard, (req, res) => {
  res.json({ user: req.user });
});


app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});


app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const start = async () => {
  try {

    await ensureSchema(); 
    await ensureDirs();
    await seedHardhatUsers(); 

    const set = await loadAllowedAddresses();
    UserRepository.setAllowlist(set);

  
    app.listen(config.port, () => {
      console.log(`API ready on http://localhost:${config.port}`);
      console.log(`Allowlist size: ${set.size} (Hardhat/ENV)`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
};


process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

start();
