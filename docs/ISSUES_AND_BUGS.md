# VOW Backend - Comprehensive Issues, Flaws, and Vulnerabilities Catalog

This document details all technical bugs, security risks, memory leaks, and anti-patterns identified in `VOW_backend`.

---

## 1. Critical Runtime & Logic Bugs

### 1.1 Express Headers Already Sent Crash (`createWorkspace`)
- **Location**: `src/controllers/workspaceControllers.ts#L36` & `L48`
- **Severity**: **CRITICAL**
- **Description**: Calling `res.status(200).json(...)` followed by `res.status(201).json(...)` causes Node.js to throw `ERR_HTTP_HEADERS_SENT` error and crash request handlers when invite emails are processed.
- **Remediation**: Remove line 36 and issue a single unified response after invite processing completes.

---

### 1.2 Unauthenticated Manager Impersonation in Rejoin Endpoint
- **Location**: `src/controllers/workspaceControllers.ts#L125`
- **Severity**: **CRITICAL (Security Risk)**
- **Description**: `rejoinWorkspace` sets `effectiveUserId = userId ? userId.toString() : workspace.manager.toString();`. If `userId` is missing, it automatically assigns the workspace manager's ID, granting arbitrary callers manager privileges.
- **Remediation**: Require valid `verifyJWT` middleware on `rejoinWorkspace` and reject requests where `userId` is missing.

---

### 1.3 Missing `/files/download/:id` Endpoint Implementation
- **Location**: `src/routes/fileRoutes.ts` & `src/api/file.js`
- **Severity**: **HIGH**
- **Description**: Frontend attempts to download files via `api.get('/files/download/${id}')`, but backend lacks route and handler, returning 404 Not Found.
- **Remediation**: Add `fileRouter.get("/download/:id", verifyJWT, downloadFile);` and implement handler in `fileControllers.ts`.

---

## 2. Security Vulnerabilities

### 2.1 Complete CORS Validation Bypass
- **Location**: `src/app.ts#L56`
- **Severity**: **CRITICAL (Security Vulnerability)**
- **Description**: CORS callback returns `return callback(null, true);` unconditionally in all execution paths, permitting unauthorized origins to send credentials and read workspace data.
- **Remediation**: Strictly match request origin against allowed origin array and return CORS error on mismatch.

---

### 2.2 Unrestricted Direct Message Retrieval
- **Location**: `src/controllers/directMessageController.ts#L70`
- **Severity**: **HIGH (Privacy Leak)**
- **Description**: `getDirectMessages` fetches messages between `user1` and `user2` without verifying if `req.user._id` is equal to `user1` or `user2`. Any authenticated user can read DMs between any two users in a workspace.
- **Remediation**: Enforce `if (String(currentUserId) !== user1 && String(currentUserId) !== user2) throw new ApiError(403, "Forbidden");`.

---

## 3. Architecture & Memory Anti-Patterns

### 3.1 Synchronous Memory Buffer File Fallback
- **Location**: `src/controllers/fileControllers.ts#L82` & `src/controllers/meControllers.ts#L99`
- **Severity**: **MEDIUM**
- **Description**: Reads entire uploaded file into a Base64 string buffer in RAM using `fs.readFileSync(req.file.path)`. Concurrent large file uploads will cause process Out-Of-Memory (OOM) crashes.
- **Remediation**: Stream files directly to AWS S3 or disk storage using streams.

---

### 3.2 In-Memory Socket Presence Store
- **Location**: `src/sockets/presenceSocket.ts#L4`
- **Severity**: **HIGH (Scalability)**
- **Description**: Spatial avatar positions are stored in local Node.js process object `presenceStore`. Positions are wiped on server restart and fail to sync across clustered instances.
- **Remediation**: Migrate presence storage to Redis Hashes and Redis Pub/Sub channels.
