"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongooseDocumentRepository = void 0;
const document_mongoose_model_1 = require("./document.mongoose.model");
const mapDocument = (record) => ({
    id: record._id.toString(),
    title: record.title,
    content: record.content,
    ownerId: record.ownerId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});
class MongooseDocumentRepository {
    async create(input, ownerId) {
        const created = await document_mongoose_model_1.DocumentMongooseModel.create({ ...input, ownerId });
        return mapDocument(created);
    }
    async list(ownerId) {
        const rows = await document_mongoose_model_1.DocumentMongooseModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
        return rows.map(mapDocument);
    }
    async getById(id, ownerId) {
        const row = await document_mongoose_model_1.DocumentMongooseModel.findOne({ _id: id, ownerId }).exec();
        return row ? mapDocument(row) : null;
    }
    async update(id, input, ownerId) {
        const row = await document_mongoose_model_1.DocumentMongooseModel.findOneAndUpdate({ _id: id, ownerId }, { $set: input }, { new: true }).exec();
        return row ? mapDocument(row) : null;
    }
    async delete(id, ownerId) {
        const row = await document_mongoose_model_1.DocumentMongooseModel.findOneAndDelete({ _id: id, ownerId }).exec();
        return Boolean(row);
    }
}
exports.MongooseDocumentRepository = MongooseDocumentRepository;
