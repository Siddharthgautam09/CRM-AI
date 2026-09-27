"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentRepository = void 0;
const document_mongoose_repository_1 = require("./document.mongoose.repository");
const document_prisma_repository_1 = require("./document.prisma.repository");
const env_1 = require("../../config/env");
const createDocumentRepository = () => {
    // Keep implementation switch centralized for easier migration.
    if (env_1.env.dbClient === 'mongoose')
        return new document_mongoose_repository_1.MongooseDocumentRepository();
    // Default and fallback for "prisma" and "both".
    return new document_prisma_repository_1.PrismaDocumentRepository();
};
exports.createDocumentRepository = createDocumentRepository;
