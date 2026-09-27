"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const getSecret = (tokenType) => tokenType === 'access' ? env_1.env.jwt.accessSecret : env_1.env.jwt.refreshSecret;
const getExpiry = (tokenType) => tokenType === 'access'
    ? env_1.env.jwt.accessExpiresIn
    : env_1.env.jwt.refreshExpiresIn;
const signToken = (payload, tokenType) => jsonwebtoken_1.default.sign({ ...payload, tokenType }, getSecret(tokenType), {
    expiresIn: getExpiry(tokenType),
});
exports.signToken = signToken;
const verifyToken = (token, tokenType) => jsonwebtoken_1.default.verify(token, getSecret(tokenType));
exports.verifyToken = verifyToken;
