import { Link, useLocation } from "react-router-dom";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const location = useLocation();

  // Helper to check if a link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        transparentAI
      </Link>

      <div className={styles.links}>
        <Link
          to="/my-context"
          className={`${styles.navLink} ${isActive("/my-context") ? styles.active : ""}`}
        >
          My Context
        </Link>

        <Link
          to="/my-agent"
          className={`${styles.navLink} ${isActive("/my-agent") ? styles.active : ""}`}
        >
          My Agent
        </Link>

        <button
          className={styles.logoutBtn}
          onClick={() => console.log("Logout clicked")}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
