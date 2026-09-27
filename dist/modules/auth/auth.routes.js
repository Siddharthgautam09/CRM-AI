"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_validation_1 = require("./auth.validation");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and get access/refresh tokens
 */
authRouter.post('/login', (0, validate_middleware_1.validate)(auth_validation_1.loginSchema), auth_controller_1.loginHandler);
authRouter.post('/refresh-token', (0, validate_middleware_1.validate)(auth_validation_1.refreshTokenSchema), auth_controller_1.refreshTokenHandler);
authRouter.post('/logout', auth_controller_1.logoutHandler);
