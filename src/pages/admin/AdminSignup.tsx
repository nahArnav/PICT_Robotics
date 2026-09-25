import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Field, inputCls } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { authErrorMessage, isAdminRole, useAuthState } from '../../lib/auth';

export function AdminSignup() {
  const [params] = useSearchParams(); const nav = useNavigate();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const token = params.get('invite') ?? '';
  const auth = useAuthState();
  const acceptInvite = async () => {
    if (!token) return setNotice('An admin invitation link is required.');
    setBusy(true); setNotice('');
    try {
      const { error } = await supabase.rpc('accept_admin_invite', { p_token: token });
      if (error) throw error;
      nav('/admin', { replace: true });
    } catch (err) {
      setNotice(authErrorMessage(err, 'This invitation could not be accepted.'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (auth.ready && isAdminRole(auth.role)) nav('/admin', { replace: true });
  }, [auth.ready, auth.role, nav]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return setNotice('An admin invitation link is required.');
    setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/admin/signup?invite=${encodeURIComponent(token)}` },
      });
      if (error) throw error;
      if (data.session) {
        await acceptInvite();
        return;
      }
      setNotice('Check your email to confirm your account, then reopen this invitation link. If you already have an account, sign in first and reopen this link.');
    } catch (err) {
      setNotice(authErrorMessage(err, 'Your account could not be created.'));
    } finally {
      setBusy(false);
    }
  };
  const signedInButNotAdmin = auth.ready && auth.session && !isAdminRole(auth.role);
  return <div className="grid min-h-screen place-items-center bg-paper px-6 py-12"><div className="w-full max-w-md"><Logo /><div className="mt-10 rounded-2xl border border-line bg-paper-2 p-7"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-tekhelet/10 text-tekhelet"><ShieldCheck size={24} /></div><h1 className="mt-5 font-display text-3xl font-bold">Create admin account</h1><p className="mt-2 text-sm text-ink-soft">This is restricted to a valid PICT Robotics Club invitation.</p>{signedInButNotAdmin ? <div className="mt-6 space-y-4"><p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-soft">You are signed in as {auth.user?.email}. Accept this invitation only if it was sent to that address.</p>{notice && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-soft">{notice}</p>}<Button variant="cta" size="lg" className="w-full" disabled={busy} onClick={() => void acceptInvite()}>{busy ? 'Checking invitation…' : 'Accept invitation'} <ArrowRight size={16} /></Button></div> : <form className="mt-6 space-y-4" onSubmit={submit}><Field label="Full name" required><input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field><Field label="Invited email" required><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field><Field label="Password" required><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="At least 8 characters" /></Field>{notice && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-soft">{notice}</p>}<Button variant="cta" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create authorized account'} <ArrowRight size={16} /></Button></form>}<p className="mt-5 text-center text-sm text-ink-soft">Already have access? <Link to="/admin/login" className="font-semibold text-tekhelet">Admin login</Link></p></div></div></div>;
}
