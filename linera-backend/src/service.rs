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

use liars_bar::Operation;

use self::state::LiarsBarState;

pub struct LiarsBarService {
    state: LiarsBarState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(LiarsBarService);

impl WithServiceAbi for LiarsBarService {
    type Abi = liars_bar::LiarsBarAbi;
}

impl Service for LiarsBarService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = LiarsBarState::load(runtime.root_view_storage_context())
            .await
            .expect("Faild to load bars state");

        LiarsBarService {
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

        Schema::build(
            QueryRoot {
                players_in_rooms,
                public_rooms,
                room_to_chain,
                temp_rooms: self.state.temp_rooms.read(..).await.unwrap(),
                active_game_chains: self.state.active_game_chains.read(..).await.unwrap(),
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
}
