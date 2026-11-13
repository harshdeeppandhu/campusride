import { db } from './client.js';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Execute operations within a database transaction.
 * If the callback throws an error, the transaction is automatically rolled back.
 */
export async function withTransaction<T>(
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(callback);
}
