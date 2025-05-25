/**
 * Roulette Casino Simulation
 *
 * This example demonstrates a comprehensive roulette game with multiple players,
 * various betting strategies, and realistic casino simulation.
 */

import { RouletteGame, BetType } from "../src/index.mts";

interface CasinoPlayer {
	id: string;
	name: string;
	balance: number;
	strategy: BettingStrategy;
	betsPlaced: number;
	totalWagered: number;
	totalWon: number;
}

type BettingStrategy = "conservative" | "aggressive" | "martingale" | "random";

class RouletteSimulation {
	private game: RouletteGame;
	private players: Map<string, CasinoPlayer> = new Map();
	private spins: number = 0;
	private history: Array<{ number: number; color: string; spin: number }> = [];

	constructor(useAmericanWheel: boolean = false) {
		this.game = new RouletteGame(useAmericanWheel, {
			minBet: 5,
			maxBet: 500,
			maxStraightUp: 100,
		});
	}

	addPlayer(
		id: string,
		name: string,
		balance: number,
		strategy: BettingStrategy,
	): void {
		const player: CasinoPlayer = {
			id,
			name,
			balance,
			strategy,
			betsPlaced: 0,
			totalWagered: 0,
			totalWon: 0,
		};

		this.players.set(id, player);
		this.game.addPlayer({ id, balance });
	}

	playSpin(): void {
		this.spins++;
		console.log(`\n🎰 Spin #${this.spins} 🎰`);

		// Each player places bets according to their strategy
		for (const [playerId, player] of this.players) {
			if (player.balance < 5) {
				console.log(`${player.name} is out of money!`);
				continue;
			}

			this.placeBetsForPlayer(playerId, player);
		}

		// Spin the wheel
		const result = this.game.spin();
		console.log(
			`\n🎯 Winning number: ${result.winningNumber} (${result.color})`,
		);

		// Track history
		this.history.push({
			number: result.winningNumber,
			color: result.color,
			spin: this.spins,
		});

		// Update player balances and show results
		this.updatePlayerBalances(result);
		this.showSpinResults(result);
	}

	private placeBetsForPlayer(playerId: string, player: CasinoPlayer): void {
		console.log(
			`\n${player.name} (${player.strategy} strategy) - Balance: $${player.balance}`,
		);

		switch (player.strategy) {
			case "conservative":
				this.conservativeBetting(playerId, player);
				break;
			case "aggressive":
				this.aggressiveBetting(playerId, player);
				break;
			case "martingale":
				this.martingaleBetting(playerId, player);
				break;
			case "random":
				this.randomBetting(playerId, player);
				break;
		}
	}

	private conservativeBetting(playerId: string, player: CasinoPlayer): void {
		// Bet small amounts on outside bets (high probability, low payout)
		const betAmount = Math.min(10, Math.floor(player.balance * 0.02));

		if (betAmount >= 5) {
			// Bet on red
			this.game.placeBet(playerId, {
				type: BetType.ROULETTE_RED,
				amount: betAmount,
				numbers: [],
			});

			// Sometimes bet on even too
			if (player.balance >= betAmount * 2) {
				this.game.placeBet(playerId, {
					type: BetType.ROULETTE_EVEN,
					amount: betAmount,
					numbers: [],
				});
				player.totalWagered += betAmount * 2;
				player.betsPlaced += 2;
				console.log(`  Bets: Red $${betAmount}, Even $${betAmount}`);
			} else {
				player.totalWagered += betAmount;
				player.betsPlaced += 1;
				console.log(`  Bet: Red $${betAmount}`);
			}
		}
	}

