import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

// Build the app, then run: node scripts/test-isolated-mysql.mjs
// Only uses a NEW temporary MySQL datadir. Logs and disposable data are retained.
// Never loads existing MySQL defaults or project .env files.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mysqlBase = "C:/Program Files/MySQL/MySQL Server 8.4";
const mysqld = path.join(mysqlBase, "bin", "mysqld.exe");
const nextCli = path.join(repo, "node_modules", "next", "dist", "bin", "next");
const controller = new AbortController();
const children = [];
const reservedPorts = new Set();
let runDirectory;
let datadir;
let dbPort;
let mysqlProcess;
let rootPassword = "";
let failed = false;

// Allow only operating-system essentials; no inherited DB settings or NODE_OPTIONS.
const osEnvironment = {};
for (const key of [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "LOCALAPPDATA",
  "APPDATA",
  "COMSPEC",
  "PATHEXT",
]) {
  if (process.env[key] !== undefined) osEnvironment[key] = process.env[key];
}
const onSigint = () => controller.abort(new Error("Interrupted by SIGINT"));
const onSigterm = () => controller.abort(new Error("Interrupted by SIGTERM"));
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);

function checkAbort() {
  controller.signal.throwIfAborted();
}

function delay(milliseconds) {
  checkAbort();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", abort);
      reject(controller.signal.reason);
    };
    controller.signal.addEventListener("abort", abort, { once: true });
  });
}

async function freePort() {
  for (;;) {
    checkAbort();
    const listener = net.createServer();
    await new Promise((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(0, "127.0.0.1", resolve);
    });
    const port = listener.address().port;
    await new Promise((resolve, reject) =>
      listener.close((error) => (error ? reject(error) : resolve())),
    );
    if (!reservedPorts.has(port)) {
      reservedPorts.add(port);
      return port;
    }
  }
}

function launch(name, executable, args, env = osEnvironment) {
  checkAbort();
  const logfile = path.join(runDirectory, name + ".log");
  const output = openSync(logfile, "a");
  let child;
  try {
    child = spawn(executable, args, {
      cwd: repo,
      env,
      windowsHide: true,
      shell: false,
      stdio: ["ignore", output, output],
    });
  } finally {
    closeSync(output);
  }
  const record = { name, child, logfile, exited: false, result: undefined };
  record.exit = new Promise((resolve) => {
    const finish = (result) => {
      if (record.exited) return;
      record.exited = true;
      record.result = result;
      resolve(result);
    };
    child.on("error", (error) => {
      if (!child.pid) finish({ error });
      else record.lastError = error;
    });
    child.once("exit", (code, signal) => finish({ code, signal }));
  });
  children.push(record);
  return record;
}

function waitForExit(record, timeout, abortable = true) {
  if (record.exited) return Promise.resolve(record.result);
  let timer;
  let abort;
  const interrupted = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(record.name + " timed out; see " + record.logfile)),
      timeout,
    );
    if (abortable) {
      abort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", abort, { once: true });
      if (controller.signal.aborted) abort();
    }
  });
  return Promise.race([record.exit, interrupted]).finally(() => {
    clearTimeout(timer);
    if (abort) controller.signal.removeEventListener("abort", abort);
  });
}

async function runChild(name, executable, args, env, timeout = 180_000) {
  const record = launch(name, executable, args, env);
  const result = await waitForExit(record, timeout);
  if (result.error || result.code !== 0) {
    throw new Error(
      name +
        " failed: " +
        (result.error?.message || "exit " + result.code) +
        "; see " +
        record.logfile,
    );
  }
  console.log(name + ": passed");
}

function normalizeDirectory(directory) {
  const normalized = path.resolve(directory).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

async function adminConnection() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: dbPort,
    user: "root",
    password: rootPassword,
    connectTimeout: 2_000,
    multipleStatements: true,
  });
  try {
    const [rows] = await connection.query("SELECT @@datadir AS datadir");
    if (normalizeDirectory(rows[0].datadir) !== normalizeDirectory(datadir)) {
      throw new Error("Refusing to use a MySQL instance with a different datadir");
    }
    return connection;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

async function waitForMySQL() {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    checkAbort();
    if (mysqlProcess.exited) throw new Error("Isolated MySQL exited; see " + mysqlProcess.logfile);
    try {
      const connection = await adminConnection();
      await connection.end();
      return;
    } catch (error) {
      lastError = error;
      // Refuse a different server that happened to acquire the selected port.
      if (error.message.includes("different datadir")) throw error;
    }
    await delay(500);
  }
  throw new Error("Isolated MySQL did not become ready: " + lastError?.message);
}

