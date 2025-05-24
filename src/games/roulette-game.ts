import {
	BetType,
	type RouletteBet,
	InvalidBetError,
	InsufficientFundsError,
} from "../types";

export interface RoulettePlayer {
	id: string;
	balance: number;
	name?: string;
}

export interface RouletteWheel {
	numbers: number[];
	isAmerican: boolean; // true for 0,00 false for 0 only
}

export interface RouletteTableLimits {
	minBet: number;
	maxBet: number;
	maxStraightUp: number;
	maxSplit: number;
	maxStreet: number;
	maxCorner: number;
	maxOutside: number;
}

export interface RouletteBetResult {
	bet: RouletteBet;
	isWinner: boolean;
	payout: number;
	winningNumbers: number[];
}

export interface RouletteSpinResult {
	winningNumber: number;
	color: "red" | "black" | "green";
	betResults: RouletteBetResult[];
	totalWinnings: { [playerId: string]: number };
}

export class RouletteGame {
	private wheel: RouletteWheel;
	private players: Map<string, RoulettePlayer>;
	private activeBets: RouletteBet[];
	private limits: RouletteTableLimits;
	private currentSpin: number | null = null;
	private spinHistory: number[] = [];

	// Standard roulette colors
	private readonly redNumbers = [
		1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
	];
	private readonly blackNumbers = [
		2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
	];

	constructor(isAmerican = false, limits: Partial<RouletteTableLimits> = {}) {
		this.wheel = {
			numbers: isAmerican
				? Array.from({ length: 38 }, (_, i) => i)
				: Array.from({ length: 37 }, (_, i) => i),
			isAmerican,
		};

		this.players = new Map();
		this.activeBets = [];
		this.limits = {
			minBet: 1,
			maxBet: 1000,
			maxStraightUp: 100,
			maxSplit: 200,
			maxStreet: 300,
			maxCorner: 400,
			maxOutside: 1000,
			...limits,
		};
	}

	// Player management
	public addPlayer(player: RoulettePlayer): void {
		this.players.set(player.id, player);
	}

	public removePlayer(playerId: string): void {
		// Remove player's bets if any
		this.activeBets = this.activeBets.filter(
			(bet) => bet.playerId !== playerId,
		);
		this.players.delete(playerId);
	}

	public getPlayer(playerId: string): RoulettePlayer | undefined {
		return this.players.get(playerId);
	}

	public getPlayers(): RoulettePlayer[] {
		return Array.from(this.players.values());
	}

	// Betting
	public placeBet(bet: RouletteBet): void {
		const player = this.players.get(bet.playerId || "");
		if (!player) {
			throw new InvalidBetError(`Player ${bet.playerId} not found`);
		}

		this.validateBet(bet);

		if (player.balance < bet.amount) {
			throw new InsufficientFundsError(
				`Insufficient funds: ${player.balance} < ${bet.amount}`,
			);
		}

		player.balance -= bet.amount;
		this.activeBets.push(bet);
	}

