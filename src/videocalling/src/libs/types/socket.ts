export interface ClientToServerEvents {
  "room:create": (data: {}, cb: (resp: any) => void) => void;
  "room:join": (data: { roomId: string }, cb: (resp: any) => void) => void;
  "room:leave": (data: { roomId: string }, cb: (resp: any) => void) => void;
  "chat:send": (data: { roomId: string; text: string }) => void;
  "webrtc:offer": (data: {
    to: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:answer": (data: {
    to: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "webrtc:ice-candidate": (data: {
    to: string;
    candidate: RTCIceCandidateInit;
  }) => void;
}

export interface ServerToClientEvents {
  "participant:joined": (data: { socketId: string; name: string }) => void;
  "participant:left": (data: { socketId: string }) => void;
  "chat:message": (data: { name: string; text: string; at: number }) => void;
  "webrtc:offer": (data: { from: string; sdp: any }) => void;
  "webrtc:answer": (data: { from: string; sdp: any }) => void;
  "webrtc:ice-candidate": (data: { from: string; candidate: any }) => void;
}
