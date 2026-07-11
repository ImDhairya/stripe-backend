import * as schema from "./models/index";
import "dotenv/config";
import {drizzle, NodePgQueryResultHKT} from "drizzle-orm/node-postgres";
import env from "../lib/env";
import {PgTransaction} from "drizzle-orm/pg-core";
import {ExtractTablesWithRelations} from "drizzle-orm";

export type Models = typeof import("./models/index");

const _db = drizzle(env.DB_URL!, {
  schema,
});

type OnCommitCallback = () => void | Promise<void>;

export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  Models,
  ExtractTablesWithRelations<Models>
>;

export const db = _db as typeof _db & {
  transaction: TransactionWithHooks;
};

export type DBConnection = Transaction | typeof db;

const ogTransaction = db.transaction.bind(db);

type TransactionWithHooks = <T>(
  transaction: (tx: Transaction) => Promise<T>,
) => Promise<T>;

export const transactionWithHooks: TransactionWithHooks = async <T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> => {
  const postConfigCallbacks: OnCommitCallback[] = [];
  const result = await ogTransaction(async (tx) => {
    const newTx: Transaction & {
      onCommit: (callback: OnCommitCallback) => void;
    } = tx as any;
    newTx.onCommit = (callback: OnCommitCallback) => {
      postConfigCallbacks.push(callback);
    };
    const result = await fn(
      tx as Transaction & {onCommit: (callback: OnCommitCallback) => void},
    );
    return result;
  });
  for (const callback of postConfigCallbacks) {
    try {
      await callback();
    } catch (error) {
      console.error("Error in oncommit callback", {error});
    }
  }
  return result;
};

db.transaction = transactionWithHooks;
