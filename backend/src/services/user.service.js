import { UserRepository } from "../repository/user.repository.js";
import { toAddress } from "../utils/eth.js";

function ensureId(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid id");
    return n;
}

export const UserService = {
    async create(dto) {
        if (!dto?.eth_address) throw new Error("eth_address required");
      
        return UserRepository.create({
            eth_address: toAddress(dto.eth_address),
            first_name: dto.first_name ?? "",
            last_name: dto.last_name ?? ""
        });
    },

    async getById(id) {
        const user = await UserRepository.getById(ensureId(id));
        if (!user) throw new Error("User not found");
        return user;
    },

    async getByAddress(addr) {
        const user = await UserRepository.getByAddress(addr);
        if (!user) throw new Error("User not found");
        return user;
    },

    async list(query) {
        const page = Number(query?.page ?? 1);
        const limit = Number(query?.limit ?? 20);
        const search = String(query?.search ?? "");
        return UserRepository.list({ page, limit, search });
    },

    async update(id, dto) {
        const payload = {};
        if (dto.eth_address != null) payload.eth_address = toAddress(dto.eth_address);
        if (dto.first_name != null) payload.first_name = dto.first_name;
        if (dto.last_name != null) payload.last_name = dto.last_name;

        const updated = await UserRepository.updateById(ensureId(id), payload);
        if (!updated) throw new Error("User not found");
        return updated;
    },

    async updateByAddress(addr, dto) {
        const payload = {};
        if (dto.first_name != null) payload.first_name = dto.first_name;
        if (dto.last_name != null) payload.last_name = dto.last_name;
        return UserRepository.updateByAddress(addr, payload);
    },

    async removeByAddress(addr) {
        const ok = await UserRepository.deleteByAddress(addr);
        if (!ok) throw new Error("User not found");
        return { ok: true };
    },

    async remove(id) {
        const ok = await UserRepository.deleteById(ensureId(id));
        if (!ok) throw new Error("User not found");
        return { ok: true };
    }
};
