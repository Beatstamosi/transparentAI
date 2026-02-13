import { useState } from "react";
import styles from "./ContextManager.module.css";

export default function ContextManager() {
  const [activeTab, setActiveTab] = useState("audio");

  // Mock data for UI representation
  const mockAudio = [
    {
      id: 1,
      name: "Meeting_Notes_Feb13.wav",
      size: "2.4 MB",
      date: "Feb 13, 2026",
    },
  ];
  const mockFiles = [
    {
      id: 1,
      name: "Project_Alpha_Specs.pdf",
      size: "1.1 MB",
      date: "Feb 12, 2026",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1>Context Manager</h1>
        <div className={styles.actionGroup}>
          <button className={styles.btnPrimary}>
            <span>🎤</span> Record Audio
          </button>
          <button className={styles.btnPrimary}>
            <span>📁</span> Upload PDF
          </button>
          <button className={styles.btnDanger}>Delete All Context</button>
        </div>
      </div>

      <div className={styles.managerCard}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "audio" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            Audio Recordings
          </button>
          <button
            className={`${styles.tab} ${activeTab === "files" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("files")}
          >
            PDF Documents
          </button>
        </div>

        <div className={styles.itemList}>
          {(activeTab === "audio" ? mockAudio : mockFiles).map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <h4>{item.name}</h4>
                <span>
                  {item.date} • {item.size}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.iconBtn}
                  title={activeTab === "audio" ? "Listen" : "View"}
                >
                  {activeTab === "audio" ? "▶️" : "👁️"}
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {(activeTab === "audio" ? mockAudio : mockFiles).length === 0 && (
            <p
              style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}
            >
              No {activeTab} added yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
