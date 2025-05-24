import { describe, expect, test } from "@jest/globals";
import { RouletteGame } from "../../src/games/roulette-game";
import { BetType } from "../../src/types";

describe("Roulette", () => {
	test("should create a roulette table with default settings", () => {
		const roulette = new RouletteGame();
		expect(roulette.getTable()).toEqual({
			bets: [],
			betLimit: 1000,
			minBet: 1,
			maxBet: 1000,
			zeroCount: 1,
			zeroColor: "green",
		});
	});

	test("should place a bet on the table", () => {
		const roulette = new RouletteGame();
		roulette.addPlayer({ id: "player1", balance: 1000, name: "Alice" });
		const bet = { type: BetType.RED, amount: 10, playerId: "player1" };
		roulette.placeBet(bet);
		expect(roulette.getTable().bets).toContainEqual({
			type: "red",
			amount: 10,
		});
	});

	test("should not allow bets exceeding the limit", () => {
		const roulette = new RouletteGame();
		roulette.addPlayer({ id: "player1", balance: 10000, name: "Alice" });
		const bet = { type: BetType.RED, amount: 2000, playerId: "player1" };
		expect(() => roulette.placeBet(bet)).toThrow("Bet cannot exceed");
	});
});
