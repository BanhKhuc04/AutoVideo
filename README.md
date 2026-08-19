# YouTube Clip Studio Pro 🎬✨

A professional, hybrid full-stack application that transforms any YouTube video into high-quality clips with multiple clip management, timeline markers, in-browser previewing, and direct exports to **Google Drive** or **ZIP archive**.

---

## 🌟 Key Features

### 1. ⚡ Hybrid Video Processing Engine
- **Option A: Download Original Quality**:
  - High-speed downloading via `yt-dlp` and frame-accurate cutting with `FFmpeg`.
  - **Anti-403 & Cookie Integration**: Configurable `BROWSER=chrome` (or `firefox`, `edge`, `brave`, `opera`) to automatically extract browser session cookies.
  - **Smart URL Normalization**: Automatically strips unwanted parameters (`&t=`, `&start=`, `&ab_channel=`, `&si=`).
  - Supports standard videos, YouTube Shorts, and multiple resolutions.
- **Option B: Browser Tab Recording (100% Reliable Fallback)**:
  - Built-in screen & tab audio recording using `navigator.mediaDevices.getDisplayMedia` + `MediaRecorder`.
  - Captures video directly from the browser tab from start timestamp to end timestamp with auto-stop.
  - Generates webm/mp4 blobs locally and packages them into ZIP or uploads directly to Google Drive!
  - **Auto-Fallback Suggestion**: If YouTube blocks downloads (HTTP 403 / bot detection), the UI seamlessly suggests switching to Browser Recording Mode with 1 click.

---

### 2. 🎛️ Multiple Clip Manager
- Name your clips custom scenes: e.g. `study_scene`, `success_scene`, `intro_hook`.
- Set precise start and end timestamps (`HH:MM:SS`, `MM:SS`, or raw seconds).
- Live duration calculator badge for each clip.
- **Clip Reordering**: Move clips up (🔼) and down (🔽) with instant list reordering.
- Color-coded marker indicators synced with the video timeline.

---

### 3. ⏱️ Video Player & Interactive Timeline
- Embedded YouTube player with real-time playhead tracking.
- Interactive timeline bar with multi-colored visual segment markers.
- Click to scrub time, with quick actions:
  - ⏱️ *"Set Start at Playhead"*
  - ⏱️ *"Set End at Playhead"*
  - ➕ *"+ Add Marker at Playhead"*

---

### 4. ☁️ Hierarchical Google Drive Integration
- Connect securely with Google Drive OAuth 2.0.
- Destination folder picker with "+ Create New Folder" support.
- "Remember selected folder" preference (saved locally).
- **Hierarchical Video Project Structure**:
  ```text
  Google Drive: Destination Folder
     └── [Video_Title]/
            ├── 01_study_scene.mp4
            ├── 02_success_scene.mp4
            └── metadata.json (Timestamps, source URL, duration, date)
  ```
- Returns direct clickable **Google Drive File URL** (`webViewLink`) and **Folder URL**.

---

## 📁 Project Architecture

```text
youtube-video-cutter/
├── package.json               # Root orchestrator scripts
├── README.md
├── server/                    # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/            # Environment & BROWSER cookies config
│   │   ├── controllers/
│   │   │   ├── videoController.ts # processVideo, processBrowserClips, streamClip, getVideoInfo
│   │   │   └── driveController.ts # Google Drive OAuth, folders, hierarchical uploads
│   │   ├── routes/
│   │   │   └── videoRoutes.ts # Express routes (with multer for browser clips)
│   │   ├── services/
│   │   │   ├── driveService.ts    # Google Drive API v3 (connect, upload, list, create)
│   │   │   ├── youtubeDownloader.ts # yt-dlp binary manager, URL normalizer, cookies retry
│   │   │   ├── videoCutter.ts       # FFmpeg high-speed clip extraction
│   │   │   ├── zipCreator.ts        # archiver ZIP packager
│   │   │   └── storage/             # LocalStorage & GoogleDriveStorage services
│   │   └── utils/             # timeConverter (clip naming & sanitize), cleanup, logger
│   ├── bin/                   # Auto-managed yt-dlp binary
│   ├── temp/                  # Temp workspace
│   ├── output/                # Stored ZIP archives & cut clips
│   ├── .env.example
│   └── .env
└── client/                    # React 19 + TypeScript + Vite + Bootstrap 5 Frontend
    ├── src/
    │   ├── components/
    │   │   ├── BrowserTabRecorder.tsx # In-browser tab & audio recorder
    │   │   ├── VideoPlayerPreview.tsx # YouTube player & timeline with markers
    │   │   ├── ClipPreviewPlayer.tsx  # In-browser HTML5 player for cut clips
    │   │   ├── GoogleDriveDestination.tsx # Drive connector & folder tree preview
    │   │   ├── SegmentList.tsx & SegmentItem.tsx # Clip manager with reordering & naming
    │   │   ├── Header.tsx             # Studio branding & Google Drive status pill
    │   │   └── DownloadResult.tsx     # Preview & export hub
    │   ├── services/          # api.ts (REST client & multipart uploads)
    │   ├── utils/             # timeValidator.ts
    │   ├── types/             # TypeScript types
    │   └── App.tsx
```

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

```bash
# Install root, server, and client dependencies
npm run install:all
```

---

### Step 2: Configure Environment Variables

Edit `server/.env`:
```env
PORT=5000
NODE_ENV=development

# Configure browser cookies to prevent 403 Forbidden errors (options: chrome, firefox, edge, brave, opera)
BROWSER=chrome

# Optional Google Drive OAuth 2.0 (configured in Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/drive/callback
```

---

### Step 3: Run Development Servers

#### Terminal 1: Backend Server
```bash
cd server
npm run dev
```
> Running on `http://localhost:5000`.

#### Terminal 2: Frontend Client
```bash
cd client
npm run dev
```
> Running on `http://localhost:3000`.

---

### Step 4: Using YouTube Clip Studio

1. Open `http://localhost:3000` in your browser.
2. Paste any YouTube URL (standard URL, Short, or URL with query parameters).
3. The video preview and interactive timeline load automatically.
4. Add & name your clips in the **Multiple Clip Manager** (e.g. `study_scene`, `success_scene`), adjust timestamps, or use 🔼 / 🔽 to reorder.
5. Select your processing method:
   - **Option A**: *Download Original Quality* (yt-dlp + FFmpeg).
   - **Option B**: *Browser Tab Recording* (Record tab video & audio directly).
6. Once processed:
   - **Preview Clips**: Watch each cut clip right in the browser.
   - **Download ZIP**: Download `result.zip` with all named clips.
   - **Upload to Google Drive**: Automatically create `[Video_Title]/` folder with all named `.mp4` clips and `metadata.json`!
