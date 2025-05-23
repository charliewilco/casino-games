import { describe, expect, test } from "@jest/globals";
import { TexasPokerGame } from "../../src/games/texas-poker-game";

describe("TexasPokerGame", () => {
	test("should create a new poker game", () => {
		const game = new TexasPokerGame();
		expect(game).toBeInstanceOf(TexasPokerGame);
		expect(game.getPlayers()).toHaveLength(0);
		expect(game.getCommunityCards()).toHaveLength(0);
		expect(game.getPot()).toBe(0);
	});

	test("should add players to the game", () => {
		const game = new TexasPokerGame();
		game.addPlayer("player1", "Alice", 1000);
		game.addPlayer("player2", "Bob", 1500);

		const players = game.getPlayers();
		expect(players).toHaveLength(2);
		expect(players[0].name).toBe("Alice");
		expect(players[0].chips).toBe(1000);
		expect(players[1].name).toBe("Bob");
		expect(players[1].chips).toBe(1500);
	});

	test("should not allow more than 10 players", () => {
		const game = new TexasPokerGame();

		// Add 10 players
		for (let i = 0; i < 10; i++) {
			game.addPlayer(`player${i}`, `Player ${i}`);
		}

		// Adding 11th player should throw
		expect(() => game.addPlayer("player11", "Player 11")).toThrow(
			"Maximum 10 players allowed",
		);
	});

	test("should start a new game with at least 2 players", () => {
		const game = new TexasPokerGame();

		// Should fail with no players
		expect(() => game.startNewGame()).toThrow("At least 2 players required");

		// Add one player
		game.addPlayer("player1", "Alice");
		expect(() => game.startNewGame()).toThrow("At least 2 players required");

		// Add second player
		game.addPlayer("player2", "Bob");
		game.startNewGame();

		// Each player should have 2 hole cards
		const players = game.getPlayers();
		expect(players[0].hand).toHaveLength(2);
		expect(players[1].hand).toHaveLength(2);
		expect(game.getGamePhase()).toBe("preflop");
	});

	test("should deal community cards in correct phases", () => {
		const game = new TexasPokerGame();
		game.addPlayer("player1", "Alice");
		game.addPlayer("player2", "Bob");
		game.startNewGame();

		// Flop: 3 community cards
		game.flop();
		expect(game.getCommunityCards()).toHaveLength(3);
		expect(game.getGamePhase()).toBe("flop");

		// Turn: 1 more community card
		game.turn();
		expect(game.getCommunityCards()).toHaveLength(4);
		expect(game.getGamePhase()).toBe("turn");

		// River: 1 more community card
		game.river();
		expect(game.getCommunityCards()).toHaveLength(5);
		expect(game.getGamePhase()).toBe("river");
	});

	test("should handle player actions", () => {
		const game = new TexasPokerGame();
		game.addPlayer("player1", "Alice", 1000);
		game.addPlayer("player2", "Bob", 1000);
		game.startNewGame();

		// Test betting
		game.bet("player1", 100);
		const players = game.getPlayers();
		expect(players[0].chips).toBe(900);
		expect(players[0].currentBet).toBe(100);
		expect(game.getPot()).toBe(100);

		// Test folding
		game.fold("player2");
		expect(players[1].folded).toBe(true);
	});

	test("should not allow invalid bets", () => {
		const game = new TexasPokerGame();
		game.addPlayer("player1", "Alice", 100);
		game.addPlayer("player2", "Bob", 100);
		game.startNewGame();

		// Bet more than chips
		expect(() => game.bet("player1", 200)).toThrow("Insufficient chips");

		// Bet for non-existent player
		expect(() => game.bet("player999", 50)).toThrow("Player not found");
	});
});
