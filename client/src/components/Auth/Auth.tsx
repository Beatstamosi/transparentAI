import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. Import navigate
import { supabase } from "../../lib/supabaseClient";
import styles from "./Auth.module.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // 2. Initialize navigate

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert("Success! Check your email for a confirmation link.");
    }
  };

  const handleLogin = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else if (data.user) {
      // 3. Redirect to the context manager on success
      navigate("/my-context");
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>transparentAI</h2>
        <p className={styles.subtitle}>Secure, Private Context Management</p>

        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className={styles.primaryBtn} onClick={handleLogin}>
          Sign In
        </button>
        <button className={styles.secondaryBtn} onClick={handleSignUp}>
          Create Account
        </button>
      </div>
    </div>
  );
}
