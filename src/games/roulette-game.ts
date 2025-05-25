import {
	BetType,
	InsufficientFundsError,
	InvalidBetError,
	type RouletteBet,
} from "../types.ts";

/**
 * Represents a player in a roulette game.
 */
export interface RoulettePlayer {
	/** Unique identifier for the player */
	id: string;
	/** Player's current balance in the game */
	balance: number;
	/** Optional display name for the player */
	name?: string;
}

/**
 * Represents the roulette wheel configuration.
 */
export interface RouletteWheel {
	/** Array of numbers on the wheel */
	numbers: number[];
	/** Whether this is an American wheel (true for 0,00; false for 0 only) */
	isAmerican: boolean; // true for 0,00 false for 0 only
}

/**
 * Configuration for table betting limits in roulette.
 */
export interface RouletteTableLimits {
	/** Minimum bet amount allowed */
	minBet: number;
	/** Maximum bet amount allowed */
	maxBet: number;
	/** Maximum bet for straight up (single number) bets */
	maxStraightUp: number;
	/** Maximum bet for split (two number) bets */
	maxSplit: number;
	/** Maximum bet for street (three number) bets */
	maxStreet: number;
	/** Maximum bet for corner (four number) bets */
	maxCorner: number;
	/** Maximum bet for outside bets (red/black, odd/even, etc.) */
	maxOutside: number;
}

/**
 * Represents the result of a single bet after a spin.
 */
export interface RouletteBetResult {
	/** The original bet that was placed */
	bet: RouletteBet;
	/** Whether this bet won */
	isWinner: boolean;
	/** Amount paid out for this bet (0 if losing) */
	payout: number;
	/** Numbers that would win for this bet type */
	winningNumbers: number[];
}

/**
 * Represents the complete result of a roulette spin.
 */
export interface RouletteSpinResult {
	/** The number that won on this spin */
	winningNumber: number;
	/** Color of the winning number */
	color: "red" | "black" | "green";
	/** Results for each individual bet placed */
	betResults: RouletteBetResult[];
	/** Total winnings by player ID */
	totalWinnings: { [playerId: string]: number };
}

