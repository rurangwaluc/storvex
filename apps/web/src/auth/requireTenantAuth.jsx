// import { Navigate, Outlet } from "react-router-dom";

// export default function RequireTenantAuth() {
//   const token = localStorage.getItem("tenantToken");

//   // console.log("RequireTenantAuth token:", token);

//   if (!token) {
//     // console.log("❌ No token → redirect login");
//     return <Navigate to="/login" replace />;
//   }

//   // console.log("✅ Token OK");
//   return <Outlet />;
// }

import { Navigate, Outlet, useLocation } from "react-router-dom";

import {jwtDecode} from "jwt-decode";

export default function RequireTenantAuth() {
  const token = localStorage.getItem("tenantToken");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  const role = decoded.role;

  // Redirect ONLY when landing on root "/"
  if (location.pathname === "/") {
    if (role === "CASHIER") return <Navigate to="/pos" replace />;
    if (role === "TECHNICIAN") return <Navigate to="/repairs" replace />;
  }

  return <Outlet />;
}
