"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const http_status_codes_1 = require("http-status-codes");
const api_error_1 = require("../utils/api-error");
const jwt_1 = require("../utils/jwt");
const extractToken = (headerValue) => {
    if (!headerValue?.startsWith('Bearer ')) {
        throw new api_error_1.ApiError('Missing or invalid authorization header', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    return headerValue.split(' ')[1];
};
const authenticate = (req, _res, next) => {
    const token = extractToken(req.headers.authorization);
    const payload = (0, jwt_1.verifyToken)(token, 'access');
    req.user = {
        id: payload.sub,
        role: payload.role,
    };
    next();
};
exports.authenticate = authenticate;
const authorize = (...allowedRoles) => (req, _res, next) => {
    if (!req.user) {
        throw new api_error_1.ApiError('Authentication required', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    if (!allowedRoles.includes(req.user.role)) {
        throw new api_error_1.ApiError('Insufficient permissions', http_status_codes_1.StatusCodes.FORBIDDEN);
    }
    next();
};
exports.authorize = authorize;
