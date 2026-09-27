"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../utils/jwt");
describe('JWT utilities', () => {
    it('should sign and verify access token', () => {
        const token = (0, jwt_1.signToken)({ sub: 'u_1', role: 'admin' }, 'access');
        const payload = (0, jwt_1.verifyToken)(token, 'access');
        expect(payload.sub).toBe('u_1');
        expect(payload.role).toBe('admin');
        expect(payload.tokenType).toBe('access');
    });
});
