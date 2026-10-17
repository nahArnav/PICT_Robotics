import { spawn } from "node:child_process";
import { localConfig } from "./local-config.mjs";
const config = localConfig();
const child = spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--port", "5173"], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_SUPABASE_URL: config.API_URL,
    VITE_SUPABASE_ANON_KEY: config.ANON_KEY,
    PORT: "5173",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
