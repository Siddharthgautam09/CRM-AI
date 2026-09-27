"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerMiddleware = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("../config/logger");
exports.requestLoggerMiddleware = (0, pino_http_1.default)({
    logger: logger_1.logger,
    customProps: (req) => ({ requestId: req.requestId }),
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
});
