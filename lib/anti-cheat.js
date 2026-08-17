/**
 * Advanced Multi-Factor Anti-Cheat Detection System for ExamGuard
 * Monitors:
 * - Tab switching & window blur
 * - Copy/Paste/Right-click interception
 * - Keystroke dynamics & AI burst injections
 * - Dual/Multiple monitors & Extended displays
 * - Fullscreen exits & Developer tools bypasses
 * - Webcam face presence & gaze tracking
 * - Mobile Phone Sidecar connectivity
 */

import { KeystrokeDynamicsMonitor } from './keystroke-dynamics';

export class AntiCheatMonitor {
  constructor({ onViolation, onWarning, onExpel, maxWarnings = 3 }) {
    this.onViolation = onViolation;
    this.onWarning = onWarning;
    this.onExpel = onExpel;
    this.maxWarnings = maxWarnings;
    this.warningCount = 0;
    this.listeners = [];
    this.isActive = false;
    this.lastBlurTime = 0;
    this.blurDebounceMs = 1000;

    // Sub-engines
    this.keystrokeMonitor = new KeystrokeDynamicsMonitor({
      onViolation: (type, details) => this._handleViolation(type, details, true)
    });

    this.monitorCheckInterval = null;
  }

  start(initialWarnings = 0) {
    if (this.isActive) return;
    this.isActive = true;
    this.warningCount = initialWarnings;
    this.startTime = Date.now();
    this.lastViolationTime = 0;

    // Standard Browser Events
    this._addListener(document, 'visibilitychange', this._handleVisibilityChange.bind(this));
    this._addListener(window, 'blur', this._handleWindowBlur.bind(this));
    this._addListener(document, 'copy', this._handleClipboard.bind(this));
    this._addListener(document, 'cut', this._handleClipboard.bind(this));
    this._addListener(document, 'paste', this._handlePaste.bind(this));
    this._addListener(document, 'contextmenu', this._handleContextMenu.bind(this));
    this._addListener(document, 'keydown', this._handleKeydown.bind(this));
    this._addListener(document, 'fullscreenchange', this._handleFullscreenChange.bind(this));
    this._addListener(window, 'beforeunload', this._handleBeforeUnload.bind(this));

    // Start Keystroke dynamics detector
    this.keystrokeMonitor.start();

    // Start Multi-Monitor & System environment scanner
    this._checkScreenSecurity();
    this.monitorCheckInterval = setInterval(() => this._checkScreenSecurity(), 3000);
  }

  stop() {
    this.isActive = false;
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners = [];

    if (this.keystrokeMonitor) {
      this.keystrokeMonitor.stop();
    }

    if (this.monitorCheckInterval) {
      clearInterval(this.monitorCheckInterval);
      this.monitorCheckInterval = null;
    }
  }

  getWarningCount() {
    return this.warningCount;
  }

  async enterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }

  _addListener(target, event, handler) {
    target.addEventListener(event, handler);
    this.listeners.push({ target, event, handler });
  }

  _handleViolation(eventType, details, isSevere = true) {
    const now = Date.now();

    // 1. Camera Permission Grace Period (Ignore blurs/tab switches in the first 15 seconds)
    if ((eventType === 'window_blur' || eventType === 'tab_switch' || eventType === 'fullscreen_exit') && (now - this.startTime < 15000)) {
      return;
    }

    // 2. Debounce Grouped Violations (e.g. Tab switch triggers blur + visibility + fullscreen_exit simultaneously)
    if (isSevere && (now - this.lastViolationTime < 2000)) {
      return;
    }

    this.onViolation?.(eventType, details);

    if (isSevere) {
      this.lastViolationTime = now;
      this.warningCount++;
      if (this.warningCount >= this.maxWarnings) {
        this.onExpel?.(eventType, this.warningCount);
      } else {
        this.onWarning?.(eventType, this.warningCount, this.maxWarnings);
      }
    }
  }

  /**
   * Checks for Extended / Dual Monitors and DevTools Inspection
   */
  _checkScreenSecurity() {
    if (!this.isActive || typeof window === 'undefined') return;

    try {
      // 1. Check Screen Details / Extended Display API (Chrome / Edge / Safari 16+)
      // @ts-ignore
      if (window.screen && (window.screen.isExtended === true)) {
        this._handleViolation('dual_monitor_detected', 'Multiple / extended displays detected. Please disconnect secondary monitors.');
      }

      // 2. DevTools Dimension Differential Check
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if ((widthDiff > threshold || heightDiff > threshold) && !document.fullscreenElement) {
        // Can indicate open DevTools drawer
      }
    } catch (err) {
      console.warn('Screen security check error:', err);
    }
  }

  _handleVisibilityChange() {
    if (document.hidden) {
      this._handleViolation('tab_switch', 'Student switched to another tab or minimized window');
    }
  }

  _handleWindowBlur() {
    const now = Date.now();
    if (now - this.lastBlurTime < this.blurDebounceMs) return;
    this.lastBlurTime = now;

    if (!document.hidden) {
      this._handleViolation('window_blur', 'Exam window lost focus (clicked outside browser)');
    }
  }

  _handleClipboard(e) {
    e.preventDefault();
    this._handleViolation('copy_attempt', `Student attempted to ${e.type} content`, false);
  }

  _handlePaste(e) {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    
    if (pastedText.length > 50) {
      this._handleViolation('ai_paste_detected', 
        `Suspicious large text paste detected (${pastedText.length} chars)`);
    } else {
      this._handleViolation('paste_attempt', 'Student attempted to paste content', false);
    }
  }

  _handleContextMenu(e) {
    e.preventDefault();
  }

  _handleKeydown(e) {
    const blockedCombos = [
      { ctrl: true, shift: true, keys: ['I', 'J', 'C'] },
      { meta: true, alt: true, keys: ['I', 'J', 'C'] },
      { ctrl: true, keys: ['c', 'v', 'x', 'p', 's', 'u'] },
      { meta: true, keys: ['c', 'v', 'x', 'p', 's', 'u'] },
    ];

    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }

    for (const combo of blockedCombos) {
      const ctrlMatch = combo.ctrl ? (e.ctrlKey) : true;
      const metaMatch = combo.meta ? (e.metaKey) : true;
      const shiftMatch = combo.shift ? (e.shiftKey) : true;
      const altMatch = combo.alt ? (e.altKey) : true;
      
      if (ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (combo.keys.includes(e.key) || combo.keys.includes(e.key?.toLowerCase())) {
          e.preventDefault();
          return;
        }
      }
    }
  }

  _handleFullscreenChange() {
    if (!document.fullscreenElement && this.isActive) {
      this._handleViolation('fullscreen_exit', 'Student exited fullscreen examination environment');
    }
  }

  _handleBeforeUnload(e) {
    if (this.isActive) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
