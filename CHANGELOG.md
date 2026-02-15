# Changelog

All notable changes to the Liar's Cafe project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Enhanced game mechanics (bluffing, card validation)
- Player authentication and profiles
- Leaderboard and statistics
- Mobile responsive design
- Testnet Conway deployment

---

## [Wave 1] - 2026-02-14

### Added

#### Backend (Linera Contract)
- **Smart Contract Implementation**
  - Table/room management system with CreateTable operation
  - Player state tracking and JoinTable operation
  - Microchain deployment for isolated games via StartGame operation
  - Multi-owner chain support with weighted ownership
  - GraphQL service layer for state queries

- **State Management**
  - `temp_rooms`: Pre-game room storage
  - `players_in_rooms`: Player roster per room
  - `public_rooms`: Public/private room visibility
  - `room_to_chain`: Room-to-microchain mapping
  - `active_game_chains`: Active game chain tracking

- **GraphQL API**
  - Query endpoints for all state variables
  - Mutation support for game operations
  - Real-time state querying

#### Frontend
- **3D Game Environment**
  - React Three Fiber integration
  - 3D game table with HDRI lighting
  - Character models with GLB format
  - NPC system with collision detection
  - Card dealing and attachment mechanics

- **UI Components**
  - Lobby creation and management
  - Player seating arrangement
  - Game controls interface
  - Next.js 15 with App Router

#### Infrastructure
- **Docker Setup**
  - Dockerfile following buildathon template
  - docker-compose.yaml with required port mappings (5173, 8080, 9001, 13001)
  - Automated deployment script (run.bash)
  - Health checks for application readiness

- **Documentation**
  - Comprehensive root README with project overview
  - Backend-specific README with contract details
  - Frontend README with setup instructions
  - Monorepo structure documentation

#### Development Tools
- Rust toolchain configuration (1.82.0)
- Cargo workspace setup
- Bun package manager for frontend
- Unified .gitignore for all project types

### Technical Details
- **Linera SDK**: 0.15.8
- **Contract Binary Targets**: liars_bar_contract, liars_bar_service
- **GraphQL**: async-graphql 7.0.17
- **Frontend**: Next.js 15, React 19, React Three Fiber
- **Build Optimization**: LTO enabled, size-optimized release builds

### Microchain Features
- Multi-owner chains (one per game)
- Equal ownership weight per player
- Multi-leader consensus rounds
- Cross-chain message passing
- Isolated game state per microchain

---

## Template for Future Waves

### Wave [N] - YYYY-MM-DD

#### Added
- New features and functionality

#### Changed
- Modifications to existing features
- Performance improvements
- Refactoring

#### Fixed
- Bug fixes
- Security patches
- Compatibility issues

#### Removed
- Deprecated features
- Unused dependencies
- Obsolete code

#### Security
- Security-related changes

---

## Notes

### Submission Compliance
This project follows the [Linera Buildathon Template](https://github.com/linera-io/buildathon-template) requirements:
- ✅ Functional Linera contract
- ✅ Docker-based deployment
- ✅ GraphQL API
- ✅ Web frontend
- ✅ Comprehensive documentation

### GitHub Repository
https://github.com/Who-s-The-Liar/monorepo
