/**
 * Texas Hold'em Poker Tournament
 *
 * This example demonstrates a complete poker tournament with multiple players,
 * realistic betting strategies, and comprehensive hand evaluation.
 */

import { TexasPokerGame, PokerHandEvaluator } from "../src/index.mts";
import type { PlayingCard } from "../src/playing-card.ts";

interface TournamentPlayer {
	id: string;
	name: string;
	chips: number;
	position: number;
	handsPlayed: number;
	handsWon: number;
	totalBet: number;
	biggestPot: number;
	isActive: boolean;
	playStyle: PlayStyle;
}

type PlayStyle = "tight" | "loose" | "aggressive" | "conservative";

class PokerTournament {
	private game: TexasPokerGame;
	private players: Map<string, TournamentPlayer> = new Map();
	private handNumber: number = 0;
	private blindLevel: number = 1;
	private tournamentHands: number;

	constructor(tournamentHands: number = 100) {
		this.game = new TexasPokerGame({
			smallBlind: 25,
			bigBlind: 50,
			maxPlayers: 8,
		});
		this.tournamentHands = tournamentHands;
	}

	addPlayer(
		id: string,
		name: string,
		chips: number,
		position: number,
		playStyle: PlayStyle,
	): void {
		const player: TournamentPlayer = {
			id,
			name,
			chips,
			position,
			handsPlayed: 0,
			handsWon: 0,
			totalBet: 0,
			biggestPot: 0,
			isActive: true,
			playStyle,
		};

		this.players.set(id, player);
		this.game.addPlayer(id, name, chips);
	}

	async playHand(): Promise<void> {
		this.handNumber++;

		// Increase blinds every 25 hands
		if (this.handNumber % 25 === 0) {
			this.blindLevel++;
			const newSmallBlind = 25 * this.blindLevel;
			const newBigBlind = 50 * this.blindLevel;
			console.log(`\n🔺 BLINDS INCREASED: ${newSmallBlind}/${newBigBlind}`);

			// Note: In a real implementation, you'd update the game's blind structure
		}

		console.log(`\n♠️ Hand #${this.handNumber} ♠️`);
		console.log(`Blinds: ${25 * this.blindLevel}/${50 * this.blindLevel}`);

		try {
			// Start new hand
			this.game.startNewHand();

			// Play through all betting rounds
			await this.playBettingRounds();

			// Show results if there was a showdown
			this.showHandResults();

			// Update player statistics
			this.updatePlayerStats();
		} catch (error) {
			console.log(`Hand ${this.handNumber} error:`, (error as Error).message);
		}
	}

	private async playBettingRounds(): Promise<void> {
		const phases = ["preflop", "flop", "turn", "river"];

		for (const phase of phases) {
			if (this.game.getGamePhase() !== phase) continue;

			console.log(`\n--- ${phase.toUpperCase()} ---`);

			if (phase !== "preflop") {
				const communityCards = this.game.getCommunityCards();
				console.log(`Community: ${this.formatCards(communityCards)}`);
			}

			await this.playBettingRound();

			// Check if hand is over (all but one folded)
			const activePlayers = this.getActivePlayers();
			if (activePlayers.length <= 1) {
				console.log("Hand ended - all players folded except one");
				break;
			}
		}
	}

	private async playBettingRound(): Promise<void> {
		const activePlayers = this.getActivePlayers();

		for (const playerId of activePlayers) {
			const player = this.players.get(playerId);
			if (!player || !player.isActive) continue;

			try {
				const action = this.getPlayerAction(playerId, player);
				console.log(
					`${player.name}: ${action.action}${action.amount ? ` $${action.amount}` : ""}`,
				);

				switch (action.action) {
					case "fold":
						this.game.fold(playerId);
						break;
					case "check":
						this.game.check(playerId);
						break;
					case "call":
						this.game.call(playerId);
						break;
					case "bet":
						if (action.amount !== undefined) {
							this.game.bet(playerId, action.amount);
							player.totalBet += action.amount;
						}
						break;
					case "raise":
						if (action.amount !== undefined) {
							this.game.raise(playerId, action.amount);
							player.totalBet += action.amount;
						}
						break;
					case "all-in":
						this.game.allIn(playerId);
						player.totalBet += player.chips;
						break;
				}

				// Short delay for readability
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.log(`${player.name} action error:`, (error as Error).message);
			}
		}
	}

