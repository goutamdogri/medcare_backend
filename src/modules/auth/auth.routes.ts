import { Router } from 'express';
import { meController, signinHandler, signupHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/signup', signupHandler);
authRouter.post('/signin', signinHandler);
authRouter.get('/me', meController);
