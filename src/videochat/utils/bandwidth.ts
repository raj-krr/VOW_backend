import { BandwidthStats } from '../shared/types';
import logger from './logger';

export class BandwidthMonitor {
  private stats: Map<string, BandwidthStats> = new Map();
  private bytesReceived: Map<string, number> = new Map();
  private bytesSent: Map<string, number> = new Map();
  private lastCheck: Map<string, number> = new Map();

  recordReceived(participantId: string, bytes: number) {
    const current = this.bytesReceived.get(participantId) || 0;
    this.bytesReceived.set(participantId, current + bytes);
  }

  recordSent(participantId: string, bytes: number) {
    const current = this.bytesSent.get(participantId) || 0;
    this.bytesSent.set(participantId, current + bytes);
  }

  calculateStats(participantId: string): BandwidthStats {
    const now = Date.now();
    const lastCheckTime = this.lastCheck.get(participantId) || now;
    const timeDiff = (now - lastCheckTime) / 1000; // seconds

    const received = this.bytesReceived.get(participantId) || 0;
    const sent = this.bytesSent.get(participantId) || 0;

    const upstream = timeDiff > 0 ? (sent * 8) / timeDiff / 1000 : 0; // Kbps
    const downstream = timeDiff > 0 ? (received * 8) / timeDiff / 1000 : 0; // Kbps

    const stats: BandwidthStats = {
      participantId,
      upstream: Math.round(upstream),
      downstream: Math.round(downstream),
      packetLoss: 0,
      latency: 0,
      timestamp: now
    };

    // Reset counters
    this.bytesReceived.set(participantId, 0);
    this.bytesSent.set(participantId, 0);
    this.lastCheck.set(participantId, now);
    this.stats.set(participantId, stats);

    return stats;
  }

  getStats(participantId: string): BandwidthStats | undefined {
    return this.stats.get(participantId);
  }

  getAllStats(): BandwidthStats[] {
    return Array.from(this.stats.values());
  }

  removeParticipant(participantId: string) {
    this.stats.delete(participantId);
    this.bytesReceived.delete(participantId);
    this.bytesSent.delete(participantId);
    this.lastCheck.delete(participantId);
  }

  checkThreshold(participantId: string): { ok: boolean; reason?: string } {
    const stats = this.stats.get(participantId);
    if (!stats) return { ok: true };

    const totalBandwidth = stats.upstream + stats.downstream;
    
    if (totalBandwidth > 4000) {
      return { 
        ok: false, 
        reason: `Bandwidth exceeded: ${totalBandwidth} Kbps` 
      };
    }

    if (stats.packetLoss > 15) {
      return { 
        ok: false, 
        reason: `High packet loss: ${stats.packetLoss}%` 
      };
    }

    return { ok: true };
  }
}