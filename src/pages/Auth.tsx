import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Field, inputCls } from "../components/ui";
import { Logo, SchematicVisual } from "../components/Logo";
import { getCurrentRole, supabase } from "../lib/supabase";
import { authErrorMessage, useAuthState } from "../lib/auth";
import { invitationReturnPath, roleHomePath } from "../lib/roleRouting";

export function Auth({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const safeReturn = invitationReturnPath(params.get("next"));
  const auth = useAuthState();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const home = roleHomePath(auth.role);
  if (!isSignup && auth.ready && auth.session && home)
    return <Navigate to={safeReturn ?? home} replace />;

  async function openAccount() {
    const destination = roleHomePath(await getCurrentRole());
    if (!destination) {
      await supabase.auth.signOut();
      throw new Error(
        "Your account is not ready yet. Please try again after verifying your email.",
      );
    }
    nav(safeReturn ?? destination, { replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-indigo text-white lg:block">
        <div className="bp-grid-dark absolute inset-0 opacity-70" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo dark />
          <div className="mx-auto w-full max-w-sm">
            <SchematicVisual />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight">
              Think. Build.
              <br />
              Break. Improve.
            </h2>
            <p className="mt-3 max-w-sm text-white/60">
              One secure sign in for applicants and the club team. Your account permissions open the
              right dashboard automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          {step === "form" ? (
            <>
              <h1 className="mt-8 font-display text-3xl font-bold lg:mt-0">
                {isSignup ? "Create account" : "Sign in"}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                {isSignup
                  ? "Use your PICT email to get started."
                  : "Applicants and club staff sign in here. We’ll open your account’s dashboard."}
              </p>
              <form
                className="mt-8 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    if (isSignup) {
                      const { data, error: signUpError } = await supabase.auth.signUp({
                        email: email.trim().toLowerCase(),
                        password,
                        options: {
                          data: { full_name: fullName.trim() },
                          emailRedirectTo: `${window.location.origin}/signin`,
                        },
                      });
                      if (signUpError) throw signUpError;
                      if (data.session) await openAccount();
                      else setStep("verify");
                    } else {
                      const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: email.trim().toLowerCase(),
                        password,
                      });
                      if (signInError) throw signInError;
                      await openAccount();
                    }
                  } catch (err) {
                    setError(authErrorMessage(err, "Unable to continue."));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {isSignup && (
                  <Field label="Full name" required>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputCls}
                      placeholder="Aarav Shah"
                    />
                  </Field>
                )}
                <Field label="Email" required>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@pict.edu"
                  />
                </Field>
                <Field label="Password" required>
                  <input
                    required
                    minLength={isSignup ? 8 : undefined}
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder={isSignup ? "At least 8 characters" : "Your password"}
                  />
                </Field>
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]"
                  >
                    {error}
                  </p>
                )}
                <Button variant="cta" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}{" "}
                  <ArrowRight size={16} />
                </Button>
              </form>
              {isSignup && (
                <p className="mt-4 text-sm text-ink-soft">
                  New accounts receive applicant access only. Staff access must be granted by an
                  authorized administrator.
                </p>
              )}
              {!isSignup && (
                <Link to="/forgot-password" className="mt-4 block text-sm text-tekhelet">
                  Forgot password?
                </Link>
              )}
              <p className="mt-6 text-center text-sm text-ink-soft">
                {isSignup ? "Already have an account? " : "New here? "}
                <Link to={isSignup ? "/signin" : "/signup"} className="font-semibold text-tekhelet">
                  {isSignup ? "Sign in" : "Create account"}
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-celadon/30 text-[#1e6b43]">
                <ShieldCheck size={26} />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold">Verify your email</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Check your inbox and confirm your PICT email. Then return here and sign in to
                continue.
              </p>
              <Button to="/signin" variant="cta" size="lg" className="mt-6 w-full">
                Return to sign in <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