async function waitForWebsite(record, url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    checkAbort();
    if (record.exited) throw new Error(record.name + " exited; see " + record.logfile);
    try {
      const response = await fetch(url + "/api/auth", {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2_000)]),
      });
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {
      checkAbort();
    }
    await delay(500);
  }
  throw new Error(record.name + " did not become ready; see " + record.logfile);
}

async function stopChild(record) {
  if (record.exited) return;
  // Only child handles created by this runner are ever terminated.
  record.child.kill("SIGTERM");
  try {
    await waitForExit(record, 10_000, false);
  } catch {
    record.child.kill("SIGKILL");
    await waitForExit(record, 10_000, false);
  }
}

async function cleanup() {
  const errors = [];
  for (const record of [...children].reverse()) {
    if (record === mysqlProcess) continue;
    try {
      await stopChild(record);
    } catch (error) {
      errors.push(error);
    }
  }
  if (mysqlProcess && !mysqlProcess.exited) {
    try {
      const connection = await adminConnection();
      try {
        await connection.query({ sql: "SHUTDOWN", timeout: 5_000 });
      } finally {
        connection.destroy();
      }
    } catch (error) {
      console.warn("MySQL shutdown response: " + error.message);
    }
    try {
      await waitForExit(mysqlProcess, 15_000, false);
    } catch {
      try {
        await stopChild(mysqlProcess);
      } catch (error) {
        errors.push(error);
      }
    }
  }
  for (const record of children) {
    if (!record.exited)
      errors.push(new Error(record.name + " (PID " + record.child.pid + ") is still running"));
  }
  if (errors.length) throw new AggregateError(errors, "Could not stop every isolated test process");
  console.log("Verified: all processes started by this runner have stopped.");
}

