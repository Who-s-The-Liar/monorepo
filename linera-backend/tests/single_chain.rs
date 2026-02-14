// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//! Integration tests for the Liar's Bar application.

#![cfg(not(target_arch = "wasm32"))]

use liars_bar::Operation;
use linera_sdk::{
    linera_base_types::ChainId,
    test::{QueryOutcome, TestValidator},
};

/// Helper: creates a fresh validator, chain, and application instance.
async fn setup() -> (
    TestValidator,
    linera_sdk::test::ActiveChain,
    linera_sdk::linera_base_types::ApplicationId<liars_bar::LiarsBarAbi>,
) {
    let (validator, module_id) =
        TestValidator::with_current_module::<liars_bar::LiarsBarAbi, (), ()>().await;
    let mut chain = validator.new_chain().await;

    let application_id = chain
        .create_application(module_id, (), (), vec![])
        .await;

    (validator, chain, application_id)
}

/// Test that the application instantiates with empty state.
#[tokio::test(flavor = "multi_thread")]
async fn test_instantiation() {
    let (_validator, chain, application_id) = setup().await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;

    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    assert!(rooms.is_empty(), "Rooms should be empty after instantiation");
}

/// Test creating a single public table.
#[tokio::test(flavor = "multi_thread")]
async fn test_create_public_table() {
    let (_validator, mut chain, application_id) = setup().await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;

    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    assert_eq!(rooms.len(), 1, "Should have one room after creating a table");
}

/// Test creating a private table.
#[tokio::test(flavor = "multi_thread")]
async fn test_create_private_table() {
    let (_validator, mut chain, application_id) = setup().await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: false });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;

    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    assert_eq!(rooms.len(), 1, "Private table should still appear in rooms");
}

/// Test creating multiple tables in sequence.
#[tokio::test(flavor = "multi_thread")]
async fn test_create_multiple_tables() {
    let (_validator, mut chain, application_id) = setup().await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: false });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;

    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    assert_eq!(
        rooms.len(),
        2,
        "Should have two rooms after creating two tables"
    );
}

/// Test joining a table adds the player to the room.
#[tokio::test(flavor = "multi_thread")]
async fn test_join_table() {
    let (_validator, mut chain, application_id) = setup().await;

    // Create a table first
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    // Retrieve the room ID from state
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;
    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: ChainId =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room ChainId");

    // Join the table
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    // Verify via playersInRooms query
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { playersInRooms }")
        .await;

    assert!(
        !response["playersInRooms"].is_null(),
        "playersInRooms should not be null after a player joins"
    );
}

/// Test that two players can join the same room.
#[tokio::test(flavor = "multi_thread")]
async fn test_multiple_players_join() {
    let (_validator, mut chain, application_id) = setup().await;

    // Create a table
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    // Get room ID
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;
    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: ChainId =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room ChainId");

    // Two players join (same signer in tests, but exercises the state logic)
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { playersInRooms }")
        .await;

    assert!(
        !response["playersInRooms"].is_null(),
        "playersInRooms should have entries after multiple joins"
    );
}

/// Test the full flow: create table → join with enough players → start game.
///
/// StartGame sends a cross-chain message to the room chain. The message handler
/// verifies at least 2 players joined and transfers chain ownership.
#[tokio::test(flavor = "multi_thread")]
async fn test_start_game_flow() {
    let (_validator, mut chain, application_id) = setup().await;

    // Create a public table
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::CreateTable { ispublic: true });
        })
        .await;

    // Get the room ID
    let QueryOutcome { response, .. } = chain
        .graphql_query(application_id, "query { rooms }")
        .await;
    let rooms = response["rooms"]
        .as_array()
        .expect("Expected rooms array");
    let room_id: ChainId =
        serde_json::from_value(rooms[0].clone()).expect("Failed to parse room ChainId");

    // Two players join so StartGame won't panic on the "need >= 2 players" assert
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::JoinTable { room_id });
        })
        .await;

    // Start the game — this sends a cross-chain Message::StartGame to room_id.
    // The message will be processed by the room chain's contract.
    chain
        .add_block(|block| {
            block.with_operation(application_id, Operation::StartGame { room_id });
        })
        .await;
}
