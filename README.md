# Campus SOS — Real-Time Campus Alert System

**Stack:** React, Hono (Cloudflare Workers), Prisma, PostgreSQL (Neon), Leaflet, SSE  
**Live:** https://e2b21f1b.campus-sos-frontend.pages.dev/

## What it does
Multi-role (student/guard/driver/faculty) alerts + live location streaming (SSE) with role-based dashboards.

## Why it’s interesting
- Real-time updates < 1s using **Server-Sent Events** on Cloudflare Workers
- JWT auth, Prisma schema for roles/alerts/locations
- Leaflet map overlays for campus zones

## Screenshots
_(add 2–3 PNGs or a short GIF)_

## Quickstart
```bash
git clone https://github.com/Anshpujara5/campus-sos
cd campus-sos
cp .env.example .env # fill values
npm ci
npm run dev
