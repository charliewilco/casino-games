/**
 * Multi-Game Casino Platform
 *
 * This example demonstrates how to integrate all three casino games
 * into a unified platform with shared player management and statistics.
 */

import {
	BlackjackGame,
	RouletteGame,
	TexasPokerGame,
	PokerHandEvaluator,
	BetType,
} from "../src/index.mts";

interface CasinoPlayer {
	id: string;
	name: string;
	totalBalance: number;
	blackjackStats: GameStats;
	rouletteStats: GameStats;
	pokerStats: GameStats;
	joinedAt: Date;
	lastActivity: Date;
	vipLevel: "Bronze" | "Silver" | "Gold" | "Platinum";
}

interface GameStats {
	gamesPlayed: number;
	totalWagered: number;
	totalWon: number;
	biggestWin: number;
	biggestLoss: number;
	currentStreak: number;
	bestStreak: number;
}

interface CasinoTable {
	id: string;
	gameType: "blackjack" | "roulette" | "poker";
	name: string;
	minBet: number;
	maxBet: number;
	players: Set<string>;
	isActive: boolean;
	game: BlackjackGame | RouletteGame | TexasPokerGame;
}

class MultiGameCasino {
	private players: Map<string, CasinoPlayer> = new Map();
	private tables: Map<string, CasinoTable> = new Map();
	private gameHistory: Array<{
		playerId: string;
		gameType: string;
		tableId: string;
		action: string;
		amount: number;
		result: number;
		timestamp: Date;
	}> = [];

	constructor() {
		this.initializeTables();
	}

	private initializeTables(): void {
		// Blackjack tables
		this.createTable("bj-low", "blackjack", "Blackjack - Low Stakes", 5, 100);
		this.createTable(
			"bj-high",
			"blackjack",
			"Blackjack - High Stakes",
			25,
			500,
		);
		this.createTable("bj-vip", "blackjack", "Blackjack - VIP", 100, 2000);

		// Roulette tables
		this.createTable("roulette-euro", "roulette", "European Roulette", 1, 1000);
		this.createTable(
			"roulette-american",
			"roulette",
			"American Roulette",
			1,
			1000,
		);

		// Poker tables
		this.createTable("poker-casual", "poker", "Casual Texas Hold'em", 10, 200);
		this.createTable("poker-serious", "poker", "High Stakes Poker", 50, 1000);
	}

	private createTable(
		id: string,
		gameType: "blackjack" | "roulette" | "poker",
		name: string,
		minBet: number,
		maxBet: number,
	): void {
		let game: BlackjackGame | RouletteGame | TexasPokerGame;

		switch (gameType) {
			case "blackjack":
				game = new BlackjackGame();
				break;
			case "roulette":
				game = new RouletteGame(id === "roulette-american", {
					minBet,
					maxBet,
					maxStraightUp: Math.floor(maxBet * 0.1),
				});
				break;
			case "poker":
				game = new TexasPokerGame({
					smallBlind: Math.floor(minBet / 2),
					bigBlind: minBet,
					maxPlayers: 8,
				});
				break;
		}

		const table: CasinoTable = {
			id,
			gameType,
			name,
			minBet,
			maxBet,
			players: new Set(),
			isActive: true,
			game,
		};

		this.tables.set(id, table);
	}

	// Player Management
	registerPlayer(
		id: string,
		name: string,
		initialBalance: number = 1000,
	): CasinoPlayer {
		const player: CasinoPlayer = {
			id,
			name,
			totalBalance: initialBalance,
			blackjackStats: this.createEmptyStats(),
			rouletteStats: this.createEmptyStats(),
			pokerStats: this.createEmptyStats(),
			joinedAt: new Date(),
			lastActivity: new Date(),
			vipLevel: "Bronze",
		};

		this.players.set(id, player);
		console.log(
			`🎰 Welcome ${name} to the casino! Starting balance: $${initialBalance}`,
		);
		return player;
	}

	private createEmptyStats(): GameStats {
		return {
			gamesPlayed: 0,
			totalWagered: 0,
			totalWon: 0,
			biggestWin: 0,
			biggestLoss: 0,
			currentStreak: 0,
			bestStreak: 0,
		};
	}

