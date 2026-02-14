#!/usr/bin/env bash

set -eu

# Source nvm to make node and pnpm available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🎲 Starting Liars Bar Linera Application..."

# Set up Linera network using template helpers
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

# Build and publish backend
echo "🔨 Building Liars Bar application..."
cd /build
cargo build --release --target wasm32-unknown-unknown

# Get the default chain
DEFAULT_CHAIN=$(linera wallet show | grep "Public Key" -A 1 | tail -1 | awk '{print $3}')
echo "🔗 Default chain: $DEFAULT_CHAIN"

# Publish the application
echo "📦 Publishing Liars Bar application..."
APP_ID=$(linera --wait-for-outgoing-messages \
    project publish-and-create \
    --path /build)

echo "✅ Application published with ID: $APP_ID"

# Start the node service
echo "🌐 Starting Linera node service..."
linera service --port 8080 &
SERVICE_PID=$!

# Wait for service to be ready
sleep 5

echo "✅ Backend ready!"
echo "📊 GraphQL endpoint: http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$APP_ID"

# Start placeholder web page on port 5173 (frontend is optional)
echo "🌐 Starting info page on port 5173..."
mkdir -p /tmp/placeholder
cat > /tmp/placeholder/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Liars Bar - Backend Only</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 { margin-top: 0; }
        .info { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 5px; margin: 10px 0; }
        code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; }
        a { color: #ffd700; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎲 Liars Bar - Linera Application</h1>
        <div class="info">
            <h2>Backend Running</h2>
            <p><strong>GraphQL Endpoint:</strong></p>
            <p><code id="endpoint">Loading...</code></p>
            <p><strong>Application ID:</strong> <code id="appId">Loading...</code></p>
            <p><strong>Chain ID:</strong> <code id="chainId">Loading...</code></p>
        </div>
        <div class="info">
            <h3>Available Operations:</h3>
            <ul>
                <li><code>CreateTable { ispublic: bool }</code> - Create a new game table</li>
                <li><code>JoinTable { room_id: u64 }</code> - Join an existing table</li>
                <li><code>StartGame { room_id: u64 }</code> - Start the game</li>
            </ul>
        </div>
        <div class="info">
            <h3>Query Available Data:</h3>
            <ul>
                <li>temp_rooms</li>
                <li>players_in_rooms</li>
                <li>public_rooms</li>
                <li>room_to_chain</li>
                <li>active_game_chains</li>
            </ul>
        </div>
        <p>Use the GraphQL endpoint above to interact with the application.</p>
    </div>
    <script>
        // Inject environment info
        const appId = 'APP_ID_PLACEHOLDER';
        const chainId = 'CHAIN_ID_PLACEHOLDER';
        document.getElementById('appId').textContent = appId;
        document.getElementById('chainId').textContent = chainId;
        document.getElementById('endpoint').textContent =
            \`http://localhost:8080/chains/\${chainId}/applications/\${appId}\`;
    </script>
</body>
</html>
EOF

# Replace placeholders
sed -i "s/APP_ID_PLACEHOLDER/$APP_ID/" /tmp/placeholder/index.html
sed -i "s/CHAIN_ID_PLACEHOLDER/$DEFAULT_CHAIN/" /tmp/placeholder/index.html

cd /tmp/placeholder
python3 -m http.server 5173 &
FRONTEND_PID=$!

echo "✅ Info page ready at http://localhost:5173"

echo ""
echo "🎉 Liars Bar is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Info Page: http://localhost:5173"
echo "GraphQL:   http://localhost:8080/chains/$DEFAULT_CHAIN/applications/$APP_ID"
echo "Faucet:    http://localhost:8080"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Keep the service running
wait
