"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const api_error_1 = require("../utils/api-error");
const errorHandlerMiddleware = (error, req, res, next) => {
    void next;
    const normalizedError = error instanceof api_error_1.ApiError
        ? error
        : new api_error_1.ApiError('Internal server error', http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, false);
    logger_1.logger.error({
        requestId: req.requestId,
        error,
        normalizedError,
    }, 'Unhandled error captured');
    res.status(normalizedError.statusCode).json({
        success: false,
        message: normalizedError.message,
        requestId: req.requestId,
        ...(env_1.env.nodeEnv !== 'production' && { stack: error?.stack }),
    });
};
exports.errorHandlerMiddleware = errorHandlerMiddleware;
