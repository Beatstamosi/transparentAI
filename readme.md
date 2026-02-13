# Support-Bot: RAG & Streaming Prototype

A small technical prototype demonstrating how to implement an AI solution with access to custom documentation (RAG) and live streaming (SSE) in TypeScript.

## Features

- **Context-Awareness:** Uses a local knowledge set to answer specific support questions.
- **Real-time Streaming:** Implementation of Server-Sent Events (SSE) for immediate UI feedback.
- **Modern Stack:** React (Frontend) and Node.js Express (Backend) built entirely in TypeScript.

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express, Groq SDK
- **AI Model:** Llama-3.1-8b-instant (via Groq)

## Installation & Setup

1. Clone the repository.
2. Run `npm install` in both client and server folders.
3. Create a `.env` file in the server folder with `GROQ_API_KEY=your_key`.
4. Run `npm run dev` in the server.
5. Run `npm run dev` in the client.
