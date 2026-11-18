import dotenv from 'dotenv';

dotenv.config();

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(
    process.env.DB_PASSWORD || ''
  )}@${process.env.DB_HOST || 'localhost'}:${positiveNumber(
    process.env.DB_PORT,
    5432
  )}/${process.env.DB_NAME || 'bukahub_db'}`;

export const config = Object.freeze({
  port: positiveNumber(process.env.PORT, 5057),
  databaseUrl,
  lowStockThreshold: positiveNumber(process.env.LOW_STOCK_THRESHOLD, 2),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5190',
});
