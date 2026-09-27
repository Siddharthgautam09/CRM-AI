"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserById = exports.findUserByEmail = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../config/env");
/**
 * Template-only in-memory users.
 * Replace this with real user persistence and secure lifecycle management.
 */
const users = [
    {
        id: 'u_1',
        email: 'admin@example.com',
        passwordHash: bcryptjs_1.default.hashSync('Admin@12345', env_1.env.bcryptSaltRounds),
        role: 'admin',
    },
    {
        id: 'u_2',
        email: 'editor@example.com',
        passwordHash: bcryptjs_1.default.hashSync('Editor@12345', env_1.env.bcryptSaltRounds),
        role: 'editor',
    },
];
const findUserByEmail = (email) => users.find((user) => user.email.toLowerCase() === email.toLowerCase());
exports.findUserByEmail = findUserByEmail;
const findUserById = (id) => users.find((user) => user.id === id);
exports.findUserById = findUserById;