	private validateBet(bet: RouletteBet): void {
		if (bet.amount < this.limits.minBet) {
			throw new InvalidBetError(`Bet must be at least ${this.limits.minBet}`);
		}

		if (bet.amount > this.limits.maxBet) {
			throw new InvalidBetError(`Bet cannot exceed ${this.limits.maxBet}`);
		}

		// Validate bet-specific limits and numbers
		switch (bet.type) {
			case BetType.STRAIGHT_UP:
				if (bet.amount > this.limits.maxStraightUp) {
					throw new InvalidBetError(
						`Straight up bet cannot exceed ${this.limits.maxStraightUp}`,
					);
				}
				if (!bet.numbers || bet.numbers.length !== 1) {
					throw new InvalidBetError(
						"Straight up bet must have exactly one number",
					);
				}
				this.validateNumber(bet.numbers[0]);
				break;

			case BetType.SPLIT:
				if (bet.amount > this.limits.maxSplit) {
					throw new InvalidBetError(
						`Split bet cannot exceed ${this.limits.maxSplit}`,
					);
				}
				if (!bet.numbers || bet.numbers.length !== 2) {
					throw new InvalidBetError("Split bet must have exactly two numbers");
				}
				bet.numbers.forEach((num) => this.validateNumber(num));
				if (!this.areAdjacent(bet.numbers[0], bet.numbers[1])) {
					throw new InvalidBetError("Split bet numbers must be adjacent");
				}
				break;

			case BetType.STREET:
				if (bet.amount > this.limits.maxStreet) {
					throw new InvalidBetError(
						`Street bet cannot exceed ${this.limits.maxStreet}`,
					);
				}
				if (!bet.numbers || bet.numbers.length !== 3) {
					throw new InvalidBetError(
						"Street bet must have exactly three numbers",
					);
				}
				bet.numbers.forEach((num) => this.validateNumber(num));
				if (!this.isValidStreet(bet.numbers)) {
					throw new InvalidBetError("Invalid street bet numbers");
				}
				break;

			case BetType.CORNER:
				if (bet.amount > this.limits.maxCorner) {
					throw new InvalidBetError(
						`Corner bet cannot exceed ${this.limits.maxCorner}`,
					);
				}
				if (!bet.numbers || bet.numbers.length !== 4) {
					throw new InvalidBetError(
						"Corner bet must have exactly four numbers",
					);
				}
				bet.numbers.forEach((num) => this.validateNumber(num));
				if (!this.isValidCorner(bet.numbers)) {
					throw new InvalidBetError("Invalid corner bet numbers");
				}
				break;

			case BetType.RED:
			case BetType.BLACK:
			case BetType.ODD:
			case BetType.EVEN:
			case BetType.HIGH:
			case BetType.LOW:
			case BetType.DOZEN_FIRST:
			case BetType.DOZEN_SECOND:
			case BetType.DOZEN_THIRD:
			case BetType.COLUMN_FIRST:
			case BetType.COLUMN_SECOND:
			case BetType.COLUMN_THIRD:
				if (bet.amount > this.limits.maxOutside) {
					throw new InvalidBetError(
						`Outside bet cannot exceed ${this.limits.maxOutside}`,
					);
				}
				break;

			case BetType.ZERO:
				if (!this.wheel.numbers.includes(0)) {
					throw new InvalidBetError("Zero not available on this wheel");
				}
				break;

			case BetType.DOUBLE_ZERO:
				if (!this.wheel.isAmerican) {
					throw new InvalidBetError(
						"Double zero only available on American wheel",
					);
				}
				break;

			default:
				throw new InvalidBetError(`Unknown bet type: ${bet.type}`);
		}
	}

	private validateNumber(num: number): void {
		if (!this.wheel.numbers.includes(num)) {
			throw new InvalidBetError(`Invalid number: ${num}`);
		}
	}

	private areAdjacent(num1: number, num2: number): boolean {
		if (num1 === 0 || num2 === 0) return false; // Zero can't be in split bets in this implementation

		// Check horizontal adjacency
		if (Math.abs(num1 - num2) === 1) {
			// Make sure they're on the same row
			const row1 = Math.ceil(num1 / 3);
			const row2 = Math.ceil(num2 / 3);
			return row1 === row2;
		}

		// Check vertical adjacency
		return Math.abs(num1 - num2) === 3;
	}

	private isValidStreet(numbers: number[]): boolean {
		const sorted = numbers.sort((a, b) => a - b);
		// Street bets are three consecutive numbers in a row
		const firstRow = Math.ceil(sorted[0] / 3);
		return (
			sorted[1] === sorted[0] + 1 &&
			sorted[2] === sorted[0] + 2 &&
			Math.ceil(sorted[1] / 3) === firstRow &&
			Math.ceil(sorted[2] / 3) === firstRow
		);
	}

	private isValidCorner(numbers: number[]): boolean {
		const sorted = numbers.sort((a, b) => a - b);
		// Corner bets cover four numbers in a 2x2 square
		return (
			sorted[1] === sorted[0] + 1 &&
			sorted[2] === sorted[0] + 3 &&
			sorted[3] === sorted[0] + 4
		);
	}

	// Spinning and results
	public spinWheel(seed?: number): RouletteSpinResult {
		// Use seed for deterministic results if provided
		const rng = seed ? this.createSeededRng(seed) : Math.random;

		this.currentSpin =
			this.wheel.numbers[Math.floor(rng() * this.wheel.numbers.length)];
		this.spinHistory.push(this.currentSpin);

		const color = this.getNumberColor(this.currentSpin);
		const betResults = this.processBets(this.currentSpin);
		const totalWinnings = this.calculateWinnings(betResults);

		// Pay out winnings
		for (const [playerId, winnings] of Object.entries(totalWinnings)) {
			const player = this.players.get(playerId);
			if (player) {
				player.balance += winnings;
			}
		}

		// Clear bets for next round
		this.activeBets = [];

		return {
			winningNumber: this.currentSpin,
			color,
			betResults,
			totalWinnings,
		};
	}

