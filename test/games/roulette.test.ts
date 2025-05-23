import { describe, expect, test } from "@jest/globals";
import { RouletteGame } from "../../src/games/roulette-game";

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
		const bet = { type: "red", amount: 10 };
		roulette.placeBet(bet);
		expect(roulette.getTable().bets).toContainEqual(bet);
	});

	test("should not allow bets exceeding the limit", () => {
		const roulette = new RouletteGame();
		const bet = { type: "red", amount: 2000 };
		expect(() => roulette.placeBet(bet)).toThrow("Bet exceeds the limit");
	});
});
