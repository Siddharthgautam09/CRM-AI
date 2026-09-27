"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const api_error_1 = require("../utils/api-error");
const notFoundMiddleware = (req, _res, next) => {
    next(new api_error_1.ApiError(`Route not found: ${req.method} ${req.originalUrl}`, http_status_codes_1.StatusCodes.NOT_FOUND));
};
exports.notFoundMiddleware = notFoundMiddleware;
