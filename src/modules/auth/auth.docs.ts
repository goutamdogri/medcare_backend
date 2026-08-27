import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { jsonOk, standardErrors } from '../../docs/components.js';
import { authResponseSchema, currentUserSchema } from './auth.schemas.js';

function registerSecurityScheme(registry: OpenAPIRegistry): void {
  registry.registerComponent(
    'securitySchemes',
    'bearerAuth',
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } as never,
  );
}

export function registerAuthDocs(registry: OpenAPIRegistry): void {
  registerSecurityScheme(registry);
  const tag = 'Auth';

  registry.registerPath({
    method: 'post',
    path: '/api/auth/signup',
    tags: [tag],
    summary: 'Create an account and receive a session token',
    security: [],
    requestBody: {
      description: 'Name, credentials and password confirmation',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'password', 'confirmPassword'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 100 },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', format: 'password', minLength: 8 },
              confirmPassword: { type: 'string', format: 'password' },
            },
          },
        },
      },
    },
    responses: {
      201: jsonOk('Signed-up — returns token + profile', authResponseSchema),
      '409': {
        ...standardErrors['400'],
        description: 'An account with this email already exists',
      },
      '400': standardErrors['400'],
      '500': standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/auth/signin',
    tags: [tag],
    summary: 'Exchange email + password for a session token',
    security: [],
    requestBody: {
      description: 'Credentials',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', format: 'password' },
            },
          },
        },
      },
    },
    responses: {
      200: jsonOk('Signed-in — returns token + profile', authResponseSchema),
      '400': standardErrors['400'],
      '401': {
        ...standardErrors['400'],
        description: 'Invalid email or password',
      },
      '500': standardErrors['500'],
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/auth/me',
    tags: [tag],
    summary: 'Return the profile for the current Bearer token',
    security: [{ bearerAuth: [] }],
    responses: {
      200: jsonOk('Current profile', z.object({ user: currentUserSchema })),
      '401': {
        ...standardErrors['400'],
        description: 'Missing, invalid, or expired token',
      },
      '500': standardErrors['500'],
    },
  });
}
