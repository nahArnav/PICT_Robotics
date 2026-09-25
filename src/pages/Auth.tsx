import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Field, inputCls } from '../components/ui';
import { Logo, SchematicVisual } from '../components/Logo';
import { supabase } from '../lib/supabase';

export function Auth({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const nav = useNavigate();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

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
            <h2 className="font-display text-3xl font-extrabold leading-tight">Think. Build.<br />Break. Improve.</h2>
            <p className="mt-3 max-w-sm text-white/60">One account for your entire recruitment journey — application, tasks, interview and result.</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          {step === 'form' ? (
            <>
              <h1 className="mt-8 font-display text-3xl font-bold lg:mt-0">{isSignup ? 'Create account' : 'Sign in'}</h1>
              <p className="mt-2 text-sm text-ink-soft">
                {isSignup ? 'Use your PICT email to get started.' : 'Welcome back. Continue your recruitment.'}
              </p>
              <form
                className="mt-8 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true); setError('');
                  try {
                    if (isSignup) {
                      const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/signin` } });
                      if (signUpError) throw signUpError;
                      setStep('verify');
                    } else {
                      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                      if (signInError) throw signInError;
                      nav('/dashboard', { replace: true });
                    }
                  } catch (err) { setError(err instanceof Error ? err.message : 'Unable to continue.'); }
                  finally { setBusy(false); }
                }}
              >
                {isSignup && (
                  <Field label="Full name" required><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Aarav Shah" /></Field>
                )}
                <Field label="PICT email" required>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@pict.edu" />
                </Field>
                <Field label="Password" required>
                  <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="At least 8 characters" />
                </Field>
                {error && <p className="rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]">{error}</p>}
                <Button variant="cta" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-ink-soft">
                {isSignup ? 'Already have an account? ' : 'New here? '}
                <Link to={isSignup ? '/signin' : '/signup'} className="font-semibold text-tekhelet">
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-celadon/30 text-[#1e6b43]">
                <ShieldCheck size={26} />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold">Verify your email</h1>
              <p className="mt-2 text-sm text-ink-soft">Check your inbox and confirm your PICT email. Then return here and sign in to continue.</p>
              <Button to="/signin" variant="cta" size="lg" className="mt-6 w-full">Return to sign in <ArrowRight size={16} /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
