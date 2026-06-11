import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { HEADER_NAV } from "./navConfig";

export function HubLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="hub-shell">
      <header className="hub-header">
        <div className="hub-header__inner">
          <Link to="/" className="hub-brand" onClick={() => setMenuOpen(false)}>
            <span className="hub-brand__title">EOL Racing Data</span>
            <span className="hub-brand__sub">European Onewheel League</span>
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
            aria-label="EOL Racing Data"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hub-nav__link${isActive ? " hub-nav__link--active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <span className="hub-nav__label">Home</span>
            </NavLink>
            {HEADER_NAV.map(({ to, navLabel, navSublabel }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `hub-nav__link${isActive ? " hub-nav__link--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="hub-nav__label">{navLabel}</span>
                {navSublabel && (
                  <span className="hub-nav__sublabel">{navSublabel}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="hub-main">
        <Outlet />
      </main>
    </div>
  );
}
