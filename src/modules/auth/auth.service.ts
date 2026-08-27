import bcrypt from 'bcrypt';
import { ApiError } from '../../shared/errors/api-errors.js';
import type {
  AuthResponse,
  CurrentUser,
  SigninInput,
  SignupInput,
} from './auth.schemas.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  mapUser,
} from './auth.repository.js';
import { signAccessToken } from './jwt.js';

const BCRYPT_ROUNDS = 12;

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const email = input.email.trim().toLowerCase();

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await createUser({
    name: input.name.trim(),
    email,
    passwordHash,
  });

  return {
    token: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    user,
  };
}

export async function signin(input: SigninInput): Promise<AuthResponse> {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) {
    // Same message for unknown email and wrong password — no account enumeration.
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const profile = mapUser(user);
  return {
    token: signAccessToken({ sub: profile.id, email: profile.email, role: profile.role }),
    user: profile,
  };
}

/** Resolves a fresh user record for an already-validated token subject (GET /me). */
export async function getUserById(id: string): Promise<CurrentUser> {
  const user = await findUserById(id);
  if (!user) {
    throw new ApiError(401, 'USER_NOT_FOUND', 'This account no longer exists');
  }
  return user;
}
