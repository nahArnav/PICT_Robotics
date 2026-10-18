import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { pictFixtureValues, publishPictTestForm } from "../form-fixtures";
import type { ProfileRow } from "../../src/lib/database";
// @ts-expect-error Node-only local helper.
import { localConfig } from "../local-config.mjs";
const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const newClient = () =>
  createClient(config.API_URL, config.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const ok = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};
test("simultaneous drafts, submissions and interviewer bookings preserve integrity", async () => {
  const tag = Date.now();
  const password = `Race-${tag}-Robot!`;
  const users: string[] = [];
  let cycleId = "";
  try {
    const clients: ReturnType<typeof newClient>[] = [];
    for (let index = 0; index < 3; index++) {
      const email = `race-${tag}-${index}@example.com`;
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Race applicant ${index}` },
      });
      ok(created);
      const id = created.data.user!.id;
      users.push(id);
      const client = newClient();
      ok(await client.auth.signInWithPassword({ email, password }));
      clients.push(client);
      ok(
        await client
          .from("profiles")
          .update({
            phone: "1234567890",
            branch: "IT",
            year: "FY",
            division: "A",
          })
          .eq("id", id),
      );
    }
    ok(await service.from("user_roles").delete().eq("user_id", users[2]));
    ok(await service.from("user_roles").insert({ user_id: users[2], role: "admin" }));
    const cycle = await service
      .from("recruitment_cycles")
      .insert({
        name: `Race cycle ${tag}`,
        academic_year: "test",
        target_batch: "FY",
        application_open: new Date(Date.now() - 60000).toISOString(),
        application_close: new Date(Date.now() + 86400000).toISOString(),
        status: "open",
      })
      .select()
      .single();
    ok(cycle);
    cycleId = cycle.data.id;
    const domain = await service.from("domains").select("id").limit(1).single();
    ok(domain);
    const form = await publishPictTestForm(clients[2], cycleId);
    const profile = await clients[0].from("profiles").select("*").eq("id", users[0]).single();
    ok(profile);
    const input = {
      p_cycle_id: cycleId,
      p_form_revision: form.revision,
      p_values: pictFixtureValues(form.schema, profile.data as ProfileRow),
    };
    const drafts = await Promise.all([
      clients[0].rpc("save_built_application_draft", input),
      clients[0].rpc("save_built_application_draft", input),
    ]);
    drafts.forEach(ok);
    expect(drafts[0].data.id).toBe(drafts[1].data.id);
    const applicationId = drafts[0].data.id;
    const submission = await Promise.all([
      clients[0].rpc("submit_application", { p_application_id: applicationId }),
      clients[0].rpc("submit_application", { p_application_id: applicationId }),
    ]);
    expect(submission.filter((result) => !result.error)).toHaveLength(1);
    const notifications = await clients[0]
      .from("notifications")
      .select("id")
      .eq("type", "application");
    ok(notifications);
    expect(notifications.data).toHaveLength(1);
    const secondProfile = await clients[1].from("profiles").select("*").eq("id", users[1]).single();
    ok(secondProfile);
    const second = await clients[1].rpc("save_built_application_draft", {
      ...input,
      p_values: pictFixtureValues(form.schema, secondProfile.data as ProfileRow),
    });
    ok(second);
    ok(
      await clients[1].rpc("submit_application", {
        p_application_id: second.data.id,
      }),
    );
    for (const id of [applicationId, second.data.id]) {
      ok(
        await clients[2].rpc("update_application_status", {
          p_application_id: id,
          p_status: "under_review",
        }),
      );
      ok(
        await clients[2].rpc("update_application_status", {
          p_application_id: id,
          p_status: "shortlisted",
        }),
      );
    }
    const when = new Date(Date.now() + 7200000).toISOString();
    const bookings = await Promise.all(
      [applicationId, second.data.id].map((id) =>
        clients[2].rpc("schedule_interview", {
          p_application_id: id,
          p_interviewer_id: users[2],
          p_scheduled_at: when,
          p_duration: 20,
        }),
      ),
    );
    expect(bookings.filter((result) => !result.error)).toHaveLength(1);
    expect(bookings.find((result) => result.error)?.error?.message).toContain("already booked");
    await Promise.all(clients.map((client) => client.auth.signOut()));
  } finally {
    if (cycleId) {
      await service.from("applications").delete().eq("recruitment_cycle_id", cycleId);
      await service.from("recruitment_cycles").delete().eq("id", cycleId);
    }
    for (const id of users) await service.auth.admin.deleteUser(id);
  }
});

test("concurrent super-admin demotions retain one authorised super admin", async () => {
  const tag = Date.now();
  const users: string[] = [];
  const clients = [];
  try {
    for (let index = 0; index < 2; index++) {
      const email = `super-race-${tag}-${index}@example.com`;
      const password = `SuperRace-${tag}-Robot!`;
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      ok(created);
      const id = created.data.user!.id;
      users.push(id);
      ok(await service.from("user_roles").delete().eq("user_id", id));
      ok(await service.from("user_roles").insert({ user_id: id, role: "super_admin" }));
      const client = newClient();
      ok(await client.auth.signInWithPassword({ email, password }));
      clients.push(client);
    }
    const changes = await Promise.all(
      clients.map((client, index) =>
        client.rpc("set_user_role", {
          p_user_id: users[1 - index],
          p_role: "applicant",
        }),
      ),
    );
    expect(changes.filter((result) => !result.error)).toHaveLength(1);
    expect(changes.find((result) => result.error)?.error?.message).toContain(
      "Super admin access required",
    );
    const roles = await service.from("user_roles").select("user_id,role").in("user_id", users);
    ok(roles);
    expect(roles.data?.filter((row) => row.role === "super_admin")).toHaveLength(1);
  } finally {
    await Promise.all(clients.map((client) => client.auth.signOut()));
    for (const id of users) await service.auth.admin.deleteUser(id);
  }
});

test("Auth bans immediately deny an existing access token through RLS and RPCs", async () => {
  const email = `banned-${Date.now()}@example.com`;
  const password = "Local-Banned-Test-Only!";
  let id = "";
  try {
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    ok(created);
    id = created.data.user!.id;
    ok(await service.from("user_roles").delete().eq("user_id", id));
    ok(await service.from("user_roles").insert({ user_id: id, role: "admin" }));
    const login = newClient();
    const signedIn = await login.auth.signInWithPassword({ email, password });
    ok(signedIn);
    const token = signedIn.data.session!.access_token;
    // Supply the original token directly; a failed refresh must not be the reason access stops.
    const existingToken = createClient(config.API_URL, config.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    ok(await existingToken.rpc("dashboard_metrics"));
    ok(await service.auth.admin.updateUserById(id, { ban_duration: "24h" }));
    const profiles = await existingToken.from("profiles").select("id");
    ok(profiles);
    expect(profiles.data).toHaveLength(0);
    const metrics = await existingToken.rpc("dashboard_metrics");
    expect(metrics.error?.message).toContain("Staff access required");
  } finally {
    if (id) await service.auth.admin.deleteUser(id);
  }
});
