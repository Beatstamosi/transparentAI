import { useState, useRef, useEffect } from "react";
import styles from "./ContextManager.module.css";
import { supabase } from "../../lib/supabaseClient";
import { pipeline, env } from "@xenova/transformers";

interface ContextItem {
  id: string;
  file_name: string;
  source_type: "audio" | "pdf";
  public_url: string;
  created_at: string;
  content?: string; // Optional since we don't always fetch it
}

interface WhisperOutput {
  text: string;
  chunks?: Array<{
    timestamp: [number, number | null];
    text: string;
  }>;
}

// If you need to type the transcriber function itself
type TranscriberPipeline = (
  data: Float32Array,
) => Promise<WhisperOutput | string>;

export default function ContextManager() {
  const [activeTab, setActiveTab] = useState("audio");
  const [isUploading, setIsUploading] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [contexts, setContexts] = useState<ContextItem[]>([]);

  const fetchContexts = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch("http://localhost:3000/context", {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (response.ok) {
      const data = await response.json();
      setContexts(data);
    }
  };

  useEffect(() => {
    fetchContexts();
  }, []);

  // Filter context based on the active tab
  const filteredItems = contexts.filter((item) => {
    if (activeTab === "audio") return item.source_type === "audio";
    if (activeTab === "files") return item.source_type === "pdf";
    return false;
  });

  // --- LOCAL TRANSCRIPTION LOGIC ---
  const transcribeLocally = async (blob: Blob): Promise<string> => {
    setTranscriptionStatus("Initializing AI...");

    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.remoteHost = "https://huggingface.co";
    env.remotePathTemplate = "{model}/resolve/{revision}/";

    try {
      // Cast the pipeline to our specific type
      const transcriber = (await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
      )) as unknown as TranscriberPipeline;

      setTranscriptionStatus("Processing audio...");

      // Use standard AudioContext with options
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      const output = await transcriber(audioData);

      setTranscriptionStatus("");

      // Use type-safe check instead of any
      if (typeof output === "string") {
        return output;
      } else {
        return output.text;
      }
    } catch (err) {
      console.error("Transcription detailed error:", err);
      setTranscriptionStatus("Error in transcription.");
      throw err;
    }
  };

  const uploadAudio = async (blob: Blob, fileName: string) => {
    setIsUploading(true);
    try {
      // 1. Transcribe locally first
      const transcription = await transcribeLocally(blob);

      // 2. Prepare FormData with BOTH the file and the text
      const formData = new FormData();
      formData.append("file", blob, `${fileName}.webm`);
      formData.append("transcription", transcription);
      formData.append("fileName", fileName);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 3. Send to a new hybrid endpoint
      const response = await fetch(
        "http://localhost:3000/context/audio-hybrid",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );

      if (response.ok) {
        alert("Success!");
        fetchContexts();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioName(`Meeting ${new Date().toLocaleDateString()}`);
        setShowAudioModal(true);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert(`Please allow microphone access: ${err}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("http://localhost:3000/context/pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      if (response.ok) {
        alert("Success!");
        fetchContexts();
      }
    } catch (error) {
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this context?"))
      return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`http://localhost:3000/context/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.ok) {
        // Remove the item from the local state list
        setContexts((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Failed to delete context.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      "ARE YOU SURE? This will permanently delete ALL your uploaded PDFs and audio recordings. This cannot be undone.",
    );

    if (!confirmed) return;

    setIsUploading(true); // Re-use loading state to disable buttons
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("http://localhost:3000/context/all", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.ok) {
        setContexts([]); // Clear local state immediately
        alert("All context has been cleared.");
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Delete all error:", err);
      alert("Failed to wipe context.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1>Context Manager</h1>
        <div className={styles.actionGroup}>
          <button
            className={`${styles.btnPrimary} ${isRecording ? styles.recordingActive : ""}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
          >
            <span>{isRecording ? "⏹️" : "🎤"}</span>
            {isRecording ? "Stop Recording" : "Record Audio"}
          </button>

          <button
            className={styles.btnPrimary}
            onClick={triggerFileSelect}
            disabled={isUploading}
          >
            <span>📁</span> {isUploading ? "Processing..." : "Upload PDF"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: "none" }}
          />
          <button className={styles.btnDanger} onClick={handleDeleteAll}>
            Delete All Context
          </button>
        </div>
      </div>

      {/* Loading Status Indicator */}
      {transcriptionStatus && (
        <div className={styles.statusMessage}>{transcriptionStatus}</div>
      )}

      <div className={styles.managerCard}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "audio" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            {/* Shorten text for small screens */}
            <span className={styles.desktopOnly}>Audio Recordings</span>
            <span className={styles.mobileOnly}>Audio</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "files" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("files")}
          >
            <span className={styles.desktopOnly}>PDF Documents</span>
            <span className={styles.mobileOnly}>PDFs</span>
          </button>
        </div>
        <div className={styles.itemList}>
          {filteredItems.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <h4>{item.file_name}</h4>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className={styles.itemActions}>
                {/* Open PDF or Play Audio in new tab */}
                <a
                  href={item.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.iconBtn}
                >
                  {item.source_type === "audio" ? "▶️" : "👁️"}
                </a>
                <button
                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <p
              style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}
            >
              No {activeTab} found.
            </p>
          )}
        </div>
      </div>

      {showAudioModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Save Recording</h3>
            <p>Your audio will be transcribed 100% locally on your device.</p>
            <input
              type="text"
              className={styles.modalInput}
              value={audioName}
              onChange={(e) => setAudioName(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowAudioModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  if (audioBlob) uploadAudio(audioBlob, audioName);
                  setShowAudioModal(false);
                }}
              >
                Transcribe & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
