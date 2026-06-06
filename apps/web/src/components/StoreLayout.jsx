import { Outlet } from "react-router-dom";
import AppShell from "./layout/AppShell";

export default function StoreLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}