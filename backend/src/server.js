
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.routes.js";
import { jwtGuard } from "./middlewares/auth.middleware.js";
import { UserRepository } from "./repository/user.repository.js";
import { loadAllowedAddresses } from "./utils/allowlist.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  exposedHeaders: ['x-client-id'] 
}));


app.use("/auth", authRouter);

app.get("/me", jwtGuard, (req, res) => {
  res.json({ user: req.user });
});


const start = async () => {
  const set = await loadAllowedAddresses();
  UserRepository.setAllowlist(set);

  app.listen(config.port, () => {
    console.log(`API ready on http://localhost:${config.port}`);
    console.log(`Allowlist size: ${set.size} (Hardhat/ENV)`);
  });
};

start();