	private getPlayerAction(
		playerId: string,
		player: TournamentPlayer,
	): { action: string; amount?: number } {
		const playIndex = this.game
			.getPlayers()
			.findIndex((p) => p.id === playerId);
		// Simple AI decision making based on play style
		const holeCards = this.game.getPlayers()[playIndex].hand;
		const communityCards = this.game.getCommunityCards();
		const phase = this.game.getGamePhase();

		// Evaluate hand strength
		const allCards = [...holeCards, ...communityCards];
		const handEvaluation =
			allCards.length >= 5 ? PokerHandEvaluator.evaluateHand(allCards) : null;

		// Get current pot and betting info
		const currentBet = this.getCurrentBet();
		const callAmount = Math.max(
			0,
			currentBet - this.getPlayerCurrentBet(playerId),
		);

		// Basic hand strength assessment
		const handStrength = this.assessHandStrength(
			holeCards,
			communityCards,
			handEvaluation,
		);

		return this.makeDecision(
			player,
			handStrength,
			callAmount,
			this.game.getPotTotal(),
			phase,
		);
	}

	private assessHandStrength(
		holeCards: Array<{ value: number; suit: string }>,
		communityCards: Array<{ value: number; suit: string }>,
		evaluation: { rank: number; description: string } | null,
	): number {
		// Simple hand strength assessment (0-1 scale)
		if (evaluation) {
			// Post-flop evaluation based on hand rank
			switch (evaluation.rank) {
				case 8:
					return 0.99; // Straight Flush
				case 7:
					return 0.95; // Four of a Kind
				case 6:
					return 0.9; // Full House
				case 5:
					return 0.85; // Flush
				case 4:
					return 0.75; // Straight
				case 3:
					return 0.65; // Three of a Kind
				case 2:
					return 0.55; // Two Pair
				case 1:
					return 0.45; // One Pair
				default:
					return 0.3; // High Card
			}
		}

		// Pre-flop evaluation based on hole cards
		if (holeCards.length === 2) {
			const [card1, card2] = holeCards;

			// Pocket pairs
			if (card1.value === card2.value) {
				if (card1.value >= 11) return 0.9; // JJ, QQ, KK, AA
				if (card1.value >= 8) return 0.75; // 88, 99, TT
				return 0.6; // Low pairs
			}

			// Suited cards
			if (card1.suit === card2.suit) {
				if (card1.value >= 11 || card2.value >= 11) return 0.7; // High suited
				return 0.55; // Medium suited
			}

			// Offsuit high cards
			if (card1.value >= 11 && card2.value >= 11) return 0.65; // High offsuit
			if (card1.value >= 10 || card2.value >= 10) return 0.5; // Medium high

			return 0.3; // Low cards
		}

		return 0.3;
	}

	private makeDecision(
		player: TournamentPlayer,
		handStrength: number,
		callAmount: number,
		potSize: number,
		phase: string,
	): { action: string; amount?: number } {
		const chipRatio = player.chips / (25 * this.blindLevel * 20); // Ratio to starting stack
		const potOdds = callAmount > 0 ? potSize / callAmount : 0;

		// Adjust thresholds based on play style
		let foldThreshold = 0.3;
		let betThreshold = 0.7;
		let raiseThreshold = 0.8;

		switch (player.playStyle) {
			case "tight":
				foldThreshold = 0.4;
				betThreshold = 0.75;
				raiseThreshold = 0.85;
				break;
			case "loose":
				foldThreshold = 0.2;
				betThreshold = 0.6;
				raiseThreshold = 0.7;
				break;
			case "aggressive":
				betThreshold = 0.5;
				raiseThreshold = 0.6;
				break;
			case "conservative":
				foldThreshold = 0.45;
				betThreshold = 0.8;
				raiseThreshold = 0.9;
				break;
		}

		// Desperation play when low on chips
		if (chipRatio < 0.3 && handStrength > 0.4) {
			return { action: "all-in" };
		}

		// Decision logic
		if (handStrength < foldThreshold && callAmount > 0) {
			return { action: "fold" };
		}

		if (callAmount === 0) {
			if (handStrength > betThreshold) {
				const betAmount = Math.floor(
					potSize * 0.5 + Math.random() * potSize * 0.3,
				);
				return { action: "bet", amount: Math.min(betAmount, player.chips) };
			}
			return { action: "check" };
		}

		if (handStrength > raiseThreshold) {
			const raiseAmount = Math.floor(
				callAmount * 2 + Math.random() * potSize * 0.4,
			);
			return { action: "raise", amount: Math.min(raiseAmount, player.chips) };
		}

		if (handStrength > foldThreshold || potOdds > 3) {
			return { action: "call" };
		}

		return { action: "fold" };
	}

	private getCurrentBet(): number {
		// This would need to be implemented based on the game's betting state
		return 0; // Simplified for this example
	}

	private getPlayerCurrentBet(playerId: string): number {
		// This would need to be implemented based on the player's current bet
		return 0; // Simplified for this example
	}

