import { Schema, model } from 'mongoose';

interface DocumentMongo {
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentMongo>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  },
);

export const DocumentMongooseModel = model<DocumentMongo>('Document', documentSchema);
