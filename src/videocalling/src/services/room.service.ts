import { presenceService } from "./presence.service.js";

export const roomService = {
  async createRoom(user: any) {
    const roomId = Math.random().toString(36).substring(2, 10);
    await presenceService.addParticipant(roomId, user.id || "owner", user);
    return roomId;
  },

  async joinRoom(roomId: string, user: any, socketId: string) {
    const participants = await presenceService.getParticipants(roomId);
    if (!participants) return { ok: false, error: "Room not found" };

    await presenceService.addParticipant(roomId, socketId, user);
    const updated = await presenceService.getParticipants(roomId);
    return { ok: true, participants: updated };
  },

  async leaveRoom(roomId: string, user: any, socketId: string) {
    await presenceService.removeParticipant(socketId);
  },
};
