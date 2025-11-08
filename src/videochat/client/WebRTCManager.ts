/// <reference lib="dom" />
import { RTC_CONFIG } from '../shared/constants';

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private onTrackCallbacks: ((participantId: string, stream: MediaStream) => void)[] = [];
  private onIceCandidateCallbacks: ((participantId: string, candidate: RTCIceCandidate) => void)[] = [];

  createPeerConnection(participantId: string): RTCPeerConnection {
    if (this.peerConnections.has(participantId)) {
      return this.peerConnections.get(participantId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidateCallbacks.forEach(cb => cb(participantId, event.candidate!));
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received track from ${participantId}:`, event.track.kind);
      const stream = event.streams[0];
      
      if (stream) {
        this.remoteStreams.set(participantId, stream);
        this.onTrackCallbacks.forEach(cb => cb(participantId, stream));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${participantId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeerConnection(participantId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}:`, pc.iceConnectionState);
    };

    this.peerConnections.set(participantId, pc);
    return pc;
  }

  async createOffer(participantId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      throw new Error(`No peer connection for ${participantId}`);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(participantId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      throw new Error(`No peer connection for ${participantId}`);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(participantId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(participantId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
  }

  async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      throw new Error(`No peer connection for ${participantId}`);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(participantId: string, candidate: RTCIceCandidateInit) {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      console.warn(`No peer connection for ${participantId} to add ICE candidate`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Error adding ICE candidate for ${participantId}:`, error);
    }
  }

  addTrack(participantId: string, track: MediaStreamTrack, stream: MediaStream) {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      throw new Error(`No peer connection for ${participantId}`);
    }

    pc.addTrack(track, stream);
  }

  getPeerConnection(participantId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(participantId);
  }

  getRemoteStream(participantId: string): MediaStream | undefined {
    return this.remoteStreams.get(participantId);
  }

  closePeerConnection(participantId: string) {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    this.remoteStreams.delete(participantId);
    console.log(`Closed peer connection for ${participantId}`);
  }

  closeAllConnections() {
    this.peerConnections.forEach((pc, participantId) => {
      this.closePeerConnection(participantId);
    });
  }

  onTrack(callback: (participantId: string, stream: MediaStream) => void) {
    this.onTrackCallbacks.push(callback);
  }

  onIceCandidate(callback: (participantId: string, candidate: RTCIceCandidate) => void) {
    this.onIceCandidateCallbacks.push(callback);
  }

  getStats(participantId: string): Promise<RTCStatsReport | null> {
    const pc = this.getPeerConnection(participantId);
    if (!pc) {
      return Promise.resolve(null);
    }

    return pc.getStats();
  }
}