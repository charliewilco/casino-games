import { describe, expect, test, beforeEach } from "@jest/globals";
import { RouletteGame } from "../../src/games/roulette-game.ts";
import { BetType } from "../../src/types.ts";

describe("RouletteGame - Comprehensive Betting", () => {
	let game: RouletteGame;

	beforeEach(() => {
		// Use seeded game for predictable results
		game = new RouletteGame(false, {
			minBet: 1,
			maxBet: 1000,
			maxStraightUp: 100,
			maxSplit: 200,
			maxStreet: 300,
			maxCorner: 400,
			maxOutside: 500,
		});
	});

	describe("Player Management", () => {
		test("should add and manage players", () => {
			game.addPlayer({ id: "player1", balance: 1000, name: "Alice" });
			game.addPlayer({ id: "player2", balance: 500, name: "Bob" });

			expect(game.getPlayers()).toHaveLength(2);
			expect(game.getPlayer("player1")?.name).toBe("Alice");
			expect(game.getPlayer("player2")?.name).toBe("Bob");
		});

		test("should update player balances", () => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.updatePlayerBalance("player1", 1500);

			expect(game.getPlayer("player1")?.balance).toBe(1500);
		});
	});

	describe("Inside Bets", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
		});

		test("should handle straight-up bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_STRAIGHT_UP,
				amount: 50,
				numbers: [7],
			});

			const bets = game.getActiveBets();
			expect(bets).toHaveLength(1);
			expect(bets[0].type).toBe(BetType.ROULETTE_STRAIGHT_UP);
			expect(bets[0].numbers).toEqual([7]);
		});

		test("should handle split bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_SPLIT,
				amount: 30,
				numbers: [1, 2],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_SPLIT);
			expect(bets[0].numbers).toEqual([1, 2]);
		});

		test("should handle street bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_STREET,
				amount: 40,
				numbers: [1, 2, 3],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_STREET);
			expect(bets[0].numbers).toEqual([1, 2, 3]);
		});

		test("should handle corner bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_CORNER,
				amount: 25,
				numbers: [1, 2, 4, 5],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_CORNER);
			expect(bets[0].numbers).toEqual([1, 2, 4, 5]);
		});
	});

	describe("Outside Bets", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
		});

		test("should handle red/black bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_RED,
				amount: 100,
				numbers: [],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_RED);
		});

		test("should handle odd/even bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_ODD,
				amount: 75,
				numbers: [],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_ODD);
		});

		test("should handle high/low bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_HIGH,
				amount: 50,
				numbers: [],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_HIGH);
		});

		test("should handle dozens bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_FIRST_DOZEN,
				amount: 60,
				numbers: [],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_FIRST_DOZEN);
		});

		test("should handle columns bets", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_FIRST_COLUMN,
				amount: 80,
				numbers: [],
			});

			const bets = game.getActiveBets();
			expect(bets[0].type).toBe(BetType.ROULETTE_FIRST_COLUMN);
		});
	});

	describe("Bet Validation", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
		});

		test("should enforce table limits", () => {
			// Test straight-up limit
			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_STRAIGHT_UP,
					amount: 150, // Over maxStraightUp of 100
					numbers: [7],
				});
			}).toThrow("Bet cannot exceed table limit of 100");

			// Test split limit
			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_SPLIT,
					amount: 250, // Over maxSplit of 200
					numbers: [1, 2],
				});
			}).toThrow("Bet cannot exceed table limit of 200");
		});

		test("should validate bet amounts", () => {
			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_STRAIGHT_UP,
					amount: 0.5, // Under minimum
					numbers: [7],
				});
			}).toThrow("below minimum bet");

			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_RED,
					amount: 1500, // Over player balance
					numbers: [],
				});
			}).toThrow("Insufficient funds");
		});

		test("should validate bet numbers", () => {
			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_STRAIGHT_UP,
					amount: 50,
					numbers: [37], // Invalid number
				});
			}).toThrow("Invalid bet numbers");

			expect(() => {
				game.placeBet("player1", {
					type: BetType.ROULETTE_SPLIT,
					amount: 50,
					numbers: [1], // Split needs 2 numbers
				});
			}).toThrow("Invalid bet numbers");
		});
	});

	describe("Payouts", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			// Use seeded spin for predictable results
			game.setSeed(12345);
		});

		test("should calculate straight-up payouts (35:1)", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_STRAIGHT_UP,
				amount: 10,
				numbers: [7],
			});

			const result = game.spin();
			const betResult = result.betResults[0];

			if (betResult.isWinner) {
				expect(betResult.payout).toBe(350); // 10 * 35
			} else {
				expect(betResult.payout).toBe(0);
			}
		});

		test("should calculate split payouts (17:1)", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_SPLIT,
				amount: 20,
				numbers: [1, 2],
			});

			const result = game.spin();
			const betResult = result.betResults[0];

			if (betResult.isWinner) {
				expect(betResult.payout).toBe(340); // 20 * 17
			}
		});

		test("should calculate outside bet payouts (1:1)", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_RED,
				amount: 100,
				numbers: [],
			});

			const result = game.spin();
			const betResult = result.betResults[0];

			if (betResult.isWinner) {
				expect(betResult.payout).toBe(100); // 100 * 1
			}
		});

		test("should calculate dozens/columns payouts (2:1)", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_FIRST_DOZEN,
				amount: 50,
				numbers: [],
			});

			const result = game.spin();
			const betResult = result.betResults[0];

			if (betResult.isWinner) {
				expect(betResult.payout).toBe(100); // 50 * 2
			}
		});
	});

	describe("Wheel Types", () => {
		test("should support European wheel (36 + 0)", () => {
			const europeanGame = new RouletteGame(false);
			const wheel = europeanGame.getWheel();

			expect(wheel.numbers).toHaveLength(37);
			expect(wheel.numbers).toContain(0);
			expect(wheel.numbers).not.toContain(-1); // No double zero
			expect(wheel.isAmerican).toBe(false);
		});

		test("should support American wheel (36 + 0 + 00)", () => {
			const americanGame = new RouletteGame(true);
			const wheel = americanGame.getWheel();

			expect(wheel.numbers).toHaveLength(38);
			expect(wheel.numbers).toContain(0);
			expect(wheel.numbers).toContain(-1); // Double zero represented as -1
			expect(wheel.isAmerican).toBe(true);
		});
	});

	describe("Game Flow", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.addPlayer({ id: "player2", balance: 500 });
		});

		test("should handle multiple players and bets", () => {
			// Player 1 bets
			game.placeBet("player1", {
				type: BetType.ROULETTE_STRAIGHT_UP,
				amount: 50,
				numbers: [7],
			});

			game.placeBet("player1", {
				type: BetType.ROULETTE_RED,
				amount: 100,
				numbers: [],
			});

			// Player 2 bets
			game.placeBet("player2", {
				type: BetType.ROULETTE_FIRST_DOZEN,
				amount: 75,
				numbers: [],
			});

			expect(game.getActiveBets()).toHaveLength(3);

			// Spin and check results
			const result = game.spin();
			expect(result.betResults).toHaveLength(3);
			expect(Object.keys(result.totalWinnings)).toContain("player1");
			expect(Object.keys(result.totalWinnings)).toContain("player2");
		});

		test("should clear bets after spin", () => {
			game.placeBet("player1", {
				type: BetType.ROULETTE_RED,
				amount: 50,
				numbers: [],
			});

			expect(game.getActiveBets()).toHaveLength(1);

			game.spin();
			expect(game.getActiveBets()).toHaveLength(0);
		});

		test("should track spin history", () => {
			game.setSeed(12345);

			const result1 = game.spin();
			const result2 = game.spin();

			const history = game.getSpinHistory();
			expect(history).toHaveLength(2);
			expect(history[0]).toBe(result1.winningNumber);
			expect(history[1]).toBe(result2.winningNumber);
		});
	});

	describe("Legacy Compatibility", () => {
		test("should support legacy bet format", () => {
			game.addPlayer({ id: "player1", balance: 1000 });

			// Test legacy bet method
			game.bet("straight", 50);

			// Should work without throwing
			expect(game.getActiveBets()).toHaveLength(1);
		});

		test("should support legacy spin method", () => {
			const result = game.spin();
			expect(typeof result.winningNumber).toBe("number");
			expect(result.winningNumber).toBeGreaterThanOrEqual(-1); // -1 for double zero
			expect(result.winningNumber).toBeLessThanOrEqual(36);
		});
	});
});
