import "socket.io";

declare module "socket.io" {
  interface Socket {
    request: {
      session?: {
        user?: { id: string; name: string };
      };
    };
  }
}
