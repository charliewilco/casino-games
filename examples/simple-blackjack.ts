/**
 * Simple Blackjack Example
 *
 * This example demonstrates basic blackjack gameplay with one player.
 */

import { BlackjackGame, BetType } from "../src/index.mts";

function runSimpleBlackjack() {
	console.log("🃏 Simple Blackjack Demo");
	console.log("=======================\n");

	const game = new BlackjackGame();

	// Add a player
	game.addPlayer({ id: "player1", name: "Alice", balance: 1000 });
	console.log("Added player Alice with $1000");

	// Start betting phase and place bet
	game.startBettingPhase();
	game.placeBet("player1", 50, BetType.BLACKJACK_MAIN);
	console.log("Alice bets $50");

	// Start the round
	game.startRound();

	// Show initial hands
	const playerHand = game.getPlayerHandMulti("player1");
	const playerValue = game.getPlayerHandValueMulti("player1");
	const dealerHand = game.getDealerHand();

	console.log("\nInitial hands:");
	console.log(
		`Alice: ${playerHand.map((c) => c.rank + c.suit).join(", ")} (${playerValue})`,
	);
	console.log(`Dealer: ${dealerHand[0].rank}${dealerHand[0].suit}, [Hidden]`);

	// Simple strategy: hit if under 17
	let currentValue = playerValue;
	while (currentValue < 17 && currentValue < 21) {
		console.log("\nAlice hits...");
		const hitCard = game.hit("player1");
		console.log(`Drew: ${hitCard.rank}${hitCard.suit}`);

		const newHand = game.getPlayerHandMulti("player1");
		currentValue = game.getPlayerHandValueMulti("player1");
		console.log(
			`Alice's hand: ${newHand.map((c) => c.rank + c.suit).join(", ")} (${currentValue})`,
		);

		if (currentValue > 21) {
			console.log("Alice busted!");
			break;
		}
	}

	if (currentValue <= 21) {
		console.log("Alice stands");
		game.stand("player1");
	}

	// Finish round and show results
	const results = game.finishRound();
	const finalDealerHand = game.getDealerHand();
	const dealerValue = game.getDealerHandValue();

	console.log("\nFinal hands:");
	console.log(`Alice: ${currentValue > 21 ? "BUSTED" : currentValue}`);
	console.log(
		`Dealer: ${finalDealerHand.map((c) => c.rank + c.suit).join(", ")} (${dealerValue})`,
	);

	const result = results.find((r) => r.playerId === "player1");
	if (result) {
		console.log(`\nResult: ${result.result.toUpperCase()}`);
		if (result.payout > 0) {
			console.log(`Alice wins $${result.payout}!`);
		}
	}

	const finalBalance = game.getPlayer("player1")?.balance || 0;
	console.log(`Alice's final balance: $${finalBalance}`);
}

runSimpleBlackjack();
