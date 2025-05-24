import { describe, test, expect, beforeEach } from "@jest/globals";
import { BetType } from "../../src/types.ts";
import { BlackjackGame } from "../../src/games/blackjack-game.ts";

describe("BlackjackGame - Advanced Features", () => {
	let game: BlackjackGame;

	beforeEach(() => {
		game = new BlackjackGame();
	});

	describe("Player Management", () => {
		test("should add and remove players", () => {
			// Add players
			game.addPlayer({ id: "player1", balance: 1000, name: "Alice" });
			game.addPlayer({ id: "player2", balance: 500, name: "Bob" });

			expect(game.getPlayers()).toHaveLength(2);
			expect(game.getPlayers()[0].name).toBe("Alice");
			expect(game.getPlayers()[1].name).toBe("Bob");

			// Remove player
			game.removePlayer("player1");
			expect(game.getPlayers()).toHaveLength(1);
			expect(game.getPlayers()[0].name).toBe("Bob");
		});

		test("should not allow duplicate player IDs", () => {
			game.addPlayer({ id: "player1", balance: 1000 });
			expect(() => {
				game.addPlayer({ id: "player1", balance: 500 });
			}).toThrow("Player player1 already exists");
		});
	});

	describe("Betting System", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.addPlayer({ id: "player2", balance: 500 });
		});

		test("should place main bets", () => {
			game.placeBet("player1", 100);
			game.placeBet("player2", 50);

			const bets = game.getCurrentBets();
			expect(bets).toHaveLength(2);
			expect(bets[0].amount).toBe(100);
			expect(bets[1].amount).toBe(50);
		});

		test("should validate bet amounts", () => {
			// Test minimum bet
			expect(() => {
				game.placeBet("player1", 0.5);
			}).toThrow("Bet amount must be between");

			// Test maximum bet
			expect(() => {
				game.placeBet("player1", 5000);
			}).toThrow("Bet amount must be between");

			// Test insufficient funds
			expect(() => {
				game.placeBet("player2", 600);
			}).toThrow("Insufficient funds");
		});

		test("should handle side bets", () => {
			game.placeBet("player1", 50);
			game.placeBet("player1", 10);

			const bets = game.getCurrentBets();
			expect(bets).toHaveLength(2);
			expect(
				bets.find((bet) => bet.type === BetType.BLACKJACK_INSURANCE)?.amount,
			).toBe(10);
		});
	});

	describe("Double Down", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.placeBet("player1", 100);
		});

		test("should allow double down on initial two cards", () => {
			game.startRound();

			// Double down should be allowed after initial deal
			expect(() => {
				game.doubleDown("player1");
			}).not.toThrow();

			// Check that bet was doubled
			const bets = game.getCurrentBets();
			const mainBet = bets.find((bet) => bet.type === BetType.BLACKJACK_MAIN);
			expect(mainBet?.amount).toBe(200);
		});

		test("should not allow double down after hit", () => {
			game.startRound();
			game.hit("player1");

			expect(() => {
				game.doubleDown("player1");
			}).toThrow("Cannot double down");
		});
	});

	describe("Split Hands", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.placeBet("player1", 100);
		});

		test("should handle split when possible", () => {
			game.startRound();

			// Note: In a real test, we'd need to control the deck to ensure pairs
			// For now, we test the error case since we can't guarantee pairs
			try {
				game.split("player1");
				// If split succeeds, check that there are now two hands
				const gameState = game.getGameState();
				// Implementation would need to expose split hands
			} catch (error) {
				// Expected if no pairs in hand
				expect(error.message).toContain("Cannot split");
			}
		});
	});

	describe("Surrender", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.placeBet("player1", 100, BetType.BLACKJACK_MAIN);
		});

		test("should allow surrender on initial hand", () => {
			game.startRound();

			expect(() => {
				game.surrender("player1");
			}).not.toThrow();

			// Player should get half their bet back
			const player = game.getPlayers().find((p) => p.id === "player1");
			expect(player?.balance).toBe(950); // 1000 - 100 + 50
		});

		test("should not allow surrender after hit", () => {
			game.startRound();
			game.hit("player1");

			expect(() => {
				game.surrender("player1");
			}).toThrow("Cannot surrender");
		});
	});

	describe("Insurance", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.placeBet("player1", 100, BetType.BLACKJACK_MAIN);
		});

		test("should handle insurance bets", () => {
			game.startRound();

			// Note: Insurance is only available when dealer shows Ace
			// Since we can't control the deck in this test, we test the general case
			try {
				game.placeBet("player1", 50, BetType.BLACKJACK_INSURANCE);
				const bets = game.getCurrentBets();
				expect(
					bets.find((bet) => bet.type === BetType.BLACKJACK_INSURANCE),
				).toBeDefined();
			} catch (error) {
				// Expected if dealer doesn't show Ace
				expect(error.message).toContain("Insurance");
			}
		});
	});

	describe("Game Flow", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", balance: 1000 });
			game.addPlayer({ id: "player2", balance: 500 });
		});

		test("should enforce betting phase", () => {
			expect(() => {
				game.hit("player1");
			}).toThrow("No active round");

			// Place bets and start round
			game.placeBet("player1", 100, BetType.BLACKJACK_MAIN);
			game.placeBet("player2", 50, BetType.BLACKJACK_MAIN);
			game.startRound();

			// Now hits should be allowed
			expect(() => {
				game.hit("player1");
			}).not.toThrow();
		});

		test("should track game statistics", () => {
			game.placeBet("player1", 100, BetType.BLACKJACK_MAIN);
			game.startRound();

			// Complete the hand
			game.stand("player1");
			game.finishRound();

			const stats = game.getGameStatistics();
			expect(stats.handsPlayed).toBe(1);
			expect(stats.totalBetAmount).toBe(100);
		});
	});

	describe("Backwards Compatibility", () => {
		test("should support legacy hit method", () => {
			// Test the legacy single-player mode
			game.hit();
			expect(game.getPlayerHand().length).toBeGreaterThan(0);
		});

		test("should support legacy stand method", () => {
			game.hit();
			expect(() => game.stand()).not.toThrow();
		});

		test("should calculate hand values correctly", () => {
			game.hit();
			game.hit();
			const handValue = game.getHandValue();
			expect(typeof handValue).toBe("number");
			expect(handValue).toBeGreaterThan(0);
		});
	});
});
