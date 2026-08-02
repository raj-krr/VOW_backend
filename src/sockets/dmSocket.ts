import { Server, Socket } from "socket.io";
import DirectMessage from "../models/directMessage";
import Workspace from "../models/workspace";
import { verifySocketToken, getTokenFromSocket } from "./auth";

export async function dmSocketHandler(io: Server, socket: Socket) {
  // Reuse user from chatSocket (set during await chatSocket(io, socket))
  let user = (socket as any).user;

  if (!user) {
    // Fallback: authenticate independently
    const token =
      getTokenFromSocket(socket) ||
      (socket.handshake.auth && (socket.handshake.auth as any).token);

    if (!token) {
      console.error("[dmSocket] No token available, cannot init DM handler");
      return;
    }

    user = (await verifySocketToken(token)) as any;
    (socket as any).user = user;
  }

  // Ensure user is in their personal room for DM delivery
  const userRoom = `user:${user._id.toString()}`;
  socket.join(userRoom);
  console.log(`[dmSocket] ✓ Handler ready for ${user.username} (${user._id}), room=${userRoom}`);

  // --- JOIN WORKSPACE ---
  socket.on("join_workspace", async (workspaceId: string) => {
    try {
      const workspace = (await Workspace.findById(workspaceId)) as any;
      if (!workspace) return socket.emit("error", "Workspace not found");

      socket.join(`workspace:${workspaceId}`);
      socket.emit("joined_workspace", workspaceId);
      console.log(`[dmSocket] ${user.username} joined workspace ${workspaceId}`);
    } catch (err: any) {
      console.error("[dmSocket] join_workspace error:", err.message);
    }
  });

  // --- SEND DM ---
  socket.on("send_dm", async (payload: any) => {
    const attCount = Array.isArray(payload?.attachments) ? payload.attachments.length : 0;
    console.log(`[send_dm] ▶ Received from ${user.username} → receiver: ${payload?.receiverId} (attachments: ${attCount})`);

    try {
      const receiverId = payload?.receiverId;
      const content = payload?.content;
      const workspaceId = payload?.workspaceId;
      const attachments = payload?.attachments;

      const hasContent = content && String(content).trim() !== "";
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

      if (!hasContent && !hasAttachments) {
        console.error("[send_dm] ✗ Neither content nor attachments provided");
        return socket.emit("error", "Missing content or attachments");
      }

      // Resolve workspaceId
      let targetWorkspaceId = workspaceId;
      if (!targetWorkspaceId || targetWorkspaceId === "undefined" || targetWorkspaceId === "null") {
        const sharedWorkspace = (await Workspace.findOne({
          members: { $all: [user._id, receiverId] },
        })) as any;
        targetWorkspaceId = sharedWorkspace
          ? sharedWorkspace._id.toString()
          : user._id.toString();
        console.log(`[send_dm] Resolved workspaceId → ${targetWorkspaceId}`);
      }

      // Save to DB
      const message = await DirectMessage.create({
        sender: user._id,
        receiver: receiverId,
        workspaceId: targetWorkspaceId,
        content: content ? String(content) : "",
        attachments: attachments || [],
      });
      console.log(`[send_dm] ✓ Saved to DB: _id=${message._id}`);

      // Populate for frontend display
      const populated = await DirectMessage.findById(message._id)
        .populate("sender", "username avatar")
        .populate("receiver", "username avatar");

      // Emit to BOTH sender and receiver personal rooms
      const senderRoom = `user:${user._id.toString()}`;
      const receiverRoom = `user:${receiverId.toString()}`;

      io.to(senderRoom).emit("receive_dm", populated);
      io.to(receiverRoom).emit("receive_dm", populated);

      console.log(`[send_dm] ✓ Delivered: ${user.username} → ${receiverId} | rooms: ${senderRoom}, ${receiverRoom}`);
    } catch (err: any) {
      console.error("[send_dm] ✗ Error:", err.message, err.stack);
      socket.emit("error", err.message || "Send DM failed");
    }
  });

  // --- TYPING ---
  socket.on("dm_typing", (receiverId: string) => {
    io.to(`user:${receiverId}`).emit("dm_user_typing", {
      userId: user._id.toString(),
      username: user.username || user.fullName || "Someone",
    });
  });

  socket.on("dm_stop_typing", (receiverId: string) => {
    io.to(`user:${receiverId}`).emit("dm_user_stop_typing", {
      userId: user._id.toString(),
      username: user.username || user.fullName || "Someone",
    });
  });

  socket.on("disconnect", () => {
    console.log(`[dmSocket] Disconnected: ${user.username}`);
  });
}
