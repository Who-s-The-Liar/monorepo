use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct LiarsCafeAbi;

impl ContractAbi for LiarsCafeAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for LiarsCafeAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    CreateTable { ispublic: bool },
    JoinTable { room_id: u64 },
    StartGame { room_id: u64 },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    StartGame { room_id: u64 },
    JoinTable { room_id: u64 },
}