	// Table Management
	joinTable(playerId: string, tableId: string): boolean {
		const player = this.players.get(playerId);
		const table = this.tables.get(tableId);

		if (!player || !table) {
			console.log("❌ Player or table not found");
			return false;
		}

		if (player.totalBalance < table.minBet) {
			console.log(
				`❌ Insufficient funds. Minimum balance required: $${table.minBet}`,
			);
			return false;
		}

		// Add player to table's game
		try {
			if (table.gameType === "blackjack") {
				(table.game as BlackjackGame).addPlayer({
					id: playerId,
					name: player.name,
					balance: player.totalBalance,
				});
			} else if (table.gameType === "roulette") {
				(table.game as RouletteGame).addPlayer({
					id: playerId,
					balance: player.totalBalance,
				});
			} else if (table.gameType === "poker") {
				(table.game as TexasPokerGame).addPlayer({
					id: playerId,
					name: player.name,
					chips: player.totalBalance,
					position: table.players.size,
				});
			}

			table.players.add(playerId);
			player.lastActivity = new Date();

			console.log(`✅ ${player.name} joined ${table.name}`);
			return true;
		} catch (error) {
			console.log(`❌ Failed to join table: ${error.message}`);
			return false;
		}
	}

	leaveTable(playerId: string, tableId: string): boolean {
		const player = this.players.get(playerId);
		const table = this.tables.get(tableId);

		if (!player || !table || !table.players.has(playerId)) {
			return false;
		}

		try {
			// Update player balance from game
			if (table.gameType === "blackjack") {
				const gamePlayer = (table.game as BlackjackGame).getPlayer(playerId);
				if (gamePlayer) player.totalBalance = gamePlayer.balance;
				(table.game as BlackjackGame).removePlayer(playerId);
			} else if (table.gameType === "roulette") {
				const gamePlayer = (table.game as RouletteGame).getPlayer(playerId);
				if (gamePlayer) player.totalBalance = gamePlayer.balance;
				(table.game as RouletteGame).removePlayer(playerId);
			} else if (table.gameType === "poker") {
				const gamePlayer = (table.game as TexasPokerGame).getPlayer(playerId);
				if (gamePlayer) player.totalBalance = gamePlayer.chips;
				(table.game as TexasPokerGame).removePlayer(playerId);
			}

			table.players.delete(playerId);
			console.log(`👋 ${player.name} left ${table.name}`);
			return true;
		} catch (error) {
			console.log(`❌ Failed to leave table: ${error.message}`);
			return false;
		}
	}

	// Game-specific actions
	async playBlackjackHand(
		playerId: string,
		tableId: string,
		betAmount: number,
	): Promise<void> {
		const table = this.tables.get(tableId);
		if (!table || table.gameType !== "blackjack") return;

		const game = table.game as BlackjackGame;
		const player = this.players.get(playerId);
		if (!player) return;

		try {
			// Place bet and start round
			game.placeBet(playerId, betAmount, BetType.BLACKJACK_MAIN);
			game.startRound();

			console.log(`\n🃏 ${player.name} playing blackjack - Bet: $${betAmount}`);

			// Simple AI play
			let handValue = game.getPlayerHandValue(playerId);
			const hand = game.getPlayerHand(playerId);

			console.log(`Hand: ${this.formatCards(hand)} (${handValue})`);

			// Basic strategy
			while (handValue < 17) {
				game.hit(playerId);
				handValue = game.getPlayerHandValue(playerId);
				const newHand = game.getPlayerHand(playerId);
				console.log(`Hit: ${this.formatCards(newHand)} (${handValue})`);

				if (handValue >= 21) break;
			}

			if (handValue < 21) {
				game.stand(playerId);
				console.log(`${player.name} stands with ${handValue}`);
			}

			// Finish round and get results
			const results = game.finishRound();

			// Update statistics
			this.updateGameStats(playerId, "blackjack", betAmount, results);
		} catch (error) {
			console.log(`❌ Blackjack error: ${error.message}`);
		}
	}

