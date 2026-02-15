// Integration tests for LiarsCafe operations moved out of src.
#![cfg(not(target_arch = "wasm32"))]

use liars_cafe::Operation;
use linera_sdk::test::{QueryOutcome, TestValidator};

/// Helper: creates a fresh validator, chain, and application instance.
async fn setup() -> (
    TestValidator,
    linera_sdk::test::ActiveChain,
    linera_sdk::linera_base_types::ApplicationId<liars_cafe::LiarsCafeAbi>,
) {
    let (validator, module_id) =
        TestValidator::with_current_module::<liars_cafe::LiarsCafeAbi, (), ()>().await;

    let mut chain = validator.new_chain().await;

    let application_id = chain
        .create_application(module_id, (), (), vec![])
        .await;

    (validator, chain, application_id)
}

#[tokio::test(flavor = "current_thread")]
async fn test_create_table() {
    let (_validator, mut chain, application_id) = setup().await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;

    let rooms = response["tempRooms"].as_array().expect("Expected rooms array");
    assert_eq!(rooms.len(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn test_join_table() {
    let (_validator, mut chain, application_id) = setup().await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;

    let rooms = response["tempRooms"].as_array().expect("Expected rooms array");
    let room_id: u64 = serde_json::from_value(rooms[0].clone()).expect("Failed to parse room_id");

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { playersInRooms }")
        .await;

    assert!(!response["playersInRooms"].is_null());
}

#[tokio::test(flavor = "current_thread")]
async fn test_start_game_flow() {
    let (validator, mut chain1, application_id) = setup().await;

    // Player 1 creates table
    chain1
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { tempRooms }")
        .await;

    let rooms = response["tempRooms"].as_array().expect("Expected rooms array");
    let room_id: u64 = serde_json::from_value(rooms[0].clone()).expect("Failed to parse room_id");

    // Player 2 joins from another chain
    let mut chain2 = validator.new_chain().await;
    chain2
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    // Process cross-chain messages on chain1
    chain1.handle_received_messages().await;

    // Start game on chain1
    chain1
        .add_block(|block| {
            block.with_operation(application_id, Operation::StartGame { room_id });
        })
        .await;

    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { activeGameChains }")
        .await;

    // Expect at least one active game chain recorded
    assert!(!response["activeGameChains"].as_array().unwrap().is_empty());
}
