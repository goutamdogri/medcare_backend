import { z } from 'zod';

/** Boolean-string dance for input type=email autocompletion (email vs username). */
export const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(320, 'Email is too long');

export const passwordFieldSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const nameFieldSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long');

/** User-facing profile — never exposes the password hash. */
export const currentUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'viewer', 'analyst']),
  createdAt: z.string().datetime(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

/** Signup: create account + return a session in one round-trip. */
export const signupSchema = z
  .object({
    name: nameFieldSchema,
    email: emailFieldSchema,
    password: passwordFieldSchema,
    confirmPassword: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type SignupInput = { name: string; email: string; password: string };

/** Signin: credentials only. */
export const signinSchema = z.object({
  email: emailFieldSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export type SigninInput = z.infer<typeof signinSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: currentUserSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
