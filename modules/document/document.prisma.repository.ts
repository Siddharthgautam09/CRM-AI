import type {
  CreateDocumentInput,
  DocumentEntity,
  DocumentRepository,
  UpdateDocumentInput,
} from './document.types';
import { getPrismaClient } from '../../config/database';

const mapEntity = (record: {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): DocumentEntity => ({ ...record });

export class PrismaDocumentRepository implements DocumentRepository {
  private readonly prisma = getPrismaClient();

  async create(input: CreateDocumentInput, ownerId: string): Promise<DocumentEntity> {
    const created = await this.prisma.document.create({
      data: {
        title: input.title,
        content: input.content,
        ownerId,
      },
    });

    return mapEntity(created);
  }

  async list(ownerId: string): Promise<DocumentEntity[]> {
    const rows = await this.prisma.document.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapEntity);
  }

  async getById(id: string, ownerId: string): Promise<DocumentEntity | null> {
    const row = await this.prisma.document.findFirst({ where: { id, ownerId } });
    return row ? mapEntity(row) : null;
  }

  async update(
    id: string,
    input: UpdateDocumentInput,
    ownerId: string,
  ): Promise<DocumentEntity | null> {
    const existing = await this.prisma.document.findFirst({ where: { id, ownerId } });
    if (!existing) return null;

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.content && { content: input.content }),
      },
    });

    return mapEntity(updated);
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const existing = await this.prisma.document.findFirst({ where: { id, ownerId } });
    if (!existing) return false;
    await this.prisma.document.delete({ where: { id } });
    return true;
  }
}
