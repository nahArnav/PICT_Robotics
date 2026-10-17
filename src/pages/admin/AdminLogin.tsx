import { Navigate } from "react-router";

// Preserve old bookmarks without maintaining a separate staff login interface.
export function AdminLogin() {
  return <Navigate to="/signin" replace />;
}
