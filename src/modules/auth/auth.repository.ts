import { query } from '../../config/database.js';
import type { CurrentUser } from './auth.schemas.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date | string;
}

export function mapUser(row: UserRow): CurrentUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as CurrentUser['role'],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at
     FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<CurrentUser | null> {
  const result = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<CurrentUser> {
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'viewer')
     RETURNING id, name, email, password_hash, role, created_at`,
    [input.name, input.email, input.passwordHash],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('User insert did not return a row');
  }
  return mapUser(row);
}
