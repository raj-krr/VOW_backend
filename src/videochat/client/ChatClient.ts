import { ChatMessage, SignalingMessageType } from '../shared/types';
import { SignalingClient } from './SignalingClient';
import { Protocol } from '../shared/protocol';

export class ChatClient {
  private messages: ChatMessage[] = [];
  private onMessageCallbacks: ((message: ChatMessage) => void)[] = [];
  private onHistoryCallbacks: ((messages: ChatMessage[]) => void)[] = [];

  constructor(
    private signalingClient: SignalingClient,
    private roomId: string,
    private participantId: string
  ) {
    this.setupListeners();
  }

  private setupListeners() {
    this.signalingClient.on(SignalingMessageType.CHAT_MESSAGE, (data) => {
      const message: ChatMessage = data.data;
      this.messages.push(message);
      this.onMessageCallbacks.forEach(cb => cb(message));
    });

    this.signalingClient.on(SignalingMessageType.CHAT_HISTORY, (data) => {
      const messages: ChatMessage[] = data.data.messages;
      this.messages = messages;
      this.onHistoryCallbacks.forEach(cb => cb(messages));
    });
  }

  sendMessage(message: string): boolean {
    if (!message.trim()) {
      return false;
    }

    const signalingMessage = Protocol.createMessage(
      SignalingMessageType.CHAT_MESSAGE,
      this.roomId,
      this.participantId,
      { message }
    );

    return this.signalingClient.send(signalingMessage);
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  onMessage(callback: (message: ChatMessage) => void) {
    this.onMessageCallbacks.push(callback);
  }

  onHistory(callback: (messages: ChatMessage[]) => void) {
    this.onHistoryCallbacks.push(callback);
  }

  clearMessages() {
    this.messages = [];
  }
}