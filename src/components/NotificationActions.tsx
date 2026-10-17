import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./ui";
import { authErrorMessage } from "../lib/auth";
import {
  deleteReadNotification,
  markAsRead,
  type Notification,
} from "../lib/services/notifications";

export function NotificationActions({
  notification,
  onChanged,
  disabled = false,
}: {
  notification: Pick<Notification, "id" | "title" | "read">;
  onChanged: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || disabled}
        aria-label={notification.read ? `Delete notification: ${notification.title}` : undefined}
        onClick={async () => {
          if (
            notification.read &&
            !window.confirm(`Delete “${notification.title}”? This cannot be undone.`)
          )
            return;
          setBusy(true);
          setError("");
          try {
            if (notification.read) await deleteReadNotification(notification.id);
            else await markAsRead(notification.id);
            onChanged();
          } catch (cause) {
            setError(
              authErrorMessage(
                cause,
                notification.read
                  ? "Unable to delete this notification. Please retry."
                  : "Unable to mark this notification read.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {notification.read && <Trash2 size={14} aria-hidden="true" />}
        {busy ? "Please wait…" : notification.read ? "Delete" : "Mark read"}
      </Button>
      {error && (
        <p role="alert" className="max-w-xs text-xs text-[#a13939]">
          {error}
        </p>
      )}
    </div>
  );
}
