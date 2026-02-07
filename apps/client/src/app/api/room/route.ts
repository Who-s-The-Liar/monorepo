import { NextResponse } from "next/server";

// Change this value to test different layouts: 2 or 3
let playerCount = 3;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 3;

export async function GET() {
  return NextResponse.json({
    playerCount,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { playerCount: newCount } = body as { playerCount: number };

  if (newCount < MIN_PLAYERS || newCount > MAX_PLAYERS) {
    return NextResponse.json(
      { error: `playerCount must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}` },
      { status: 400 }
    );
  }

  playerCount = newCount;

  return NextResponse.json({
    playerCount,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  });
}
