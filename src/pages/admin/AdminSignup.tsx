import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ShieldCheck } from "lucide-react";
import { Button, Field, inputCls } from "../../components/ui";
import { Logo } from "../../components/Logo";
import { DataState } from "../../components/DataState";
import { supabase } from "../../lib/supabase";
import { authErrorMessage, useAuthState, refreshAuth } from "../../lib/auth";
import { useRemote } from "../../lib/useRemote";

export function AdminSignup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuthState();
  const token = params.get("invite") ?? "";
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const invitation = useRemote(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
    const { data, error } = await supabase.rpc("inspect_admin_invite", {
      p_token: token,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  }, [token]);
  const accept = async () => {
    const { error } = await supabase.rpc("accept_admin_invite", {
      p_token: token,
    });
    if (error) throw error;
    await refreshAuth();
    navigate("/admin", { replace: true });
  };
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 py-12">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-10 rounded-2xl border border-line bg-white p-7">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tekhelet/10 text-tekhelet">
            <ShieldCheck size={24} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold">Club invitation</h1>
          <DataState
            loading={invitation.loading || !auth.ready}
            error={invitation.error}
            retry={invitation.refresh}
          />
          {!invitation.loading && !invitation.error && !invitation.data && (
            <p className="mt-4 text-sm text-ink-soft">
              A valid, unused invitation is required. This link may be missing, expired, revoked, or
              already accepted.
            </p>
          )}
          {invitation.data && (
            <>
              <p className="mt-3 text-sm text-ink-soft">
                Invitation for {invitation.data.email} · {invitation.data.role.replace("_", " ")}.
                Expires {new Date(invitation.data.expires_at).toLocaleString()}.
              </p>
              {auth.session ? (
                <div className="mt-5 space-y-4">
                  <p className="text-sm">Signed in as {auth.user?.email}.</p>
                  <Button
                    variant="cta"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setNotice("");
                      try {
                        await accept();
                      } catch (error) {
                        setNotice(authErrorMessage(error, "Unable to accept this invitation."));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Accept invitation
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      await refreshAuth();
                    }}
                  >
                    Use another account
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex gap-2">
                    <Button
                      size="sm"
                      variant={mode === "signup" ? "primary" : "outline"}
                      onClick={() => setMode("signup")}
                    >
                      New account
                    </Button>
                    <Button
                      size="sm"
                      variant={mode === "signin" ? "primary" : "outline"}
                      onClick={() => setMode("signin")}
                    >
                      Existing account
                    </Button>
                  </div>
                  <form
                    className="mt-5 space-y-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setBusy(true);
                      setNotice("");
                      try {
                        if (mode === "signup") {
                          const { data, error } = await supabase.auth.signUp({
                            email: invitation.data!.email,
                            password,
                            options: {
                              data: { full_name: name.trim() },
                              emailRedirectTo: `${window.location.origin}/admin/signup?invite=${encodeURIComponent(token)}`,
                            },
                          });
                          if (error) throw error;
                          if (!data.session) {
                            setNotice(
                              "Check your email to confirm your account, then reopen this invitation. If you already have an account, choose Existing account.",
                            );
                            return;
                          }
                        } else {
                          const { error } = await supabase.auth.signInWithPassword({
                            email: invitation.data!.email,
                            password,
                          });
                          if (error) throw error;
                        }
                        await accept();
                      } catch (error) {
                        setNotice(
                          authErrorMessage(error, "Unable to continue with this invitation."),
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {mode === "signup" && (
                      <Field label="Full name" required>
                        <input
                          required
                          className={inputCls}
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </Field>
                    )}
                    <Field label="Invited email">
                      <input
                        readOnly
                        type="email"
                        className={inputCls}
                        value={invitation.data.email}
                      />
                    </Field>
                    <Field label="Password" required>
                      <input
                        required
                        minLength={8}
                        type="password"
                        className={inputCls}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </Field>
                    <Button variant="cta" className="w-full" disabled={busy}>
                      {busy
                        ? "Please wait…"
                        : mode === "signup"
                          ? "Create authorised account"
                          : "Sign in and accept"}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
          {notice && (
            <p role="status" className="mt-4 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-soft">
              {notice}
            </p>
          )}
          <p className="mt-5 text-center text-sm">
            <Link to="/signin" className="font-semibold text-tekhelet">
              Return to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
