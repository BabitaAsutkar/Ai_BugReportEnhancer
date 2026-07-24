🐛 AI Bug Report Enhancer
A powerful, AI-driven QA tool designed to streamline bug reporting. Simply upload a screenshot of a software defect, and the application will use advanced AI Vision models to analyze the image, generate a professional-grade bug report, and push it directly to JIRA with a single click!

✨ Features
Stateless Architecture: Zero server-side credential storage. "Bring Your Own Key" (BYOK) architecture keeps the application secure and lightweight.
AI Vision Analysis: Powered by Groq's blazing-fast Llama-3/Qwen vision models to automatically detect UI defects, missing elements, and server errors from screenshots.
Enterprise-Grade Bug Reports: Automatically structures reports with Bug Titles, Environment, Pre-conditions, Test Data, Steps to Reproduce, and Priority rankings based on Senior QA standards.
Direct JIRA Integration: One-click push to your Atlassian Jira workspace.

🚀 Getting Started
Prerequisites
Node.js (v18 or higher)
A Groq API Key (for AI Vision)
An Atlassian JIRA API Token
Installation
Clone the repository

git clone https://github.com/yourusername/BugReportEnhancer.git
cd BugReportEnhancer
Install Frontend Dependencies

cd client
npm install
Install Backend Dependencies

cd ../server
npm install
Running the Application (Development)
Start the Backend Server

cd server
npm run dev
The server will start on http://localhost:3001

Start the Frontend Application

cd client
npm run dev
The frontend will start on http://localhost:5173

⚙️ Configuration
     The application does not require any backend configuration files. Simply open the web application in your browser and click the Settings ⚙️ icon in the top right corner to enter your JIRA and Groq API credentials. Your credentials will be securely saved locally in your browser.

🛠️ Tech Stack
    Frontend: HTML5, Vanilla CSS, TypeScript, Vite
    Backend: Node.js, Express, TypeScript
    Integrations: Groq SDK, Atlassian Jira v3 REST API
