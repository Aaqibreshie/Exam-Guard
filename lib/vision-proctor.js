/**
 * Intelligent Vision Proctoring Engine for ExamGuard
 * 
 * Calibrated for zero false positives during normal exam taking:
 * 1. Permits natural slight eye movements (reading questions, looking at right sidebar/palette).
 * 2. Flags COMPLETE HEAD TURN away from screen (>7s sustained).
 * 3. Flags SUDDEN DRASTIC / ERRATIC head movements.
 * 4. Flags REPEATED persistent glances towards the same off-screen direction (3+ times within 25s).
 * 5. Flags STUDENT ABSENCE (>5s absence).
 * 6. Flags MULTIPLE PERSONS in frame.
 */

export class VisionProctor {
  constructor({
    onStatusUpdate,
    onViolation,
    lookAwayThresholdSec = 7,
    absentThresholdSec = 5,
    repeatedGlanceWindowSec = 25,
    repeatedGlanceThreshold = 3
  }) {
    this.onStatusUpdate = onStatusUpdate;
    this.onViolation = onViolation;
    this.lookAwayThresholdSec = lookAwayThresholdSec;
    this.absentThresholdSec = absentThresholdSec;
    this.repeatedGlanceWindowSec = repeatedGlanceWindowSec;
    this.repeatedGlanceThreshold = repeatedGlanceThreshold;

    this.stream = null;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
    this.intervalId = null;

    // Temporal State & Exponential Moving Average (EMA) Smoothing
    this.smoothedX = 0.5;
    this.smoothedY = 0.5;
    this.hasInitializedSmoothing = false;
    this.lastCentroid = null; // { x, y, timestamp }
    this.lastSuddenMoveTime = 0;

    // Absence & Sustained Head Turn Tracking
    this.absentStartTime = null;
    this.hasLoggedAbsent = false;
    this.headTurnStartTime = null;
    this.hasLoggedHeadTurn = false;

    // Repeated Directional Glance History (last 25s rolling window)
    this.glanceHistory = []; // [{ direction, timestamp, durationMs }]
    this.currentGlance = null; // { direction, startTime, reported }
    this.lastReportedRepeatedGlanceTime = 0;

    this.nativeFaceDetector = null;
  }

  async start(videoElement) {
    if (this.isRunning) return { success: true };
    this.videoElement = videoElement;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = 'Camera not supported in this browser environment.';
      this.onStatusUpdate?.({
        isActive: false,
        hasPermissionError: true,
        statusText: msg
      });
      return { success: false, error: 'unsupported', message: msg };
    }

    try {
      // 1. Request Webcam Stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play().catch(() => {});
      }

