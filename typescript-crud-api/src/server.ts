import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './_middleware/errorHandler';
import {initialize} from './_helpers/db';
import usersController from './users/users.controller';
import authController from './auth/auth.controller';

const app: Application = express();

//MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

//API ROUTES (before static files to prevent conflicts)
app.use('/users', usersController);
app.use('/api', authController);

// STATIC FILES - Serve frontend from /public folder
app.use(express.static(path.join(__dirname, '../public')));

//GLOBAL ERROR HANDLER
app.use(errorHandler);

// SPA FALLBACK - Send index.html for any unmatched routes (LAST)
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 4000;

initialize()
.then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}`);
    console.log(`API endpoints: /users, /api/login, /api/register`);
  });
})
.catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});