# AI Academic Copilot

A full-stack AI-powered academic assistant that helps students manage courses, tasks, study plans, and emotional well-being through a 3D AI companion.

Built with **React + Vite** (frontend) and **Node.js + Express + MongoDB** (backend), powered by **Mistral AI**.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Radix UI |
| Backend    | Node.js, Express                    |
| Database   | MongoDB (Mongoose)                  |
| AI         | Mistral AI (mistral-large-latest)   |
| Auth       | JWT (jsonwebtoken + bcryptjs)       |

---

## Prerequisites

1. [Node.js](https://nodejs.org/) v18 or higher
2. [MongoDB Community](https://www.mongodb.com/try/download/community) running locally on port `27017`
3. A [Mistral AI API key](https://console.mistral.ai/)

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd "Fest CODE"
npm install
```

### 2. Configure Environment

Create or update `.env.local` in the project root:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_academic_copilot
JWT_SECRET=your_secret_key_here
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-large-latest
```

> **Never commit** `.env.local` — it is already in `.gitignore`.

---

## Running the App

### Run both frontend and backend together

```bash
npm run dev:all
```

### Run only the backend

```bash
npm run server
```

### Run only the frontend (against the running backend)

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`  
The backend API runs at: `http://localhost:5000`

---

## Project Structure

```
├── src/                  # React frontend
│   ├── api/
│   │   └── apiClient.js  # REST API client (auth, entities, integrations)
│   ├── components/       # UI components
│   ├── pages/            # App pages
│   └── services/         # Business logic services
├── server/               # Express backend
│   ├── index.js          # Server entry point
│   ├── models/           # Mongoose MongoDB models
│   └── routes/           # API routes (auth, entities, ai)
├── public/               # Static assets
├── .env.local            # Local environment (not committed)
└── package.json
```

---

## API Health Check

Verify both the server and MongoDB are running:

```
GET http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "AI Academic Copilot Backend",
  "mongodb": "connected",
  "ai": "mistral"
}
```

---

## Building for Production

```bash
npm run build
```

Output is placed in the `dist/` folder. Serve with any static host or your own Express server.

---

## License

This project is privately owned. All rights reserved.
