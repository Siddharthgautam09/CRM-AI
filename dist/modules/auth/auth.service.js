"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_codes_1 = require("http-status-codes");
const auth_mock_users_1 = require("./auth.mock-users");
const api_error_1 = require("../../utils/api-error");
const jwt_1 = require("../../utils/jwt");
/**
 * In production, store refresh token family in Redis/DB with rotation strategy.
 */
const refreshTokenStore = new Set();
const issueTokens = (userId, role) => {
    const accessToken = (0, jwt_1.signToken)({ sub: userId, role }, 'access');
    const refreshToken = (0, jwt_1.signToken)({ sub: userId, role }, 'refresh');
    refreshTokenStore.add(refreshToken);
    return {
        accessToken,
        refreshToken,
    };
};
const login = async (input) => {
    const user = (0, auth_mock_users_1.findUserByEmail)(input.email);
    if (!user) {
        throw new api_error_1.ApiError('Invalid credentials', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    const passwordMatched = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    if (!passwordMatched) {
        throw new api_error_1.ApiError('Invalid credentials', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    return issueTokens(user.id, user.role);
};
exports.login = login;
const refresh = async (refreshToken) => {
    if (!refreshTokenStore.has(refreshToken)) {
        throw new api_error_1.ApiError('Invalid refresh token', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    const payload = (0, jwt_1.verifyToken)(refreshToken, 'refresh');
    if (payload.tokenType !== 'refresh') {
        throw new api_error_1.ApiError('Invalid token type', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    const user = (0, auth_mock_users_1.findUserById)(payload.sub);
    if (!user) {
        throw new api_error_1.ApiError('User no longer exists', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    }
    refreshTokenStore.delete(refreshToken);
    return issueTokens(user.id, user.role);
};
exports.refresh = refresh;
const logout = async (refreshToken) => {
    if (refreshToken) {
        refreshTokenStore.delete(refreshToken);
    }
};
exports.logout = logout;
