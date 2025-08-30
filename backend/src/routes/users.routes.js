import { Router } from "express";
import { UserService } from "../services/user.service.js";

const r = Router();

const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

r.get("/", ah(async (req, res) => {
  const data = await UserService.list(req.query);
  res.json(data);
}));

r.get("/:address", ah(async (req, res) => {
  const user = await UserService.getByAddress(req.params.address);
  res.json({ user });
}));


r.post("/", ah(async (req, res) => {
  const user = await UserService.create(req.body); 
  res.status(201).json({ user });
}));

r.put("/:address", ah(async (req, res) => {
  const user = await UserService.updateByAddress(req.params.address, req.body);
  res.json({ user });
}));


r.delete("/:address", ah(async (req, res) => {
  const result = await UserService.removeByAddress(req.params.address);
  res.json(result);
}));

export const usersRouter = r;
