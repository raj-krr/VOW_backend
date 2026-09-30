# VOW Backend - Detailed File-by-File Technical Analysis

This document provides a line-by-line and file-by-file audit of every source file in `VOW_backend/src/`.

---

## 1. Core Server Files

### `src/index.ts`
- **Lines**: 44
- **Purpose**: Entry point bootstrapping Express app, connecting to MongoDB (`mongoDb()`), starting Socket.IO (`initSocket()`), starting HTTP listener on `PORT`, and setting up a cron job.
- **Key Logic**:
  - `cron.schedule("0 2 * * *", ...)` runs daily at 02:00 AM to delete unverified user accounts created over 24 hours ago.
- **Flaws & Anti-Patterns**:
  - `initVideoChat(app, server)` is commented out on line 23. SFU Video signaling server remains uninitialized.
  - Missing graceful shutdown handling for Node.js process signals (`SIGINT`, `SIGTERM`).
  - Unverified user deletion does not clean orphaned user ID entries in workspace `members` arrays if unverified users were partially joined.

---

### `src/app.ts`
- **Lines**: 136
- **Purpose**: Configures Express middleware (CORS, JSON/urlencoded parsers, cookie-parser, views engine, Swagger UI), mounts routes, and sets global error handler.
- **Key Logic**:
  - Merges 11 YAML documentation files using `deepmerge.all` and serves them via `swaggerUi.setup` at `/api-docs`.
  - Configures CORS options array.
- **Flaws & Anti-Patterns**:
  - **Security Bug**: Lines 44–57 in CORS callback return `callback(null, true)` in all logic paths, completely disabling cross-origin security.
  - Mounts router as `/superviser` (typo: `superviser` instead of `supervisor`).

---

### `src/constant.ts`
- **Lines**: 15
- **Purpose**: Exports cookie options (`options`) used across authentication responses.
- **Flaws & Anti-Patterns**: Hardcodes `httpOnly: true`, `sameSite: "none"` without dynamic adjustment for HTTP vs HTTPS environments.

---

## 2. Models (`src/models/`)

### `src/models/user.ts`
- **Purpose**: Mongoose schema for User entity.
- **Methods**: `comparePassword`, `isPasswordCorrect`, `generateTokens`.
- **Flaws**:
  - Dual password comparison methods (`comparePassword` & `isPasswordCorrect`) performing redundant `bcrypt.compare` logic.
  - `refreshTokenExpires` property defined in TypeScript interface and Mongoose schema but never set in `generateTokens()`.

---

### `src/models/workspace.ts`
- **Purpose**: Schema for multi-tenant Workspace entity containing `workspaceName`, `manager` (Ref User), `members` (Ref User Array), `inviteCode`.
- **Flaws**: Lacks compound index on `{ members: 1 }`, slowing down workspace queries.

---

### `src/models/team.ts`
- **Purpose**: Sub-organization team model linking members and supervisor.
- **Flaws**: Typo in field name `superviser` vs standard spelling `supervisor`.

---

### `src/models/channel.ts`
- **Purpose**: Text and voice channels within a workspace.
- **Flaws**: Property `server` used to store Workspace ObjectId instead of `workspaceId`.

---

### `src/models/message.ts`
- **Purpose**: Persistent text messages sent to channels.
- **Flaws**: Missing index on `{ channelId: 1, createdAt: -1 }`.

---

### `src/models/directMessage.ts`
- **Purpose**: 1-on-1 private messaging entity between two users.
- **Flaws**: Missing compound index on `{ sender: 1, receiver: 1, createdAt: 1 }`.

---

### `src/models/meeting.ts`
- **Purpose**: Calendar meeting model for scheduling workspace conferences.
- **Flaws**: `attendees` array stores email strings rather than references to User ObjectIds.

---

### `src/models/file.ts`
- **Purpose**: Metadata tracking uploaded workspace files.
- **Flaws**: Lacks soft-deletion capability.

---

### `src/models/map.ts`
- **Purpose**: Base 2D office layout data.

---

### `src/models/room.ts`
- **Purpose**: Conference room token model.

---

## 3. Controllers (`src/controllers/`)

### `src/controllers/auth.ts`
- **Handlers**: `register`, `resendVerification`, `verifyEmail`, `login`, `forgotPassword`, `verifyResetOtp`, `updatePassword`, `logout`, `refreshAccessToken`.
- **Flaws**:
  - `sanitizeUser` uses `delete` operators on object properties manually rather than structured DTO projection.
  - `forgotPassword` OTP expiration time (2 minutes) is too tight for email delivery delays.

