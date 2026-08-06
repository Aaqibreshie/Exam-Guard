/**
 * Keystroke Dynamics & LLM Burst Detection Engine for ExamGuard
 * Analyzes typing cadence, speed, and sudden text insertions to detect
 * ChatGPT/LLM pastes, script injections, and clipboard bypasses.
 */

export class KeystrokeDynamicsMonitor {
  constructor({ onViolation }) {
    this.onViolation = onViolation;
    this.keyEvents = [];
    this.lastInputLengthMap = new Map();
    this.isActive = false;
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleInput = this._handleInput.bind(this);
  }

  start() {
    if (this.isActive || typeof window === 'undefined') return;
    this.isActive = true;

    document.addEventListener('keydown', this._handleKeyDown, true);
    document.addEventListener('input', this._handleInput, true);
  }

  stop() {
    this.isActive = false;
    if (typeof window !== 'undefined') {
      document.removeEventListener('keydown', this._handleKeyDown, true);
      document.removeEventListener('input', this._handleInput, true);
    }
    this.keyEvents = [];
    this.lastInputLengthMap.clear();
  }

  _handleKeyDown(e) {
    const now = performance.now();
    this.keyEvents.push({
      key: e.key,
      time: now
    });

    // Keep only last 30 keystrokes in sliding window
    if (this.keyEvents.length > 30) {
      this.keyEvents.shift();
    }
  }

  _handleInput(e) {
    const target = e.target;
    if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    const currentVal = target.value || '';
    const lastLength = this.lastInputLengthMap.get(target) || 0;
    const deltaLength = currentVal.length - lastLength;
    this.lastInputLengthMap.set(target, currentVal.length);

    // If more than 25 characters appeared in a single input tick
    if (deltaLength >= 25) {
      const now = performance.now();
      // Check how many actual keydowns occurred in the last 200ms
      const recentKeys = this.keyEvents.filter(k => now - k.time < 200);

      // If text increased by 25+ chars with fewer than 3 actual keystrokes -> Script or masked paste!
      if (recentKeys.length < 3) {
        this.onViolation?.(
          'llm_burst_detected',
          `Abnormal text injection detected: +${deltaLength} characters inserted in <200ms without manual typing cadence.`
        );
      }
    }
  }
}
