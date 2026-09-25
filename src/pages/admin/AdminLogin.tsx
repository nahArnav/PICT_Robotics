import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router';
import { ArrowRight, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { Button, Field, inputCls } from '../../components/ui';
import { Logo, SchematicVisual } from '../../components/Logo';
import { getCurrentRole, supabase } from '../../lib/supabase';
import { authErrorMessage, isAdminRole, useAuthState } from '../../lib/auth';

export function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = useAuthState();
  if (auth.ready && isAdminRole(auth.role)) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (authError) throw authError;
      const role = await getCurrentRole();
      if (isAdminRole(role)) nav('/admin', { replace: true });
      else {
        await supabase.auth.signOut();
        setError('This account is not authorized for the admin console.');
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Unable to sign in right now.'));
    }
    setBusy(false);
  };

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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-paper-2/5 px-3 py-1 text-xs text-celadon">
              <Lock size={12} /> Restricted · Recruitment team only
            </div>
            <h2 className="font-display text-3xl font-extrabold leading-tight">Admin<br />Console</h2>
            <p className="mt-3 max-w-sm text-white/60">Registrations, pipeline, interview scheduling and evaluations — the entire recruitment operation in one place.</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-tekhelet/10 text-tekhelet lg:mt-0">
            <ShieldCheck size={24} />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold">Admin sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in with your recruitment team credentials.</p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Admin email" required>
              <input required type="email" className={inputCls} placeholder="admin@pictrobotics.in"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" required>
              <input required type="password" className={inputCls} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button variant="cta" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-soft">Use the email and password created in Supabase Auth. Access is restricted to the recruitment team.</p>
          <p className="mt-2 text-center text-xs text-ink-soft">Have a club invitation? <Link to="/admin/signup" className="font-semibold text-tekhelet">Create your authorized account</Link></p>
        </div>
      </div>
    </div>
  );
}
