# VOW Backend - Technical Architecture & Infrastructure Specification

## 1. Executive Summary

**VOW Backend** is a high-performance, event-driven Node.js & Express application written in TypeScript. It powers real-time spatial avatar synchronization, persistent channels & direct messaging, SFU WebRTC signaling, role-based workspace management, meeting scheduling with automated email alerts, and secure multi-cloud file vault storage.

---

## 2. Layered Software Architecture

The backend follows a **Clean Layered Architecture** separating routing, request validation, business logic, data persistence, and real-time event distribution:

```mermaid
graph TD
    subgraph Client Requests
        RESTReq["HTTPS REST API Requests"]
        SocketReq["Socket.IO WSS Events"]
        SFUReq["Mediasoup WebRTC WSS Signaling"]
    end

    subgraph Entry & Route Layer
        AppTS["app.ts (Express Config & Global Middlewares)"]
        IndexTS["index.ts (Http Server & Socket Initialization)"]
        RoutesLayer["routes/*.ts (Express Routers)"]
    end

    subgraph Middleware & Validation Layer
        AuthMW["authmiddleware.ts (verifyJWT)"]
        WorkspaceMW["workspace.middleware.ts (verifyWorkspaceToken)"]
        ValidateMW["validate.ts (Zod Schema Validation)"]
        RateLimitMW["rateLimit.ts (IP & Email Rate Limiters)"]
    end

    subgraph Business Controller Layer
        AuthCtrl["controllers/auth.ts"]
        WorkspaceCtrl["controllers/workspaceControllers.ts"]
        TeamCtrl["controllers/teamControllers.ts"]
        ChannelCtrl["controllers/channelController.ts"]
        MessageCtrl["controllers/messageController.ts"]
        DMCtrl["controllers/directMessageController.ts"]
        FileCtrl["controllers/fileControllers.ts"]
        MeetingCtrl["controllers/meetingControllers.ts"]
        MapCtrl["controllers/mapController.ts"]
    end

    subgraph Real-Time & Audio/Video Layer
        PresenceSocket["sockets/presenceSocket.ts (2D Spatial Map)"]
        ChatSocket["sockets/chatSocket.ts (Channels Engine)"]
        DMSocket["sockets/dmSocket.ts (Direct Messages)"]
        SFUServer["videochat/server/sfu.ts (Mediasoup WebRTC)"]
    end

    subgraph Data & Persistence Layer
        MongooseModels["models/*.ts (Mongoose ODM Schemas)"]
        RedisLib["libs/redis.ts (Upstash / Redis Caching)"]
        CloudinaryLib["libs/cloudinary.ts (Media Cloud Storage)"]
        S3Lib["libs/s3.ts (AWS S3 Client)"]
        NodemailerLib["middlewares/email.ts (Nodemailer Email Engine)"]
    end

    RESTReq --> AppTS
    SocketReq --> IndexTS
    SFUReq --> IndexTS

    AppTS --> RoutesLayer
    RoutesLayer --> AuthMW
    RoutesLayer --> WorkspaceMW
    RoutesLayer --> ValidateMW
    RoutesLayer --> RateLimitMW

    AuthMW --> BusinessController
    WorkspaceMW --> BusinessController
    ValidateMW --> BusinessController
    
    BusinessController --> MongooseModels
    BusinessController --> NodemailerLib
    BusinessController --> CloudinaryLib
    
    IndexTS --> PresenceSocket
    IndexTS --> ChatSocket
    IndexTS --> DMSocket
    IndexTS --> SFUServer

    PresenceSocket <--> RedisLib
    ChatSocket --> MongooseModels
    DMSocket --> MongooseModels
```

---

## 3. Database Schemas & Data Model Relationships

```mermaid
erDiagram
    USER ||--o{ WORKSPACE : "manages / joined"
    WORKSPACE ||--o{ TEAM : "contains"
    WORKSPACE ||--o{ CHANNEL : "contains"
    TEAM ||--o{ USER : "members"
    CHANNEL ||--o{ MESSAGE : "stores"
    USER ||--o{ MESSAGE : "sends"
    USER ||--o{ DIRECT_MESSAGE : "sends / receives"
    WORKSPACE ||--o{ FILE : "hosts"
    WORKSPACE ||--o{ MEETING : "schedules"

    USER {
        ObjectId _id PK
        string email
        string username
        string password
        boolean isVerified
        string avatar
    }

    WORKSPACE {
        ObjectId _id PK
        string workspaceName
        ObjectId manager FK
        ObjectId[] members FK
        string inviteCode
    }

    TEAM {
        ObjectId _id PK
        string name
        ObjectId workspaceId FK
        ObjectId[] members FK
        ObjectId superviser FK
    }

    CHANNEL {
        ObjectId _id PK
        string name
        string type
        ObjectId server FK
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId channelId FK
        ObjectId sender FK
        string content
        string[] attachments
    }

    DIRECT_MESSAGE {
        ObjectId _id PK
        ObjectId sender FK
        ObjectId receiver FK
        ObjectId workspaceId FK
        string content
        string[] attachments
    }
```

---

## 4. Key Infrastructure Services Specifications

1. **Database Persistence**: MongoDB Atlas Cluster via Mongoose ODM. Schema validation, password hashing pre-save hooks (`bcryptjs`), and token generation methods.
2. **Real-Time WebSockets**: Socket.IO server with custom token authentication handshakes. Emits real-time spatial movements, channel messages, and direct messages.
3. **WebRTC SFU Conferencing**: Powered by Mediasoup Node.js library. Configured for low-latency multi-participant audio/video routing over WebSockets signaling.
4. **Cloud Vault Storage**: Hybrid file storage supporting Cloudinary CDN and AWS S3 bucket storage with Base64 fallback handling.
5. **Nodemailer Email Engine**: Sends OTP verification codes, welcome emails, workspace invitations, and meeting cancellation/reschedule alerts using HTML email templates.
