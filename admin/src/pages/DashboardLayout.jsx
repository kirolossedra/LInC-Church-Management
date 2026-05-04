import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "📊 Overview" },
  { to: "/dashboard/submissions", label: "📋 Submissions" },
  { to: "/dashboard/calendar", label: "📅 Calendar" },
  { to: "/dashboard/meetings", label: "🎥 Meetings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg viewBox="0 0 64 64" width="36" height="36">
            <rect width="64" height="64" rx="10" fill="#8b1e1e" />
            <rect x="28" y="10" width="8" height="44" fill="white" />
            <rect x="18" y="26" width="28" height="8" fill="white" />
          </svg>
          <span>LINC Admin</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item--active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
