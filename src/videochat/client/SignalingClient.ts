import { SignalingMessage, SignalingMessageType } from '../shared/types';
import { Protocol } from '../shared/protocol';

export class SignalingClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<SignalingMessageType, Set<(data: any) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private isConnected: boolean = false;

  constructor(private serverUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private handleMessage(data: string | ArrayBuffer) {
    try {
      if (typeof data === 'string') {
        const message = Protocol.deserialize(data);
        this.dispatchMessage(message);
      } else {
        // Binary data - handle separately
        this.dispatchBinaryData(data);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private dispatchMessage(message: SignalingMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  private dispatchBinaryData(data: ArrayBuffer) {
    // Dispatch to binary handlers if any
    const handlers = this.messageHandlers.get(SignalingMessageType.MEDIA_CHUNK);
    if (handlers) {
      handlers.forEach(handler => handler({ data }));
    }
  }

  on(type: SignalingMessageType, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  off(type: SignalingMessageType, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  send(message: SignalingMessage) {
    if (!this.ws || !this.isConnected) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(Protocol.serialize(message));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  sendBinary(data: ArrayBuffer) {
    if (!this.ws || !this.isConnected) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error('Error sending binary data:', error);
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}