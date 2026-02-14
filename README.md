# 🎲 Liars Bar - Linera Blockchain Game

A decentralized multiplayer bluffing game built on the Linera blockchain platform for the Linera Buildathon.

[![GitHub](https://img.shields.io/badge/GitHub-Who's--The--Liar-blue?logo=github)](https://github.com/Who-s-The-Liar/monorepo)

## 🎮 About the Game

Liars Bar is a multiplayer bluffing game where players create tables, join games, and compete on isolated microchains. Each game runs on its own dedicated blockchain, ensuring fair play and transparent game state.

## ✨ Features

- **Table Management**: Create public or private game tables
- **Multi-Player Support**: Join tables and play with other players
- **Microchain Architecture**: Each game runs on its own dedicated chain
- **GraphQL API**: Query game state and execute operations
- **3D Web Frontend**: Interactive 3D game experience with React Three Fiber

## 📁 Project Structure

```
monorepo/
├── linera-backend/       # Linera smart contract (Rust)
│   ├── src/
│   │   ├── contract.rs   # Core game logic
│   │   ├── service.rs    # GraphQL API
│   │   └── state.rs      # Game state management
│   ├── Dockerfile
│   ├── compose.yaml
│   └── run.bash
├── apps/
│   └── client/           # Frontend application (Next.js + React Three Fiber)
└── .gitignore
```

## 🚀 Quick Start

### Using Docker (Recommended)

The easiest way to run the entire application:

```bash
cd linera-backend
docker compose up --force-recreate
```

Access the application:
- **Frontend**: http://localhost:5173
- **GraphQL API**: http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}
- **Faucet**: http://localhost:8080

### Manual Setup

**Prerequisites:**
- Rust 1.82.0
- Linera CLI 0.15.8
- Node.js 18+
- Bun (for frontend)

**1. Build and deploy the contract:**

```bash
cd linera-backend
cargo build --release --target wasm32-unknown-unknown
linera net up --testing-prng-seed 37
linera project publish-and-create
```

**2. Run the frontend:**

```bash
cd apps/client
bun install
bun run dev
```

## 🎯 How to Play

1. Open the frontend at http://localhost:5173
2. Enter Chain ID and Application ID (shown in Docker logs)
3. Create or join a public/private table
4. Wait for players to join (minimum 2 players)
5. Start the game and begin playing!

## 🏗️ Architecture

### Backend (Linera Contract)

- **Contract** - Handles table creation, player management, and game logic
- **Service** - GraphQL interface for querying game state
- **Microchains** - Each game runs on its own isolated blockchain with multi-owner consensus

### Frontend (3D Web App)

- **Next.js** - React framework with App Router
- **React Three Fiber** - 3D rendering with Three.js
- **Linera Web Client** - Integration with Linera blockchain

## 📋 Available Operations

GraphQL mutations:
- `createTable(ispublic: Boolean!)` - Create a new game table
- `joinTable(roomId: Int!)` - Join an existing table
- `startGame(roomId: Int!)` - Start the game (creates microchain)

GraphQL queries:
- `tempRooms` - List of pre-game rooms
- `playersInRooms` - Players in each room
- `publicRooms` - Public/private room status
- `roomToChain` - Room to microchain mapping
- `activeGameChains` - Active game chains

## 🛠️ Technical Stack

**Backend:**
- Linera SDK 0.15.8
- Rust
- GraphQL (async-graphql)

**Frontend:**
- Next.js 15
- React 19
- React Three Fiber
- TypeScript
- Tailwind CSS

**Infrastructure:**
- Docker & Docker Compose
- Linera Local Network

## 🏆 Buildathon Submission

This project follows the [Linera Buildathon Template](https://github.com/linera-io/buildathon-template) requirements:

- ✅ Dockerized application with compose.yaml
- ✅ Automated setup with run.bash
- ✅ Functional Linera contract
- ✅ Web frontend on port 5173
- ✅ GraphQL API integration
- ✅ Microchain implementation

## 📝 Key Linera Features Used

- **Microchains**: Each game runs on a dedicated chain
- **Multi-Owner Chains**: Equal ownership weight per player
- **Message Passing**: Cross-chain communication
- **GraphQL Service**: Query interface for blockchain state
- **Chain Ownership**: Dynamic chain creation and management

## 🤝 Team

**Team Name:** Who's The Liar

<!-- TODO: Add team member details -->
- Team Member 1: [Name] - Discord: [@username] - Wallet: [address]
- Team Member 2: [Name] - Discord: [@username] - Wallet: [address]

## 📊 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed progress across buildathon waves.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

Built for the Linera Buildathon using the Linera SDK and buildathon template.

---

**Built with ❤️ on Linera**

## 📚 Additional Documentation

- [Backend Documentation](./linera-backend/README.md) - Detailed Linera contract documentation
- [Frontend Documentation](./apps/client/README.md) - Frontend setup and development guide