/**
 * A comprehensive roulette game implementation supporting both American and European wheels,
 * multiple players, various bet types, and configurable table limits.
 *
 * @example
 * ```typescript
 * const game = new RouletteGame(true); // American wheel
 * game.addPlayer({ id: "player1", balance: 1000 });
 * game.placeBet("player1", { type: BetType.RED, amount: 50 });
 * const result = game.spin();
 * ```
 */
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

	/**
	 * Creates a new roulette game instance.
	 *
	 * @param isAmerican - Whether to use American wheel (with 00) or European wheel (default: false)
	 * @param limits - Custom table limits to override defaults
	 */
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
	/**
	 * Adds a new player to the game.
	 *
	 * @param player - The player to add
	 */
	public addPlayer(player: RoulettePlayer): void {
		this.players.set(player.id, player);
	}

	/**
	 * Removes a player from the game and refunds any active bets.
	 *
	 * @param playerId - ID of the player to remove
	 */
	public removePlayer(playerId: string): void {
		// Remove player's bets if any
		this.activeBets = this.activeBets.filter(
			(bet) => bet.playerId !== playerId,
		);
		this.players.delete(playerId);
	}

	/**
	 * Retrieves a player by their ID.
	 *
	 * @param playerId - ID of the player to retrieve
	 * @returns The player object or undefined if not found
	 */
	public getPlayer(playerId: string): RoulettePlayer | undefined {
		return this.players.get(playerId);
	}

	/**
	 * Gets all players currently in the game.
	 *
	 * @returns Array of all players
	 */
	public getPlayers(): RoulettePlayer[] {
		return Array.from(this.players.values());
	}

	// Betting
	/**
	 * Places a bet using a bet object.
	 *
	 * @param bet - The complete bet object
	 * @overload
	 */
	public placeBet(bet: RouletteBet): void;
	/**
	 * Places a bet for a specific player.
	 *
	 * @param playerId - ID of the player placing the bet
	 * @param bet - The bet object without playerId
	 * @throws {InvalidBetError} If player not found or bet is invalid
	 * @throws {InsufficientFundsError} If player lacks sufficient balance
	 * @overload
	 */
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

	/**
	 * Validates a bet against table limits and game rules.
	 *
	 * @param bet - The bet to validate
	 * @throws {InvalidBetError} If bet violates any rules or limits
	 * @private
	 */
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

	/**
	 * Updates a player's balance directly.
	 *
	 * @param playerId - ID of the player
	 * @param newBalance - The new balance amount
	 * @throws {InvalidBetError} If player not found
	 */
	public updatePlayerBalance(playerId: string, newBalance: number): void {
		const player = this.players.get(playerId);
		if (!player) {
			throw new InvalidBetError(`Player ${playerId} not found`);
		}
		player.balance = newBalance;
	}

	/**
	 * Sets a seed for the next spin to enable deterministic results.
	 *
	 * @param seed - The seed value for random number generation
	 */
	public setSeed(seed: number): void {
		// Store seed for use in next spin
		this.seedForNextSpin = seed;
	}

	/**
	 * Gets a copy of the wheel configuration.
	 *
	 * @returns Copy of the wheel object
	 */
	public getWheel(): RouletteWheel {
		return { ...this.wheel };
	}

	/**
	 * Legacy method for placing bets with default player.
	 *
	 * @param type - Type of bet to place
	 * @param amount - Amount to bet
	 * @deprecated Use placeBet() with player ID instead
	 */
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

	/**
	 * Spins the roulette wheel using any previously set seed.
	 * Clears the seed after use to prevent repeated deterministic results.
	 *
	 * @returns Spin result including winning number, color, bet results, and total winnings
	 * @example
	 * ```typescript
	 * game.setSeed(12345); // Set seed for deterministic result
	 * const result = game.spin();
	 * console.log(`Winning number: ${result.winningNumber}`);
	 * ```
	 */
	public spin(): RouletteSpinResult {
		const seed = this.seedForNextSpin;
		this.seedForNextSpin = undefined; // Clear seed after use
		return this.spinWheel(seed);
	}

	/**
	 * Spins the roulette wheel and processes all active bets.
	 * This is the main game action that determines winners and distributes payouts.
	 *
	 * @param seed - Optional seed for deterministic results (useful for testing)
	 * @returns Complete spin result with winning number, color, individual bet results, and total winnings
	 * @example
	 * ```typescript
	 * // Regular spin with random outcome
	 * const result = game.spinWheel();
	 *
	 * // Deterministic spin for testing
	 * const testResult = game.spinWheel(12345);
	 * console.log(`Ball landed on ${result.winningNumber} (${result.color})`);
	 * ```
	 */
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

	/**
	 * Creates a seeded random number generator for deterministic results.
	 * Uses Linear Congruential Generator algorithm for consistent cross-platform results.
	 *
	 * @param seed - The seed value for random number generation
	 * @returns A function that returns pseudo-random numbers between 0 and 1
	 * @private
	 */
	private createSeededRng(seed: number): () => number {
		let state = seed % 2147483647;
		if (state <= 0) state += 2147483646;

		return () => {
			state = (state * 16807) % 2147483647;
			return (state - 1) / 2147483646;
		};
	}

	/**
	 * Determines the color of a roulette number.
	 *
	 * @param num - The roulette number (0, -1 for double zero, or 1-36)
	 * @returns The color of the number: "red", "black", or "green"
	 * @private
	 */
	private getNumberColor(num: number): "red" | "black" | "green" {
		if (num === 0 || (this.wheel.isAmerican && num === -1)) {
			return "green";
		}
		return this.redNumbers.includes(num) ? "red" : "black";
	}

	/**
	 * Processes all active bets against the winning number.
	 * Determines winners, calculates payouts, and returns detailed results.
	 *
	 * @param winningNumber - The number that won on the roulette wheel
	 * @returns Array of bet results with winner status and payout information
	 * @private
	 */
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

	/**
	 * Determines if a specific bet wins against the winning number.
	 * Handles all bet types including inside bets, outside bets, and special bets.
	 *
	 * @param bet - The roulette bet to check
	 * @param winningNumber - The winning number from the spin
	 * @returns True if the bet wins, false otherwise
	 * @private
	 */
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

	/**
	 * Calculates the payout amount for a winning bet.
	 * Returns only the winnings amount, not including the original bet.
	 *
	 * @param bet - The winning bet to calculate payout for
	 * @returns The payout amount (winnings only, original bet returned separately)
	 * @private
	 * @example
	 * ```typescript
	 * // For a $10 straight-up bet (35:1 payout)
	 * const payout = calculatePayout(bet); // Returns 350 (35 * 10)
	 * // Player receives: 350 (winnings) + 10 (original bet) = 360 total
	 * ```
	 */
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

	/**
	 * Gets all numbers that would win for a specific bet type.
	 * Used for displaying winning numbers in bet results.
	 *
	 * @param bet - The bet to get winning numbers for
	 * @returns Array of numbers that would make this bet a winner
	 * @private
	 */
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

	/**
	 * Calculates total winnings for each player from bet results.
	 * Groups winnings by player ID for efficient payout processing.
	 *
	 * @param betResults - Array of bet results to calculate winnings from
	 * @returns Object mapping player IDs to their total winnings
	 * @private
	 */
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

	/**
	 * Gets the current winning number from the last spin.
	 *
	 * @returns The winning number from the most recent spin, or null if no spin has occurred
	 */
	// Utility methods
	public getCurrentSpin(): number | null {
		return this.currentSpin;
	}

	/**
	 * Gets a copy of the complete spin history.
	 *
	 * @returns Array of all winning numbers from previous spins, in chronological order
	 */
	public getSpinHistory(): number[] {
		return [...this.spinHistory];
	}

	/**
	 * Gets a copy of all currently active bets.
	 *
	 * @returns Array of all bets placed but not yet resolved
	 */
	public getActiveBets(): RouletteBet[] {
		return [...this.activeBets];
	}

	/**
	 * Clears all active bets and refunds the money to players.
	 * Useful for canceling a round or resetting the table.
	 *
	 * @example
	 * ```typescript
	 * // Cancel all bets before spinning
	 * game.clearBets();
	 * console.log(game.getActiveBets().length); // 0
	 * ```
	 */
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

	/**
	 * Gets a copy of the current table betting limits.
	 *
	 * @returns The table limits including minimum and maximum bet amounts
	 */
	public getTableLimits(): RouletteTableLimits {
		return { ...this.limits };
	}

	/**
	 * Checks if this is an American roulette wheel (with double zero).
	 *
	 * @returns True if American roulette (38 numbers), false if European (37 numbers)
	 */
	public isAmerican(): boolean {
		return this.wheel.isAmerican;
	}

	/**
	 * Legacy method that returns table information in the old format.
	 *
	 * @returns Legacy table object with bets and limits
	 * @deprecated Use getActiveBets() and getTableLimits() instead
	 */
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

	/**
	 * Legacy method for placing bets using the old Bet interface.
	 * Automatically creates a default player if one doesn't exist.
	 *
	 * @param bet - Legacy bet object with type and amount
	 * @deprecated Use placeBet() with RouletteBet instead
	 * @throws {InvalidBetError} If bet validation fails
	 */
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

	/**
	 * Legacy method for spinning the wheel that only returns the winning number.
	 *
	 * @returns The winning number from the spin
	 * @deprecated Use spinWheel() for complete spin results
	 */
	public spinWheelLegacy(): number {
		const result = this.spinWheel();
		return result.winningNumber;
	}

	/**
	 * Legacy method that returns the current winning number.
	 *
	 * @returns The winning number from the most recent spin, or 0 if no spin occurred
	 * @deprecated Use getCurrentSpin() instead
	 */
	public getWinningNumber(): number {
		return this.currentSpin || 0;
	}

	/**
	 * Legacy method to check if a bet wins against the current spin.
	 *
	 * @param bet - Legacy bet object to check
	 * @returns True if the bet wins against the current spin result
	 * @deprecated Use isBetWinner() with RouletteBet instead
	 */
	public checkWin(bet: Bet): boolean {
		if (this.currentSpin === null) return false;

		const rouletteBet: RouletteBet = {
			type: bet.type as BetType,
			amount: bet.amount,
			playerId: "player1",
		};

		return this.isBetWinner(rouletteBet, this.currentSpin);
	}

	/**
	 * Legacy method to calculate payout for a bet.
	 * Returns net winnings (payout minus original bet) or negative amount for losses.
	 *
	 * @param bet - Legacy bet object to calculate payout for
	 * @returns Net winnings (positive for wins, negative for losses)
	 * @deprecated Use calculatePayout() with RouletteBet instead
	 */
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

/**
 * Legacy bet interface for backwards compatibility.
 *
 * @deprecated Use RouletteBet interface instead
 */
// Legacy exports for backwards compatibility
export interface Bet {
	/** The type of bet (e.g., "red", "black", "straight_up") */
	type: string;
	/** The amount of money being bet */
	amount: number;
}

/**
 * Legacy roulette table interface for backwards compatibility.
 *
 * @deprecated Use getActiveBets() and getTableLimits() methods instead
 */
export interface RouletteTable {
	/** Array of active bets on the table */
	bets: Bet[];
	/** Maximum bet limit (same as maxBet) */
	betLimit: number;
	/** Minimum bet amount allowed */
	minBet: number;
	/** Maximum bet amount allowed */
	maxBet: number;
	/** Number of zeros on the wheel (1 for European, 2 for American) */
	zeroCount: number;
	/** Color of zero numbers (always "green") */
	zeroColor: string;
}
