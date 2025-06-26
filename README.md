# Collaborative Text Editor

A real-time collaborative text editor built with Nuxt 3, NestJS, and custom diff algorithms. Multiple users can edit the same document simultaneously with real-time synchronization.

## Architecture

This monorepo contains four packages:

- **apps/app**: Nuxt 3 (Vue 3) frontend application
- **apps/backend**: NestJS backend with WebSocket support
- **packages/diff-lib**: Custom text diff library with Web Worker implementation
- **packages/ws-client**: TypeScript WebSocket client wrapper

## Features

- Real-time collaborative editing
- Custom diff algorithm for efficient synchronization
- Web Worker implementation with SharedArrayBuffer and Atomics
- WebSocket-based communication
- Document persistence to file system
- Docker support for development and production
- Comprehensive unit testing
- ESLint with Airbnb style guide
- Git hooks for code quality

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker and Docker Compose (optional)

## Quick Start

### Using pnpm (Recommended)

#### Dev Server

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start development servers:**

   ```bash
   pnpm dev
   ```

3. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

#### Prod Server

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build projects:**

   ```bash
   pnpm build
   ```

3. **Start development servers:**

   ```bash
   pnpm preview
   ```

4. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

### Using Docker

1. **Start with Docker Compose:**

   ```bash
   docker compose up -d --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

## Development

### Project Structure

```
collab-editor/
├── apps/
│   ├── app/                 # Nuxt 3 frontend
│   └── backend/            # NestJS backend
├── packages/
│   ├── diff-lib/           # Custom diff library
│   └── ws-client/          # WebSocket client wrapper
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

### Available Scripts

- `pnpm dev` - Start both frontend and backend in development mode
- `pnpm build` - Build all packages and applications
- `pnpm build:packages` - Build all packages
- `pnpm preview` - Start both frontend and backend in production mode
- `pnpm lint` - Fix Eslint/Prettier issues automatically