      // 2. Setup Processing Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      // 3. Initialize Native FaceDetector if available in browser (Chrome/Edge/Opera)
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        try {
          // @ts-ignore
          this.nativeFaceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
        } catch {
          this.nativeFaceDetector = null;
        }
      }

      this.isRunning = true;
      this.intervalId = setInterval(() => this._processFrame(), 400);

      this.onStatusUpdate?.({
        isActive: true,
        hasPermissionError: false,
        faceCount: 1,
        isFocused: true,
        statusText: 'Webcam Proctor Active',
        gazeDirection: 'center'
      });

      return { success: true };
    } catch (err) {
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const statusMsg = isDenied 
        ? 'Camera permission denied in browser.' 
        : `Camera error: ${err.message}`;

      this.onStatusUpdate?.({
        isActive: false,
        hasPermissionError: true,
        isDenied,
        statusText: statusMsg
      });

      return { success: false, error: err.name, isDenied, message: statusMsg };
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  async _processFrame() {
    if (!this.isRunning || !this.videoElement || this.videoElement.readyState < 2) return;

    try {
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

      let faces = [];

      // 1. Try Native Browser Face Detector
      if (this.nativeFaceDetector) {
        try {
          faces = await this.nativeFaceDetector.detect(this.canvas);
        } catch {
          faces = [];
        }
      }

      // 2. Fallback: Computer Vision Luminance / Skin-Tone Centroid Tracker
      if (!this.nativeFaceDetector || faces.length === 0) {
        faces = this._fallbackDetectFace(this.ctx, this.canvas.width, this.canvas.height);
      }

      const faceCount = faces.length;
      const now = Date.now();

      // -------------------------------------------------------------
      // CASE A: 0 Faces Detected (Student Left Desk / Camera Obstructed)
      // -------------------------------------------------------------
      if (faceCount === 0) {
        if (!this.absentStartTime) this.absentStartTime = now;
        const absentDurationSec = (now - this.absentStartTime) / 1000;

        if (absentDurationSec >= this.absentThresholdSec && !this.hasLoggedAbsent) {
          this.hasLoggedAbsent = true;
          this.onViolation?.('student_absent', `Student absent from camera view for ${Math.round(absentDurationSec)}s`);
        }

        // Reset gaze tracking when absent
        this.currentGlance = null;
        this.headTurnStartTime = null;

        this.onStatusUpdate?.({
          isActive: true,
          hasPermissionError: false,
          faceCount: 0,
          isFocused: false,
          statusText: `⚠️ Face Not Visible (${Math.round(absentDurationSec)}s)`,
          gazeDirection: 'absent'
        });
        return;
      } else {
        this.absentStartTime = null;
        this.hasLoggedAbsent = false;
      }

      // -------------------------------------------------------------
      // CASE B: Multiple Faces Detected (Unauthorized Secondary Person)
      // -------------------------------------------------------------
      if (faceCount > 1) {
        this.onViolation?.('multiple_faces_detected', `Multiple persons (${faceCount} faces) detected in camera frame`);
        this.onStatusUpdate?.({
          isActive: true,
          hasPermissionError: false,
          faceCount,
          isFocused: false,
          statusText: `🚨 Multiple Faces Detected (${faceCount})`,
          gazeDirection: 'multiple'
        });
        return;
      }

      // -------------------------------------------------------------
      // CASE C: 1 Face Detected - Multi-Factor Head Pose & Glance Analysis
      // -------------------------------------------------------------
      const face = faces[0];
      const box = face.boundingBox || face;
      const rawCenterX = (box.x + box.width / 2) / this.canvas.width;
      const rawCenterY = (box.y + box.height / 2) / this.canvas.height;

      // Apply Exponential Moving Average (EMA) smoothing to prevent micro-jitter false flags
      if (!this.hasInitializedSmoothing) {
        this.smoothedX = rawCenterX;
        this.smoothedY = rawCenterY;
        this.hasInitializedSmoothing = true;
      } else {
        this.smoothedX = this.smoothedX * 0.65 + rawCenterX * 0.35;
        this.smoothedY = this.smoothedY * 0.65 + rawCenterY * 0.35;
      }

      // 1. Sudden Rapid Head Jerk / Movement Velocity Analysis
      if (this.lastCentroid) {
        const dt = Math.max(0.1, (now - this.lastCentroid.timestamp) / 1000);
        const dx = Math.abs(this.smoothedX - this.lastCentroid.x);
        const dy = Math.abs(this.smoothedY - this.lastCentroid.y);
        const velocity = Math.sqrt(dx * dx + dy * dy) / dt;

        // If sudden whip movement detected (>0.9 screen displacement / sec)
        if (velocity > 0.95 && (now - this.lastSuddenMoveTime > 12000)) {
          // Check if moving towards extreme off-screen boundary
          if (this.smoothedX < 0.20 || this.smoothedX > 0.80 || this.smoothedY > 0.85) {
            this.lastSuddenMoveTime = now;
            this.onViolation?.('sudden_movement_detected', 'Sudden drastic head whip / erratic movement detected towards off-screen area');
          }
        }
      }
      this.lastCentroid = { x: this.smoothedX, y: this.smoothedY, timestamp: now };

      // 2. Gaze / Head Pose Categorization
      // NATURAL SCREEN BOUNDS: 0.18 <= X <= 0.82 (Tolerates full screen reading, sidebars, looking at questions)
      const isNaturalReadingX = this.smoothedX >= 0.18 && this.smoothedX <= 0.82;
      const isNaturalReadingY = this.smoothedY >= 0.12 && this.smoothedY <= 0.88;

      let gazeDirection = 'center';
      let isOffScreen = false;

      if (!isNaturalReadingX || !isNaturalReadingY) {
        isOffScreen = true;
        if (this.smoothedX < 0.18) gazeDirection = 'left';
        else if (this.smoothedX > 0.82) gazeDirection = 'right';
        else if (this.smoothedY > 0.88) gazeDirection = 'down';
        else if (this.smoothedY < 0.12) gazeDirection = 'up';
      }

      // Clean up old glances from history older than 25 seconds
      const glanceWindowThreshold = now - (this.repeatedGlanceWindowSec * 1000);
      this.glanceHistory = this.glanceHistory.filter(g => g.timestamp > glanceWindowThreshold);

      // -------------------------------------------------------------
      // SUB-CASE 1: Natural Screen Reading (No Penalty, Keep State Green)
      // -------------------------------------------------------------
      if (!isOffScreen) {
        // If student returned from an off-screen glance, log glance to history if it had substance (>600ms)
        if (this.currentGlance) {
          const glanceDuration = now - this.currentGlance.startTime;
          if (glanceDuration >= 600) {
            this.glanceHistory.push({
              direction: this.currentGlance.direction,
              timestamp: this.currentGlance.startTime,
              durationMs: glanceDuration
            });
          }
          this.currentGlance = null;
        }

        // Reset sustained head turn timer
        this.headTurnStartTime = null;
        this.hasLoggedHeadTurn = false;

        this.onStatusUpdate?.({
          isActive: true,
          hasPermissionError: false,
          faceCount: 1,
          isFocused: true,
          statusText: '🟢 Focused on Exam',
          gazeDirection: 'center'
        });
        return;
      }

      // -------------------------------------------------------------
      // SUB-CASE 2: Off-Screen Head Turn or Deviation
      // -------------------------------------------------------------
      if (!this.currentGlance) {
        this.currentGlance = {
          direction: gazeDirection,
          startTime: now,
          reported: false
        };
      } else if (this.currentGlance.direction !== gazeDirection) {
        // Shifted to another off-screen direction
        this.currentGlance = {
          direction: gazeDirection,
          startTime: now,
          reported: false
        };
      }

      const currentGlanceDurationSec = (now - this.currentGlance.startTime) / 1000;

      // A) COMPLETE HEAD TURN CHECK:
      // If student turns head completely away (extreme edge <0.14 or >0.86) for >7 seconds
      const isExtremeHeadTurn = this.smoothedX < 0.14 || this.smoothedX > 0.86 || this.smoothedY > 0.90;
      if (isExtremeHeadTurn) {
        if (!this.headTurnStartTime) this.headTurnStartTime = now;
        const headTurnDurationSec = (now - this.headTurnStartTime) / 1000;

        if (headTurnDurationSec >= this.lookAwayThresholdSec && !this.hasLoggedHeadTurn) {
          this.hasLoggedHeadTurn = true;
          this.onViolation?.('severe_head_turn_detected', `Student turned head completely away from screen (${gazeDirection}) for ${Math.round(headTurnDurationSec)}s`);
        }
      } else {
        this.headTurnStartTime = null;
      }

      // B) REPEATED PERSISTENT GLANCES IN THE SAME DIRECTION CHECK:
      // If student repeatedly darts eyes/head in the same direction 3+ times in the last 25s
      const sameDirectionPastGlances = this.glanceHistory.filter(g => g.direction === gazeDirection);
      const totalGlancesInDirection = sameDirectionPastGlances.length + 1;

      if (
        totalGlancesInDirection >= this.repeatedGlanceThreshold &&
        currentGlanceDurationSec >= 1.2 &&
        !this.currentGlance.reported &&
        (now - this.lastReportedRepeatedGlanceTime > 15000)
      ) {
        this.currentGlance.reported = true;
        this.lastReportedRepeatedGlanceTime = now;
        this.onViolation?.(
          'repeated_offscreen_glance',
          `Repeated suspicious glances detected towards the ${gazeDirection} (${totalGlancesInDirection} times in ${this.repeatedGlanceWindowSec}s)`
        );
      }

      // UI Status Update: Gentle visual indicator without punishing occasional glances
      this.onStatusUpdate?.({
        isActive: true,
        hasPermissionError: false,
        faceCount: 1,
        isFocused: isExtremeHeadTurn ? false : true,
        statusText: isExtremeHeadTurn 
          ? `⚠️ Head Turned (${gazeDirection.toUpperCase()} ${Math.round(currentGlanceDurationSec)}s)`
          : `👀 Off-Center View (${gazeDirection})`,
        gazeDirection
      });

    } catch (err) {
      console.warn('Frame analysis error:', err);
    }
  }

  /**
   * Fast luminance & skin-tone centroid locator for universal browser compatibility
   */
  _fallbackDetectFace(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    let skinPixels = 0;
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Universal skin-tone range check in RGB space
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && (Math.max(r, g, b) - Math.min(r, g, b) > 15)) {
        const pixelIdx = i / 4;
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);
        sumX += x;
        sumY += y;
        skinPixels++;
      }
    }

    if (skinPixels > 120) {
      const avgX = sumX / skinPixels;
      const avgY = sumY / skinPixels;
      const estWidth = Math.min(width * 0.5, Math.max(30, Math.sqrt(skinPixels) * 3.2));

      return [{
        x: Math.max(0, avgX - estWidth / 2),
        y: Math.max(0, avgY - estWidth / 2),
        width: estWidth,
        height: estWidth * 1.2
      }];
    }

    return [];
  }
}
