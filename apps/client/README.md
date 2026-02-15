# 🎮 Liar's Cafe - Frontend Client

Interactive 3D web frontend for the Liar's Cafe game, built with Next.js and React Three Fiber.

> **Note:** This is the frontend component. See the [main README](../../README.md) for complete project documentation.

## 🎨 Features

- **3D Game Environment** - Immersive game experience with React Three Fiber
- **Real-time Updates** - GraphQL subscriptions for live game state
- **Responsive UI** - Works on desktop and tablet devices
- **Linera Integration** - Direct blockchain interaction via Linera Web Client

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **3D Rendering**: React Three Fiber + Three.js
- **Styling**: Tailwind CSS
- **Blockchain**: Linera Web Client SDK
- **Language**: TypeScript
- **Package Manager**: Bun

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Running Linera backend (see [backend README](../../linera-backend/README.md))

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Create optimized production build
bun run build

# Start production server
bun start
```

## 📂 Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Home page
│   └── layout.tsx    # Root layout
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   └── game/        # Game-specific components
├── lib/             # Utilities and helpers
│   └── linera/      # Linera client integration
└── styles/          # Global styles
```

## 🎮 Game Components

### Core Components

- **GameCanvas** - 3D rendering canvas with Three.js scene
- **PlayerAvatar** - 3D character models and animations
- **GameTable** - Interactive game table with card positions
- **LobbyManager** - Room creation and player management
- **GameControls** - Player actions and game controls

### Linera Integration

The frontend connects to the Linera backend via:
- GraphQL queries for game state
- Mutations for player actions
- Chain ID and Application ID configuration

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_LINERA_RPC_URL=http://localhost:8080
NEXT_PUBLIC_CHAIN_ID=your-chain-id
NEXT_PUBLIC_APP_ID=your-application-id
```

### Linera Client Setup

```typescript
import { LineraClient } from '@linera/sdk'

const client = new LineraClient({
  rpcUrl: process.env.NEXT_PUBLIC_LINERA_RPC_URL,
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
})
```

## 🎨 Styling

This project uses:
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable component library
- **CSS Modules** - Component-scoped styles

To customize the theme, edit `tailwind.config.ts`.

## 📱 Responsive Design

The application is optimized for:
- Desktop (1920x1080 and above)
- Laptop (1366x768 and above)
- Tablet (iPad and similar)

Mobile support is planned for future releases.

## 🧪 Development

### Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run type-check
```

## 🚀 Deployment

The frontend can be deployed to:
- Vercel (recommended)
- Netlify
- Docker container
- Static hosting

For Docker deployment, use the backend's compose.yaml which includes the frontend.

## 📝 Learn More

**Next.js Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

**Linera Resources:**
- [Linera SDK Documentation](https://linera.dev)
- [Web Client Guide](https://linera.dev/web_client.html)

---

For complete project documentation, see the [main README](../../README.md).
