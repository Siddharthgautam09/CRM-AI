"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContextMiddleware = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const requestContextMiddleware = (req, _res, next) => {
    req.requestId = req.headers['x-request-id']?.toString() ?? node_crypto_1.default.randomUUID();
    next();
};
exports.requestContextMiddleware = requestContextMiddleware;
