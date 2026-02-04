import * as crypto from 'crypto';

/**
 * Hash a card number using SHA256 for secure storage and lookup
 */
export function hashCardNumber(cardNumber: string): string {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

/**
 * Mask a card number for display (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 4) {
    return '****';
  }
  return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

/**
 * Calculate period key for daily limits (YYYY-MM-DD format)
 */
export function getDailyPeriodKey(date: Date, timezone = 'UTC'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Calculate period key for monthly limits (YYYY-MM format)
 */
export function getMonthlyPeriodKey(date: Date, timezone = 'UTC'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

/**
 * Calculate period key for weekly limits (YYYY-WXX format)
 */
export function getWeeklyPeriodKey(date: Date, timezone = 'UTC'): string {
  const zonedDate = new Date(
    date.toLocaleString('en-US', { timeZone: timezone }),
  );
  const startOfYear = new Date(zonedDate.getFullYear(), 0, 1);
  const days = Math.floor(
    (zonedDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${zonedDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}