	private aggressiveBetting(playerId: string, player: CasinoPlayer): void {
		// Mix of inside and outside bets
		const baseAmount = Math.min(25, Math.floor(player.balance * 0.1));

		if (baseAmount >= 5) {
			// Straight up bet on lucky number
			const luckyNumber = (Number.parseInt(playerId.slice(-1)) || 7) % 37;
			this.game.placeBet(playerId, {
				type: BetType.ROULETTE_STRAIGHT_UP,
				amount: Math.min(baseAmount, 50),
				numbers: [luckyNumber],
			});

			// Corner bet
			this.game.placeBet(playerId, {
				type: BetType.ROULETTE_CORNER,
				amount: baseAmount,
				numbers: [1, 2, 4, 5], // Corner covering 1,2,4,5
			});

			player.totalWagered += baseAmount * 2;
			player.betsPlaced += 2;
			console.log(
				`  Bets: Straight-up #${luckyNumber} $${Math.min(baseAmount, 50)}, Corner $${baseAmount}`,
			);
		}
	}

	private martingaleBetting(playerId: string, player: CasinoPlayer): void {
		// Double bet after losses on even money bets
		let betAmount =
			player.betsPlaced === 0 ? 5 : this.calculateMartingaleBet(player);
		betAmount = Math.min(betAmount, player.balance, 100);

		if (betAmount >= 5) {
			this.game.placeBet(playerId, {
				type: BetType.ROULETTE_BLACK,
				amount: betAmount,
				numbers: [],
			});

			player.totalWagered += betAmount;
			player.betsPlaced += 1;
			console.log(`  Bet: Black $${betAmount} (Martingale)`);
		}
	}

	private randomBetting(playerId: string, player: CasinoPlayer): void {
		// Random mix of different bet types
		const betTypes = [
			BetType.ROULETTE_RED,
			BetType.ROULETTE_BLACK,
			BetType.ROULETTE_ODD,
			BetType.ROULETTE_EVEN,
			BetType.ROULETTE_FIRST_DOZEN,
			BetType.ROULETTE_SECOND_DOZEN,
			BetType.ROULETTE_THIRD_DOZEN,
		];

		const randomBetType = betTypes[Math.floor(Math.random() * betTypes.length)];
		const betAmount = Math.min(
			5 + Math.floor(Math.random() * 20),
			Math.floor(player.balance * 0.15),
		);

		if (betAmount >= 5) {
			this.game.placeBet(playerId, {
				type: randomBetType,
				amount: betAmount,
				numbers: [],
			});

			player.totalWagered += betAmount;
			player.betsPlaced += 1;
			console.log(`  Bet: ${this.getBetTypeName(randomBetType)} $${betAmount}`);
		}
	}

	private calculateMartingaleBet(player: CasinoPlayer): number {
		// Simple martingale: double after loss
		const lastResult = this.history[this.history.length - 1];
		if (lastResult && lastResult.color !== "black") {
			return Math.min(
				player.balance,
				10 * 2 ** Math.min(4, player.betsPlaced % 5),
			);
		}
		return 5;
	}

	private getBetTypeName(betType: BetType): string {
		switch (betType) {
			case BetType.ROULETTE_RED:
				return "Red";
			case BetType.ROULETTE_BLACK:
				return "Black";
			case BetType.ROULETTE_ODD:
				return "Odd";
			case BetType.ROULETTE_EVEN:
				return "Even";
			case BetType.ROULETTE_FIRST_DOZEN:
				return "1st Dozen";
			case BetType.ROULETTE_SECOND_DOZEN:
				return "2nd Dozen";
			case BetType.ROULETTE_THIRD_DOZEN:
				return "3rd Dozen";
			default:
				return "Unknown";
		}
	}

	private updatePlayerBalances(result: {
		totalWinnings: { [playerId: string]: number };
	}): void {
		for (const [playerId, player] of this.players) {
			const gamePlayer = this.game.getPlayer(playerId);
			if (gamePlayer) {
				const winnings = result.totalWinnings[playerId] || 0;
				player.totalWon += winnings;
				player.balance = gamePlayer.balance;
			}
		}
	}

