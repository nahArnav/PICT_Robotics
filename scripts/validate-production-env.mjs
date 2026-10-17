export const productionProjectRef = "ycsqqktwzvqqblarqpfi";

// Never print key values, including in failure messages. This guard prevents a
// production build from silently using localhost, a different project, or an
// elevated credential that Vite would expose to every visitor.
export function validateProductionEnv(environment) {
  const url = environment.VITE_SUPABASE_URL;
  const key = environment.VITE_SUPABASE_ANON_KEY;
  const errors = [];
  if (url !== `https://${productionProjectRef}.supabase.co`) {
    errors.push(`VITE_SUPABASE_URL must be https://${productionProjectRef}.supabase.co`);
  }
  if (!key) {
    errors.push("VITE_SUPABASE_ANON_KEY is required; use the public anon or publishable key.");
  } else if (key.startsWith("sb_publishable_") && key.length > 25) {
    // New Supabase publishable keys are intentionally safe in browser builds.
  } else {
    try {
      const parts = key.split(".");
      if (parts.length !== 3) throw new Error("Invalid public key format");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.role !== "anon" || payload.ref !== productionProjectRef) {
        throw new Error("Wrong key role or project");
      }
    } catch {
      errors.push(
        "VITE_SUPABASE_ANON_KEY must be this project’s public anon/publishable key, never a service-role or secret key.",
      );
    }
  }
  for (const name of Object.keys(environment)) {
    if (
      name.startsWith("VITE_") &&
      /SERVICE.?ROLE|SECRET|PASSWORD|ACCESS.?TOKEN|SMTP/i.test(name)
    ) {
      errors.push(`Remove ${name}: privileged credentials must not be exposed through Vite.`);
    }
  }
  return errors;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const errors = validateProductionEnv(process.env);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Production public configuration validated for ${productionProjectRef}.`);
  }
}
