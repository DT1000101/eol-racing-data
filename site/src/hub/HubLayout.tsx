import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/rankings", label: "Rankings" },
  { to: "/divisions", label: "Divisions" },
  { to: "/seeding", label: "Finals seeding" },
];

export function HubLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="hub-shell">
      <header className="hub-header">
        <div className="hub-header__inner">
          <Link to="/" className="hub-brand" onClick={() => setMenuOpen(false)}>
            <span className="hub-brand__title">EOL Hub</span>
            <span className="hub-brand__sub">European Onewheel League tools</span>
          </Link>

          <button
            type="button"
            className="hub-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="hub-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <span className="hub-menu-btn__bar" />
            <span className="hub-menu-btn__bar" />
            <span className="hub-menu-btn__bar" />
          </button>

          <nav
            id="hub-nav"
            className={`hub-nav${menuOpen ? " hub-nav--open" : ""}`}
            aria-label="EOL Hub"
          >
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `hub-nav__link${isActive ? " hub-nav__link--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="hub-main">
        <Outlet />
      </main>

      <footer className="hub-footer">
        <p>
          Community tools for EOL organisers and riders — not the official league
          website.
        </p>
      </footer>
    </div>
  );
}
