import supabase from "../middleware/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse-new";

const uploadPDF = async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing token" });

    // 1. Create the scoped client
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const file = req.file;
    const userId = req.user.id;
    const fileName = `${userId}/${Date.now()}_${file.originalname}`;

    // 2. USE THE USERCLIENT (Crucial Change!)
    const { data: storageData, error: storageError } = await userClient.storage
      .from("context-files")
      .upload(fileName, file.buffer, {
        contentType: "application/pdf",
        upsert: true, // Highly recommended to avoid 409 errors
      });

    if (storageError) throw storageError;

    // 3. Extract text
    const pdfData = await pdfParse(file.buffer);

    // 4. Get Public URL (Either client works for this, but stay consistent)
    const {
      data: { publicUrl },
    } = userClient.storage.from("context-files").getPublicUrl(fileName);

    // 5. Save to Database using the user-scoped client
    const { error: dbError } = await userClient.from("user_contexts").insert([
      {
        user_id: userId,
        content: pdfData.text,
        source_type: "pdf",
        file_name: file.originalname,
        storage_path: fileName,
        public_url: publicUrl,
      },
    ]);

    if (dbError) throw dbError;

    res.json({ message: "PDF processed and stored", publicUrl });
  } catch (err: any) {
    console.error("DETAILED ERROR:", err);
    res.status(500).json({ error: err.message || "PDF upload failed" });
  }
};

const uploadAudio = async (req: any, res: any) => {
  try {
    const file = req.file;
    const { transcription, fileName: originalName } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    if (!file) return res.status(400).json({ error: "No audio file provided" });

    // 1. Create the scoped User Client
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const userId = req.user.id;
    const storagePath = `${userId}/${Date.now()}_recording.webm`;

    // 2. Upload Audio using userClient
    const { error: storageError } = await userClient.storage
      .from("context-files")
      .upload(storagePath, file.buffer, {
        contentType: "audio/webm",
        upsert: true,
      });

    if (storageError) throw storageError;

    // 3. Get the Public URL
    const {
      data: { publicUrl },
    } = userClient.storage.from("context-files").getPublicUrl(storagePath);

    // 4. Save metadata and transcription to Database
    const { error: dbError } = await userClient.from("user_contexts").insert([
      {
        user_id: userId,
        content: transcription,
        source_type: "audio",
        file_name: originalName,
        storage_path: storagePath,
        public_url: publicUrl,
      },
    ]);

    if (dbError) throw dbError;

    res.json({ message: "Audio and transcription stored", publicUrl });
  } catch (err: any) {
    console.error("AUDIO UPLOAD ERROR:", err);
    res
      .status(500)
      .json({ error: err.message || "Audio hybrid upload failed" });
  }
};

const getContext = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "No token provided" });

    // Create a temporary client using the user's token
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data, error } = await userClient // Use userClient, not the global supabase
      .from("user_contexts")
      .select("id, file_name, source_type, created_at, public_url")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Could not fetch context" });
  }
};

const deleteContext = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Missing token" });

    // 1. Create the scoped User Client
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    // 2. Fetch the record using userClient to ensure ownership
    const { data: record, error: fetchError } = await userClient
      .from("user_contexts")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !record) {
      return res
        .status(404)
        .json({ error: "Context not found or unauthorized" });
    }

    // 3. Delete physical file using userClient (Needs RLS DELETE policy on Storage!)
    if (record.storage_path) {
      const { error: storageError } = await userClient.storage
        .from("context-files")
        .remove([record.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // We throw here because we don't want a "ghost" file in storage
        // with no database record pointing to it.
        throw new Error("Could not delete physical file");
      }
    }

    // 4. Delete database record
    const { error: dbError } = await userClient
      .from("user_contexts")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    res.json({ message: "Context and file deleted successfully" });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to delete context" });
  }
};

const deleteAllContext = async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.user.id;

    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    // 1. Create the scoped User Client
    const userClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // 2. Get all file paths for this user before deleting records
    const { data: records, error: fetchError } = await userClient
      .from("user_contexts")
      .select("storage_path");

    if (fetchError) throw fetchError;

    // 3. Batch delete from Storage if there are files
    if (records && records.length > 0) {
      const pathsToDelete = records
        .map((r) => r.storage_path)
        .filter((p) => p !== null);

      if (pathsToDelete.length > 0) {
        const { error: storageError } = await userClient.storage
          .from("context-files")
          .remove(pathsToDelete);

        if (storageError)
          console.error("Batch storage delete warning:", storageError);
      }
    }

    // 4. Delete all DB records for this user
    // RLS will naturally restrict this to the user's own rows,
    // but we add .eq('user_id', userId) as a secondary safety measure.
    const { error: dbError } = await userClient
      .from("user_contexts")
      .delete()
      .eq("user_id", userId);

    if (dbError) throw dbError;

    res.json({ message: "Successfully wiped all user context." });
  } catch (err: any) {
    console.error("Delete All Error:", err);
    res.status(500).json({ error: "Failed to clear knowledge base." });
  }
};

export { uploadPDF, getContext, uploadAudio, deleteContext, deleteAllContext };
