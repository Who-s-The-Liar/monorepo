#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{
        Amount, ApplicationPermissions, ChainOwnership, TimeoutConfig, WithContractAbi,
    },
    views::{RootView, View},
    Contract, ContractRuntime,
};

use liars_bar::{Message, Operation};

use self::state::LiarsBarState;

pub struct LiarsBarContract {
    state: LiarsBarState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(LiarsBarContract);

impl WithContractAbi for LiarsBarContract {
    type Abi = liars_bar::LiarsBarAbi;
}

impl Contract for LiarsBarContract {
    type Message = Message;
    type Parameters = ();
    type EventValue = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = LiarsBarState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        LiarsBarContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {}

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match operation {
            Operation::CreateTable { ispublic } => {
                let player = self.runtime.authenticated_signer().unwrap();

                // Generate a new temporary room ID
                let room_id = *self.state.next_room_id.get();

                // Increment the room ID counter
                self.state.next_room_id.set(room_id + 1);

                // Add room to temp_rooms
                self.state.temp_rooms.push(room_id);

                // Add creator to players list
                let players = vec![player];
                self.state
                    .players_in_rooms
                    .insert(&room_id, players)
                    .expect("Failed to insert players");

                // Set public/private status
                self.state
                    .public_rooms
                    .insert(&room_id, ispublic)
                    .expect("Failed to insert public room");
            }
            Operation::JoinTable { room_id } => {
                let player = self.runtime.authenticated_signer().unwrap();

                // Get existing players
                let mut players = self
                    .state
                    .players_in_rooms
                    .get(&room_id)
                    .await
                    .expect("Failed to get players")
                    .expect("Room does not exist");

                // Check if player is already in the room
                if !players.contains(&player) {
                    players.push(player);

                    self.state
                        .players_in_rooms
                        .insert(&room_id, players)
                        .expect("Failed to insert players");
                }
            }
            Operation::StartGame { room_id } => {
                // Get all players in the room
                let players = self
                    .state
                    .players_in_rooms
                    .get(&room_id)
                    .await
                    .expect("Failed to get players")
                    .expect("Room does not exist");

                assert!(!players.is_empty(), "No players in this room");
                assert!(players.len() >= 2, "Need at least 2 players to start");

                // Create chain ownership with multiple owners
                // Each owner gets equal weight (100)
                let owners_and_weights = players.iter().map(|owner| (*owner, 100u64));

                let ownership = ChainOwnership::multiple(
                    owners_and_weights,
                    10, // multi_leader_rounds: allow 10 rounds of multi-leader consensus
                    TimeoutConfig::default(),
                );

                // Create the game microchain
                let game_chain_id = self.runtime.open_chain(
                    ownership,
                    ApplicationPermissions::default(),
                    Amount::ZERO,
                );

                // Map the room_id to the actual chain_id
                self.state
                    .room_to_chain
                    .insert(&room_id, game_chain_id)
                    .expect("Failed to map room to chain");

                // Add to active games
                self.state.active_game_chains.push(game_chain_id);

                // Send message to the game chain to initialize
                self.runtime
                    .prepare_message(Message::StartGame { room_id })
                    .send_to(game_chain_id);
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            Message::StartGame { room_id } => {
                let player = self
                    .state
                    .players_in_rooms
                    .get(&room_id)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                assert!(!player.is_empty(), "No players in this room");
                assert!(player.len() >= 2, "Need at least 2 players to start");

                // Note: change_ownership is not available in SDK 0.15.8
                // For now, game state will be managed without changing chain ownership
                // TODO: Implement multi-player ownership when SDK supports it
                // Game started successfully with the players
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
