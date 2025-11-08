import { MEDIA_CONSTRAINTS, CHUNK_CONFIG } from '../shared/constants';

export class MediaHandler {
  private localStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private canvas: HTMLCanvasElement;
  private canvasContext: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = MEDIA_CONSTRAINTS.video.width;
    this.canvas.height = MEDIA_CONSTRAINTS.video.height;
    this.canvasContext = this.canvas.getContext('2d')!;
  }

  async startCapture(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: MEDIA_CONSTRAINTS.video.width },
          height: { ideal: MEDIA_CONSTRAINTS.video.height },
          frameRate: { ideal: MEDIA_CONSTRAINTS.video.frameRate }
        },
        audio: {
          echoCancellation: MEDIA_CONSTRAINTS.audio.echoCancellation,
          noiseSuppression: MEDIA_CONSTRAINTS.audio.noiseSuppression,
          autoGainControl: MEDIA_CONSTRAINTS.audio.autoGainControl
        }
      });

      this.videoTrack = this.localStream.getVideoTracks()[0];
      this.audioTrack = this.localStream.getAudioTracks()[0];

      console.log('Media capture started');
      return this.localStream;
    } catch (error) {
      console.error('Error starting media capture:', error);
      throw error;
    }
  }

  stopCapture() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      this.videoTrack = null;
      this.audioTrack = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    console.log('Media capture stopped');
  }

  captureVideoFrame(): Uint8Array | null {
    if (!this.videoTrack || !this.localStream) {
      return null;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = this.localStream;
      video.play();

      this.canvasContext.drawImage(
        video,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      return new Uint8Array(imageData.data.buffer);
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }

  async captureAudioData(): Promise<Uint8Array | null> {
    if (!this.audioTrack || !this.localStream) {
      return null;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({
          sampleRate: MEDIA_CONSTRAINTS.audio.sampleRate
        });
      }

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      return new Promise((resolve) => {
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const audioData = new Float32Array(inputData);
          
          // Convert Float32Array to Uint8Array
          const uint8Data = new Uint8Array(audioData.buffer);
          
          processor.disconnect();
          source.disconnect();
          
          resolve(uint8Data);
        };

        source.connect(processor);
        processor.connect(this.audioContext!.destination);
      });
    } catch (error) {
      console.error('Error capturing audio data:', error);
      return null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  toggleVideo(enabled: boolean) {
    if (this.videoTrack) {
      this.videoTrack.enabled = enabled;
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.audioTrack) {
      this.audioTrack.enabled = enabled;
    }
  }

  isVideoEnabled(): boolean {
    return this.videoTrack?.enabled || false;
  }

  isAudioEnabled(): boolean {
    return this.audioTrack?.enabled || false;
  }

  async switchCamera(deviceId?: string) {
    if (!this.localStream) return;

    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId } }
        : {
            width: { ideal: MEDIA_CONSTRAINTS.video.width },
            height: { ideal: MEDIA_CONSTRAINTS.video.height },
            frameRate: { ideal: MEDIA_CONSTRAINTS.video.frameRate }
          },
      audio: false
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (this.videoTrack) {
        this.videoTrack.stop();
        this.localStream.removeTrack(this.videoTrack);
      }

      this.localStream.addTrack(newVideoTrack);
      this.videoTrack = newVideoTrack;

      console.log('Camera switched successfully');
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }

  static async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => 
        device.kind === 'videoinput' || device.kind === 'audioinput'
      );
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }
}