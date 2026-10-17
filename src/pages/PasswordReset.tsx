import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { Button, Field, inputCls } from "../components/ui";
import { supabase } from "../lib/supabase";
import { authErrorMessage } from "../lib/auth";

export function PasswordReset({ recovery = false }: { recovery?: boolean }) {
  const nav = useNavigate();
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">
          {recovery ? "Choose a new password" : "Reset your password"}
        </h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setNotice("");
            try {
              if (recovery) {
                const { error } = await supabase.auth.updateUser({
                  password: value,
                });
                if (error) throw error;
                await supabase.auth.signOut();
                nav("/signin", { replace: true });
              } else {
                const { error } = await supabase.auth.resetPasswordForEmail(value.trim(), {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setNotice(
                  "If an account exists for that email, check your inbox for a password reset link.",
                );
              }
            } catch (error) {
              setNotice(
                authErrorMessage(
                  error,
                  "Unable to reset your password. Request a new link and retry.",
                ),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={recovery ? "New password" : "Email address"} required>
            <input
              className={inputCls}
              type={recovery ? "password" : "email"}
              autoComplete={recovery ? "new-password" : "email"}
              minLength={recovery ? 8 : undefined}
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <Button className="w-full" variant="cta" disabled={busy}>
            {busy ? "Please wait…" : recovery ? "Save password" : "Send reset link"}
          </Button>
          {notice && (
            <p role="status" className="text-sm text-ink-soft">
              {notice}
            </p>
          )}
        </form>
        <Link to="/signin" className="mt-5 block text-sm text-tekhelet">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
