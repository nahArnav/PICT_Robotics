import { execFileSync } from "node:child_process";
export function localConfig() {
  const output = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const config = JSON.parse(output);
  if (config.API_URL !== "http://127.0.0.1:55421" || !config.SERVICE_ROLE_KEY || !config.ANON_KEY)
    throw new Error(
      "Tests require the dedicated local Supabase stack at port 55421. Hosted projects are never accepted.",
    );
  return config;
}
