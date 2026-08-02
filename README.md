# VOW (Virtual Organized World) - Backend Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/express-%5E5.1.0-lightgrey.svg)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/socket.io-%5E4.8.1-black.svg)](https://socket.io/)
[![Cloudinary](https://img.shields.io/badge/cloudinary-v2.0-blue.svg)](https://cloudinary.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose%20v8-green.svg)](https://mongoosejs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

**VOW (Virtual Organized World)** is a real-time spatial backend platform engineered to power interactive 2D virtual office environments for distributed remote teams. Built on Express, TypeScript, Socket.io, and MongoDB, VOW bridges the gap between remote isolation and office presence by providing real-time spatial avatar tracking, automatic DM opening on avatar collision, persistent text/voice channels, direct messaging with media sharing, WebRTC video/audio meetings, role-based workspace governance, and an integrated Google Gemini AI copilot.

---

## 🌟 What Makes VOW Special?

Remote teams often suffer from disjointed tools—slack for chat, zoom for calls, and zero sense of physical co-presence. **VOW combines spatial awareness with real-time collaboration:**

- 🎮 **2D Spatial Co-Presence**: Walk around an interactive 2D office floor plan with real-time ~16Hz avatar movement. See who is online, who is in a meeting room, or who is working at their desk.
- 🤝 **Proximity Avatar Collisions**: Walking up to and colliding with a teammate's avatar on the 2D map automatically opens a Direct Message (DM) chat window for instant spontaneous communication.
- 💬 **Unified Messaging Engine**: Seamless team channels and one-on-one Direct Messages (DMs) with real-time unread message counters, typing indicators, and media sharing.
- 🖼️ **Cloudinary Media Storage**: High-speed avatar and file attachment uploads powered by Cloudinary with fail-safe inline Data URI fallbacks for uninterrupted file sharing.
- 🎥 **WebRTC SFU Video & Audio Conferencing**: Multi-party video/audio meeting rooms with real-time signaling for team huddles, supervisory reviews, and company-wide presentations.
- 🔐 **Granular Role Governance**: Multi-tenant workspace partitioning with Manager, Supervisor, and Team Member roles, protected by JWT authentication and invite links.
- 🤖 **Gemini AI Workspace Copilot**: Embedded AI assistant capable of answering workspace queries, summarizing discussions, and offering contextual guidance.

---

## 🚀 Core Platform Capabilities & Modules

### 1. 🎮 Spatial Presence & 2D Map Engine
- **Zero-Database Spatial Broadcasting**: Ultra-fast (~16Hz) Socket.io position relaying across normalized workspace rooms (`workspace:${workspaceId}`) for lag-free 2D avatar navigation.
- **Proximity Collision Detection**: Server & client event coordination triggering DM chat initiation when two member avatars collide on the canvas.
- **Staggered Multi-User Spawning**: Automatic offset coordinate generation so connecting team members never spawn on top of each other.

### 2. 💬 Communication Subsystems
- **Persistent Text Channels**: Workspace-scoped public and private channels with persistent MongoDB message history.
- **Direct Messaging (DMs)**: Private 1-on-1 conversations supporting textless file attachments and high-resolution media previews.
- **Real-Time Unread Counters**: Socket-driven unread message tracking keeping team members informed of unread DMs across workspaces.

### 3. 🖼️ Cloud Media & Storage Pipeline
- **Cloudinary Integration**: Direct-to-cloud media upload pipeline with automatic asset optimization.
- **Fail-Safe Data URI Fallback**: Automatic inline Data URI encoding fallback ensuring file uploads succeed even under cloud key misconfigurations.
- **Attachment Support**: Native handling for images, documents, audio clips, and code snippets.

### 4. 🎥 WebRTC SFU Meeting Signaling
- **Multi-Party Audio/Video Signaling**: Low-latency mesh/SFU signaling for video conferences and audio huddles.
- **Screen Sharing & Controls**: Real-time room join/leave broadcasts and media stream management.

### 5. 🔐 Governance & Security Architecture
- **JWT & Workspace Tokens**: Dual-layer authentication requiring master user access tokens and workspace-scoped authorization tokens.
- **Role Hierarchy**:
  - 👑 **Manager**: Full workspace administration, channel management, invite code generation, and team partitioning.
  - 🛡️ **Supervisor**: Operational coordination, channel oversight, and team analytics.
  - 👤 **Team Member**: Spatial navigation, channel participation, DM communication, and meeting attendance.

---

## 🏗️ High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOW Real-Time Platform                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ Express 5 & TypeScript Engine │
                 └───────────────┬───────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Socket.IO   │         │ MongoDB Atlas│         │Cloudinary CDN│
│ Spatial/Chat │         │ Data Storage │         │ Media Files  │
└──────────────┘         └──────────────┘         └──────────────┘
```

---

## 🚀 Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v18.x or higher (v20.x recommended)
- **MongoDB**: Local instance running on `27017` or MongoDB Atlas URI
- **Cloudinary Account**: Cloud name, API key, and API secret

### 2. Environment Configuration
Create a `.env` file in the root of `VOW_backend`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/vow_db
JWT_SECRET=your_jwt_secret_key_here
WORKSPACE_JWT_SECRET=your_workspace_jwt_secret_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Installation & Local Execution
```bash
# Clone the repository
git clone https://github.com/raj-krr/VOW_backend.git
cd VOW_backend

# Install dependencies
npm install

# Start development server with Nodemon & ts-node
npm run dev
```

The backend server will run at `http://localhost:5000`.

---

## 🐳 Docker Container Deployment

Run the complete backend container with Docker Compose:
```bash
docker-compose up -d --build
```

---

## 📄 License
This project is licensed under the ISC License.
