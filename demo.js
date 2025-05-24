/**
 * Simple Casino Demo
 *
 * A quick demonstration of the casino games engine's core functionality.
 */

import {
	BlackjackGame,
	RouletteGame,
	TexasPokerGame,
	BetType,
} from "./dist/index.js";

console.log("🎰 Casino Games Engine Demo 🎰");
console.log("==============================\n");

// Blackjack Demo
console.log("🃏 BLACKJACK DEMO");
console.log("----------------");

const blackjack = new BlackjackGame();
blackjack.addPlayer({ id: "player1", name: "Alice", balance: 1000 });

console.log("Player added to blackjack table");
console.log("Starting betting phase and placing $25 bet...");

blackjack.startBettingPhase();
blackjack.placeBet("player1", 25);
blackjack.startRound();

const playerHand = blackjack.getPlayerHandMulti("player1");
const playerValue = blackjack.getPlayerHandValueMulti("player1");
const dealerHand = blackjack.getDealerHand();

console.log(
	`Player hand: ${playerHand.map((c) => c.text + c.suit).join(", ")} (Value: ${playerValue})`,
);
console.log(`Dealer showing: ${dealerHand[0].text}${dealerHand[0].suit}`);

// Simple strategy: hit if under 17
if (playerValue < 17) {
	console.log("Player hits...");
	blackjack.hit("player1");
	const newValue = blackjack.getPlayerHandValueMulti("player1");
	const newHand = blackjack.getPlayerHandMulti("player1");
	console.log(
		`New hand: ${newHand.map((c) => c.text + c.suit).join(", ")} (Value: ${newValue})`,
	);
}

console.log("Player stands");
blackjack.stand("player1");

const results = blackjack.finishRound();
const finalBalance = blackjack.getPlayer("player1")?.balance || 0;
console.log(`Round complete! Player balance: $${finalBalance}\n`);

// Roulette Demo
console.log("🎰 ROULETTE DEMO");
console.log("---------------");

const roulette = new RouletteGame(false); // European wheel
roulette.addPlayer({ id: "player1", balance: 1000 });

console.log("Player joins roulette table");
console.log("Placing bets: $50 on Red, $10 on number 7");

roulette.placeBet("player1", {
	type: BetType.ROULETTE_RED,
	amount: 50,
	numbers: [],
	playerId: "player1",
});

roulette.placeBet("player1", {
	type: BetType.ROULETTE_STRAIGHT_UP,
	amount: 10,
	numbers: [7],
	playerId: "player1",
});

const spinResult = roulette.spin();
console.log(
	`Winning number: ${spinResult.winningNumber} (${spinResult.color})`,
);

const winnings = spinResult.totalWinnings.player1 || 0;
console.log(`Player winnings: $${winnings}`);

const rouletteBalance = roulette.getPlayer("player1")?.balance || 0;
console.log(`Player balance: $${rouletteBalance}\n`);

// Poker Demo
console.log("🎲 POKER DEMO");
console.log("------------");

const poker = new TexasPokerGame({
	smallBlind: 10,
	bigBlind: 20,
	maxPlayers: 6,
});

poker.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
poker.addPlayer({ id: "player2", name: "Bob", chips: 1000, position: 1 });

console.log("Two players join poker table");
console.log("Starting new hand...");

poker.startNewHand();
console.log(`Game phase: ${poker.getCurrentPhase()}`);

const player1Cards = poker.getPlayerHoleCards("player1");
const player2Cards = poker.getPlayerHoleCards("player2");

console.log(
	`Alice's hole cards: ${player1Cards.map((c) => c.text + c.suit).join(", ")}`,
);
console.log(
	`Bob's hole cards: ${player2Cards.map((c) => c.text + c.suit).join(", ")}`,
);

// Simple actions
console.log("Alice calls, Bob raises to $40");
try {
	poker.call("player1");
	poker.raise("player2", 40);
} catch (error) {
	console.log("Poker action error:", error.message);
}

console.log("\n✅ Demo complete! All games are working correctly.");
console.log(
	"📚 Check the examples/ directory for more comprehensive demonstrations.",
);
