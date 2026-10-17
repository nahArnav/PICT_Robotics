import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
// No production connection is accepted. Every run gets its own network-isolated database.
const container = `roboclub-test-${process.pid}`;
const image = process.env.TEST_POSTGRES_IMAGE || "postgis/postgis:16-3.4";
function docker(args, input, quiet = false) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (!quiet && result.stderr) process.stdout.write(result.stderr);
  if (result.status !== 0)
    throw new Error(result.stderr || result.stdout || "Docker command failed");
  return result.stdout;
}
const sql = (source) =>
  docker(
    ["exec", "-i", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
    source,
  );
try {
  docker(
    [
      "run",
      "--detach",
      "--rm",
      "--network",
      "none",
      "--name",
      container,
      "--env",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      image,
    ],
    undefined,
    true,
  );
  for (let attempt = 0; attempt < 60; attempt++) {
    // The image starts a temporary Unix-socket server during initialization. Only
    // the final server accepts TCP; otherwise tests can be killed mid-migration.
    const ready = spawnSync("docker", [
      "exec",
      container,
      "pg_isready",
      "-h",
      "127.0.0.1",
      "-U",
      "postgres",
    ]);
    if (ready.status === 0) break;
    await new Promise((done) => setTimeout(done, 500));
    if (attempt === 59) throw new Error("Test database did not start");
  }
  sql(readFileSync(new URL("./sql/bootstrap.sql", import.meta.url), "utf8"));
  for (const file of readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    console.log(`Applying ${file}`);
    sql(readFileSync(resolve("supabase/migrations", file), "utf8"));
  }
  sql(readFileSync(new URL("./sql/workflows.sql", import.meta.url), "utf8"));
  console.log("Migration chain and database workflow/security tests passed.");
} finally {
  spawnSync("docker", ["rm", "--force", container], { encoding: "utf8" });
}
