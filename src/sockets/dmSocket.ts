import { Server, Socket } from "socket.io";
import DirectMessage from "../models/directMessage";
import Workspace from "../models/workspace";
import { verifySocketToken, getTokenFromSocket } from "./auth";


export function dmSocketHandler(io: Server) {
  io.on("connection", async (socket: Socket) => {
    try {
      const token =
        getTokenFromSocket(socket) ||
        (socket.handshake.auth && (socket.handshake.auth as any).token);

      const user = (await verifySocketToken(token)) as any;
      (socket as any).user = user;
      socket.join(`user:${user._id}`);
      console.log(`DM socket connected: ${user.username} (${user._id})`);

      socket.on("join_workspace", async (workspaceId: string) => {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace)
          return socket.emit("error", "Workspace not found");

        const isMember = workspace.members
          .map((m) => String(m))
          .includes(String(user._id));
        if (!isMember)
          return socket.emit("error", "Not a member of workspace");

        socket.join(`workspace:${workspaceId}`);
        socket.emit("joined_workspace", workspaceId);
        console.log(`${user.username} joined workspace ${workspaceId}`);
      });

      socket.on(
        "send_dm",
        async (payload: {
          receiverId: string;
          workspaceId: string;
          content: string;
          attachments?: { url: string; filename?: string }[];
        }) => {
          try {
            const { receiverId, workspaceId, content, attachments } = payload;

            if (!receiverId || !workspaceId || !content)
              return socket.emit("error", "Missing DM data");

            const workspace = await Workspace.findById(workspaceId);
            if (
              !workspace ||
              !workspace.members
                .map((m) => String(m))
                .includes(String(user._id)) ||
              !workspace.members
                .map((m) => String(m))
                .includes(String(receiverId))
            ) {
              return socket.emit("error", "Both users must belong to workspace");
            }

            const message = await DirectMessage.create({
              sender: user._id,
              receiver: receiverId,
              workspaceId,
              content,
              attachments,
            });

            const populated = await DirectMessage.findById(message._id)
              .populate("sender", "username avatar")
              .populate("receiver", "username avatar");

            const dmRoom = getDMRoomId(user._id.toString(), receiverId.toString());

            socket.join(dmRoom);
            io.to(`user:${receiverId}`).socketsJoin(dmRoom);

            io.to(dmRoom).emit("receive_dm", populated);
            console.log(
              `DM ${user.username} → ${receiverId}: ${content}`
            );
          } catch (err: any) {
            socket.emit("error", err.message || "Send DM failed");
          }
        }
      );

      socket.on("dm_typing", (receiverId: string) => {
        io.to(`user:${receiverId}`).emit("dm_user_typing", {
          userId: user._id,
        });
      });
      socket.on("dm_stop_typing", (receiverId: string) => {
        io.to(`user:${receiverId}`).emit("dm_user_stop_typing", {
          userId: user._id,
        });
      });

      socket.on("disconnect", () => {
        console.log(`DM socket disconnected: ${user.username}`);
      });
    } catch (err: any) {
      socket.emit("unauthorized", err.message);
      socket.disconnect(true);
    }
  });
}

function getDMRoomId(userA: string, userB: string): string {
  return `dm:${[userA, userB].sort().join(":")}`;
}
