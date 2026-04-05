import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validateRequest } from '../_middleware/validateRequest';
import { db } from '../_helpers/db';
import { Role } from '../_helpers/role';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ROUTES
router.post('/register', registerSchema, register);
router.post('/login', loginSchema, login);

export default router;

// VALIDATION SCHEMAS
function registerSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    title: Joi.string().optional().default('Mr'),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).optional(),
    role: Joi.string().valid(Role.Admin, Role.User).default(Role.User),
  });
  validateRequest(req, next, schema);
}

function loginSchema(req: Request, res: Response, next: NextFunction): void {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

// ROUTE HANDLERS
async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, firstName, lastName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    await db.User.create({
      title: title || 'Mr',
      firstName,
      lastName,
      email,
      passwordHash,
      role: role || Role.User,
    });

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    next(error);
  }
}

async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user with password hash
    const user = await db.User.scope('withHash').findOne({ where: { email } });
    
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        title: user.title,
      }
    });
  } catch (error) {
    next(error);
  }
}
