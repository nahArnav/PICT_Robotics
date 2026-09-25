import { useEffect, useState } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { Button, Card, Field, Kicker, inputCls } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import type { AppRole } from '../../lib/database';
import { authErrorMessage, useAuthState } from '../../lib/auth';

export function AdminInvites() {
  const auth = useAuthState();
  const [email, setEmail] = useState(''); const [role, setRole] = useState<Exclude<AppRole, 'applicant'>>('recruiter'); const [link, setLink] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const allowedRoles: Array<Exclude<AppRole, 'applicant'>> = auth.role === 'super_admin' ? ['recruiter', 'admin', 'super_admin'] : ['recruiter'];
  useEffect(() => { if (!allowedRoles.includes(role)) setRole('recruiter'); }, [role, allowedRoles]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setNotice(''); setLink(''); setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_admin_invite', { p_email: email.trim().toLowerCase(), p_role: role });
      if (error) throw error;
      const invitation = data?.[0];
      if (!invitation?.token) throw new Error('The invitation was created without a token.');
      setLink(`${window.location.origin}/admin/signup?invite=${encodeURIComponent(invitation.token)}`);
      setNotice('Invitation created. The secure link is shown once; share it only with the intended club member.');
    } catch (err) {
      setNotice(authErrorMessage(err, 'Unable to create the invitation.'));
    } finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6"><div><Kicker>Administration</Kicker><h1 className="mt-1 font-display text-2xl font-bold">Invite club administrators</h1><p className="mt-2 text-sm text-ink-soft">Admins may invite recruiters. Super admins may invite administrators and super admins. Invitations expire after seven days.</p></div><Card className="p-6"><form className="space-y-4" onSubmit={create}><Field label="PICT email" required><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field><Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value as Exclude<AppRole, 'applicant'>)} className={inputCls}>{allowedRoles.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></Field><Button variant="cta" disabled={busy}>{busy ? 'Creating invite…' : 'Create invite'} <UserPlus size={16} /></Button></form>{notice && <p className="mt-4 text-sm text-ink-soft">{notice}</p>}{link && <div className="mt-4 flex gap-2"><input readOnly value={link} className={`${inputCls} flex-1`} /><Button variant="outline" onClick={() => navigator.clipboard.writeText(link)}><Copy size={16} /></Button></div>}</Card></div>;
}
