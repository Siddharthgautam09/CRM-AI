export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
}

export interface DocumentRepository {
  create(input: CreateDocumentInput, ownerId: string): Promise<DocumentEntity>;
  list(ownerId: string): Promise<DocumentEntity[]>;
  getById(id: string, ownerId: string): Promise<DocumentEntity | null>;
  update(id: string, input: UpdateDocumentInput, ownerId: string): Promise<DocumentEntity | null>;
  delete(id: string, ownerId: string): Promise<boolean>;
}
