# Epoxy Floor Estimator

A cloud-synced dashboard for estimating epoxy floor coating projects. Each user gets their own secure account with data stored in Supabase.

## Setup Guide (15 minutes)

### Step 1 — Supabase Database Setup

1. Go to your Supabase Dashboard (supabase.com/dashboard)
2. Open your project, then SQL Editor → New Query
3. Paste the contents of `supabase-setup.sql` and click Run
4. Go to Authentication → Providers and make sure Email is enabled
5. For testing: go to Authentication → Settings and disable "Confirm email"

### Step 2 — Configure Your Credentials

1. In Supabase: Settings → API — copy the Project URL and anon/public key
2. The anon key starts with `eyJ` — it is a long JWT string
3. Edit the `.env` file in this project folder with your values

### Step 3 — Run Locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173 with a login screen.

### Step 4 — Deploy

```bash
npm run build
```

Upload the `dist/` folder to any host (Netlify, Vercel, your own server).
Set the two environment variables on your hosting platform.

## Adding Contractors

Share your URL. They click Sign up, enter their email and a password, and
they are in. Each contractor gets completely isolated data enforced by
Row Level Security at the database level.

## Project Structure

```
epoxy-app/
├── .env                    # Your Supabase credentials (never commit)
├── .env.example            # Template for .env
├── supabase-setup.sql      # Run once in Supabase SQL Editor
├── src/
│   ├── App.jsx             # Main application
│   ├── Auth.jsx            # Login / Signup / Password reset
│   ├── supabaseClient.js   # Supabase connection
│   └── main.jsx            # React entry point
├── package.json
├── vite.config.js
└── index.html
```
