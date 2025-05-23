import { describe, expect, test } from "@jest/globals";
import { BlackjackGame } from "../../src/games/blackjack-game";

describe("BlackjackGame", () => {
	test("should create a new blackjack game", () => {
		const game = new BlackjackGame();
		expect(game).toBeInstanceOf(BlackjackGame);
	});

	test("should start a new round with 2 cards each", () => {
		const game = new BlackjackGame();
		game.startNewRound();

		expect(game.getPlayerHand()).toHaveLength(2);
		expect(game.getDealerHand()).toHaveLength(2);
	});

	test("should allow player to hit", () => {
		const game = new BlackjackGame();
		game.startNewRound();

		const initialHandSize = game.getPlayerHand().length;
		const card = game.hit();

		expect(card).toBeDefined();
		expect(game.getPlayerHand()).toHaveLength(initialHandSize + 1);
	});

	test("should calculate hand values correctly", () => {
		const game = new BlackjackGame();
		game.startNewRound();

		const playerValue = game.getPlayerHandValue();
		const dealerValue = game.getDealerHandValue();

		expect(playerValue).toBeGreaterThan(0);
		expect(dealerValue).toBeGreaterThan(0);
	});

	test("should detect when player is busted", () => {
		const game = new BlackjackGame();
		game.startNewRound();

		// Keep hitting until busted (this is probabilistic but should work in practice)
		while (
			game.getPlayerHandValue() <= 21 &&
			game.getPlayerHand().length < 10
		) {
			game.hit();
		}

		if (game.getPlayerHandValue() > 21) {
			expect(game.isPlayerBusted()).toBe(true);
		}
	});

	test("should play dealer correctly", () => {
		const game = new BlackjackGame();
		game.startNewRound();

		game.dealerPlay();

		// Dealer should have at least 17 or be busted
		const dealerValue = game.getDealerHandValue();
		expect(dealerValue >= 17 || dealerValue > 21).toBe(true);
	});
});
