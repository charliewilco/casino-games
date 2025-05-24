// Custom error types for the casino games
export abstract class CasinoError extends Error {
	abstract readonly code: string;
	readonly timestamp: Date;
	readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		context?: Record<string, unknown>,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = this.constructor.name;
		this.timestamp = new Date();
		this.context = context;
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			timestamp: this.timestamp,
			context: this.context,
			stack: this.stack,
		};
	}
}

export class InsufficientFundsError extends CasinoError {
	readonly code = "INSUFFICIENT_FUNDS";
}

export class InvalidBetError extends CasinoError {
	readonly code = "INVALID_BET";
}

export class GameStateError extends CasinoError {
	readonly code = "GAME_STATE";
}

export class InvalidPlayerError extends CasinoError {
	readonly code = "INVALID_PLAYER";
}

export class DeckEmptyError extends CasinoError {
	readonly code = "DECK_EMPTY";
}

export class BettingClosedError extends CasinoError {
	readonly code = "BETTING_CLOSED";
}

export class InvalidActionError extends CasinoError {
	readonly code = "INVALID_ACTION";
}

export class TableLimitError extends CasinoError {
	readonly code = "TABLE_LIMIT";
}

// Bet type definitions
export enum BetType {
	// Roulette bets
	RED = "red",
	BLACK = "black",
	ODD = "odd",
	EVEN = "even",
	HIGH = "high", // 19-36
	LOW = "low", // 1-18
	STRAIGHT_UP = "straight_up", // Single number
	SPLIT = "split", // Two adjacent numbers
	STREET = "street", // Three numbers in a row
	CORNER = "corner", // Four numbers in a square
	DOZEN_FIRST = "dozen_first", // 1-12
	DOZEN_SECOND = "dozen_second", // 13-24
	DOZEN_THIRD = "dozen_third", // 25-36
	COLUMN_FIRST = "column_first",
	COLUMN_SECOND = "column_second",
	COLUMN_THIRD = "column_third",
	ZERO = "zero",
	DOUBLE_ZERO = "double_zero",

	// Blackjack side bets
	INSURANCE = "insurance",
	PERFECT_PAIRS = "perfect_pairs",
	TWENTY_ONE_PLUS_THREE = "21_plus_3",

	// Poker bets
	ANTE = "ante",
	BLIND = "blind",
	CALL = "call",
	RAISE = "raise",
	ALL_IN = "all_in",
}

export interface BaseBet {
	type: BetType;
	amount: number;
	playerId?: string;
}

export interface RouletteNumberBet extends BaseBet {
	type: BetType.STRAIGHT_UP | BetType.SPLIT | BetType.STREET | BetType.CORNER;
	numbers: number[];
}

export interface RouletteBet extends BaseBet {
	type: BetType;
	numbers?: number[];
}

export interface BlackjackBet extends BaseBet {
	handIndex?: number; // For split hands
}

export interface PokerBet extends BaseBet {
	round?: "preflop" | "flop" | "turn" | "river";
}

export type GameBet = RouletteBet | BlackjackBet | PokerBet;

// Poker hand rankings and evaluation
export enum HandRank {
	HIGH_CARD = 0,
	PAIR = 1,
	TWO_PAIR = 2,
	THREE_OF_A_KIND = 3,
	STRAIGHT = 4,
	FLUSH = 5,
	FULL_HOUSE = 6,
	FOUR_OF_A_KIND = 7,
	STRAIGHT_FLUSH = 8,
	ROYAL_FLUSH = 9,
}

export interface HandEvaluation {
	rank: HandRank;
	value: number; // Numeric value for comparison
	description: string;
	cards: import("./playing-card").PlayingCard[]; // The 5 cards that make the hand
	kickers: import("./playing-card").PlayingCard[]; // Remaining cards for tiebreaking
}

export interface PokerShowdown {
	playerId: string;
	hand: HandEvaluation;
	holeCards: import("./playing-card").PlayingCard[];
	bestHand: import("./playing-card").PlayingCard[];
}

// Game state types
export interface GameStatistics {
	handsPlayed: number;
	totalWagered: number;
	totalWon: number;
	biggestWin: number;
	biggestLoss: number;
	winRate: number;
}

export interface SessionInfo {
	startTime: Date;
	endTime?: Date;
	duration?: number; // in milliseconds
	statistics: GameStatistics;
}

// Betting system types
export interface BettingLimits {
	minBet: number;
	maxBet: number;
	maxRaise?: number;
	blindStructure?: {
		smallBlind: number;
		bigBlind: number;
		ante?: number;
	};
}

export interface BetHistory {
	playerId: string;
	action: "bet" | "call" | "raise" | "fold" | "check" | "all-in";
	amount: number;
	timestamp: Date;
	gamePhase?: string;
}

// Advanced game features
export interface SideBet {
	id: string;
	name: string;
	description: string;
	payout: number;
	eligibleCards?: import("./playing-card").PlayingCard[];
	conditions: (cards: import("./playing-card").PlayingCard[]) => boolean;
}

export interface Tournament {
	id: string;
	name: string;
	buyIn: number;
	prizePool: number;
	players: string[];
	startTime: Date;
	status: "registering" | "playing" | "finished";
	blindLevels: BettingLimits[];
	currentLevel: number;
}
