# ResQNet × AFTERMATH (Disaster Intelligence & Rescue Platform)

> **ResQNet is the Communication Layer. AFTERMATH is the Intelligence & Action Layer.**  
> *"From SOS to Situational Awareness. From Satellite Evidence to Disaster Intelligence. From Intelligence to Actionable Rescue."*

---

## 🏗️ Architecture Overview

1. **Victim Mobile App (`/apps/mobile`)**
   - React Native + Expo (Offline SOS Queue, Auto-Sync, GPS Capture).
2. **Tactical Command Center Dashboard (`/apps/dashboard`)**
   - Vite + React + Leaflet + Esri World Imagery (Zero Watermarks).
   - **AFTERMATH AI Engine**:
     - **Copernicus & Esri Satellite Observation** (Pre vs Post Disaster Change Detection).
     - **Dual Disaster Triggers**:
       - *Trigger 1*: Ground SOS Density Surge (auto-detects $\ge 3$ reports in 2.5km and triggers analysis).
       - *Trigger 2*: Official Early-Warning Feeds (Live USGS Earthquakes & NASA EONET feeds).
     - **Evidence Fusion**: Correlates ground SOS reports with satellite flood inundation & structural damage polygons.
     - **Dynamic Road Network**: Click-to-block segments with instant graph rerouting.
     - **Automated Mission Planner**: Generates explainable Rescue Priority Scores ($RPS$) and 1-Click human dispatch authorization.
3. **Local Self-Contained Database**
   - Powered by Supabase PostgreSQL (zero external dependencies).

---

## 🚀 Quick Start (1-Click Run)

### 1. Start the Command Dashboard
```bash
npm run dev
```
Open [http://localhost:5173/aftermath](http://localhost:5173/aftermath) in your browser.

### 2. Start the Mobile Victim App
```bash
npm run mobile
```
Press `a` for Android Emulator or scan the QR code with Expo Go.

### 3. Optional: Process Local SOS Reports
```bash
npm run process:local
```

---

## 🏆 Hackathon Winning Demo Script (3-Minute Walkthrough)

1. **Open Dashboard at `/aftermath`**:
   - Point out the headline: **AFTERMATH AI Orchestration & Rescue Command**.
2. **Demonstrate Satellite Intelligence (Module H)**:
   - Drag the **Copernicus Satellite Swipe Slider** back and forth.
   - Show how the pre-monsoon normal river contrasts with the Sentinel-detected flood overflow (+14.8 km² inundation).
3. **Show Evidence Fusion on Map**:
   - Point out the **translucent cyan Satellite Flood Inundation Polygon**.
   - Show how the SOS cluster at *Majnu Ka Tilla* is automatically tagged:  
     `🛰️ Verified Inside Satellite Flood Zone • Est Depth: 2.1m`.
   - Explain the **Rescue Priority Score (RPS = 95/100)**: Transparent reasoning with vulnerable populations (elderly/children).
4. **Trigger Dynamic Road Block & Rerouting (Module D & E)**:
   - On the right panel under **Dynamic Road Accessibility**, click on:  
     `Ring Road (ISBT Kashmiri Gate to Majnu Ka Tilla)`.
   - Toggle it to **BLOCKED**.
   - **Watch the magic happen:** The route immediately reroutes away from the flooded highway via elevated Mall Road & Civil Lines corridor!
5. **Demonstrate Multi-Modal Boat Deployment (Module G)**:
   - For the submerged cluster where roads are cut off, AFTERMATH recommends:  
     `🌊 Waterway Approach: NDRF Motorized Zodiac Boat Alpha`.
6. **Authorize Rescue Mission (Human-in-the-Loop AM-56)**:
   - Click **"AUTHORIZE & DISPATCH TEAM"** on `MIS-001`.
   - The mission locks in with live dispatch confirmation:  
     `✅ DISPATCH AUTHORIZED • UNIT EN ROUTE`.
