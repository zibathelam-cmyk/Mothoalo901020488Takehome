import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import memberRoutes from './routes/users.js';
import movementRoutes from './routes/transactions.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '120kb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({ data: { status: 'ready', service: 'bukahub-api' } });
});

app.get('/api/v1/meta', (_req, res) => {
  res.json({ data: { lowStockThreshold: config.lowStockThreshold } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/users', memberRoutes);
app.use('/api/v1/transactions', movementRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { message: 'No route matches that request.', code: 'NOT_FOUND' } });
});

app.use(errorHandler);

export default app;
