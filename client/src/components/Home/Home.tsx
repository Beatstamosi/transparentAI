import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.logo}>transparentAI</div>
        <nav>
          <button
            className={styles.tryButton}
            style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem" }}
          >
            Try out
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1>
          Your Data. Your Rules.{" "}
          <span className={styles.highlight}>Transparent Intelligence.</span>
        </h1>
        <p className={styles.description}>
          We are redefining AI privacy. Your personal context is built by you,
          stays with you, and is never "fed" back into global AI models.
          Experience a smarter world without sacrificing your digital
          sovereignty.
        </p>
        <button className={styles.tryButton}>Get Started for Free</button>
      </section>

      {/* Process/Info Section */}
      <section className={styles.processGrid}>
        <div className={styles.card}>
          <h3>Multi-Source Context</h3>
          <p>
            Easily build your knowledge base by recording voice notes or
            uploading PDFs. Our system transforms them into usable intelligence
            instantly.
          </p>
        </div>

        <div className={styles.card}>
          <h3>Hybrid Hosting</h3>
          <p>
            Choose your comfort level. Save your encrypted data in our secure
            cloud or host it entirely in your own datacenter.
          </p>
        </div>

        <div className={styles.card}>
          <h3>Strict Permissions</h3>
          <p>
            Your personal AI agent only accesses the information you explicitly
            authorize. You have the master switch at all times.
          </p>
        </div>

        <div className={styles.card}>
          <h3>Zero-Data Leakage</h3>
          <p>
            We use state-of-the-art inference that ensures your private files
            are never used to train future public AI models.
          </p>
        </div>
      </section>
    </div>
  );
}
