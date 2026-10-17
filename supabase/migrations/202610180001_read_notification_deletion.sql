-- Opt-in deletion only: this migration never removes existing notifications.
-- Reading/deleting someone else's notification is forbidden, including for admins.
grant delete on public.notifications to authenticated;
create policy "owners delete read notifications" on public.notifications
 for delete to authenticated
 using(user_id=(select auth.uid()) and read and (select public.is_active_account()));
