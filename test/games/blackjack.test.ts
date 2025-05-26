import { beforeEach, describe, expect, test } from "@jest/globals";
import { BlackjackGame } from "../../src/games/blackjack-game.ts";
import { BetType } from "../../src/types.ts";

describe("BlackjackGame", () => {
	let game: BlackjackGame;
	const playerId = "player1";

	beforeEach(() => {
		game = new BlackjackGame();
		game.addPlayer({ id: playerId, balance: 1000 });
		game.placeBet(playerId, 100, BetType.BLACKJACK_MAIN);
		game.startRound();
	});

	test("should create a new blackjack game", () => {
		const g = new BlackjackGame();
		expect(g).toBeInstanceOf(BlackjackGame);
	});

	test("should start a new round with 2 cards each", () => {
		const hand = game.getPlayerHandMulti(playerId);
		expect(hand).toHaveLength(2);
		expect(game.getDealerHand()).toHaveLength(2);
	});

	test("should allow player to hit", () => {
		const initialHandSize = game.getPlayerHandMulti(playerId).length;
		const card = game.hit(playerId);
		expect(card).toBeDefined();
		expect(game.getPlayerHandMulti(playerId)).toHaveLength(initialHandSize + 1);
	});

	test("should calculate hand values correctly", () => {
		const playerValue = game.getPlayerHandValueMulti(playerId);
		const dealerValue = game.getDealerHandValue();
		expect(playerValue).toBeGreaterThan(0);
		expect(dealerValue).toBeGreaterThan(0);
	});

	test("should detect when player is busted", () => {
		// Keep hitting until busted (this is probabilistic but should work in practice)
		while (
			game.getPlayerHandValueMulti(playerId) <= 21 &&
			game.getPlayerHandMulti(playerId).length < 10
		) {
			game.hit(playerId);
		}
		if (game.getPlayerHandValueMulti(playerId) > 21) {
			expect(game.isPlayerBustedMulti(playerId)).toBe(true);
		}
	});

	test("should play dealer correctly", () => {
		game.dealerPlay();
		// Dealer should have at least 17 or be busted
		const dealerValue = game.getDealerHandValue();
		expect(dealerValue >= 17 || dealerValue > 21).toBe(true);
	});
});
