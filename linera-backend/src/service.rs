#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::{collections::HashMap, sync::Arc};

use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, ChainId, WithServiceAbi},
    views::View,
    Service, ServiceRuntime,
};

use liars_cafe::Operation;

use self::state::LiarsCafeState;

pub struct LiarsCafeService {
    state: LiarsCafeState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(LiarsCafeService);

impl WithServiceAbi for LiarsCafeService {
    type Abi = liars_cafe::LiarsCafeAbi;
}

impl Service for LiarsCafeService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = LiarsCafeState::load(runtime.root_view_storage_context())
            .await
            .expect("Faild to load Cafes state");

        LiarsCafeService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let mut public_rooms = HashMap::new();
        let mut players_in_rooms = HashMap::new();
        let mut room_to_chain = HashMap::new();

        // Get public room mappings
        let public_room_keys = self.state.public_rooms.indices().await.unwrap();
        for key in public_room_keys {
            if let Some(val) = self.state.public_rooms.get(&key).await.unwrap() {
                public_rooms.insert(key, val);
            }
        }

        // Get players in rooms mappings
        let player_keys = self.state.players_in_rooms.indices().await.unwrap();
        for key in player_keys {
            if let Some(val) = self.state.players_in_rooms.get(&key).await.unwrap() {
                players_in_rooms.insert(key, val);
            }
        }

        // Get room to chain mappings
        let room_chain_keys = self.state.room_to_chain.indices().await.unwrap();
        for key in room_chain_keys {
            if let Some(val) = self.state.room_to_chain.get(&key).await.unwrap() {
                room_to_chain.insert(key, val);
            }
        }

        // Get remaining_bullet mappings
        let mut remaining_bullet = HashMap::new();
        let bullet_keys = self.state.remaining_bullet.indices().await.unwrap();
        for key in bullet_keys {
            if let Some(val) = self.state.remaining_bullet.get(&key).await.unwrap() {
                remaining_bullet.insert(key, val);
            }
        }

        // Get is_eliminated mappings
        let mut is_eliminated = HashMap::new();
        let elim_keys = self.state.is_eliminated.indices().await.unwrap();
        for key in elim_keys {
            if let Some(val) = self.state.is_eliminated.get(&key).await.unwrap() {
                is_eliminated.insert(key, val);
            }
        }

        Schema::build(
            QueryRoot {
                players_in_rooms,
                public_rooms,
                room_to_chain,
                temp_rooms: self.state.temp_rooms.read(..).await.unwrap(),
                active_game_chains: self.state.active_game_chains.read(..).await.unwrap(),
                is_started: *self.state.is_started.get(),
                remaining_bullet,
                is_eliminated,
                playing_turn: *self.state.playing_trun.get(),
                players: self.state.players.read(..).await.unwrap(),
                round_count: *self.state.round_count.get(),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    temp_rooms: Vec<u64>,
    players_in_rooms: HashMap<u64, Vec<AccountOwner>>,
    public_rooms: HashMap<u64, bool>,
    room_to_chain: HashMap<u64, ChainId>,
    active_game_chains: Vec<ChainId>,
    is_started: bool,
    remaining_bullet: HashMap<AccountOwner, u8>,
    is_eliminated: HashMap<AccountOwner, bool>,
    playing_turn: Option<AccountOwner>,
    players: Vec<AccountOwner>,
    round_count: u8,
}

#[Object]
impl QueryRoot {
    async fn temp_rooms(&self) -> &Vec<u64> {
        &self.temp_rooms
    }
    async fn players_in_rooms(&self) -> &HashMap<u64, Vec<AccountOwner>> {
        &self.players_in_rooms
    }
    async fn public_rooms(&self) -> &HashMap<u64, bool> {
        &self.public_rooms
    }
    async fn room_to_chain(&self) -> &HashMap<u64, ChainId> {
        &self.room_to_chain
    }
    async fn active_game_chains(&self) -> &Vec<ChainId> {
        &self.active_game_chains
    }
    async fn is_started(&self) -> bool {
        self.is_started
    }
    async fn remaining_bullet(&self) -> &HashMap<AccountOwner, u8> {
        &self.remaining_bullet
    }
    async fn is_eliminated(&self) -> &HashMap<AccountOwner, bool> {
        &self.is_eliminated
    }
    async fn playing_turn(&self) -> &Option<AccountOwner> {
        &self.playing_turn
    }
    async fn players(&self) -> &Vec<AccountOwner> {
        &self.players
    }
    async fn round_count(&self) -> u8 {
        self.round_count
    }
}
