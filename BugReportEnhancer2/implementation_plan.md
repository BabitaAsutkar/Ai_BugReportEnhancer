# Implementation Plan: AI Bug Report Enhancer with JIRA Integration

The **Bug Report Enhancer** is a full-stack web application designed to accelerate QA workflows by automatically analyzing screenshot defects using Vision AI (Groq Qwen Vision & Llama models), structuring comprehensive bug reports, and seamlessly creating JIRA tickets with the screenshot attached.

---

## 1. System Architecture

```text
BugReportEnhancer/
├── client/                     # Vite + TypeScript Frontend
│   ├── index.html              # Main HTML markup
│   ├── src/
│   │   ├── main.ts             # Entry point & Tab navigation
│   │   ├── api.ts              # Backend API Client (Fetch wrappers)
│   │   ├── pages/
│   │   │   ├── bugReport.ts    # Screenshot upload, AI analysis & JIRA push logic
│   │   │   └── settings.ts     # JIRA & Groq API configuration page
│   │   └── styles/             # UI CSS design system
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                     # Express.js + TypeScript Backend
│   ├── config.json             # App Configuration (JIRA & Groq API keys)
│   ├── src/
│   │   ├── index.ts            # Server entry point & CORS configuration
│   │   ├── routes/
│   │   │   ├── analyze.ts      # Multipart screenshot analysis endpoint
│   │   │   ├── jira.ts         # JIRA ticket creation & attachment endpoint
│   │   │   └── settings.ts     # Get/Save settings & Connection test endpoints
│   │   ├── services/
│   │   │   ├── groqService.ts  # Groq Qwen Vision & Llama SDK integrations
│   │   │   └── jiraService.ts  # JIRA REST API v3 & ADF converter
│   │   └── utils/
│   │       └── config.js       # Config reader & masked payload persistence
│   └── tsconfig.json
└── package.json                # Root package scripts (concurrent dev/build)
```

---

## 2. Key Features

1. **Screenshot Analysis via Groq Vision AI**:
   - Accepts image uploads (PNG, JPG, WEBP) up to 4MB.
   - Uses `qwen/qwen3.6-27b` on Groq to extract Title, Environment, Steps to Reproduce, Expected vs. Actual behavior, and Severity.

2. **Seamless JIRA Integration**:
   - Converts Markdown AI output into Atlassian Document Format (ADF) for JIRA REST API v3.
   - Automatically creates the issue in the target project and attaches the uploaded screenshot image.

3. **Configurable Settings & Testing**:
   - Securely manage JIRA site URL, Project Key, Email, API Token, and Groq API Key.
   - Test connection buttons validate credentials without saving unverified inputs.

---

## 3. Running & Verification Commands

- **Build all packages**: `npm run build`
- **Run dev environment**: `npm run dev` (starts backend on port 3001 and Vite client on 5173)
