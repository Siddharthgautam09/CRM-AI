"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
describe('Auth endpoints', () => {
    it('should login and return token pair', async () => {
        const response = await (0, supertest_1.default)(app_1.app).post('/api/v1/auth/login').send({
            email: 'admin@example.com',
            password: 'Admin@12345',
        });
        expect(response.status).toBe(200);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
    });
    it('should refresh token pair', async () => {
        const loginResponse = await (0, supertest_1.default)(app_1.app).post('/api/v1/auth/login').send({
            email: 'admin@example.com',
            password: 'Admin@12345',
        });
        const refreshResponse = await (0, supertest_1.default)(app_1.app).post('/api/v1/auth/refresh-token').send({
            refreshToken: loginResponse.body.data.refreshToken,
        });
        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body.data.accessToken).toBeDefined();
    });
});
