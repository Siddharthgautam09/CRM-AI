"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const http_status_codes_1 = require("http-status-codes");
const api_error_1 = require("../utils/api-error");
const validate = (schema) => (req, _res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (error) {
        const zodError = error;
        const issueMessage = zodError.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        next(new api_error_1.ApiError(`Validation failed - ${issueMessage}`, http_status_codes_1.StatusCodes.BAD_REQUEST));
    }
};
exports.validate = validate;
