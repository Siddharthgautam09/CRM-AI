"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaDocumentRepository = void 0;
const database_1 = require("../../config/database");
const mapEntity = (record) => ({ ...record });
class PrismaDocumentRepository {
    prisma = (0, database_1.getPrismaClient)();
    async create(input, ownerId) {
        const created = await this.prisma.document.create({
            data: {
                title: input.title,
                content: input.content,
                ownerId,
            },
        });
        return mapEntity(created);
    }
    async list(ownerId) {
        const rows = await this.prisma.document.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
        return rows.map(mapEntity);
    }
    async getById(id, ownerId) {
        const row = await this.prisma.document.findFirst({ where: { id, ownerId } });
        return row ? mapEntity(row) : null;
    }
    async update(id, input, ownerId) {
        const existing = await this.prisma.document.findFirst({ where: { id, ownerId } });
        if (!existing)
            return null;
        const updated = await this.prisma.document.update({
            where: { id },
            data: {
                ...(input.title && { title: input.title }),
                ...(input.content && { content: input.content }),
            },
        });
        return mapEntity(updated);
    }
    async delete(id, ownerId) {
        const existing = await this.prisma.document.findFirst({ where: { id, ownerId } });
        if (!existing)
            return false;
        await this.prisma.document.delete({ where: { id } });
        return true;
    }
}
exports.PrismaDocumentRepository = PrismaDocumentRepository;