	private showSpinResults(result: {
		totalWinnings: { [playerId: string]: number };
	}): void {
		console.log("\n--- Spin Results ---");
		for (const [playerId, player] of this.players) {
			const winnings = result.totalWinnings[playerId] || 0;
			const status = winnings > 0 ? `WON $${winnings}! 🎉` : "Lost 💸";
			console.log(`${player.name}: $${player.balance} (${status})`);
		}
	}

	showStatistics(): void {
		console.log("\n📊 CASINO STATISTICS 📊");
		console.log("=========================");

		// Number analysis
		const numberFreq = new Map<number, number>();
		for (const record of this.history) {
			numberFreq.set(record.number, (numberFreq.get(record.number) || 0) + 1);
		}

		console.log(`\nTotal Spins: ${this.spins}`);
		console.log("\nMost Frequent Numbers:");
		const sortedNumbers = Array.from(numberFreq.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		for (const [number, count] of sortedNumbers) {
			const percentage = ((count / this.spins) * 100).toFixed(1);
			console.log(`  ${number}: ${count} times (${percentage}%)`);
		}

		// Color analysis
		const redCount = this.history.filter((h) => h.color === "red").length;
		const blackCount = this.history.filter((h) => h.color === "black").length;
		const greenCount = this.history.filter((h) => h.color === "green").length;

		console.log("\nColor Distribution:");
		console.log(
			`  Red: ${redCount} (${((redCount / this.spins) * 100).toFixed(1)}%)`,
		);
		console.log(
			`  Black: ${blackCount} (${((blackCount / this.spins) * 100).toFixed(1)}%)`,
		);
		console.log(
			`  Green: ${greenCount} (${((greenCount / this.spins) * 100).toFixed(1)}%)`,
		);

		// Player analysis
		console.log("\nPlayer Performance:");
		const sortedPlayers = Array.from(this.players.values()).sort(
			(a, b) => b.balance - a.balance,
		);

		sortedPlayers.forEach((player, index) => {
			const netProfit = player.balance + player.totalWon - player.totalWagered;
			const roi =
				player.totalWagered > 0
					? ((netProfit / player.totalWagered) * 100).toFixed(1)
					: "0.0";
			const profitSign = netProfit >= 0 ? "+" : "";

			console.log(`\n${index + 1}. ${player.name} (${player.strategy})`);
			console.log(`   Balance: $${player.balance}`);
			console.log(`   Total Wagered: $${player.totalWagered}`);
			console.log(`   Total Won: $${player.totalWon}`);
			console.log(`   Net P&L: ${profitSign}$${netProfit.toFixed(2)}`);
			console.log(`   ROI: ${profitSign}${roi}%`);
			console.log(`   Bets Placed: ${player.betsPlaced}`);
		});
	}

	async runSimulation(numberOfSpins: number): Promise<void> {
		console.log("🎰 Starting Roulette Casino Simulation! 🎰");
		console.log(`Players: ${this.players.size}, Spins: ${numberOfSpins}`);

		for (let i = 0; i < numberOfSpins; i++) {
			this.playSpin();

			// Remove players with no money
			for (const [playerId, player] of this.players) {
				if (player.balance <= 0) {
					console.log(`\n💸 ${player.name} has left the table (out of money)`);
					this.game.removePlayer(playerId);
				}
			}

			// Short pause between spins (remove in real usage)
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		this.showStatistics();
	}
}

// Example usage
async function runExample() {
	const casino = new RouletteSimulation(false); // European wheel

	// Add players with different strategies
	casino.addPlayer(
		"conservative1",
		"Alice (Conservative)",
		500,
		"conservative",
	);
	casino.addPlayer("aggressive1", "Bob (Aggressive)", 500, "aggressive");
	casino.addPlayer("martingale1", "Charlie (Martingale)", 500, "martingale");
	casino.addPlayer("random1", "Diana (Random)", 500, "random");
	casino.addPlayer("conservative2", "Eve (Conservative)", 500, "conservative");

	// Run simulation
	await casino.runSimulation(50);
}

// Uncomment to run the example
// runExample().catch(console.error);

await runExample();
