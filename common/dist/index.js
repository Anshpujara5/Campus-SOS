"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAlertInput = exports.createAlertInput = exports.signinInput = exports.signupInput = exports.RoleInput = exports.RoleCoerced = exports.Role = void 0;
const zod_1 = __importDefault(require("zod"));
exports.Role = zod_1.default.enum(['student', 'security', 'driver']);
exports.RoleCoerced = zod_1.default
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(exports.Role);
exports.RoleInput = zod_1.default.object({
    role: exports.RoleCoerced
});
exports.signupInput = zod_1.default.object({
    email: zod_1.default.email(),
    password: zod_1.default.string().min(6),
    name: zod_1.default.string().optional(),
});
exports.signinInput = zod_1.default.object({
    email: zod_1.default.email(),
    password: zod_1.default.string().min(6),
});
exports.createAlertInput = zod_1.default.object({
    title: zod_1.default.string(),
    message: zod_1.default.string()
});
exports.updateAlertInput = zod_1.default.object({
    title: zod_1.default.string(),
    message: zod_1.default.string()
});
