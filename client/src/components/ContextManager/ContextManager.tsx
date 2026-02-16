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
  content?: string;
}

interface WhisperOutput {
  text: string;
  chunks?: Array<{
    timestamp: [number, number | null];
    text: string;
  }>;
}

interface ExtendedWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface ProgressData {
  status: "initiate" | "progress" | "done" | "ready";
  name?: string;
  file?: string;
  progress?: number;
}

type TranscriberPipeline = (
  data: Float32Array,
  options?: { language?: string; task?: string },
) => Promise<WhisperOutput | string>;

export default function ContextManager() {
  const [activeTab, setActiveTab] = useState("audio");
  const [isUploading, setIsUploading] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
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
    const response = await fetch(`${import.meta.env.VITE_API_URL}/context`, {
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

  const filteredItems = contexts.filter((item) => {
    if (activeTab === "audio") return item.source_type === "audio";
    if (activeTab === "files") return item.source_type === "pdf";
    return false;
  });

  const transcribeLocally = async (blob: Blob): Promise<string> => {
    setTranscriptionStatus("Initializing AI...");
    setDownloadProgress(0);

    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.remoteHost = "https://huggingface.co";
    env.remotePathTemplate = "{model}/resolve/{revision}/";

    try {
      const transcriber = (await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny", // Multilingual version
        {
          progress_callback: (data: ProgressData) => {
            if (
              data.status === "progress" &&
              typeof data.progress === "number"
            ) {
              setDownloadProgress(Math.round(data.progress));
            }
            if (data.status === "ready") {
              setDownloadProgress(100);
              setTranscriptionStatus("Model Loaded. Processing audio...");
            }
          },
        },
      )) as unknown as TranscriberPipeline;

      const AudioContextClass =
        window.AudioContext || (window as ExtendedWindow).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      const audioContext = new AudioContextClass({ sampleRate: 16000 });

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      const output = await transcriber(audioData, {
        language: "german", // Forced German as requested
        task: "transcribe",
      });

      await audioContext.close();
      setDownloadProgress(0);
      setTranscriptionStatus("");

      return typeof output === "string" ? output : output.text;
    } catch (err) {
      console.error("Transcription error:", err);
      setDownloadProgress(0);
      setTranscriptionStatus("Error in transcription.");
      throw err;
    }
  };

  const uploadAudio = async (blob: Blob, fileName: string) => {
    setIsUploading(true);
    try {
      const transcription = await transcribeLocally(blob);
      const formData = new FormData();
      formData.append("file", blob, `${fileName}.webm`);
      formData.append("transcription", transcription);
      formData.append("fileName", fileName);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/context/audio-hybrid`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );

      if (response.ok) {
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/context/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        },
      );
      if (response.ok) fetchContexts();
    } catch (error) {
      alert(`Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this item?")) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/context/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      },
    );
    if (response.ok) setContexts((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL context? This cannot be undone.")) return;
    setIsUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/context/all`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );
      if (response.ok) setContexts([]);
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
            {isRecording ? "Stop" : "Record"}
          </button>

          <button
            className={styles.btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <span>📁</span> {isUploading ? "Uploading..." : "PDF"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: "none" }}
          />
          <button
            className={styles.btnDanger}
            onClick={handleDeleteAll}
            disabled={isUploading}
          >
            Wipe All
          </button>
        </div>
      </div>

      {(transcriptionStatus || downloadProgress > 0) && (
        <div className={styles.statusContainer}>
          <div className={styles.statusMessage}>
            {transcriptionStatus}{" "}
            {downloadProgress > 0 && downloadProgress < 100
              ? `${downloadProgress}%`
              : ""}
          </div>
          {downloadProgress > 0 && (
            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.managerCard}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "audio" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("audio")}
          >
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
            <p className={styles.emptyLabel}>No {activeTab} found.</p>
          )}
        </div>
      </div>

      {showAudioModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Save Recording</h3>
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
