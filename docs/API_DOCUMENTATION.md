# VOW Backend - REST & WebSockets API Documentation

## 1. REST API Specification

### 1.1 Auth Routes (`/auth`)

#### `POST /auth/register`
- **Body**: `{ "email": "user@example.com", "username": "john_doe", "password": "SecurePassword123" }`
- **Response 201**: `{ "success": true, "msg": "Registered. Check your email...", "user": { ... } }`

#### `POST /auth/verifyemail`
- **Body**: `{ "code": "123456", "email": "user@example.com" }`
- **Response 200**: `{ "success": true, "msg": "Email verified successfully" }`

#### `POST /auth/login`
- **Body**: `{ "identifier": "john_doe", "password": "SecurePassword123" }`
- **Response 200**: `{ "success": true, "msg": "login successful", "user": { ... } }`
- **Cookies Set**: `accessToken` (HTTPOnly, 8h), `refreshToken` (HTTPOnly, 7d).

#### `POST /auth/forgetpassword`
- **Body**: `{ "email": "user@example.com" }`
- **Response 200**: `{ "success": true, "msg": "OTP sent to email", "otpExpiresAt": "..." }`

#### `POST /auth/verifyresetotp`
- **Body**: `{ "email": "user@example.com", "otp": "654321" }`
- **Response 200**: `{ "success": true, "msg": "OTP verified", "expiresIn": 300 }`
- **Cookie Set**: `resetToken` (HTTPOnly, 5 min).

#### `POST /auth/updatepassword`
- **Body**: `{ "newPassword": "NewPassword123" }`
- **Headers/Cookies**: Cookie `resetToken` or Header `x-reset-token`.
- **Response 200**: `{ "success": true, "msg": "Password updated successfully" }`

#### `POST /auth/logout`
- **Response 200**: `{ "success": true, "msg": "Logged out successfully" }`

---

### 1.2 Workspace Routes (`/workspaces`)

#### `POST /workspaces/create`
- **Body**: `{ "workspaceName": "Engineering Hub", "inviteEmails": ["peer@example.com"] }`
- **Header**: `Authorization: Bearer <accessToken>`
- **Response 201**: `{ "success": true, "message": "Workspace created successfully", "workspace": { ... } }`

#### `POST /workspaces/join`
- **Body**: `{ "inviteCode": "INV-12345" }`
- **Response 200**: `{ "success": true, "message": "Joined workspace successfully", "workspace": { ... } }`

#### `GET /workspaces/details`
- **Response 200**: `{ "success": true, "workspaces": [ ... ] }`

---

### 1.3 Team Routes (`/manager`, `/superviser`)

#### `POST /manager/team/create/:workspaceId`
- **Body**: `{ "name": "Frontend Squad", "memberIds": ["..."], "superviser": "..." }`
- **Header**: Cookie `workspaceToken_${workspaceId}` or Header `x-workspace-token`.
- **Response 201**: `{ "success": true, "message": "Team created successfully", "team": { ... } }`

#### `GET /manager/team/all/:workspaceId`
- **Response 200**: `{ "success": true, "count": 2, "teams": [ ... ] }`

---

### 1.4 Files Routes (`/files`)

#### `POST /files/:workspaceId/upload`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (Binary)
- **Response 201**: `{ "message": "File uploaded successfully", "file": { ... } }`

#### `GET /files/:workspaceId`
- **Response 200**: `{ "workspaceId": "...", "files": [ ... ] }`

#### `GET /files/all/joined`
- **Query**: `?page=1&limit=10`
- **Response 200**: `{ "message": "Fetched paginated files", "total": 15, "files": [ ... ] }`

#### `DELETE /files/delete/:id`
- **Response 200**: `{ "message": "File deleted successfully" }`

---

## 2. WebSockets Real-Time Event Protocols

### 2.1 Presence Namespace (`sockets/presenceSocket.ts`)
- **Connect**: Pass JWT token in `socket.handshake.auth.token`.
- **`join`**: `{ workspaceId, displayName, avatar, x, y }` -> Server emits `join-ack` to client and `user-joined` to room `workspace:${workspaceId}`.
- **`move`**: `{ workspaceId, x, y }` -> Server broadcasts `user-moved` to room.
- **Disconnect**: Server broadcasts `user-left` with `{ userId }`.

---

### 2.2 Chat Namespace (`sockets/chatSocket.ts`)
- **`join_channel`**: `channelId: string` -> Client joins room `channel:${channelId}`.
- **`send_message`**: `{ channelId, content, attachments }` -> Emits `receive_message` to room `channel:${channelId}`.
- **`typing` / `stop_typing`**: `channelId: string` -> Emits `user_typing` / `user_stop_typing` to channel peers.

---

### 2.3 Direct Message Namespace (`sockets/dmSocket.ts`)
- **`send_dm`**: `{ receiverId, workspaceId, content, attachments }` -> Emits `receive_dm` to rooms `user:${senderId}` and `user:${receiverId}`.
- **`dm_typing` / `dm_stop_typing`**: `receiverId: string` -> Emits `dm_user_typing` to target user room.
