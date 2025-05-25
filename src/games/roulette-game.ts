import {
	BetType,
	type RouletteBet,
	InvalidBetError,
	InsufficientFundsError,
} from "../types.ts";

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
	private seedForNextSpin?: number;

	// Standard roulette colors
	private readonly redNumbers = [
		1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
	];
	private readonly blackNumbers = [
		2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
	];

	constructor(isAmerican = false, limits: Partial<RouletteTableLimits> = {}) {
		// For American wheel: 0, 00 (represented as -1), 1-36
		// For European wheel: 0, 1-36
		const wheelNumbers = Array.from({ length: 37 }, (_, i) => i); // 0-36
		if (isAmerican) {
			wheelNumbers.push(-1); // Add double zero represented as -1
		}

		this.wheel = {
			numbers: wheelNumbers,
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
	public placeBet(bet: RouletteBet): void;
	public placeBet(playerId: string, bet: Omit<RouletteBet, "playerId">): void;
	public placeBet(
		betOrPlayerId: RouletteBet | string,
		bet?: Omit<RouletteBet, "playerId">,
	): void {
		let finalBet: RouletteBet;

		if (typeof betOrPlayerId === "string") {
			// Called with playerId as first parameter
			if (!bet) {
				throw new InvalidBetError(
					"Bet object required when providing playerId",
				);
			}
			finalBet = { ...bet, playerId: betOrPlayerId };
		} else {
			// Called with bet object only
			finalBet = betOrPlayerId;
		}

		const player = this.players.get(finalBet.playerId || "");
		if (!player) {
			throw new InvalidBetError(`Player ${finalBet.playerId} not found`);
		}

		// Check insufficient funds first, then table limits
		if (player.balance < finalBet.amount) {
			throw new InsufficientFundsError(
				`Insufficient funds: ${player.balance} < ${finalBet.amount}`,
			);
		}

		this.validateBet(finalBet);

		player.balance -= finalBet.amount;
		this.activeBets.push(finalBet);
	}

	private validateBet(bet: RouletteBet): void {
		// Validate bet amount
		if (bet.amount < this.limits.minBet) {
			throw new InvalidBetError(
				`Bet amount ${bet.amount} is below minimum bet of ${this.limits.minBet}`,
			);
		}

		// Get the appropriate limit for this bet type
		let maxBetForType = this.limits.maxBet;
		switch (bet.type) {
			case BetType.STRAIGHT_UP:
			case BetType.ROULETTE_STRAIGHT_UP:
				maxBetForType = this.limits.maxStraightUp;
				break;
			case BetType.SPLIT:
			case BetType.ROULETTE_SPLIT:
				maxBetForType = this.limits.maxSplit;
				break;
			case BetType.STREET:
			case BetType.ROULETTE_STREET:
				maxBetForType = this.limits.maxStreet;
				break;
			case BetType.CORNER:
			case BetType.ROULETTE_CORNER:
				maxBetForType = this.limits.maxCorner;
				break;
			default:
				maxBetForType = this.limits.maxOutside;
				break;
		}

		if (bet.amount > maxBetForType) {
			throw new InvalidBetError(
				`Bet cannot exceed table limit of ${maxBetForType}`,
			);
		}

		// Validate bet numbers for number-based bets
		if (bet.numbers && bet.numbers.length > 0) {
			for (const num of bet.numbers) {
				if (!this.wheel.numbers.includes(num)) {
					throw new InvalidBetError(
						`Invalid bet numbers: ${bet.numbers.join(", ")}`,
					);
				}
			}
		}

		// Validate bet type-specific requirements
		const betTypeValues = Object.values(BetType);
		const betTypeKeys = Object.keys(BetType);
		const betTypeKey =
			typeof bet.type === "string"
				? bet.type
				: betTypeKeys.find(
						(key) => (BetType as Record<string, string>)[key] === bet.type,
					);
		if (betTypeKey?.includes("SPLIT") || bet.type === "split") {
			if (!bet.numbers || bet.numbers.length !== 2) {
				throw new InvalidBetError(
					"Invalid bet numbers: Split bet requires exactly 2 numbers",
				);
			}
		}
	}

	public updatePlayerBalance(playerId: string, newBalance: number): void {
		const player = this.players.get(playerId);
		if (!player) {
			throw new InvalidBetError(`Player ${playerId} not found`);
		}
		player.balance = newBalance;
	}

	public setSeed(seed: number): void {
		// Store seed for use in next spin
		this.seedForNextSpin = seed;
	}

	public getWheel(): RouletteWheel {
		return { ...this.wheel };
	}

	public bet(type: string, amount: number): void {
		// Legacy method - add default player if needed
		if (!this.players.has("player1")) {
			this.addPlayer({ id: "player1", balance: 10000 });
		}

		const rouletteBet: RouletteBet = {
			type: type as BetType,
			amount: amount,
			playerId: "player1",
		};

		this.placeBet(rouletteBet);
	}

	public spin(): RouletteSpinResult {
		const seed = this.seedForNextSpin;
		this.seedForNextSpin = undefined; // Clear seed after use
		return this.spinWheel(seed);
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

		// Pay out winnings (winnings + original bet returned)
		for (const [playerId, winnings] of Object.entries(totalWinnings)) {
			const player = this.players.get(playerId);
			if (player) {
				// Return original bet plus winnings for winning bets
				const winningBets = betResults.filter(
					(br) => br.bet.playerId === playerId && br.isWinner,
				);
				const originalBetsToReturn = winningBets.reduce(
					(sum, br) => sum + br.bet.amount,
					0,
				);
				player.balance += winnings + originalBetsToReturn;
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
		if (num === 0 || (this.wheel.isAmerican && num === -1)) {
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
			case BetType.ROULETTE_STRAIGHT_UP:
				return bet.numbers?.[0] === winningNumber;

			case BetType.SPLIT:
			case BetType.ROULETTE_SPLIT:
				return bet.numbers?.includes(winningNumber) ?? false;

			case BetType.STREET:
			case BetType.ROULETTE_STREET:
				return bet.numbers?.includes(winningNumber) ?? false;

			case BetType.CORNER:
			case BetType.ROULETTE_CORNER:
				return bet.numbers?.includes(winningNumber) ?? false;

			case BetType.RED:
			case BetType.ROULETTE_RED:
				return (
					winningNumber !== 0 &&
					winningNumber !== -1 &&
					this.redNumbers.includes(winningNumber)
				);

			case BetType.BLACK:
			case BetType.ROULETTE_BLACK:
				return (
					winningNumber !== 0 &&
					winningNumber !== -1 &&
					this.blackNumbers.includes(winningNumber)
				);

			case BetType.ODD:
			case BetType.ROULETTE_ODD:
				return (
					winningNumber !== 0 && winningNumber !== -1 && winningNumber % 2 === 1
				);

			case BetType.EVEN:
			case BetType.ROULETTE_EVEN:
				return (
					winningNumber !== 0 && winningNumber !== -1 && winningNumber % 2 === 0
				);

			case BetType.HIGH:
			case BetType.ROULETTE_HIGH:
				return winningNumber >= 19 && winningNumber <= 36;

			case BetType.LOW:
			case BetType.ROULETTE_LOW:
				return winningNumber >= 1 && winningNumber <= 18;

			case BetType.DOZEN_FIRST:
			case BetType.ROULETTE_FIRST_DOZEN:
				return winningNumber >= 1 && winningNumber <= 12;

			case BetType.DOZEN_SECOND:
			case BetType.ROULETTE_SECOND_DOZEN:
				return winningNumber >= 13 && winningNumber <= 24;

			case BetType.DOZEN_THIRD:
			case BetType.ROULETTE_THIRD_DOZEN:
				return winningNumber >= 25 && winningNumber <= 36;

			case BetType.COLUMN_FIRST:
			case BetType.ROULETTE_FIRST_COLUMN:
				return winningNumber > 0 && winningNumber % 3 === 1;

			case BetType.COLUMN_SECOND:
			case BetType.ROULETTE_SECOND_COLUMN:
				return winningNumber > 0 && winningNumber % 3 === 2;

			case BetType.COLUMN_THIRD:
			case BetType.ROULETTE_THIRD_COLUMN:
				return winningNumber > 0 && winningNumber % 3 === 0;

			case BetType.ZERO:
			case BetType.ROULETTE_ZERO:
				return winningNumber === 0;

			case BetType.DOUBLE_ZERO:
			case BetType.ROULETTE_DOUBLE_ZERO:
				return this.wheel.isAmerican && winningNumber === -1; // Double zero represented as -1

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
		return bet.amount * ratio; // Return only the winnings, not original bet
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
				return [-1]; // 00 represented as -1

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
