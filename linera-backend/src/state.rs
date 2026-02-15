use linera_sdk::{
    linera_base_types::{AccountOwner, ChainId},
    views::{linera_views, LogView, MapView, RegisterView, RootView, ViewStorageContext},
};

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct LiarsCafeState {
    // Counter for generating unique room IDs
    pub next_room_id: RegisterView<u64>,
    // Temporary rooms (before game starts)
    pub temp_rooms: LogView<u64>,
    // Players in temporary rooms
    pub players_in_rooms: MapView<u64, Vec<AccountOwner>>,
    // Public/private room settings
    pub public_rooms: MapView<u64, bool>,
    // Maps room_id to actual chain_id after game starts
    pub room_to_chain: MapView<u64, ChainId>,
    // Active game chains
    pub active_game_chains: LogView<ChainId>,

    // table state
    pub is_started: RegisterView<bool>,
    pub remaining_bullet: MapView<AccountOwner, u8>,
    pub is_eliminated: MapView<AccountOwner, bool>,
    pub playing_trun: RegisterView<Option<AccountOwner>>,
    pub players: LogView<AccountOwner>,
    // table & player common state
    pub round_count: RegisterView<u8>,
    pub plced_cards: LogView<u8>,

    // player state
    pub player_cards: LogView<u8>,
}
