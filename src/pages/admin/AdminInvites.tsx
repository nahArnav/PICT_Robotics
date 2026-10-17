import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { Button, Card, Field, Kicker, inputCls } from "../../components/ui";
import { DataState } from "../../components/DataState";
import { supabase } from "../../lib/supabase";
import type { AppRole } from "../../lib/database";
import { authErrorMessage, useAuthState } from "../../lib/auth";
import { useRemote } from "../../lib/useRemote";
import { getAdminInvites } from "../../lib/services/admin";

export function AdminInvites() {
  const auth = useAuthState();
  if (auth.role !== "super_admin")
    return <DataState error="You do not have permission to access this page." />;
  return <AccessSettings />;
}

function AccessSettings() {
  const auth = useAuthState();
  const superAdmin = auth.role === "super_admin";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<AppRole, "applicant">>("admin");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const invites = useRemote(getAdminInvites);
  const users = useRemote(async () => {
    if (!superAdmin) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .ilike("email", `%${search}%`)
      .order("email")
      .range(page * 25, page * 25 + 24);
    if (error) throw error;
    return data ?? [];
  }, [superAdmin, search, page]);
  const roles = useRemote(async () => {
    const ids = users.data?.map((user) => user.id) ?? [];
    if (!superAdmin || !ids.length) return [];
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", ids);
    if (error) throw error;
    return data ?? [];
  }, [superAdmin, users.data]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Kicker>Administration</Kicker>
        <h1 className="mt-1 font-display text-2xl font-bold">Access and invitations</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Super admins manage staff invitations and account roles. Invitation links expire after
          seven days.
        </p>
      </div>
      <Card className="p-6">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setNotice("");
            setLink("");
            try {
              const { data, error } = await supabase.rpc("create_admin_invite", {
                p_email: email.trim().toLowerCase(),
                p_role: role,
              });
              if (error) throw error;
              const invitation = data?.[0];
              if (!invitation) throw new Error("Invitation creation failed.");
              setLink(`${window.location.origin}/admin/signup?invite=${invitation.token}`);
              setNotice(
                "Invitation created. Copy this link now and share it with the intended recipient.",
              );
              invites.refresh();
            } catch (error) {
              setNotice(authErrorMessage(error, "Unable to create invitation."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Invited email" required>
            <input
              required
              type="email"
              className={inputCls}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              {["admin", "super_admin"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Button variant="cta" disabled={busy}>
            Create invite <UserPlus size={16} />
          </Button>
        </form>
        {notice && (
          <p role="status" className="mt-4 text-sm text-ink-soft">
            {notice}
          </p>
        )}
        {link && (
          <div className="mt-4 flex gap-2">
            <input aria-label="Invitation link" readOnly className={inputCls} value={link} />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setNotice("Invitation link copied.");
                } catch {
                  setNotice("Copy the invitation link from the field above.");
                }
              }}
            >
              <Copy size={16} />
            </Button>
          </div>
        )}
      </Card>
      <Card className="p-6">
        <h2 className="font-display text-xl font-bold">Recent invitations</h2>
        <DataState loading={invites.loading} error={invites.error} retry={invites.refresh} />
        {invites.data?.map((invitation) => (
          <div
            key={invitation.id}
            className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm"
          >
            <div>
              <p>
                {invitation.email} · {invitation.role}
              </p>
              <p className="text-xs text-ink-soft">
                {invitation.accepted_at
                  ? "Accepted"
                  : invitation.revoked_at
                    ? "Revoked"
                    : new Date(invitation.expires_at) < new Date()
                      ? "Expired"
                      : `Expires ${new Date(invitation.expires_at).toLocaleString()}`}
              </p>
            </div>
            {!invitation.accepted_at && !invitation.revoked_at && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { error } = await supabase.rpc("revoke_admin_invite", {
                      p_invite_id: invitation.id,
                    });
                    if (error) throw error;
                    invites.refresh();
                    setNotice("Invitation revoked.");
                  } catch (error) {
                    setNotice(authErrorMessage(error, "Unable to revoke invitation."));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Revoke
              </Button>
            )}
          </div>
        ))}
      </Card>
      {superAdmin && (
        <>
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold">User roles</h2>
            <input
              aria-label="Find user email"
              className={`${inputCls} mt-4`}
              placeholder="Search email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <DataState
              loading={users.loading}
              error={users.error || roles.error}
              retry={() => {
                users.refresh();
                roles.refresh();
              }}
            />
            {users.data?.map((user) => (
              <div
                key={user.id}
                className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
              >
                <span>
                  {user.full_name} · {user.email}
                </span>
                <select
                  aria-label={`Role for ${user.email}`}
                  className={`${inputCls} max-w-xs`}
                  disabled={
                    busy || roles.loading || Boolean(roles.error) || user.id === auth.user?.id
                  }
                  value={
                    roles.data
                      ?.filter((r) => r.user_id === user.id)
                      .sort(
                        (a, b) =>
                          ["super_admin", "admin", "applicant"].indexOf(a.role) -
                          ["super_admin", "admin", "applicant"].indexOf(b.role),
                      )[0]?.role ?? "applicant"
                  }
                  onChange={async (event) => {
                    const next = event.target.value as AppRole;
                    if (!confirm(`Change ${user.email} to ${next}?`)) return;
                    setBusy(true);
                    try {
                      const { error } = await supabase.rpc("set_user_role", {
                        p_user_id: user.id,
                        p_role: next,
                      });
                      if (error) throw error;
                      roles.refresh();
                      setNotice("User role updated.");
                    } catch (error) {
                      setNotice(authErrorMessage(error, "Unable to change this role."));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {["applicant", "admin", "super_admin"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
            ))}
          </Card>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={!page} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={(users.data?.length ?? 0) < 25}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
