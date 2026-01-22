# PRXY Electron Client

A desktop application for connecting to the be-prxyauth Playwright WebSocket server and controlling browsers locally.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- be-prxyauth server running with Playwright WebSocket support

## Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (one-time setup)
npx playwright install chromium
```

## Development

```bash
# Start both Vite dev server and Electron
pnpm electron:dev
```

## Building for Production

```bash
# Build for Windows
pnpm electron:build
```

The built executable will be in the `release` directory.

## Usage

1. **Start be-prxyauth server** with WebSocket server enabled
2. **Launch the Electron app**
3. **Enter your server URL** (e.g., `http://localhost:8000`)
4. **Enter your JWT auth token** from be-prxyauth
5. **Click Connect** to load your sessions
6. **Click on a session** to create a browser server and connect
7. **Use the browser controls** to navigate, take screenshots, etc.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Electron App                            │
│  ┌────────────────┐       ┌────────────────────────┐    │
│  │  React UI      │◄─────►│  Electron Main Process │    │
│  │  (Renderer)    │  IPC  │  (Node.js + Playwright)│    │
│  └────────────────┘       └───────────┬────────────┘    │
│                                       │                  │
└───────────────────────────────────────┼──────────────────┘
                                        │ playwright.connect()
                                        ▼
┌─────────────────────────────────────────────────────────┐
│                    be-prxyauth Server                         │
│  ┌────────────────────────────────────────────────┐     │
│  │  Playwright WebSocket Server                    │     │
│  │  (chromium.launchServer)                        │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Security

- All browser servers require session ownership authentication
- WebSocket endpoints are protected with unique access tokens
- Sessions are isolated by tenant ID
