export interface Bet {
	type: string;
	amount: number;
}

export interface RouletteTable {
	bets: Bet[];
	betLimit: number;
	minBet: number;
	maxBet: number;
	zeroCount: number;
	zeroColor: string;
}

export class RouletteGame {
	private table: RouletteTable;
	private winningNumber: number;

	constructor() {
		this.table = {
			bets: [],
			betLimit: 1000,
			minBet: 1,
			maxBet: 1000,
			zeroCount: 1,
			zeroColor: "green",
		};
		this.winningNumber = Math.floor(Math.random() * 37); // Random number between 0 and 36
	}

	getTable(): RouletteTable {
		return this.table;
	}

	placeBet(bet: Bet): void {
		if (bet.amount > this.table.betLimit) {
			throw new Error("Bet exceeds the limit");
		}
		if (bet.amount < this.table.minBet) {
			throw new Error("Bet is below the minimum");
		}
		this.table.bets.push(bet);
	}

	spinWheel(): number {
		this.winningNumber = Math.floor(Math.random() * 37);
		console.log(`Winning number is ${this.winningNumber}`);
		return this.winningNumber;
	}

	getWinningNumber(): number {
		return this.winningNumber;
	}

	checkWin(bet: Bet): boolean {
		// Simple implementation for number bets
		if (bet.type === "red") {
			const redNumbers = [
				1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
			];
			return redNumbers.includes(this.winningNumber);
		}
		if (bet.type === "black") {
			const blackNumbers = [
				2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
			];
			return blackNumbers.includes(this.winningNumber);
		}
		// Add more bet types as needed
		return false;
	}

	getPayout(bet: Bet): number {
		return this.checkWin(bet) ? bet.amount * 2 : -bet.amount; // 2:1 for red/black
	}

	clearBets(): void {
		this.table.bets = [];
	}
}
