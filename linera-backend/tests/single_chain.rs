// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//! Integration tests for the Liar's Bar application.

#![cfg(not(target_arch = "wasm32"))]

use liars_cafe::Operation;
use linera_sdk::test::{QueryOutcome, TestValidator};

/// Helper: creates a fresh validator, chain, and application instance.
async fn setup() -> (
    TestValidator,
    linera_sdk::test::ActiveChain,
    linera_sdk::linera_base_types::ApplicationId<liars_cafe::LiarsCafeAbi>,
) {
    println!("Initializing test validator...");
    let (validator, module_id) =
        TestValidator::with_current_module::<liars_cafe::LiarsCafeAbi, (), ()>().await;
    println!("Validator created with module_id: {:?}", module_id);

    println!("Creating new chain...");
    let mut chain = validator.new_chain().await;
    println!("Chain created: {:?}", chain.id());

    println!("Creating application instance...");
    let application_id = chain
        .create_application(module_id, (), (), vec![])
        .await;
    println!("Application created with ID: {:?}", application_id);

    (validator, chain, application_id)
}

/// Test that the application instantiates with empty state.
#[tokio::test(flavor = "current_thread")]
async fn test_instantiation() {
    println!("=== Starting test_instantiation ===");
    let (_validator, chain, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    println!("Number of rooms: {}", rooms.len());
    assert!(rooms.is_empty(), "Rooms should be empty after instantiation");
    println!("✓ Test passed: Application instantiated with empty state");
}

/// Test creating a single public table.
#[tokio::test(flavor = "current_thread")]
async fn test_create_public_table() {
    println!("\n=== Starting test_create_public_table ===");
    let (_validator, mut chain, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    println!("Creating public table...");
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;
    println!("Block added with CreateTable operation");

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    println!("Number of rooms: {}", rooms.len());
    assert_eq!(rooms.len(), 1, "Should have one room after creating a table");
    println!("✓ Test passed: Public table created successfully");
}

/// Test creating a private table.
#[tokio::test(flavor = "current_thread")]
async fn test_create_private_table() {
    println!("\n=== Starting test_create_private_table ===");
    let (_validator, mut chain, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    println!("Creating private table...");
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: false });
        })
        .await;
    println!("Block added with CreateTable operation (private)");

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    println!("Number of rooms: {}", rooms.len());
    assert_eq!(rooms.len(), 1, "Private table should still appear in rooms");
    println!("✓ Test passed: Private table created successfully");
}

/// Test creating multiple tables in sequence.
#[tokio::test(flavor = "current_thread")]
async fn test_create_multiple_tables() {
    println!("\n=== Starting test_create_multiple_tables ===");
    let (_validator, mut chain, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    println!("Creating first table (public)...");
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;
    println!("First table created");

    println!("Creating second table (private)...");
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: false });
        })
        .await;
    println!("Second table created");

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    println!("Number of rooms: {}", rooms.len());
    assert_eq!(
        rooms.len(),
        2,
        "Should have two rooms after creating two tables"
    );
    println!("✓ Test passed: Multiple tables created successfully");
}

/// Test joining a table adds the player to the room.
#[tokio::test(flavor = "current_thread")]
async fn test_join_table() {
    println!("\n=== Starting test_join_table ===");
    let (_validator, mut chain, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    // Create a table first
    println!("Creating public table...");
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;
    println!("Table created");

    // Retrieve the room ID from state
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response for rooms: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: u64 =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room_id as u64");
    println!("Retrieved room_id: {}", room_id);

    // Join the table
    println!("Joining table with room_id: {}", room_id);
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;
    println!("Player joined the table");

    // Verify via playersInRooms query
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { playersInRooms }")
        .await;
    println!("GraphQL response for playersInRooms: {}", serde_json::to_string_pretty(&response).unwrap());

    assert!(
        !response["playersInRooms"].is_null(),
        "playersInRooms should not be null after a player joins"
    );
    println!("✓ Test passed: Player successfully joined table");
}

/// Test that two players (from different chains) can join the same room.
///
/// Player 1 creates the table on chain1 (home chain) and is automatically added.
/// Player 2 joins from chain2, which triggers a cross-chain message back to chain1.
#[tokio::test(flavor = "current_thread")]
async fn test_multiple_players_join() {
    println!("\n=== Starting test_multiple_players_join ===");
    let (validator, mut chain1, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    // Player 1 creates a table on the home chain (automatically added to players)
    println!("Player 1 creating public table on chain1...");
    chain1
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;
    println!("Table created");

    // Get room ID
    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response for rooms: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: u64 =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room_id as u64");
    println!("Retrieved room_id: {}", room_id);

    // Player 2 joins from a second chain (cross-chain message path)
    println!("Creating chain2 for player 2...");
    let mut chain2 = validator.new_chain().await;
    println!("Chain2 created: {:?}", chain2.id());

    println!("Player 2 joining table from chain2...");
    chain2
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;
    println!("Player 2 sent cross-chain join");

    // Process the incoming cross-chain message on chain1
    chain1.handle_received_messages().await;
    println!("Chain1 processed incoming messages");

    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { playersInRooms }")
        .await;
    println!("GraphQL response for playersInRooms: {}", serde_json::to_string_pretty(&response).unwrap());

    assert!(
        !response["playersInRooms"].is_null(),
        "playersInRooms should have entries after multiple joins"
    );
    println!("✓ Test passed: Multiple players joined successfully");
}

/// Test the full flow: create table → join with enough players → start game.
///
/// Player 1 creates the table on chain1 (home chain), player 2 joins from chain2
/// via cross-chain message. StartGame opens a new microchain for the game.
#[tokio::test(flavor = "current_thread")]
async fn test_start_game_flow() {
    println!("\n=== Starting test_start_game_flow ===");
    let (validator, mut chain1, application_id) = setup().await;
    println!("Setup complete. Application ID: {:?}", application_id);

    // Player 1 creates a public table (automatically added to players)
    println!("Player 1 creating public table on chain1...");
    chain1
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;
    println!("Table created");

    // Get the room ID
    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { tempRooms }")
        .await;
    println!("GraphQL response for rooms: {}", serde_json::to_string_pretty(&response).unwrap());

    let rooms = response["tempRooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: u64 =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room_id as u64");
    println!("Retrieved room_id: {}", room_id);

    // Player 2 joins from a second chain (cross-chain message path)
    println!("Creating chain2 for player 2...");
    let mut chain2 = validator.new_chain().await;
    println!("Chain2 created: {:?}", chain2.id());

    println!("Player 2 joining table from chain2...");
    chain2
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;
    println!("Player 2 sent cross-chain join");

    // Process the incoming cross-chain message on chain1
    chain1.handle_received_messages().await;
    println!("Chain1 processed incoming messages");

    // Verify players before starting game
    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { playersInRooms }")
        .await;
    println!("Players in rooms before game start: {}", serde_json::to_string_pretty(&response).unwrap());

    // Start the game — opens a new microchain with both players as owners
    println!("Starting game with room_id: {}", room_id);
    chain1
        .add_block(|block| {
            block.with_operation(application_id, Operation::StartGame { room_id });
        })
        .await;
    println!("Game started successfully");

    // Query active game chains
    let QueryOutcome { response, .. } = chain1
        .graphql_query(application_id, "query { activeGameChains }")
        .await;
    println!("Active game chains: {}", serde_json::to_string_pretty(&response).unwrap());

    println!("✓ Test passed: Full game flow completed successfully");
}
