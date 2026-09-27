"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityMiddlewares = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const env_1 = require("../config/env");
const applySecurityMiddlewares = (app) => {
    app.disable('x-powered-by');
    app.use((0, cors_1.default)({
        origin: env_1.env.allowedOrigins,
        credentials: true,
    }));
    app.use((0, helmet_1.default)());
    app.use((0, hpp_1.default)());
    // Defends against NoSQL injection payloads.
    app.use((0, express_mongo_sanitize_1.default)());
    // Built-in body parser with strict payload limits.
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    app.use((0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many requests, please try again later.',
        },
    }));
};
exports.applySecurityMiddlewares = applySecurityMiddlewares;
