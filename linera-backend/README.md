# 🎲 Liars Bar - Linera Blockchain Game

A decentralized multiplayer game built on the Linera blockchain platform for the Linera Buildathon.

## 🎮 About the Game

Liars Bar is a multiplayer bluffing game where players create tables, join games, and compete on isolated microchains. Each game runs on its own dedicated blockchain, ensuring fair play and transparent game state.

## ✨ Features

- **Table Management**: Create public or private game tables
- **Multi-Player Support**: Join tables and play with other players
- **Microchain Architecture**: Each game runs on its own dedicated chain
- **GraphQL API**: Query game state and execute operations
- **Web Frontend**: React-based UI for easy interaction

## 🏗️ Architecture

The application consists of:

- **Contract** (`src/contract.rs`): Core game logic, table management, and microchain creation
- **Service** (`src/service.rs`): GraphQL query interface
- **State** (`src/state.rs`): Data structures for rooms, players, and game chains
- **Frontend** (`web-frontend/`): React + TypeScript UI

## 🚀 Running with Docker Compose

This project follows the Linera Buildathon template structure for easy submission and review.

### Prerequisites

- Docker
- Docker Compose

### Quick Start

1. **Build and run the application:**

```bash
docker compose up --force-recreate
```

2. **Access the application:**

- **Frontend**: http://localhost:5173
- **GraphQL Endpoint**: http://localhost:8080/chains/{CHAIN_ID}/applications/{APP_ID}
- **Faucet**: http://localhost:8080

The healthcheck waits for the frontend to be ready on port 5173.

### Exposed Ports

- `5173`: Frontend (Vite dev server)
- `8080`: Linera faucet and node service
- `9001`: Localnet validator proxy
- `13001`: Localnet validator

## 🎯 How to Play

### Via Frontend (Recommended)

1. Open http://localhost:5173
2. Enter Chain ID and Application ID when prompted (these are shown in the Docker logs)
3. Click "Create Public Table" or "Create Private Table"
4. Wait for other players to join
5. Click "Start Game" when ready (requires at least 2 players)

### Via GraphQL

**Query available tables:**

```graphql
query {
  tempRooms
  playersInRooms
  publicRooms
  roomToChain
  activeGameChains
}
```

**Create a table:**

```graphql
mutation {
  createTable(ispublic: true)
}
```

**Join a table:**

```graphql
mutation {
  joinTable(roomId: 0)
}
```

**Start a game:**

```graphql
mutation {
  startGame(roomId: 0)
}
```

## 🛠️ Development

### Local Development (without Docker)

**Prerequisites:**
- Rust 1.82.0
- Linera CLI 0.15.8
- Node.js 18+

**Build the contract:**

```bash
cargo build --release --target wasm32-unknown-unknown
```

**Start local network:**

```bash
linera net up --testing-prng-seed 37
```

**Publish the application:**

```bash
linera project publish-and-create
```

**Run the frontend:**

```bash
cd web-frontend
npm install
npm run dev
```

## 📋 Operations

The application supports the following operations:

- `CreateTable { ispublic: bool }` - Create a new game table
- `JoinTable { room_id: u64 }` - Join an existing table
- `StartGame { room_id: u64 }` - Start the game (creates a dedicated microchain)

## 🔗 State Queries

Available GraphQL queries:

- `tempRooms` - List of temporary rooms (pre-game)
- `playersInRooms` - Map of room IDs to player lists
- `publicRooms` - Map of room IDs to public/private status
- `roomToChain` - Map of room IDs to game chain IDs
- `activeGameChains` - List of active game chain IDs

## 🏆 Buildathon Submission

This project is structured according to the [Linera Buildathon Template](https://github.com/linera-io/buildathon-template):

- ✅ Dockerfile with all dependencies
- ✅ compose.yaml with required port mappings
- ✅ run.bash for automated setup and execution
- ✅ Healthcheck for application readiness
- ✅ Frontend on port 5173
- ✅ Backend services on required ports

## 📝 Technical Details

**SDK Version**: Linera 0.15.8

**Key Technologies:**
- Rust for smart contracts
- GraphQL for API
- React + TypeScript for frontend
- Docker for containerization

**Microchain Features:**
- Multi-owner chains (one per game)
- Weighted ownership (equal weight per player)
- Multi-leader consensus rounds
- Message passing between chains

## 🤝 Contributing

This is a buildathon submission project. For questions or improvements, please open an issue.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built for the Linera Buildathon using the Linera SDK.

---

**Built with ❤️ on Linera**
