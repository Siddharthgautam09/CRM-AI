import { DocumentMongooseModel } from './document.mongoose.model';
import type {
  CreateDocumentInput,
  DocumentEntity,
  DocumentRepository,
  UpdateDocumentInput,
} from './document.types';

const mapDocument = (record: {
  _id: { toString: () => string };
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): DocumentEntity => ({
  id: record._id.toString(),
  title: record.title,
  content: record.content,
  ownerId: record.ownerId,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export class MongooseDocumentRepository implements DocumentRepository {
  async create(input: CreateDocumentInput, ownerId: string): Promise<DocumentEntity> {
    const created = await DocumentMongooseModel.create({ ...input, ownerId });
    return mapDocument(created);
  }

  async list(ownerId: string): Promise<DocumentEntity[]> {
    const rows = await DocumentMongooseModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
    return rows.map(mapDocument);
  }

  async getById(id: string, ownerId: string): Promise<DocumentEntity | null> {
    const row = await DocumentMongooseModel.findOne({ _id: id, ownerId }).exec();
    return row ? mapDocument(row) : null;
  }

  async update(
    id: string,
    input: UpdateDocumentInput,
    ownerId: string,
  ): Promise<DocumentEntity | null> {
    const row = await DocumentMongooseModel.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: input },
      { new: true },
    ).exec();
    return row ? mapDocument(row) : null;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const row = await DocumentMongooseModel.findOneAndDelete({ _id: id, ownerId }).exec();
    return Boolean(row);
  }
}
