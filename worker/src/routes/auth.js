/**
 * Authentication routes
 */
import { Hono } from 'hono';
import { createToken } from '../auth.js';

const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const { password } = await c.req.json();
  const adminPassword = c.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return c.json({ error: 'Server misconfigured: ADMIN_PASSWORD not set' }, 500);
  }

  if (password !== adminPassword) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  const jwtSecret = c.env.JWT_SECRET || c.env.ADMIN_PASSWORD;
  const token = await createToken(jwtSecret);

  return c.json({ token, message: 'Login successful' });
});

export default authRoutes;
