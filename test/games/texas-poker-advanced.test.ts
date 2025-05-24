import { TexasPokerGame } from "../../src/games/texas-poker-game";

describe("TexasPokerGame - Advanced Features", () => {
	let game: TexasPokerGame;

	beforeEach(() => {
		game = new TexasPokerGame();
	});

	describe("Advanced Player Management", () => {
		test("should handle multiple players with complex scenarios", () => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			game.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });

			expect(game.getPlayers()).toHaveLength(3);
			expect(game.getCurrentPlayer()?.id).toBe("player1");
		});

		test("should manage dealer position rotation", () => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			game.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });

			game.startNewHand();
			const dealerPos1 = game.getDealerPosition();

			game.finishHand();
			game.startNewHand();
			const dealerPos2 = game.getDealerPosition();

			expect(dealerPos2).toBe((dealerPos1 + 1) % 3);
		});
	});

	describe("Comprehensive Betting System", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			game.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });
			game.startNewHand();
		});

		test("should handle all betting actions", () => {
			// Test check
			game.check("player1");
			expect(game.getCurrentBet("player1")).toBe(50); // Big blind

			// Test call
			game.call("player2");
			expect(game.getCurrentBet("player2")).toBe(50);

			// Test raise
			game.raise("player3", 100);
			expect(game.getCurrentBet("player3")).toBe(150);

			// Test fold
			game.fold("player1");
			expect(game.getPlayer("player1")?.isActive).toBe(false);
		});

		test("should handle all-in scenarios", () => {
			// Player with limited chips goes all-in
			game.updatePlayerChips("player1", 75);
			
			game.allIn("player1");
			expect(game.getCurrentBet("player1")).toBe(75);
			expect(game.getPlayer("player1")?.isAllIn).toBe(true);
		});

		test("should validate betting actions", () => {
			// Test invalid raise (too small)
			expect(() => {
				game.raise("player1", 10); // Less than minimum raise
			}).toThrow("Raise amount must be at least");

			// Test insufficient chips
			expect(() => {
				game.raise("player1", 2000); // More than player has
			}).toThrow("Insufficient chips");

			// Test action out of turn
			expect(() => {
				game.bet("player3", 100); // Not current player's turn
			}).toThrow("Not player's turn");
		});
	});

	describe("Game Flow Management", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			game.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });
		});

		test("should progress through betting rounds", () => {
			game.startNewHand();
			expect(game.getCurrentPhase()).toBe("preflop");

			// Complete preflop betting
			game.call("player1");
			game.call("player2");
			game.check("player3");

			expect(game.getCurrentPhase()).toBe("flop");
			expect(game.getCommunityCards()).toHaveLength(3);

			// Complete flop betting
			game.check("player1");
			game.check("player2");
			game.check("player3");

			expect(game.getCurrentPhase()).toBe("turn");
			expect(game.getCommunityCards()).toHaveLength(4);

			// Complete turn betting
			game.check("player1");
			game.check("player2");
			game.check("player3");

			expect(game.getCurrentPhase()).toBe("river");
			expect(game.getCommunityCards()).toHaveLength(5);
		});

		test("should handle showdown correctly", () => {
			game.startNewHand();

			// All players call to showdown
			game.call("player1");
			game.call("player2");
			game.check("player3");

			// Flop
			game.check("player1");
			game.check("player2");
			game.check("player3");

			// Turn
			game.check("player1");
			game.check("player2");
			game.check("player3");

			// River
			game.check("player1");
			game.check("player2");
			game.check("player3");

			// Should now be in showdown
			expect(game.getCurrentPhase()).toBe("showdown");

			const result = game.getShowdownResult();
			expect(result).toBeDefined();
			expect(result?.winners).toHaveLength(1);
			expect(result?.potAmount).toBeGreaterThan(0);
		});
	});

	describe("Pot Management", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			game.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });
			game.startNewHand();
		});

		test("should calculate pot correctly", () => {
			const initialPot = game.getPot();
			expect(initialPot).toBe(75); // Small blind + big blind

			game.raise("player1", 100);
			expect(game.getPot()).toBe(125); // 75 + 50 (additional from player1)

			game.call("player2");
			expect(game.getPot()).toBe(200); // 125 + 75 (call amount)
		});

		test("should handle side pots with all-in players", () => {
			// Set up scenario where one player has limited chips
			game.updatePlayerChips("player1", 100);
			
			game.allIn("player1"); // 100 chips
			game.raise("player2", 200); // 250 total
			game.call("player3"); // 250 total

			const potInfo = game.getPotInfo();
			expect(potInfo.mainPot).toBe(300); // 100 * 3 players
			expect(potInfo.sidePots).toHaveLength(1);
			expect(potInfo.sidePots[0].amount).toBe(300); // (250-100) * 2 players
		});
	});

	describe("Hand Evaluation Integration", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
		});

		test("should evaluate hands correctly at showdown", () => {
			game.startNewHand();

			// Fast-forward to showdown
			game.call("player1");
			game.check("player2");

			// Skip to showdown by checking through all rounds
			["flop", "turn", "river"].forEach(() => {
				game.check("player1");
				game.check("player2");
			});

			const result = game.getShowdownResult();
			expect(result).toBeDefined();
			expect(result?.winners).toHaveLength(1);
			expect(result?.handEvaluations).toHaveLength(2);

			// Check that hand evaluations are valid
			result?.handEvaluations.forEach(eval => {
				expect(eval.rank).toBeGreaterThanOrEqual(0);
				expect(eval.description).toBeDefined();
				expect(eval.cards).toHaveLength(5);
			});
		});
	});

	describe("Game Statistics and History", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
		});

		test("should track hand statistics", () => {
			const initialHandNumber = game.getHandNumber();
			
			game.startNewHand();
			game.fold("player1");
			game.finishHand();

			expect(game.getHandNumber()).toBe(initialHandNumber + 1);
		});

		test("should track betting rounds", () => {
			game.startNewHand();
			
			game.raise("player1", 100);
			game.call("player2");

			const bettingRounds = game.getBettingRounds();
			expect(bettingRounds).toHaveLength(1);
			expect(bettingRounds[0].totalPot).toBeGreaterThan(0);
			expect(bettingRounds[0].actions).toHaveLength(2);
		});
	});

	describe("Advanced Game Settings", () => {
		test("should support custom blinds", () => {
			const customGame = new TexasPokerGame({
				smallBlind: 10,
				bigBlind: 20,
				maxPlayers: 6
			});

			customGame.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			customGame.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
			customGame.startNewHand();

			expect(customGame.getSmallBlind()).toBe(10);
			expect(customGame.getBigBlind()).toBe(20);
		});

		test("should enforce player limits", () => {
			const limitedGame = new TexasPokerGame({ maxPlayers: 2 });

			limitedGame.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			limitedGame.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });

			expect(() => {
				limitedGame.addPlayer({ id: "player3", name: "Charlie", chips: 2000, position: 2 });
			}).toThrow("Maximum number of players");
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
		});

		test("should handle invalid player actions", () => {
			expect(() => {
				game.bet("nonexistent", 100);
			}).toThrow("Player nonexistent not found");

			expect(() => {
				game.fold("player1"); // Before hand starts
			}).toThrow("No active hand");
		});

		test("should handle game state errors", () => {
			game.startNewHand();
			
			expect(() => {
				game.startNewHand(); // Hand already in progress
			}).toThrow("Hand already in progress");
		});
	});

	describe("Legacy Compatibility", () => {
		test("should support legacy methods", () => {
			game.addPlayer({ id: "player1", name: "Alice", chips: 1000, position: 0 });
			
			// Test legacy bet method
			expect(() => {
				game.bet("player1", 100);
			}).not.toThrow();

			// Test legacy getPot method
			const pot = game.getPot();
			expect(typeof pot).toBe("number");
			expect(pot).toBeGreaterThanOrEqual(0);
		});

		test("should maintain simple game flow", () => {
			// Test the old simple game pattern
			game.startNewGame();
			
			// Should be able to get pot without errors
			const pot = game.getPot();
			expect(pot).toBeGreaterThanOrEqual(0);
		});
	});
});
