"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocumentHandler = exports.updateDocumentHandler = exports.getDocumentByIdHandler = exports.listDocumentsHandler = exports.createDocumentHandler = void 0;
const http_status_codes_1 = require("http-status-codes");
const document_service_1 = require("./document.service");
const async_handler_1 = require("../../utils/async-handler");
const getUserId = (req) => req.user?.id ?? 'u_1';
exports.createDocumentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const created = await (0, document_service_1.createDocument)(req.body, getUserId(req));
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        data: created,
    });
});
exports.listDocumentsHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const documents = await (0, document_service_1.listDocuments)(getUserId(req));
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: documents,
    });
});
exports.getDocumentByIdHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const id = String(req.params.id);
    const document = await (0, document_service_1.getDocumentById)(id, getUserId(req));
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: document,
    });
});
exports.updateDocumentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const id = String(req.params.id);
    const updated = await (0, document_service_1.updateDocument)(id, req.body, getUserId(req));
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: updated,
    });
});
exports.deleteDocumentHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const id = String(req.params.id);
    await (0, document_service_1.deleteDocument)(id, getUserId(req));
    res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
});
