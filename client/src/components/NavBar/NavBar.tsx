import { Link, useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { supabase } from "../../lib/supabaseClient"; // Import your client
import styles from "./NavBar.module.css";

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      navigate("/");
    }
  };

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

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
