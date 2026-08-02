# VOW (Virtual Organized World) - Backend Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.1.0-lightgrey.svg)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8.1-black.svg)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v8-green.svg)](https://mongoosejs.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-v2.0-blue.svg)](https://cloudinary.com/)
[![Swagger Docs](https://img.shields.io/badge/Swagger-OpenAPI%203.0-brightgreen.svg)](https://swagger.io/)
[![Frontend Repository](https://img.shields.io/badge/Frontend-VOW-blue.svg)](https://github.com/raj-krr/VOW)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

**VOW (Virtual Organized World) Backend** is a high-performance, real-time spatial platform engineered to power 2D virtual office environments for distributed remote teams. Built using Express 5, TypeScript 5.9, Socket.io 4.8, and MongoDB, VOW Backend handles spatial position relaying, proximity avatar collision events, real-time channels and 1-on-1 direct messaging, SFU WebRTC signaling, Cloudinary media processing, multi-tenant role-based workspace security, and automated background maintenance.

> 🔗 **Repositories Ecosystem**:
> - ⚙️ **Backend Repository (This Repo)**: [https://github.com/raj-krr/VOW_backend](https://github.com/raj-krr/VOW_backend)
> - 🎨 **Frontend Repository**: [https://github.com/raj-krr/VOW](https://github.com/raj-krr/VOW)

---

## 🎯 Full-Stack Context & Problem VOW Solves

Building a real-time spatial application introduces distinct technical challenges that standard CRUD backends cannot handle:

1. **High-Frequency Spatial Position Bottlenecks**: Relaying 2D avatar coordinates for dozens of users at ~16Hz will crash traditional database-backed APIs. VOW Backend solves this via a **Zero-DB Socket.io spatial broadcasting engine** over workspace-scoped rooms.
2. **Proximity-Based Event Coordination**: Detecting when two users' avatars touch on the frontend 2D map requires synchronized spatial event broadcasting (`avatar-collide`) to automatically open a direct 1-on-1 communication window on the React client.
3. **Multi-Tenant Data Isolation & Security**: Supporting separate workspace environments with granular role privileges (**Manager**, **Supervisor**, **Team Member**) while enforcing dual-token JWT access control (Master Auth Token + Workspace Session Token).
4. **Resilient Media & Storage Pipeline**: Preventing file upload failures due to external cloud key misconfigurations by serving inline Data-URI buffer fallbacks when Cloudinary keys are missing or invalid.

---

## 🚀 Key Backend Capabilities

### 1. 🎮 Spatial Relay & Proximity Collision Engine
- **Zero-DB Spatial Broadcasting**: Ultra-fast (~16Hz) Socket.io position relaying across normalized workspace rooms (`workspace:${workspaceId}`) without database write latency.
- **Avatar Collision Coordination**: Server-side collision event handling (`avatar-collide`) triggering automatic DM chat creation between colliding users.
- **Staggered Multi-User Spawning**: Smart coordinate calculation for new connections to prevent avatar stacking.

### 2. 💬 Real-Time Messaging & Presence Subsystem
- **Multi-Room Sockets**: Dedicated handlers for presence (`presenceSocket.ts`), text channels (`chatSocket.ts`), and 1-on-1 DMs (`dmSocket.ts`).
- **Real-Time Unread Counters**: Socket event emission (`unread_count_update`) keeping users updated on unread messages across channels and DMs.
- **Typing Indicators & Message History**: Persistent MongoDB channel message & DM storing with real-time socket broadcasting.

### 3. 🖼️ Cloud Media Upload Pipeline
- **Cloudinary Integration**: Direct-to-cloud asset storage with thumbnail generation and file metadata extraction.
- **Data-URI Fallback System**: Fail-safe buffer processing automatically converting files to inline Data-URIs if Cloudinary keys are invalid or unconfigured.

### 4. 🎥 WebRTC SFU Meeting Signaling
- **Multi-Party Audio/Video Signaling**: Low-latency mesh/SFU signaling for video conference rooms (`videochat/` subsystem).
- **Stream & Room Governance**: Active participant tracking, screen-sharing stream management, and join/leave events.

### 5. 🔐 Security, RBAC & Multi-Tenancy
- **Dual-Layer JWT Authorization**: Master User authentication tokens combined with workspace-scoped session tokens (`workspace.middleware.ts`).
- **Role-Based Access Control (RBAC)**:
  - 👑 **Manager**: Full workspace administration, team partitioning, supervisor creation, channel governance, invite links.
  - 🛡️ **Supervisor**: Operational coordination, channel oversight, attendance tracking, and task delegation.
  - 👤 **Team Member**: 2D office navigation, channel/DM participation, media sharing, and video calls.
- **Password Security & Rate Limiting**: Bcryptjs password hashing, cookie parser, CORS origin whitelisting, rate limiting, and Zod input validation schemas.
- **Node-Cron User Cleanup**: Daily scheduled background job deleting unverified accounts older than 24 hours.

---

## 🏗️ Full-Stack & Backend Architecture

### Full-Stack Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              VOW Frontend (React 19 + Vite)                            │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────────┐ │
│ │   2D Office Canvas   │  │    Redux Toolkit     │  │       Chat & Media Panel       │ │
│ │  (Spatial Navigation)│  │ (State & Persistence)│  │ (ChatLayout / VideoConference) │ │
│ └──────────┬───────────┘  └──────────┬───────────┘  └───────────────┬────────────────┘ │
└────────────┼─────────────────────────┼──────────────────────────────┼──────────────────┘
             │                         │                              │
             │ REST API (Axios)        │ Socket.io & WebRTC           │ Cloudinary / AI
             ▼                         ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         VOW Backend Server (Express 5 + TypeScript)                    │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────────┐ │
│ │   REST Controllers   │  │ Socket.io Handlers   │  │      WebRTC SFU Signaling      │ │
│ │ (Auth, Workspace, DM)│  │(Presence, Spatial 16Hz)│ │     (Video / Audio Huddles)    │ │
│ └──────────┬───────────┘  └──────────┬───────────┘  └───────────────┬────────────────┘ │
└────────────┼─────────────────────────┼──────────────────────────────┼──────────────────┘
             │                         │                              │
             ▼                         ▼                              ▼
 ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────────┐
 │ MongoDB Atlas Database│   │ Cloudinary Media CDN  │   │  Google Gemini AI Service │
 └───────────────────────┘   └───────────────────────┘   └───────────────────────────┘
```

---

## 📊 Database Models (Mongoose Schemas)

| Model | File | Description |
| :--- | :--- | :--- |
| **User** | `models/user.ts` | Stores user credentials, hashed passwords, verification OTP, avatars, and global roles. |
| **Workspace** | `models/workspace.ts` | Stores multi-tenant workspace metadata, owner IDs, invite codes, and custom settings. |
| **Team** | `models/team.ts` | Defines sub-team partitions, supervisor assignments, and member lists within a workspace. |
| **Channel** | `models/channel.ts` | Stores workspace public and private text channels. |
| **Message** | `models/message.ts` | Persistent text channel message history, media links, and timestamps. |
| **DirectMessage** | `models/directMessage.ts` | Stores 1-on-1 private chat logs, file attachments, and read states. |
| **Map** | `models/map.ts` | Tilemap grid data, spawn coordinates, collision boundaries, and spatial objects. |
| **Room** | `models/room.ts` | Meeting room definitions within the 2D office floor plan. |
| **Meeting** | `models/meeting.ts` | WebRTC video call session logs and participant logs. |
| **File** | `models/file.ts` | Uploaded media metadata, Cloudinary URLs, fallbacks, and uploader references. |

---

## 🔌 API & Socket Event Reference

### REST API Endpoints Overview
- **`POST /auth/signup`**: Register a new user account & send OTP email.
- **`POST /auth/verify-otp`**: Verify email address with 6-digit OTP code.
- **`POST /auth/login`**: Authenticate user & return master JWT token.
- **`GET /me`**: Retrieve current user profile and active workspace context.
- **`POST /workspaces`**: Create a new virtual workspace (Assigns Manager role).
- **`POST /workspaces/join`**: Join existing workspace via invite code.
- **`GET /channels/:workspaceId`**: Fetch channels for active workspace.
- **`POST /files/upload`**: Upload media asset to Cloudinary with Data-URI fallback.
- **`GET /api-docs`**: Full interactive Swagger OpenAPI specification interface.

### Socket.io Event Matrix
- **`spatial_move`**: Broadcasts `(x, y)` coordinate updates across `workspace:${id}` room (~16Hz).
- **`avatar-collide`**: Emitted on collision; notifies backend to initiate direct 1-on-1 DM context between users.
- **`send_message` / `receive_message`**: Real-time channel text and media transmission.
- **`send_dm` / `receive_dm`**: Direct message delivery with live unread badge update.
- **`unread_count_update`**: Real-time unread message counter push for connected clients.

---

## 📁 Source Code Directory Layout

```
VOW_backend/src/
├── controllers/               # REST Request Handlers
│   ├── authController.ts      # Authentication & OTP handlers
│   ├── workspaceController.ts # Workspace creation & membership
│   ├── channelController.ts   # Channel management
│   ├── directMessageController.ts # 1-on-1 messaging
│   └── fileController.ts      # Cloudinary upload handler
├── libs/                      # External Service Libraries
│   ├── db.ts                  # MongoDB connection bootstrap
│   └── cloudinary.ts          # Cloudinary SDK client setup
├── middlewares/               # Middleware Stack
│   ├── authMiddleware.ts      # Master JWT token verifier
│   ├── workspace.middleware.ts# Workspace-scoped token & role validator
│   └── upload.ts              # Multer memory storage file interceptor
├── models/                    # Mongoose Data Models (10 Schemas)
├── routes/                    # Express Router Endpoints
├── schemas/                   # Zod Input Validation Schemas
├── sockets/                   # Real-Time Socket.io Handlers
│   ├── index.ts               # Socket server initializer
│   ├── presenceSocket.ts      # Spatial position & status handler
│   ├── chatSocket.ts          # Channel messaging socket handler
│   └── dmSocket.ts            # Direct message & unread counter handler
├── swagger/                   # OpenAPI Specs (.yaml files)
├── videochat/                 # WebRTC SFU Server Signaling Subsystem
├── app.ts                     # Express App Initialization & Configuration
└── index.ts                   # Entrypoint: DB Connect, Server Start, Cron Jobs
```

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: Local MongoDB or MongoDB Atlas URI
- **Cloudinary Account**: Cloud name, API Key, API Secret
- **Frontend Repository**: [VOW](https://github.com/raj-krr/VOW)

### 2. Environment Variables Configuration
Create a `.env` file in `VOW_backend/`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/vow_db
JWT_SECRET=your_master_jwt_secret
WORKSPACE_JWT_SECRET=your_workspace_jwt_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Nodemailer / OTP Email Setup
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Installation & Run

```bash
cd VOW_backend

# Install dependencies
npm install

# Start development server
npm run dev
```

Server starts at `http://localhost:5000`. Access Swagger UI docs at `http://localhost:5000/api-docs`.

---

## 🎨 Pairing With Frontend Repository

To connect with the **Frontend Repository**:

1. Clone and launch the **Frontend Repository**:
   ```bash
   git clone https://github.com/raj-krr/VOW.git
   cd VOW
   npm install
   npm run dev
   ```
2. Ensure `VITE_API_URL` and `VITE_SOCKET_URL` in `VOW/.env` point to `http://localhost:5000`.

---

## 🐳 Docker Deployment

To build and run the backend container using Docker Compose:

```bash
docker-compose up -d --build
```

---

## 📄 License
Licensed under the [ISC License](LICENSE).
