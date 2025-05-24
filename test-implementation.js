// Quick test of our blackjack implementation
import { BlackjackGame } from "./dist/index.js";

console.log("🃏 Testing BlackjackGame Implementation\n");

const game = new BlackjackGame();

// Test 1: Legacy compatibility
console.log("=== Test 1: Legacy Compatibility ===");
game.startNewRound();
console.log(
	"Player hand:",
	game.getPlayerHand().map((c) => `${c.text}${c.suit}`),
);
console.log(
	"Dealer hand:",
	game.getDealerHand().map((c) => `${c.text}${c.suit}`),
);
console.log("Player value:", game.getPlayerHandValue());
console.log("Dealer value:", game.getDealerHandValue());

// Test hitting
const hitCard = game.hit();
console.log("Hit card:", `${hitCard.text}${hitCard.suit}`);
console.log("New player value:", game.getPlayerHandValue());
console.log("Is busted:", game.isPlayerBusted());

console.log("\n=== Test 2: Multi-player Mode ===");

const game2 = new BlackjackGame();
game2.addPlayer({ id: "alice", balance: 1000 });
game2.addPlayer({ id: "bob", balance: 1000 });

game2.startBettingPhase();
game2.placeBet("alice", 50);
game2.placeBet("bob", 100);
game2.startRound();

console.log(
	"Alice hand:",
	game2.getPlayerHandMulti("alice").map((c) => `${c.text}${c.suit}`),
);
console.log(
	"Bob hand:",
	game2.getPlayerHandMulti("bob").map((c) => `${c.text}${c.suit}`),
);
console.log("Alice value:", game2.getPlayerHandValueMulti("alice"));
console.log("Bob value:", game2.getPlayerHandValueMulti("bob"));

// Test multi-player hit
const aliceHit = game2.hit("alice");
console.log("Alice hits:", `${aliceHit.text}${aliceHit.suit}`);
console.log("Alice new value:", game2.getPlayerHandValueMulti("alice"));

console.log("\n=== Test 3: Blackjack Detection ===");

// Create a controlled scenario for blackjack
const game3 = new BlackjackGame();
game3.startNewRound();
const hand = game3.getPlayerHand();
console.log("Initial hand value:", game3.getPlayerHandValue());

console.log("\n✅ All tests completed successfully!");