	private getActivePlayers(): string[] {
		return Array.from(this.players.entries())
			.filter(([_, player]) => player.isActive)
			.map(([id, _]) => id);
	}

	private showHandResults(): void {
		try {
			if (this.game.getGamePhase() === "showdown") {
				const result = this.game.showdown();
				if (result) {
					console.log("\n🏆 SHOWDOWN RESULTS 🏆");
					result.winners.forEach((winner, index) => {
						const evaluation = PokerHandEvaluator.evaluateHand(winner.hand);
						console.log(
							`${index + 1}. ${winner.name}: ${evaluation.description}`,
						);
						console.log(`   Cards: ${this.formatCards(winner.hand)}`);
					});
					console.log(`💰 Pot: $${result.potWon}`);
				}
			}
		} catch (error) {
			console.log("Error showing results:", (error as Error).message);
		}
	}

	private updatePlayerStats(): void {
		for (const [playerId, player] of this.players) {
			try {
				const gamePlayer = this.game
					.getPlayers()
					.find((p) => p.id === playerId);
				if (gamePlayer) {
					const chipChange = gamePlayer.chips - player.chips;
					player.chips = gamePlayer.chips;
					player.handsPlayed++;

					if (chipChange > 0) {
						player.handsWon++;
						player.biggestPot = Math.max(player.biggestPot, chipChange);
					}

					// Eliminate players with no chips
					if (player.chips <= 0) {
						player.isActive = false;
						console.log(`\n💀 ${player.name} eliminated!`);
					}
				}
			} catch (error) {
				console.log(
					`Error updating stats for ${player.name}:`,
					(error as Error).message,
				);
			}
		}
	}

	private formatCards(cards: PlayingCard[]): string {
		return cards.map((card) => `${card.rank}${card.suit}`).join(" ");
	}

	showTournamentResults(): void {
		console.log("\n🏆 TOURNAMENT RESULTS 🏆");
		console.log("==========================");

		const sortedPlayers = Array.from(this.players.values()).sort(
			(a, b) => b.chips - a.chips,
		);

		sortedPlayers.forEach((player, index) => {
			const winRate =
				player.handsPlayed > 0
					? ((player.handsWon / player.handsPlayed) * 100).toFixed(1)
					: "0.0";
			const status = player.isActive ? "✅ Active" : "❌ Eliminated";

			console.log(`\n${index + 1}. ${player.name} (${player.playStyle})`);
			console.log(`   Chips: $${player.chips} ${status}`);
			console.log(`   Hands: ${player.handsPlayed} (Won: ${player.handsWon})`);
			console.log(`   Win Rate: ${winRate}%`);
			console.log(`   Total Bet: $${player.totalBet}`);
			console.log(`   Biggest Pot: $${player.biggestPot}`);
		});
	}

	async runTournament(): Promise<void> {
		console.log("🎲 Starting Texas Hold'em Tournament! 🎲");
		console.log(
			`Players: ${this.players.size}, Hands: ${this.tournamentHands}`,
		);

		while (this.handNumber < this.tournamentHands) {
			await this.playHand();

			// Check if tournament should end (only one player left)
			const activePlayers = Array.from(this.players.values()).filter(
				(p) => p.isActive,
			);
			if (activePlayers.length <= 1) {
				console.log("\n🎉 Tournament ended - only one player remaining!");
				break;
			}

			// Show current standings every 10 hands
			if (this.handNumber % 10 === 0) {
				this.showCurrentStandings();
			}
		}

		this.showTournamentResults();
	}

	private showCurrentStandings(): void {
		console.log("\n📊 Current Standings:");
		const activePlayers = Array.from(this.players.values())
			.filter((p) => p.isActive)
			.sort((a, b) => b.chips - a.chips);

		activePlayers.forEach((player, index) => {
			console.log(`${index + 1}. ${player.name}: $${player.chips}`);
		});
	}
}

// Example usage
async function runExample() {
	const tournament = new PokerTournament(50);

	// Add players with different play styles
	tournament.addPlayer("alice", "Alice", 1500, 0, "tight");
	tournament.addPlayer("bob", "Bob", 1500, 1, "aggressive");
	tournament.addPlayer("charlie", "Charlie", 1500, 2, "loose");
	tournament.addPlayer("diana", "Diana", 1500, 3, "conservative");
	tournament.addPlayer("eve", "Eve", 1500, 4, "aggressive");
	tournament.addPlayer("frank", "Frank", 1500, 5, "tight");

	// Run the tournament
	await tournament.runTournament();
}

// Uncomment to run the example
// runExample().catch(console.error);
await runExample();