---

### `src/controllers/workspaceControllers.ts`
- **Handlers**: `createWorkspace`, `joinWorkspace`, `getWorkspaceDetails`, `rejoinWorkspace`, `workspaceMembers`, `deleteWorkspace`.
- **Flaws**:
  - **CRITICAL BUG**: `createWorkspace` invokes `res.status(200).json(...)` at line 36 AND `res.status(201).json(...)` at line 48. Triggers `ERR_HTTP_HEADERS_SENT` error in Node.js.
  - `rejoinWorkspace` falls back to `effectiveUserId = userId ? userId.toString() : workspace.manager.toString();`, allowing unauthenticated users to impersonate the workspace manager if `userId` is missing.

---

### `src/controllers/teamControllers.ts`
- **Handlers**: `createTeam`, `renameTeam`, `addMembers`, `removeMember`, `assignSuperviser`, `getAllTeams`, `getTeamMembers`, `deleteTeam`.
- **Flaws**: `addMembers` uses `.push(...validMembers)` without deduplicating, causing duplicate user IDs in team member lists.

---

### `src/controllers/channelController.ts`
- **Handlers**: `createChannel`, `getServerChannels`, `deleteChannel`, `updateChannelName`.
- **Flaws**: Lacks membership authorization check ensuring caller belongs to target workspace before creating channels.

---

### `src/controllers/messageController.ts`
- **Handlers**: `sendMessageRest`, `getChannelMessages`, `deleteMessage`.
- **Flaws**: `sendMessageRest` manually constructs custom response fields instead of returning normalized Mongoose schema outputs.

---

### `src/controllers/directMessageController.ts`
- **Handlers**: `sendDirectMessage`, `getDirectMessages`, `deleteDirectMessage`.
- **Flaws**: `getDirectMessages` does not check if caller is either `user1` or `user2`, allowing any user to read direct messages between other users.

---

### `src/controllers/meetingControllers.ts`
- **Handlers**: `scheduleMeeting`, `getWorkspaceMeetings`, `deleteMeeting`, `updateMeeting`.
- **Flaws**: Meeting reminder emails use in-memory `setTimeout` inside Node.js process instead of durable job queues.

---

### `src/controllers/fileControllers.ts`
- **Handlers**: `uploadFile`, `getAllFiles`, `deleteFile`, `getAllUserWorkspaceFiles`.
- **Flaws**: Missing `downloadFile` endpoint implementation; Cloudinary fallback reads entire file into RAM Base64 memory buffer (`fs.readFileSync`).

---

### `src/controllers/mapController.ts`
- **Handlers**: `initBaseMap`, `getBaseMap`, `updatePresence`, `getPresence`, `removePresence`.
- **Flaws**: Relies on Redis hash storage without automatic cleanup on abrupt socket disconnection.

---

### `src/controllers/meControllers.ts`
- **Handlers**: `updateProfileAndAvatar`, `uploadProfilePhoto`, `getUserProfile`.
- **Flaws**: Avatar URL string construction hardcodes S3 bucket URL format without checking if AWS environment variables exist.

---

### `src/controllers/rooms.ts`
- **Handlers**: `makeRoomToken`, `listRooms`, `getRoom`, `joinRoom`, `leaveRoom`, `getRoomPresence`.

---

## 4. WebSockets Layer (`src/sockets/`)

### `src/sockets/index.ts`
- Initializes Socket.IO with CORS settings. Registers `chatSocket`, `dmSocketHandler`, `presenceSocket`.

### `src/sockets/auth.ts`
- Extracts JWT from handshake headers/auth object and verifies token.

### `src/sockets/presenceSocket.ts`
- **Flaw**: Uses in-memory `presenceStore` object. Lost on server restart and unsynchronized across multi-instance cluster nodes.

### `src/sockets/chatSocket.ts`
- **Flaw**: Emits channel message to every workspace member individual socket room (`io.to('user:${mStr}')`), causing $O(N)$ fanout overhead on large workspaces.

### `src/sockets/dmSocket.ts`
- Handles 1-on-1 direct message broadcasts to personal rooms (`user:${id}`).

---

## 5. WebRTC SFU Subsystem (`src/videochat/`)

- `init.ts`: Bootstraps Mediasoup SFU router and WebSocket signaling server (`/signaling`). Disabled in `index.ts`.
- `server/sfu.ts`: Manages Mediasoup workers, routers, transports, producers, and consumers.
- `server/websocket.ts`: Handles WebSocket signaling events (`join-room`, `create-transport`, `connect-transport`, `produce`, `consume`).
