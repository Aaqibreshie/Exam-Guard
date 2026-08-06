# 🛡️ ExamGuard | AI-Proofed Online Examination & Proctoring Platform

ExamGuard is a full-stack, enterprise-grade online examination and automated proctoring platform built with **Next.js 16 (App Router)** and **Supabase**. It provides teachers with rich exam creation, automated scoring, and real-time multi-sensor integrity audit logs, while empowering students with a secure testing environment, in-browser live code execution, and an AI-driven practice arena.

---

## ✨ Core Features

### 1. 👁️ Intelligent Multi-Sensor Anti-Cheat System
- **Calibrated AI Face & Gaze Tracking**:
  - In-browser computer vision with native `FaceDetector` API and fallback luminance/skin-tone centroid tracking.
  - **Zero false positives for natural reading**: Permits reading across the screen and checking palettes/timers.
  - Detects **complete head turns (>7s sustained)**, **sudden erratic head movements**, **repeated directional glances (3+ in 25s)**, **student absence (>5s)**, and **multiple persons (2+ faces)**.
- **📱 Dual-Angle Mobile Camera Sidecar**:
  - QR-code paired secondary smartphone camera stream for 360-degree desk and keyboard monitoring with zero app install required.
  - Heartbeat-monitored connection with instant flags if disconnected.
- **⚡ Keystroke Dynamics & AI Injections**:
  - Intercepts instant clipboard paste dumps, LLM burst keystroke patterns, and external extensions.
- **🖥️ Display & Environment Lockdown**:
  - Fullscreen enforcement, tab-switch interception, blur detection, and multi-monitor / extended display detection.

### 2. 👨‍🏫 Teacher Dashboard
- **Exam Management**:
  - Create and manage exams with customizable durations, scheduled start/end windows, access control (All, Batch-specific, or Selected Candidates), and warning thresholds.
  - **Bulk Question Parser**: Import MCQs, Short Answer, and Live Coding problems instantly from raw text or Markdown.
- **Detailed Integrity Audit Trail**:
  - Chronological timeline of all security events with timestamps and severity ratings.
  - Automated integrity score calculation (0–100%).
  - Grade and submission analytics with export-ready breakdown.

### 3. 👨‍🎓 Student Examination Portal
- **Interactive Exam Player**:
  - Real-time countdown timer with auto-submission on expiration.
  - **In-Browser Code Runner**: Write and run JavaScript code live against automated unit test suites with console logging and execution benchmarks.
- **Comprehensive Post-Exam Review**:
  - Detailed breakdown of all answers, earned points, reference model solutions, test suite outcomes, and concept explanations.

### 4. 🧠 Automated AI Mock Test Arena
- **Powered by Google Gemini 2.5 Flash & Synthetic Curriculums**:
  - Students can generate custom mock exams on **JavaScript Algorithms, MERN Stack, Git & GitHub, DSA**, or **any custom topic**.
  - Choose between Beginner, Intermediate, and Advanced difficulties.
  - Live code testing, smart AI practice hints, and automated AI diagnostic reports highlighting strengths, growth areas, and recommendations.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime)
- **AI Synthesis**: Google Gemini 2.5 Flash API
- **Execution Sandbox**: In-browser sandboxed JavaScript code evaluation engine
- **Styling**: Vanilla CSS Design System with responsive layouts and light/dark surface palettes

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Aaqibreshie/Exam-Guard.git
cd Exam-Guard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Google Gemini API (for dynamic mock test synthesis)
GEMINI_API_KEY=your_gemini_api_key

# Optional: SMTP Email Service (for custom OTP email delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
SMTP_FROM="ExamGuard Support" <no-reply@examguard.io>
```

### 4. Database Setup
Run the SQL migration script located in `supabase-schema.sql` in your Supabase SQL Editor.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License
MIT License. Built for modern, secure, and fair remote examinations.
