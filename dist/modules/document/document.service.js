"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocument = exports.getDocumentById = exports.listDocuments = exports.createDocument = void 0;
const http_status_codes_1 = require("http-status-codes");
const document_repository_factory_1 = require("./document.repository.factory");
const api_error_1 = require("../../utils/api-error");
const sanitize_1 = require("../../utils/sanitize");
const repository = (0, document_repository_factory_1.createDocumentRepository)();
const createDocument = async (input, ownerId) => repository.create({
    title: (0, sanitize_1.sanitizeText)(input.title),
    content: (0, sanitize_1.sanitizeText)(input.content),
}, ownerId);
exports.createDocument = createDocument;
const listDocuments = async (ownerId) => repository.list(ownerId);
exports.listDocuments = listDocuments;
const getDocumentById = async (id, ownerId) => {
    const document = await repository.getById(id, ownerId);
    if (!document) {
        throw new api_error_1.ApiError('Document not found', http_status_codes_1.StatusCodes.NOT_FOUND);
    }
    return document;
};
exports.getDocumentById = getDocumentById;
const updateDocument = async (id, input, ownerId) => {
    const updated = await repository.update(id, {
        ...(input.title && { title: (0, sanitize_1.sanitizeText)(input.title) }),
        ...(input.content && { content: (0, sanitize_1.sanitizeText)(input.content) }),
    }, ownerId);
    if (!updated) {
        throw new api_error_1.ApiError('Document not found', http_status_codes_1.StatusCodes.NOT_FOUND);
    }
    return updated;
};
exports.updateDocument = updateDocument;
const deleteDocument = async (id, ownerId) => {
    const deleted = await repository.delete(id, ownerId);
    if (!deleted) {
        throw new api_error_1.ApiError('Document not found', http_status_codes_1.StatusCodes.NOT_FOUND);
    }
};
exports.deleteDocument = deleteDocument;
