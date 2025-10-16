import z from "zod";

export const Role = z.enum(['student' , 'security' , 'driver']);
export type RoleType = z.infer<typeof Role>;

export const RoleCoerced = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(Role);

export const RoleInput = z.object({
    role:RoleCoerced
})

export const signupInput = z.object({
    email:z.email(),
    password:z.string().min(6),
    name:z.string().optional(),
})

export const signinInput = z.object({
    email:z.email(),
    password:z.string().min(6),
})


export const createAlertInput = z.object({
    title:z.string(),
    message:z.string()
})

export const updateAlertInput = z.object({
    title:z.string(),
    message:z.string()
})

export type signupInput = z.infer<typeof signupInput>
export type signinInput = z.infer<typeof signinInput>
export type CreateAlertInput = z.infer<typeof createAlertInput>;
export type UpdateAlertInput = z.infer<typeof updateAlertInput>;