import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { CurrentUser } from './auth.schemas.js';
import { signinSchema, signupSchema } from './auth.schemas.js';
import { signin, signup } from './auth.service.js';
import type { AuthedRequest } from './auth.middleware.js';
import { requireAuth } from './auth.middleware.js';
import { getUserById } from './auth.service.js';

export const signupHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signupSchema.parse(req.body);
  const result = await signup({
    name: parsed.name,
    email: parsed.email,
    password: parsed.password,
  });
  res.status(201).json(result);
});

export const signinHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signinSchema.parse(req.body);
  res.json(await signin(parsed));
});

/**
 * Returns the current session profile. Requires a valid Bearer token.
 * Used by the SPA to restore a session across reloads.
 */
export const meController = [
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const user: CurrentUser | null = await getUserById(req.user!.sub);
    res.json({ user });
  }),
];
