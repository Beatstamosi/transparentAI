const { createClient } = require("@supabase/supabase-js");
import supabase from "./supabaseClient";

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  // Verify the JWT with Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Attach user info to the request for your LLM context logic
  req.user = user;
  next();
};

export default authenticate;
