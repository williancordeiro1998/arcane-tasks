# 🔮 ArcaneTasks

![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

**ArcaneTasks** is a production-ready collaborative task management platform designed to demonstrate robust, scalable, and secure software architecture. It implements advanced patterns like Optimistic Concurrency, Row-Level Security (RLS), and Real-time Synchronization.

---

### 🚀 Live Demo

| Service | Status | Link |
| :--- | :--- | :--- |
| **Frontend** | Hosted on Vercel | [arcane-tasks.vercel.app](https://arcane-tasks.vercel.app/) |
| **Backend API** | Hosted on Render | [arcane-backend-ik3s.onrender.com](https://arcane-backend-ik3s.onrender.com) |

---

## 📋 Table of Contents

- [Overview](#%EF%B8%8F%E2%80%8D%🗨%EF%B8%8F-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#%EF%B8%8F-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)

---

## 👁️‍🗨️ Overview

ArcaneTasks was engineered to solve complex workflow challenges found in distributed systems. Unlike a simple CRUD application, it focuses on data integrity in multi-user environments and strict security boundaries using database-native policies.

The interface features an immersive **"Neon/Dark Mode"** design system, ensuring a seamless User Experience (UX) with native internationalization (i18n) support.

---

## ✨ Key Features

### 🛡️ Data Integrity & Security
* **Optimistic Concurrency Control:** Implements the `If-Match` header and ETag versioning strategy. If two users try to edit the same task simultaneously, the system prevents the overwrite and alerts the user of the conflict (HTTP 409).
* **Row-Level Security (RLS):** Security logic is enforced directly at the database level. The application injects a tenant context (`workspace_id`) into the transaction, ensuring users can strictly access only their organization's data.

### ⚡ Performance & UX
* **Real-Time Synchronization:** The frontend utilizes smart polling to keep the task list updated across multiple clients without manual refreshing.
* **Optimistic UI Updates:** The interface updates immediately upon user interaction while the background request processes, providing a snappy experience.
* **Internationalization (i18n):** Full support for English (EN) and Portuguese (PT) with instant state-preserved switching.

### 📊 Observability
* **Metrics Dashboard:** A simulated monitoring view showcasing API P95 latency, error rates, and worker queue backlogs using SVG visualizations.

---

## 💻 Tech Stack

### Frontend
* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS
* **State Management:** React Hooks (`useState`, `useReducer`, `useContext`)
* **HTTP Client:** Axios
* **Design:** Custom "Arcane Neon" Design System

### Backend
* **Runtime:** Node.js (v20+)
* **Framework:** Fastify (Chosen for low overhead and high performance)
* **Language:** TypeScript
* **Security:** `@fastify/cors` configured for production environments

### Infrastructure & DevOps
* **Database:** PostgreSQL 18 (Hosted on Render)
* **CI/CD:** GitHub Actions (Automated pipelines for Linting, Building, and Testing)
* **Hosting:** Vercel (Frontend) & Render (Backend)

---

## 🏗️ Architecture

The project follows a distributed architecture pattern, decoupling the presentation layer from the business logic and data persistence.

1.  **Client Layer:** Next.js application served via CDN.
2.  **API Gateway:** Fastify server handling REST requests, validation, and session context injection.
3.  **Data Layer:** PostgreSQL database utilizing RLS policies for multi-tenancy isolation.

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites
* Node.js v20+
* PostgreSQL (Local instance or connection string)

### 1. Clone the Repository

```bash
git clone [https://github.com/williancordeiro1998/arcane-tasks.git](https://github.com/williancordeiro1998/arcane-tasks.git)
cd arcane-tasks
2. Backend Setup
Bash

cd backend
npm install

# Run the server (defaults to port 3000)
# Ensure your local Postgres is running or set DATABASE_URL in .env
npx ts-node src/api_core.ts
3. Frontend Setup
Open a new terminal in the project root:

Bash

cd frontend
npm install

# Run Next.js on port 3001 to avoid conflicts
npm run dev -- -p 3001
Access the application at http://localhost:3001.

🔌 API Documentation
The backend exposes a RESTful API. Below are the core endpoints:

Method	Endpoint	Description
GET	/api/v1/tasks	Retrieves all tasks for the current workspace.
POST	/api/v1/tasks	Creates a new task.
PUT	/api/v1/tasks/:id	Updates a task. Requires If-Match header with the current version.
GET	/health/ready	Health check endpoint for uptime monitoring.