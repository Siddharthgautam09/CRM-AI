"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentMongooseModel = void 0;
const mongoose_1 = require("mongoose");
const documentSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
}, {
    timestamps: true,
});
exports.DocumentMongooseModel = (0, mongoose_1.model)('Document', documentSchema);