	async spinRoulette(
		playerId: string,
		tableId: string,
		bets: Array<{ type: BetType; amount: number; numbers?: number[] }>,
	): Promise<void> {
		const table = this.tables.get(tableId);
		if (!table || table.gameType !== "roulette") return;

		const game = table.game as RouletteGame;
		const player = this.players.get(playerId);
		if (!player) return;

		try {
			console.log(`\n🎰 ${player.name} playing roulette`);

			// Place all bets
			let totalBet = 0;
			for (const bet of bets) {
				game.placeBet(playerId, {
					type: bet.type,
					amount: bet.amount,
					numbers: bet.numbers || [],
					playerId,
				});
				totalBet += bet.amount;
				console.log(`Bet: ${this.getBetDescription(bet)} - $${bet.amount}`);
			}

			// Spin the wheel
			const result = game.spin();
			console.log(
				`🎯 Winning number: ${result.winningNumber} (${result.color})`,
			);

			const winnings = result.totalWinnings[playerId] || 0;
			const netResult = winnings - totalBet;

			console.log(
				`${player.name} ${netResult >= 0 ? "won" : "lost"} $${Math.abs(netResult)}`,
			);

			// Update statistics
			this.updateGameStats(playerId, "roulette", totalBet, {
				netWinnings: netResult,
			});
		} catch (error) {
			console.log(`❌ Roulette error: ${error.message}`);
		}
	}

	async playPokerHand(playerId: string, tableId: string): Promise<void> {
		const table = this.tables.get(tableId);
		if (!table || table.gameType !== "poker") return;

		const game = table.game as TexasPokerGame;
		const player = this.players.get(playerId);
		if (!player) return;

		try {
			console.log(`\n🎲 ${player.name} playing poker`);

			// This would involve complex poker AI - simplified for example
			game.startNewHand();

			// Simple AI actions
			const holeCards = game.getPlayerHoleCards(playerId);
			console.log(`Hole cards: ${this.formatCards(holeCards)}`);

			// Basic preflop action
			if (Math.random() > 0.3) {
				game.call(playerId);
				console.log(`${player.name} calls`);
			} else {
				game.fold(playerId);
				console.log(`${player.name} folds`);
				return;
			}

			// Continue through betting rounds...
			// (Simplified for this example)
		} catch (error) {
			console.log(`❌ Poker error: ${error.message}`);
		}
	}

	// Statistics and Reporting
	private updateGameStats(
		playerId: string,
		gameType: "blackjack" | "roulette" | "poker",
		wagered: number,
		results: any,
	): void {
		const player = this.players.get(playerId);
		if (!player) return;

		let stats: GameStats;
		switch (gameType) {
			case "blackjack":
				stats = player.blackjackStats;
				break;
			case "roulette":
				stats = player.rouletteStats;
				break;
			case "poker":
				stats = player.pokerStats;
				break;
		}

		stats.gamesPlayed++;
		stats.totalWagered += wagered;

		// Calculate winnings (simplified)
		const netWinnings = results.netWinnings || 0;
		stats.totalWon += Math.max(0, netWinnings);

		if (netWinnings > 0) {
			stats.biggestWin = Math.max(stats.biggestWin, netWinnings);
			stats.currentStreak = Math.max(0, stats.currentStreak) + 1;
			stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
		} else {
			stats.biggestLoss = Math.max(stats.biggestLoss, Math.abs(netWinnings));
			stats.currentStreak = Math.min(0, stats.currentStreak) - 1;
		}

		// Update VIP level based on total wagered
		this.updateVipLevel(player);

		// Record in history
		this.gameHistory.push({
			playerId,
			gameType,
			tableId: "", // Would need to track current table
			action: "game_result",
			amount: wagered,
			result: netWinnings,
			timestamp: new Date(),
		});
	}

	private updateVipLevel(player: CasinoPlayer): void {
		const totalWagered =
			player.blackjackStats.totalWagered +
			player.rouletteStats.totalWagered +
			player.pokerStats.totalWagered;

		const oldLevel = player.vipLevel;

		if (totalWagered >= 100000) player.vipLevel = "Platinum";
		else if (totalWagered >= 50000) player.vipLevel = "Gold";
		else if (totalWagered >= 20000) player.vipLevel = "Silver";
		else player.vipLevel = "Bronze";

		if (player.vipLevel !== oldLevel) {
			console.log(
				`🌟 ${player.name} promoted to ${player.vipLevel} VIP level!`,
			);
		}
	}

	// Utility methods
	private formatCards(cards: any[]): string {
		return cards.map((card) => `${card.text}${card.suit}`).join(" ");
	}