	private createSeededRng(seed: number): () => number {
		let state = seed % 2147483647;
		if (state <= 0) state += 2147483646;

		return () => {
			state = (state * 16807) % 2147483647;
			return (state - 1) / 2147483646;
		};
	}

	private getNumberColor(num: number): "red" | "black" | "green" {
		if (num === 0 || (this.wheel.isAmerican && num === 37)) {
			return "green";
		}
		return this.redNumbers.includes(num) ? "red" : "black";
	}

	private processBets(winningNumber: number): RouletteBetResult[] {
		return this.activeBets.map((bet) => {
			const isWinner = this.isBetWinner(bet, winningNumber);
			const payout = isWinner ? this.calculatePayout(bet) : 0;
			const winningNumbers = this.getBetNumbers(bet);

			return {
				bet,
				isWinner,
				payout,
				winningNumbers,
			};
		});
	}

	private isBetWinner(bet: RouletteBet, winningNumber: number): boolean {
		switch (bet.type) {
			case BetType.STRAIGHT_UP:
				return bet.numbers![0] === winningNumber;

			case BetType.SPLIT:
				return bet.numbers!.includes(winningNumber);

			case BetType.STREET:
				return bet.numbers!.includes(winningNumber);

			case BetType.CORNER:
				return bet.numbers!.includes(winningNumber);

			case BetType.RED:
				return winningNumber !== 0 && this.redNumbers.includes(winningNumber);

			case BetType.BLACK:
				return winningNumber !== 0 && this.blackNumbers.includes(winningNumber);

			case BetType.ODD:
				return winningNumber !== 0 && winningNumber % 2 === 1;

			case BetType.EVEN:
				return winningNumber !== 0 && winningNumber % 2 === 0;

			case BetType.HIGH:
				return winningNumber >= 19 && winningNumber <= 36;

			case BetType.LOW:
				return winningNumber >= 1 && winningNumber <= 18;

			case BetType.DOZEN_FIRST:
				return winningNumber >= 1 && winningNumber <= 12;

			case BetType.DOZEN_SECOND:
				return winningNumber >= 13 && winningNumber <= 24;

			case BetType.DOZEN_THIRD:
				return winningNumber >= 25 && winningNumber <= 36;

			case BetType.COLUMN_FIRST:
				return winningNumber > 0 && winningNumber % 3 === 1;

			case BetType.COLUMN_SECOND:
				return winningNumber > 0 && winningNumber % 3 === 2;

			case BetType.COLUMN_THIRD:
				return winningNumber > 0 && winningNumber % 3 === 0;

			case BetType.ZERO:
				return winningNumber === 0;

			case BetType.DOUBLE_ZERO:
				return this.wheel.isAmerican && winningNumber === 37; // 00 represented as 37

			default:
				return false;
		}
	}

	private calculatePayout(bet: RouletteBet): number {
		const payoutRatios: { [key in BetType]?: number } = {
			[BetType.STRAIGHT_UP]: 35, // 35:1
			[BetType.SPLIT]: 17, // 17:1
			[BetType.STREET]: 11, // 11:1
			[BetType.CORNER]: 8, // 8:1
			[BetType.RED]: 1, // 1:1
			[BetType.BLACK]: 1, // 1:1
			[BetType.ODD]: 1, // 1:1
			[BetType.EVEN]: 1, // 1:1
			[BetType.HIGH]: 1, // 1:1
			[BetType.LOW]: 1, // 1:1
			[BetType.DOZEN_FIRST]: 2, // 2:1
			[BetType.DOZEN_SECOND]: 2, // 2:1
			[BetType.DOZEN_THIRD]: 2, // 2:1
			[BetType.COLUMN_FIRST]: 2, // 2:1
			[BetType.COLUMN_SECOND]: 2, // 2:1
			[BetType.COLUMN_THIRD]: 2, // 2:1
			[BetType.ZERO]: 35, // 35:1
			[BetType.DOUBLE_ZERO]: 35, // 35:1
		};

		const ratio = payoutRatios[bet.type] || 0;
		return bet.amount + bet.amount * ratio; // Return original bet + winnings
	}

