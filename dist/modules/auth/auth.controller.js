"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutHandler = exports.refreshTokenHandler = exports.loginHandler = void 0;
const http_status_codes_1 = require("http-status-codes");
const auth_service_1 = require("./auth.service");
const async_handler_1 = require("../../utils/async-handler");
exports.loginHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const tokens = await (0, auth_service_1.login)(req.body);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: tokens,
    });
});
exports.refreshTokenHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await (0, auth_service_1.refresh)(refreshToken);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: tokens,
    });
});
exports.logoutHandler = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = (req.body ?? {});
    await (0, auth_service_1.logout)(refreshToken);
    res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
});