try {
  if (process.platform !== "win32")
    throw new Error("This runner requires Windows and the local MySQL 8.4 installation.");
  await Promise.all([
    access(mysqld),
    access(nextCli),
    access(path.join(repo, ".next", "BUILD_ID")),
    access(path.join(repo, "db", "mysql", "schema.sql")),
  ]);
  checkAbort();
  runDirectory = await mkdtemp(path.join(os.tmpdir(), "metro-mysql-test-"));
  datadir = path.join(runDirectory, "data");
  await mkdir(datadir);
  console.log("Isolated test files and logs: " + runDirectory);
  dbPort = await freePort();
  const firstPort = await freePort();
  const secondPort = await freePort();
  const database = "metro_test_" + randomUUID().replaceAll("-", "");
  const baseArgs = ["--no-defaults", "--basedir=" + mysqlBase, "--datadir=" + datadir];
  await runChild(
    "mysql-initialize",
    mysqld,
    [...baseArgs, "--initialize-insecure", "--console"],
    osEnvironment,
    120_000,
  );
  mysqlProcess = launch("mysql", mysqld, [
    ...baseArgs,
    "--port=" + dbPort,
    "--bind-address=127.0.0.1",
    "--mysqlx=OFF",
    "--skip-log-bin",
    "--local-infile=OFF",
    "--max-allowed-packet=67108864",
    "--pid-file=" + path.join(runDirectory, "mysql.pid"),
    "--log-error=" + path.join(runDirectory, "mysql-error.log"),
  ]);
  await writeFile(
    path.join(runDirectory, "run.json"),
    JSON.stringify(
      {
        repo,
        datadir,
        database,
        dbPort,
        firstPort,
        secondPort,
        mysqlPid: mysqlProcess.child.pid,
      },
      null,
      2,
    ),
  );
  await waitForMySQL();
  const appPassword = randomBytes(24).toString("hex");
  const connection = await adminConnection();
  try {
    const schema = await readFile(path.join(repo, "db", "mysql", "schema.sql"), "utf8");
    await connection.query(schema.replaceAll("penang_metro", database));
    const nextRootPassword = randomBytes(24).toString("hex");
    await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [nextRootPassword]);
    rootPassword = nextRootPassword;
    await connection.query("CREATE USER 'metro_test'@'127.0.0.1' IDENTIFIED BY ?", [appPassword]);
    await connection.query(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON " + database + ".* TO 'metro_test'@'127.0.0.1'",
    );
  } finally {
    await connection.end();
  }

  // Next and smoke-local both call @next/env. Replace the loader only inside
  // these child processes before either entry point can read project .env files.
  const preload = path.join(runDirectory, "explicit-environment.cjs");
  await writeFile(
    preload,
    [
      'const filename = require.resolve("@next/env", { paths: [' + JSON.stringify(repo) + "] });",
      "const original = require(filename);",
      "require.cache[filename].exports = {",
      "  ...original,",
      "  loadEnvConfig() {",
      "    return { combinedEnv: process.env, parsedEnv: {}, loadedEnvFiles: [] };",
      "  },",
      "};",
      "",
    ].join("\n"),
  );
  const env = {
    ...osEnvironment,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    __NEXT_PROCESSED_ENV: "true",
    DB_HOST: "127.0.0.1",
    DB_PORT: String(dbPort),
    DB_NAME: database,
    DB_USER: "metro_test",
    DB_PASSWORD: appPassword,
    SMOKE_ALLOW_WRITES: "1",
    SMOKE_BASE_URL: "http://127.0.0.1:" + firstPort,
    SMOKE_SECOND_BASE_URL: "http://127.0.0.1:" + secondPort,
  };
  const nodeArgs = ["--require", preload];
  const authorityKey = randomBytes(24).toString("hex");
  await runChild(
    "registration-setup",
    process.execPath,
    [...nodeArgs, path.join(repo, "scripts", "setup-registration.mjs")],
    {
      ...env,
      AUTHORITY_REGISTRATION_KEY: authorityKey,
      TEAM_CODE_SECRET: randomBytes(32).toString("hex"),
    },
    30_000,
  );
  await runChild(
    "registration-setup-idempotent",
    process.execPath,
    [...nodeArgs, path.join(repo, "scripts", "setup-registration.mjs")],
    {
      ...env,
      AUTHORITY_REGISTRATION_KEY: "ignored-site-local-key",
      TEAM_CODE_SECRET: "ignored-site-local-seed",
    },
    30_000,
  );
  await runChild(
    "db-check",
    process.execPath,
    [...nodeArgs, path.join(repo, "scripts", "check-db.mjs")],
    env,
    30_000,
  );
  const first = launch(
    "website-1",
    process.execPath,
    [...nodeArgs, nextCli, "start", repo, "--hostname", "127.0.0.1", "--port", String(firstPort)],
    env,
  );
  const second = launch(
    "website-2",
    process.execPath,
    [...nodeArgs, nextCli, "start", repo, "--hostname", "127.0.0.1", "--port", String(secondPort)],
    {
      ...env,
      AUTHORITY_REGISTRATION_KEY: "ignored-site-local-key",
      TEAM_CODE_SECRET: "ignored-site-local-seed",
    },
  );
  await Promise.all([
    waitForWebsite(first, env.SMOKE_BASE_URL),
    waitForWebsite(second, env.SMOKE_SECOND_BASE_URL),
  ]);
  console.log(
    "Two isolated websites ready: " + env.SMOKE_BASE_URL + ", " + env.SMOKE_SECOND_BASE_URL,
  );
  await runChild(
    "smoke",
    process.execPath,
    [...nodeArgs, path.join(repo, "scripts", "smoke-local.mjs")],
    { ...env, SMOKE_AUTHORITY_REGISTRATION_KEY: authorityKey },
  );
  console.log("Isolated MySQL integration smoke test passed.");
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  try {
    await cleanup();
  } catch (error) {
    failed = true;
    console.error(error);
  }
  process.removeListener("SIGINT", onSigint);
  process.removeListener("SIGTERM", onSigterm);
  if (runDirectory) console.log("Logs and disposable data retained at: " + runDirectory);
  if (failed) process.exitCode = 1;
}
