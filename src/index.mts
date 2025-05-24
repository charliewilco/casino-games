// Main exports for the casino games package
export { Deck, DeckShoe } from "./deck";
export {
	type PlayingCard,
	CardValue,
	CardText,
	CardSuite,
	createStandardDeck,
} from "./playing-card";

// Game engines
export { BlackjackGame } from "./games/blackjack-game";
export {
	RouletteGame,
	type Bet,
	type RouletteTable,
	type RoulettePlayer,
	type RouletteBetResult,
	type RouletteSpinResult,
} from "./games/roulette-game";
export {
	TexasPokerGame,
	type PokerPlayer,
	type PlayerAction,
	type BettingRound,
	type PotInfo,
	type ShowdownResult,
} from "./games/texas-poker-game";

// Poker hand evaluation
export { PokerHandEvaluator } from "./poker-evaluator";

// Core types and interfaces
export {
	// Error types
	CasinoError,
	GameStateError,
	InvalidActionError,
	BettingClosedError,
	TableLimitError,
	InvalidBetError,
	InsufficientFundsError,
	InvalidPlayerError,
	DeckEmptyError,
	// Enums
	BetType,
	HandRank,
	// Betting interfaces
	type BaseBet,
	type RouletteBet,
	type BlackjackBet,
	type PokerBet,
	type GameBet,
	// Poker interfaces
	type HandEvaluation,
	type PokerShowdown,
	// Game statistics
	type GameStatistics,
} from "./types";
