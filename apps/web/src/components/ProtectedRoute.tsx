// /home/jmechavez/Projects/vape-inventory/apps/web/src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
