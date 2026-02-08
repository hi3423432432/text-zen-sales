export class ScreenCapture {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private intervalId: number | null = null;
  private onFrame: ((imageData: string) => void) | null = null;

  async start(onFrame: (imageData: string) => void, intervalMs: number = 3000): Promise<boolean> {
    try {
      this.onFrame = onFrame;
      
      // Request screen capture permission
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Set up video element to capture frames
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (this.video) {
          this.video.onloadedmetadata = () => {
            this.video?.play();
            resolve();
          };
        }
      });

      // Set up canvas for frame capture
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      // Handle stream ending (user stops sharing)
      this.stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing ended by user');
        this.stop();
      };

      // Start capturing frames
      this.startCapturing(intervalMs);

      console.log('Screen capture started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start screen capture:', error);
      return false;
    }
  }

  private startCapturing(intervalMs: number) {
    // Capture first frame immediately
    this.captureFrame();

    // Then capture at intervals
    this.intervalId = window.setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }

  private captureFrame() {
    if (!this.video || !this.canvas || !this.ctx || !this.onFrame) return;

    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return;

    // Scale down for faster processing while maintaining readability
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / videoWidth);
    
    this.canvas.width = videoWidth * scale;
    this.canvas.height = videoHeight * scale;

    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Convert to base64 JPEG with quality setting
    const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
    this.onFrame(imageData);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.onFrame = null;

    console.log('Screen capture stopped');
  }

  isActive(): boolean {
    return this.stream !== null && this.intervalId !== null;
  }
}

// Singleton instance
let screenCaptureInstance: ScreenCapture | null = null;

export const getScreenCapture = (): ScreenCapture => {
  if (!screenCaptureInstance) {
    screenCaptureInstance = new ScreenCapture();
  }
  return screenCaptureInstance;
};