	private getBetDescription(bet: {
		type: BetType;
		numbers?: number[];
	}): string {
		switch (bet.type) {
			case BetType.ROULETTE_RED:
				return "Red";
			case BetType.ROULETTE_BLACK:
				return "Black";
			case BetType.ROULETTE_STRAIGHT_UP:
				return `Straight-up ${bet.numbers?.[0]}`;
			case BetType.ROULETTE_SPLIT:
				return `Split ${bet.numbers?.join(",")}`;
			default:
				return "Unknown bet";
		}
	}

	// Public reporting methods
	getPlayerStats(playerId: string): CasinoPlayer | null {
		return this.players.get(playerId) || null;
	}

	getCasinoSummary(): any {
		const totalPlayers = this.players.size;
		const activeTables = Array.from(this.tables.values()).filter(
			(t) => t.isActive,
		).length;
		const totalWagered = Array.from(this.players.values()).reduce(
			(sum, player) =>
				sum +
				player.blackjackStats.totalWagered +
				player.rouletteStats.totalWagered +
				player.pokerStats.totalWagered,
			0,
		);

		return {
			totalPlayers,
			activeTables,
			totalWagered,
			totalGames: this.gameHistory.length,
			vipDistribution: this.getVipDistribution(),
		};
	}

	private getVipDistribution(): Record<string, number> {
		const distribution = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
		for (const player of this.players.values()) {
			distribution[player.vipLevel]++;
		}
		return distribution;
	}

	showDetailedReport(): void {
		console.log("\n🏛️  CASINO REPORT 🏛️");
		console.log("======================");

		const summary = this.getCasinoSummary();
		console.log(`Total Players: ${summary.totalPlayers}`);
		console.log(`Active Tables: ${summary.activeTables}`);
		console.log(`Total Wagered: $${summary.totalWagered.toLocaleString()}`);
		console.log(`Total Games: ${summary.totalGames}`);

		console.log("\nVIP Distribution:");
		Object.entries(summary.vipDistribution).forEach(([level, count]) => {
			console.log(`  ${level}: ${count} players`);
		});

		console.log("\nTop Players by Total Wagered:");
		const topPlayers = Array.from(this.players.values())
			.sort((a, b) => {
				const aTotalWagered =
					a.blackjackStats.totalWagered +
					a.rouletteStats.totalWagered +
					a.pokerStats.totalWagered;
				const bTotalWagered =
					b.blackjackStats.totalWagered +
					b.rouletteStats.totalWagered +
					b.pokerStats.totalWagered;
				return bTotalWagered - aTotalWagered;
			})
			.slice(0, 5);

		topPlayers.forEach((player, index) => {
			const totalWagered =
				player.blackjackStats.totalWagered +
				player.rouletteStats.totalWagered +
				player.pokerStats.totalWagered;
			const totalWon =
				player.blackjackStats.totalWon +
				player.rouletteStats.totalWon +
				player.pokerStats.totalWon;
			const netPL = totalWon - totalWagered;
			console.log(
				`${index + 1}. ${player.name} (${player.vipLevel}) - Wagered: $${totalWagered.toLocaleString()}, P&L: ${netPL >= 0 ? "+" : ""}$${netPL.toLocaleString()}`,
			);
		});
	}
}

// Example usage
async function runCasinoExample() {
	const casino = new MultiGameCasino();

	// Register players
	casino.registerPlayer("alice", "Alice", 2000);
	casino.registerPlayer("bob", "Bob", 1500);
	casino.registerPlayer("charlie", "Charlie", 3000);
	casino.registerPlayer("diana", "Diana", 1000);

	// Players join different tables
	casino.joinTable("alice", "bj-low");
	casino.joinTable("bob", "roulette-euro");
	casino.joinTable("charlie", "poker-casual");
	casino.joinTable("diana", "bj-high");

	// Simulate some gameplay
	await casino.playBlackjackHand("alice", "bj-low", 25);
	await casino.playBlackjackHand("diana", "bj-high", 100);

	await casino.spinRoulette("bob", "roulette-euro", [
		{ type: BetType.ROULETTE_RED, amount: 50 },
		{ type: BetType.ROULETTE_STRAIGHT_UP, amount: 10, numbers: [7] },
	]);

	await casino.playPokerHand("charlie", "poker-casual");

	// Show final report
	casino.showDetailedReport();
}

// Uncomment to run the example
// runCasinoExample().catch(console.error);

export { MultiGameCasino };
