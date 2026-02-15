# 🎲 Liar's Cafe - Backend (Linera Contract)

Smart contract implementation for the Liar's Cafe game on Linera blockchain.

> **Note:** This is the backend component. See the [main README](../README.md) for complete project documentation.

## 🏗️ Contract Overview

This Linera smart contract implements the backend logic for Liar's Cafe, a multiplayer bluffing game. It handles:

- **Table/Room Management**: Create and manage game lobbies
- **Player State**: Track players and their game participation
- **Microchain Orchestration**: Deploy dedicated chains for each game
- **GraphQL Service**: Expose game state through a queryable API

## 📂 File Structure

```
linera-backend/
├── src/
│   ├── contract.rs    # Core contract logic (operations, microchain creation)
│   ├── service.rs     # GraphQL service implementation
│   └── state.rs       # State data structures
├── tests/             # Contract tests
├── Cargo.toml         # Rust dependencies
├── Dockerfile         # Container image
├── compose.yaml       # Docker Compose configuration
└── run.bash          # Automated deployment script
```

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

**Test the contract:**

```bash
cargo test
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

## 🔧 Contract Details

### State Management

The contract maintains:
- `temp_rooms`: Rooms awaiting game start
- `players_in_rooms`: Player roster per room
- `public_rooms`: Public vs private room mapping
- `room_to_chain`: Mapping of rooms to their game microchains
- `active_game_chains`: List of all active game chains

### Operations

1. **CreateTable { ispublic: bool }**
   - Creates a new room
   - Adds creator as first player
   - Marks room as public/private

2. **JoinTable { room_id: u64 }**
   - Adds player to existing room
   - Validates room exists and isn't full

3. **StartGame { room_id: u64 }**
   - Creates dedicated microchain for the game
   - Transfers room ownership to all players
   - Sets up multi-owner consensus

### GraphQL Service

Exposes read-only queries:
- `tempRooms` - Pre-game lobbies
- `playersInRooms` - Player lists
- `publicRooms` - Room visibility
- `roomToChain` - Room-to-chain mapping
- `activeGameChains` - Active game chains

## 🏆 Buildathon Template

This backend follows the [Linera Buildathon Template](https://github.com/linera-io/buildathon-template):

- ✅ Dockerfile with Rust and Linera dependencies
- ✅ compose.yaml with required port mappings (5173, 8080, 9001, 13001)
- ✅ run.bash for automated local network setup and deployment
- ✅ Healthcheck waiting for frontend readiness

## 🧪 Testing

Run contract tests:

```bash
cargo test
```

Run with coverage:

```bash
cargo tarpaulin --out Html
```

## 📝 Dependencies

**Linera SDK**: 0.15.8
- `linera-sdk` - Core blockchain functionality
- `async-graphql` - GraphQL service layer
- `serde` - Serialization

See [Cargo.toml](./Cargo.toml) for complete dependency list.

---

For complete project documentation, see the [main README](../README.md).
