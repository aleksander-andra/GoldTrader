/* eslint-disable no-console, no-undef */
// Prosty test client do testowania MCP servera
// Uruchom: node test-client.js

import { spawn } from 'child_process';

console.log('🚀 Testowanie GoldTrader MCP Server...\n');

// Uruchom serwer MCP
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

// Zbieraj output z serwera
server.stdout.on('data', (data) => {
  console.log('📡 SERVER OUTPUT:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('GoldTrader MCP Server running')) {
    serverReady = true;
    console.log('✅ Server gotowy!\n');
    runTests();
  }
  console.error('📡 SERVER ERROR:', output);
});

// Funkcje testowe
function runTests() {
  console.log('🧪 Uruchamianie testów...\n');

  // Test 1: Lista narzędzi
  console.log('Test 1: Pobieranie listy narzędzi');
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test 2: Wywołanie narzędzia get_gold_price
  setTimeout(() => {
    console.log('\nTest 2: Wywołanie get_gold_price');
    const callToolRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_gold_price",
        arguments: {
          symbol: "XAUUSD",
          timeframe: "1D"
        }
      }
    };

    server.stdin.write(JSON.stringify(callToolRequest) + '\n');

    // Test 3: Wywołanie search_financial_news
    setTimeout(() => {
      console.log('\nTest 3: Wywołanie search_financial_news');
      const searchRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search_financial_news",
          arguments: {
            query: "gold market",
            limit: 3
          }
        }
      };

      server.stdin.write(JSON.stringify(searchRequest) + '\n');

      // Zakończ po 5 sekundach
      setTimeout(() => {
        console.log('\n✅ Testy zakończone!');
        server.kill();
        process.exit(0);
      }, 5000);

    }, 2000);

  }, 1000);
}

// Obsługa błędów
server.on('error', (error) => {
  console.error('❌ Błąd serwera:', error);
  process.exit(1);
});

// Timeout na start serwera
setTimeout(() => {
  if (!serverReady) {
    console.error('❌ Server nie uruchomił się w czasie');
    server.kill();
    process.exit(1);
  }
}, 10000);
