// Quick test of our blackjack implementation
import { BetType, BlackjackGame } from "../src/index.mts";

console.log("🃏 Testing BlackjackGame Implementation\n");

// --- Test 1: Single-player Mode (Legacy Compatibility Refactored) ---
console.log("=== Test 1: Single-player Mode (Refactored) ===");
const game = new BlackjackGame();
const playerId = "player1";
game.addPlayer({ id: playerId, balance: 1000 });
game.startBettingPhase();
game.placeBet(playerId, 100, BetType.BLACKJACK_MAIN);
game.startRound();
console.log(
	"Player hand:",
	game.getPlayerHandMulti(playerId).map((c) => `${c.rank}${c.suit}`),
);
console.log(
	"Dealer hand:",
	game.getDealerHand().map((c) => `${c.rank}${c.suit}`),
);
console.log("Player value:", game.getPlayerHandValueMulti(playerId));
console.log("Dealer value:", game.getDealerHandValue());

// Test hitting
const hitCard = game.hit(playerId);
console.log("Hit card:", `${hitCard.rank}${hitCard.suit}`);
console.log("New player value:", game.getPlayerHandValueMulti(playerId));
const state = game.getGameState();
const handState = state.playerHands[playerId][0];
console.log("Is busted:", handState.isBusted);

console.log("\n=== Test 2: Multi-player Mode ===");

const game2 = new BlackjackGame();
game2.addPlayer({ id: "alice", balance: 1000 });
game2.addPlayer({ id: "bob", balance: 1000 });
game2.startBettingPhase();
game2.placeBet("alice", 50, BetType.BLACKJACK_MAIN);
game2.placeBet("bob", 100, BetType.BLACKJACK_MAIN);
game2.startRound();
console.log(
	"Alice hand:",
	game2.getPlayerHandMulti("alice").map((c) => `${c.rank}${c.suit}`),
);
console.log(
	"Bob hand:",
	game2.getPlayerHandMulti("bob").map((c) => `${c.rank}${c.suit}`),
);
console.log("Alice value:", game2.getPlayerHandValueMulti("alice"));
console.log("Bob value:", game2.getPlayerHandValueMulti("bob"));
// Test multi-player hit
const aliceHit = game2.hit("alice");
console.log("Alice hits:", `${aliceHit.rank}${aliceHit.suit}`);
console.log("Alice new value:", game2.getPlayerHandValueMulti("alice"));

console.log("\n=== Test 3: Blackjack Detection ===");
// Create a controlled scenario for blackjack (simulate by checking after deal)
const game3 = new BlackjackGame();
const player3 = "testplayer";
game3.addPlayer({ id: player3, balance: 1000 });
game3.startBettingPhase();
game3.placeBet(player3, 100, BetType.BLACKJACK_MAIN);
game3.startRound();
console.log("Initial hand value:", game3.getPlayerHandValueMulti(player3));

console.log("\n✅ All tests completed successfully!");
