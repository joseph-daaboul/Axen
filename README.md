# AXEN – AI Mental Wellbeing Platform for Athletes

## Overview

AXEN is a full-stack web application designed to support athletes’ mental wellbeing through structured exercises, routine tracking, and AI-assisted guidance. The system provides users with tools to manage their mental state, build habits, and receive real-time support via an integrated chatbot.

---

## Technologies Used

* **Frontend:** React (JavaScript), Tailwind CSS
* **Backend / Database:** Firebase (Authentication & Firestore)
* **AI Integration:** Google Gemini API
* **Routing:** React Router
* **Data Visualisation:** Recharts

---

## Project Structure

The project follows a modular architecture:

* `src/components/` – Reusable UI components (Navbar, ProtectedRoute, etc.)
* `src/pages/` – Main application pages (Dashboard, Exercises, Routine, Chatbot, etc.)
* `src/services/` – Service layer for handling external APIs and logic
* `src/firebase/` – Firebase configuration and setup
* `src/data/` – Static data (e.g., exercises)
* `api/` – Backend API endpoint for chatbot communication

---

## Installation Instructions

1. Clone or extract the project folder
2. Open a terminal in the project directory
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the application in your browser at:

```id="p0a5qk"
http://localhost:5173
```

---

## Environment Configuration

This project requires external services to run correctly.

Markers must configure the following:

* **Firebase Configuration**

  * Create a Firebase project
  * Enable Authentication (Email/Password)
  * Enable Firestore Database
  * Replace the configuration inside `src/firebase/firebase.js`

* **Gemini API Key**

  * Obtain an API key from Google AI Studio
  * Store the key in an environment variable or configuration file
  * Ensure the chatbot service can access this key

---

## How to Use / Test the System

1. Register a new user account
2. Log in using your credentials
3. Navigate through the dashboard
4. Use the chatbot for AI-based guidance
5. Complete exercises and track progress
6. Create and manage routines
7. View summary statistics and activity data

---

## Hosted Version

A deployed version of the application is available at:

https://axen-jk13.vercel.app/

---

## Notes

* The application is designed for demonstration and educational purposes
* Sensitive data such as API keys and credentials are not included in this submission
* Some features may require proper configuration of Firebase and external APIs

---

## Author

Developed as part of a Final Year Project.
