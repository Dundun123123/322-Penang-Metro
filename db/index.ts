import "server-only";
import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";

type SqlValue = string | number | boolean | null | Buffer;
type Executor = Pool | PoolConnection;

export interface AppDatabase {
  prepare(sql: string): {
    all(...values: SqlValue[]): Promise<Record<string, unknown>[]>;
    get(...values: SqlValue[]): Promise<Record<string, unknown> | undefined>;
    run(...values: SqlValue[]): Promise<ResultSetHeader>;
  };
  withLock<T>(key: string, work: (db: AppDatabase) => Promise<T>): Promise<T>;
  transaction<T>(work: (db: AppDatabase) => Promise<T>): Promise<T>;
}

/** All statements are asynchronous; transaction callbacks use one reserved connection. */
export function database(executor: Executor): AppDatabase {
  return {
    prepare(sql: string) {
      return {
        async all(...values: SqlValue[]): Promise<Record<string, unknown>[]> {
          const [rows] = await executor.query<RowDataPacket[]>(sql, values);
          return rows;
        },
        async get(...values: SqlValue[]): Promise<Record<string, unknown> | undefined> {
          const [rows] = await executor.query<RowDataPacket[]>(sql, values);
          return rows[0];
        },
        async run(...values: SqlValue[]) {
          const [result] = await executor.query<ResultSetHeader>(sql, values);
          return result;
        },
      };
    },
    async withLock<T>(key: string, work: (db: AppDatabase) => Promise<T>): Promise<T> {
      if (!("getConnection" in executor)) throw new Error("Nested locks are not supported");
      const connection = await executor.getConnection();
      let locked = false;
      try {
        const db = database(connection);
        const result = await db.prepare("SELECT GET_LOCK(?,10) AS acquired").get(key);
        if (Number(result?.acquired) !== 1)
          throw new Error("Could not acquire database lock; retry the request");
        locked = true;
        return await work(db);
      } finally {
        try {
          if (locked) await connection.query("SELECT RELEASE_LOCK(?)", [key]);
        } finally {
          connection.release();
        }
      }
    },
    async transaction<T>(work: (db: AppDatabase) => Promise<T>): Promise<T> {
      if (!("getConnection" in executor)) throw new Error("Nested transactions are not supported");
      const connection = await executor.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(database(connection));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

type GlobalDatabase = typeof globalThis & { __metroMysqlPool?: Pool };
export function getDb() {
  const shared = globalThis as GlobalDatabase;
  if (!shared.__metroMysqlPool) {
    for (const name of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
      if (!process.env[name])
        throw new Error(`Missing ${name}. Configure .env.local before starting the website.`);
    }
    const port = Number(process.env.DB_PORT || "3306");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid DB_PORT");
    shared.__metroMysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 50,
      connectTimeout: 10000,
      multipleStatements: false,
    });
  }
  return database(shared.__metroMysqlPool);
}