	private getBetNumbers(bet: RouletteBet): number[] {
		switch (bet.type) {
			case BetType.STRAIGHT_UP:
			case BetType.SPLIT:
			case BetType.STREET:
			case BetType.CORNER:
				return bet.numbers || [];

			case BetType.RED:
				return this.redNumbers;

			case BetType.BLACK:
				return this.blackNumbers;

			case BetType.ODD:
				return Array.from({ length: 36 }, (_, i) => i + 1).filter(
					(n) => n % 2 === 1,
				);

			case BetType.EVEN:
				return Array.from({ length: 36 }, (_, i) => i + 1).filter(
					(n) => n % 2 === 0,
				);

			case BetType.HIGH:
				return Array.from({ length: 18 }, (_, i) => i + 19);

			case BetType.LOW:
				return Array.from({ length: 18 }, (_, i) => i + 1);

			case BetType.DOZEN_FIRST:
				return Array.from({ length: 12 }, (_, i) => i + 1);

			case BetType.DOZEN_SECOND:
				return Array.from({ length: 12 }, (_, i) => i + 13);

			case BetType.DOZEN_THIRD:
				return Array.from({ length: 12 }, (_, i) => i + 25);

			case BetType.COLUMN_FIRST:
				return Array.from({ length: 12 }, (_, i) => i * 3 + 1);

			case BetType.COLUMN_SECOND:
				return Array.from({ length: 12 }, (_, i) => i * 3 + 2);

			case BetType.COLUMN_THIRD:
				return Array.from({ length: 12 }, (_, i) => i * 3 + 3);

			case BetType.ZERO:
				return [0];

			case BetType.DOUBLE_ZERO:
				return [37]; // 00 represented as 37

			default:
				return [];
		}
	}

	private calculateWinnings(betResults: RouletteBetResult[]): {
		[playerId: string]: number;
	} {
		const winnings: { [playerId: string]: number } = {};

		for (const result of betResults) {
			const playerId = result.bet.playerId || "";
			if (!winnings[playerId]) {
				winnings[playerId] = 0;
			}
			winnings[playerId] += result.payout;
		}

		return winnings;
	}

	// Utility methods
	public getCurrentSpin(): number | null {
		return this.currentSpin;
	}

	public getSpinHistory(): number[] {
		return [...this.spinHistory];
	}

	public getActiveBets(): RouletteBet[] {
		return [...this.activeBets];
	}

	public clearBets(): void {
		// Return money to players for cancelled bets
		for (const bet of this.activeBets) {
			const player = this.players.get(bet.playerId || "");
			if (player) {
				player.balance += bet.amount;
			}
		}
		this.activeBets = [];
	}

	public getTableLimits(): RouletteTableLimits {
		return { ...this.limits };
	}

	public isAmerican(): boolean {
		return this.wheel.isAmerican;
	}

	// Legacy compatibility methods
	public getTable(): RouletteTable {
		return {
			bets: this.activeBets.map((bet) => ({
				type: bet.type,
				amount: bet.amount,
			})),
			betLimit: this.limits.maxBet,
			minBet: this.limits.minBet,
			maxBet: this.limits.maxBet,
			zeroCount: this.wheel.isAmerican ? 2 : 1,
			zeroColor: "green",
		};
	}

	public placeBetLegacy(bet: Bet): void {
		// Legacy method - convert to new format
		if (!this.players.has("player1")) {
			this.addPlayer({ id: "player1", balance: 10000 });
		}

		const rouletteBet: RouletteBet = {
			type: bet.type as BetType,
			amount: bet.amount,
			playerId: "player1",
		};

		this.placeBet(rouletteBet);
	}

	public spinWheelLegacy(): number {
		const result = this.spinWheel();
		return result.winningNumber;
	}

	public getWinningNumber(): number {
		return this.currentSpin || 0;
	}

	public checkWin(bet: Bet): boolean {
		if (this.currentSpin === null) return false;

		const rouletteBet: RouletteBet = {
			type: bet.type as BetType,
			amount: bet.amount,
			playerId: "player1",
		};

		return this.isBetWinner(rouletteBet, this.currentSpin);
	}

	public getPayout(bet: Bet): number {
		const rouletteBet: RouletteBet = {
			type: bet.type as BetType,
			amount: bet.amount,
			playerId: "player1",
		};

		if (
			this.currentSpin === null ||
			!this.isBetWinner(rouletteBet, this.currentSpin)
		) {
			return -bet.amount;
		}

		return this.calculatePayout(rouletteBet) - bet.amount; // Return net winnings
	}
}

// Legacy exports for backwards compatibility
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
