/**
 * Blackjack Tournament Example
 *
 * This example demonstrates how to run a multi-player blackjack tournament
 * with advanced features like splitting, doubling down, and insurance.
 */

import { BlackjackGame, BetType } from "../src/index.mts";
import type { GameResult } from "../src/games/blackjack-game.ts";

interface TournamentPlayer {
	id: string;
	name: string;
	startingBalance: number;
	currentBalance: number;
	handsWon: number;
	handsLost: number;
	totalBet: number;
}

class BlackjackTournament {
	private game: BlackjackGame;
	private players: Map<string, TournamentPlayer> = new Map();
	private rounds = 0;
	private maxRounds: number;

	constructor(maxRounds = 50) {
		this.game = new BlackjackGame();
		this.maxRounds = maxRounds;
	}

	addPlayer(id: string, name: string, startingBalance = 1000): void {
		const player: TournamentPlayer = {
			id,
			name,
			startingBalance,
			currentBalance: startingBalance,
			handsWon: 0,
			handsLost: 0,
			totalBet: 0,
		};

		this.players.set(id, player);
		this.game.addPlayer({
			id,
			name,
			balance: startingBalance,
		});
	}

	async playRound(): Promise<void> {
		if (this.rounds >= this.maxRounds) {
			console.log("Tournament completed!");
			return;
		}

		this.rounds++;
		console.log(`\n=== Round ${this.rounds} ===`);

		// Start betting phase
		this.game.startBettingPhase();

		// Players place bets (using simple strategy for demo)
		for (const [playerId, player] of this.players) {
			if (player.currentBalance <= 0) continue;

			const betAmount = Math.min(
				Math.floor(player.currentBalance * 0.1), // Bet 10% of balance
				50, // Maximum bet of 50
			);

			if (betAmount >= 5) {
				// Minimum bet
				this.game.placeBet(playerId, betAmount, BetType.BLACKJACK_MAIN);
				player.totalBet += betAmount;
				console.log(`${player.name} bets $${betAmount}`);
			}
		}

		// Start the round
		this.game.startRound();

		// Players make decisions
		for (const [playerId, player] of this.players) {
			if (player.currentBalance <= 0) continue;

			await this.playPlayerHand(playerId, player);
		}

		// Finish the round
		const results = this.game.finishRound();

		// Update player statistics
		this.updatePlayerStats(results);

		// Show round results
		this.showRoundResults();
	}

	private async playPlayerHand(
		playerId: string,
		player: TournamentPlayer,
	): Promise<void> {
		try {
			const hand = this.game.getPlayerHandMulti(playerId);
			let handValue = this.game.getPlayerHandValueMulti(playerId);

			console.log(
				`\n${player.name}'s turn - Hand: ${this.formatHand(hand)} (Value: ${handValue})`,
			);

			// Simple AI strategy for demo
			while (handValue < 17) {
				// Get current bet amount (simplified - use the bet amount from tournament)
				const betAmount = Math.min(Math.floor(player.currentBalance * 0.1), 50);

				// Check if we can double down
				if (hand.length === 2 && handValue >= 9 && handValue <= 11) {
					if (player.currentBalance >= betAmount) {
						console.log(`${player.name} doubles down!`);
						this.game.doubleDown(playerId);
						player.totalBet += betAmount;
						break;
					}
				}

				// Check if we can split (simplified)
				if (hand.length === 2 && hand[0].value === hand[1].value) {
					if (player.currentBalance >= betAmount) {
						console.log(`${player.name} splits!`);
						this.game.split(playerId);
						player.totalBet += betAmount;
						break;
					}
				}

				// Otherwise, hit
				console.log(`${player.name} hits`);
				this.game.hit(playerId);
				const newHand = this.game.getPlayerHandMulti(playerId);
				handValue = this.game.getPlayerHandValueMulti(playerId);
				console.log(
					`New hand: ${this.formatHand(newHand)} (Value: ${handValue})`,
				);

				if (handValue >= 21) break;
			}

			if (!this.game.isPlayerBustedMulti(playerId) && handValue < 21) {
				console.log(`${player.name} stands`);
				this.game.stand(playerId);
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.log(`${player.name} encountered an error:`, errorMessage);
		}
	}

	private updatePlayerStats(results: GameResult[]): void {
		for (const result of results) {
			const player = this.players.get(result.playerId);
			if (!player) continue;

			// Update player balance from game
			const gamePlayer = this.game.getPlayer(result.playerId);
			if (gamePlayer) {
				player.currentBalance = gamePlayer.balance;
			}

			// Update win/loss tracking
			if (result.result === "win" || result.result === "blackjack") {
				player.handsWon++;
			} else if (result.result === "lose") {
				player.handsLost++;
			}
			// Push is neither win nor loss
		}
	}

	private showRoundResults(): void {
		console.log("\n--- Round Results ---");
		for (const [, player] of this.players) {
			const profit = player.currentBalance - player.startingBalance;
			const profitSign = profit >= 0 ? "+" : "";
			console.log(
				`${player.name}: $${player.currentBalance} (${profitSign}$${profit})`,
			);
		}
	}

	private formatHand(hand: Array<{ rank: string; suit: string }>): string {
		return hand.map((card) => `${card.rank}${card.suit}`).join(", ");
	}

	showFinalResults(): void {
		console.log("\n🎉 TOURNAMENT RESULTS 🎉");
		console.log("========================");

		const sortedPlayers = Array.from(this.players.values()).sort(
			(a, b) => b.currentBalance - a.currentBalance,
		);

		sortedPlayers.forEach((player, index) => {
			const profit = player.currentBalance - player.startingBalance;
			const profitSign = profit >= 0 ? "+" : "";
			const winRate = (
				(player.handsWon / (player.handsWon + player.handsLost)) *
				100
			).toFixed(1);

			console.log(`${index + 1}. ${player.name}`);
			console.log(
				`   Final Balance: $${player.currentBalance} (${profitSign}$${profit})`,
			);
			console.log(
				`   Win Rate: ${winRate}% (${player.handsWon}W/${player.handsLost}L)`,
			);
			console.log(`   Total Bet: $${player.totalBet}`);
			console.log("");
		});
	}

	async runTournament(): Promise<void> {
		console.log("🃏 Starting Blackjack Tournament! 🃏");
		console.log(`Players: ${this.players.size}, Rounds: ${this.maxRounds}`);

		while (this.rounds < this.maxRounds) {
			await this.playRound();

			// Remove players who are out of money
			for (const [playerId, player] of this.players) {
				if (player.currentBalance <= 0) {
					console.log(`\n💸 ${player.name} is eliminated!`);
					this.game.removePlayer(playerId);
				}
			}

			// Check if we need to end early
			const remainingPlayers = Array.from(this.players.values()).filter(
				(p) => p.currentBalance > 0,
			);

			if (remainingPlayers.length <= 1) {
				console.log("\nTournament ended early - only one player remaining!");
				break;
			}

			// Pause between rounds (remove in real usage)
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		this.showFinalResults();
	}
}

// Example usage
async function runExample() {
	console.log("Starting tournament example...");
	const tournament = new BlackjackTournament(3); // Shorter tournament

	// Add players
	tournament.addPlayer("alice", "Alice", 1000);
	tournament.addPlayer("bob", "Bob", 1000);

	// Run the tournament
	await tournament.runTournament();
}

// Uncomment to run the example
// runExample().catch(console.error);

runExample();
