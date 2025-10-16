import z from "zod";
export declare const Role: z.ZodEnum<{
    student: "student";
    security: "security";
    driver: "driver";
}>;
export type RoleType = z.infer<typeof Role>;
export declare const RoleCoerced: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodEnum<{
    student: "student";
    security: "security";
    driver: "driver";
}>>;
export declare const RoleInput: z.ZodObject<{
    role: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodEnum<{
        student: "student";
        security: "security";
        driver: "driver";
    }>>;
}, z.core.$strip>;
export declare const signupInput: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const signinInput: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createAlertInput: z.ZodObject<{
    title: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export declare const updateAlertInput: z.ZodObject<{
    title: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type signupInput = z.infer<typeof signupInput>;
export type signinInput = z.infer<typeof signinInput>;
export type CreateAlertInput = z.infer<typeof createAlertInput>;
export type UpdateAlertInput = z.infer<typeof updateAlertInput>;
