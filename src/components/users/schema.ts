import z from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
});

export type SignupSchema = z.infer<typeof signupSchema>;

export const signupCompleteSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
});

export type signupCompleteSchema = z.infer<typeof signupCompleteSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
