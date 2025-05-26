import { DeckShoe } from "../deck.ts";
import type { PlayingCard } from "../playing-card.ts";
import {
	BetType,
	GameStateError,
	InsufficientFundsError,
	InvalidBetError,
} from "../types.ts";

/**
 * Represents a player in a blackjack game.
 */
export interface BlackjackPlayer {
	/** Unique identifier for the player */
	id: string;
	/** Player's current balance in the game */
	balance: number;
	/** Optional display name for the player */
	name?: string;
}

/**
 * Represents a single hand in a blackjack game.
 * Each player can have multiple hands if they split.
 */
export interface BlackjackHand {
	/** The cards currently in this hand */
	cards: PlayingCard[];
	/** The amount bet on this hand */
	bet: number;
	/** Whether this hand has been doubled down */
	isDoubledDown: boolean;
	/** Whether the player has chosen to stand on this hand */
	isStanding: boolean;
	/** Whether this hand is eligible for splitting */
	canSplit: boolean;
	/** Whether this hand is eligible for doubling down */
	canDoubleDown: boolean;
	/** Whether this hand is eligible for surrender */
	canSurrender: boolean;
	/** Whether this hand is a blackjack (21 with 2 cards) */
	isBlackjack: boolean;
	/** Whether this hand has busted (exceeded 21) */
	isBusted: boolean;
	/** Whether this hand has been surrendered */
	isSurrendered: boolean;
}

/**
 * Configuration options for customizing blackjack game rules.
 */
export interface BlackjackOptions {
	/** Whether players can double down on their hands */
	allowDoubleDown: boolean;
	/** Whether players can split pairs */
	allowSplit: boolean;
	/** Whether players can surrender their hands */
	allowSurrender: boolean;
	/** Whether insurance bets are allowed when dealer shows an Ace */
	allowInsurance: boolean;
	/** Whether dealer hits on soft 17 (Ace + 6) */
	dealerHitsSoft17: boolean;
	/** Maximum number of hands a player can have after splitting */
	maxSplitHands: number;
	/** Payout multiplier for blackjack (1.5 for 3:2, 1.2 for 6:5) */
	blackjackPayout: number; // 1.5 for 3:2, 1.2 for 6:5
	/** Minimum bet amount allowed */
	minBet: number;
	/** Maximum bet amount allowed */
	maxBet: number;
}

/**
 * Represents the result of a completed blackjack hand.
 */
export interface GameResult {
	/** ID of the player this result belongs to */
	playerId: string;
	/** Index of the hand (relevant for split hands) */
	handIndex: number;
	/** Outcome of the hand */
	result: "win" | "lose" | "push" | "blackjack" | "surrender";
	/** Amount paid out to the player (0 for losses) */
	payout: number;
	/** Final value of the player's hand */
	playerValue: number;
	/** Final value of the dealer's hand */
	dealerValue: number;
}

/**
 * A comprehensive blackjack game implementation supporting multiple players,
 * splitting, doubling down, surrender, insurance, and various game rules.
 *
 * @example
 * ```typescript
 * const game = new BlackjackGame(6, { allowSurrender: true });
 * game.addPlayer({ id: "player1", balance: 1000 });
 * game.startBettingPhase();
 * game.placeBet("player1", 100);
 * game.startRound();
 * ```
 */
export enum GamePhase {
	WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
	BETTING_PHASE = "BETTING_PHASE",
	DEAL_PHASE = "DEAL_PHASE",
	PLAYER_ACTION_PHASE = "PLAYER_ACTION_PHASE",
	INSURANCE_OFFERED = "INSURANCE_OFFERED",
	DEALER_PLAY_PHASE = "DEALER_PLAY_PHASE",
	ROUND_RESULTS = "ROUND_RESULTS",
	ENDED = "ENDED",
}

export interface BlackjackGameState {
	phase: GamePhase;
	players: BlackjackPlayer[];
	playerHands: Record<string, BlackjackHand[]>;
	dealer: { cards: PlayingCard[]; isBlackjack: boolean };
	currentPlayer: string | null;
	activeBets: Record<string, Array<{ amount: number; type: BetType }>>;
	insuranceBets: Record<string, number>;
	statistics: { handsPlayed: number; totalBetAmount: number };
}

export class BlackjackGame {
	private shoe: DeckShoe;
	private dealer: { cards: PlayingCard[]; isBlackjack: boolean };
	private players: Map<string, BlackjackPlayer>;
	private playerHands: Map<string, BlackjackHand[]>;
	private currentPlayer: string | null = null;
	private gamePhase: GamePhase = GamePhase.WAITING_FOR_PLAYERS;
	private options: BlackjackOptions;
	private insuranceBets: Map<string, number> = new Map();
	private activeBets: Map<string, Array<{ amount: number; type: BetType }>> =
		new Map();
	private gameStats = { handsPlayed: 0, totalBetAmount: 0 };

	public getCurrentPhase(): GamePhase {
		return this.gamePhase;
	}

	/**
	 * Creates a new blackjack game instance.
	 *
	 * @param decks - Number of decks to use in the shoe (default: 8)
	 * @param options - Custom game options to override defaults
	 */
	constructor(decks = 8, options: Partial<BlackjackOptions> = {}) {
		this.shoe = new DeckShoe(decks);
		this.dealer = { cards: [], isBlackjack: false };
		this.players = new Map();
		this.playerHands = new Map();
		this.options = {
			allowDoubleDown: true,
			allowSplit: true,
			allowSurrender: true,
			allowInsurance: true,
			dealerHitsSoft17: false,
			maxSplitHands: 4,
			blackjackPayout: 1.5,
			minBet: 1,
			maxBet: 1000,
			...options,
		};
		this.gamePhase = GamePhase.WAITING_FOR_PLAYERS;
	}

	// Player management
	/**
	 * Adds a new player to the game.
	 *
	 * @param player - The player to add
	 * @throws {GameStateError} If a player with the same ID already exists
	 */
	public addPlayer(player: BlackjackPlayer): void {
		if (this.players.has(player.id)) {
			throw new GameStateError(`Player ${player.id} already exists`);
		}
		this.players.set(player.id, player);
		this.playerHands.set(player.id, []);
		if (
			this.gamePhase === GamePhase.WAITING_FOR_PLAYERS &&
			this.players.size > 0
		) {
			this.gamePhase = GamePhase.BETTING_PHASE;
		}
	}

	/**
	 * Removes a player from the game.
	 *
	 * @param playerId - ID of the player to remove
	 * @throws {GameStateError} If trying to remove the current player during an active game
	 */
	public removePlayer(playerId: string): void {
		if (
			(this.gamePhase === GamePhase.PLAYER_ACTION_PHASE ||
				this.gamePhase === GamePhase.INSURANCE_OFFERED ||
				this.gamePhase === GamePhase.DEALER_PLAY_PHASE) &&
			this.currentPlayer === playerId
		) {
			throw new GameStateError("Cannot remove current player during game");
		}
		this.players.delete(playerId);
		this.playerHands.delete(playerId);
		if (this.players.size === 0) {
			this.gamePhase = GamePhase.WAITING_FOR_PLAYERS;
		}
	}

	/**
	 * Retrieves a player by their ID.
	 *
	 * @param playerId - ID of the player to retrieve
	 * @returns The player object or undefined if not found
	 */
	public getPlayer(playerId: string): BlackjackPlayer | undefined {
		return this.players.get(playerId);
	}

	/**
	 * Gets all players currently in the game.
	 *
	 * @returns Array of all players
	 */
	public getPlayers(): BlackjackPlayer[] {
		return Array.from(this.players.values());
	}

	/**
	 * Gets all current active bets in the game.
	 *
	 * @returns Array of bet information including player ID, amount, and type
	 */
	public getCurrentBets(): Array<{
		playerId: string;
		amount: number;
		type: BetType;
	}> {
		const allBets: Array<{ playerId: string; amount: number; type: BetType }> =
			[];
		for (const [playerId, bets] of this.activeBets.entries()) {
			for (const bet of bets) {
				allBets.push({ playerId, amount: bet.amount, type: bet.type });
			}
		}
		return allBets;
	}

	/**
	 * Gets game statistics including hands played and total bet amounts.
	 *
	 * @returns Object containing game statistics
	 */
	public getGameStatistics(): { handsPlayed: number; totalBetAmount: number } {
		return { ...this.gameStats };
	}

	/**
	 * Returns a snapshot of the current game state for UI or debugging.
	 */
	public getGameState(): BlackjackGameState {
		return {
			phase: this.gamePhase,
			players: this.getPlayers(),
			playerHands: Object.fromEntries(this.playerHands.entries()),
			dealer: { ...this.dealer, cards: [...this.dealer.cards] },
			currentPlayer: this.currentPlayer,
			activeBets: Object.fromEntries(
				Array.from(this.activeBets.entries()).map(([pid, bets]) => [
					pid,
					bets.map((b) => ({ ...b })),
				]),
			),
			insuranceBets: Object.fromEntries(this.insuranceBets.entries()),
			statistics: { ...this.gameStats },
		};
	}

	// Betting phase
	/**
	 * Starts the betting phase of the game, resetting hands and bets.
	 *
	 * @throws {GameStateError} If a game is already in progress
	 */
	public startBettingPhase(): void {
		if (
			this.gamePhase === GamePhase.PLAYER_ACTION_PHASE ||
			this.gamePhase === GamePhase.INSURANCE_OFFERED ||
			this.gamePhase === GamePhase.DEALER_PLAY_PHASE
		) {
			throw new GameStateError("Game already in progress");
		}
		this.gamePhase = GamePhase.BETTING_PHASE;
		this.playerHands.forEach((hands, playerId) => {
			this.playerHands.set(playerId, []);
		});
		this.dealer.cards = [];
		this.dealer.isBlackjack = false;
		this.insuranceBets.clear();
		this.activeBets.clear();
	}

	/**
	 * Places a bet for a player.
	 *
	 * @param playerId - ID of the player placing the bet
	 * @param amount - Amount to bet
	 * @param betType - Type of bet (main, insurance, etc.)
	 * @throws {InvalidBetError} If player not found or bet amount invalid
	 * @throws {InsufficientFundsError} If player lacks sufficient balance
	 * @throws {GameStateError} If betting is not allowed at this time
	 */
	public placeBet(playerId: string, amount: number, betType: BetType): void {
		// Auto-start betting phase if not already started
		if (
			this.gamePhase !== GamePhase.BETTING_PHASE &&
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			this.startBettingPhase();
		}

		const player = this.players.get(playerId);
		if (!player) {
			throw new InvalidBetError(`Player ${playerId} not found`);
		}

		if (amount < this.options.minBet || amount > this.options.maxBet) {
			throw new InvalidBetError(
				`Bet amount must be between ${this.options.minBet} and ${this.options.maxBet}`,
			);
		}

		if (player.balance < amount) {
			throw new InsufficientFundsError(
				`Insufficient funds: ${player.balance} < ${amount}`,
			);
		}

		// Determine final bet type
		let finalBetType = betType;

		// Handle insurance bet logic first (before betting phase check)
		const isInsuranceBet = betType === BetType.INSURANCE;
		if (isInsuranceBet) {
			if (this.dealer.cards.length === 0 || this.dealer.cards[0].value !== 1) {
				throw new GameStateError(
					"Insurance is only available when dealer shows an Ace",
				);
			}
			finalBetType = BetType.INSURANCE;
		} else {
			// Auto-detect insurance for smaller bets during betting phase
			if (betType === BetType.BLACKJACK_MAIN) {
				const hands = this.playerHands.get(playerId) || [];
				if (hands.length > 0 && amount < hands[0].bet) {
					// Smaller bet after main bet = insurance
					finalBetType = BetType.INSURANCE;
				}
			}

			// Check betting phase for non-insurance bets
			if (
				this.gamePhase !== GamePhase.BETTING_PHASE &&
				finalBetType !== BetType.INSURANCE
			) {
				throw new GameStateError("Not in betting phase");
			}
		}

		// Handle main bet - create hand
		if (finalBetType === BetType.BLACKJACK_MAIN) {
			player.balance -= amount;
			const hand: BlackjackHand = {
				cards: [],
				bet: amount,
				isDoubledDown: false,
				isStanding: false,
				canSplit: false,
				canDoubleDown: true,
				canSurrender: this.options.allowSurrender,
				isBlackjack: false,
				isBusted: false,
				isSurrendered: false,
			};

			const hands = this.playerHands.get(playerId) || [];
			hands.push(hand);
			this.playerHands.set(playerId, hands);
		}

		// Track the bet
		if (!this.activeBets.has(playerId)) {
			this.activeBets.set(playerId, []);
		}
		const playerBets = this.activeBets.get(playerId);
		if (playerBets) {
			playerBets.push({ amount, type: finalBetType });
		}

		// Update game stats
		this.gameStats.totalBetAmount += amount;

		// Deduct from balance for side bets and insurance
		if (finalBetType !== BetType.BLACKJACK_MAIN) {
			player.balance -= amount;
		}
	}

	/**
	 * Starts a new round after the betting phase, dealing initial cards.
	 *
	 * @throws {GameStateError} If not in betting phase or no players have placed bets
	 */
	public startRound(): void {
		if (this.gamePhase !== GamePhase.BETTING_PHASE) {
			throw new GameStateError(
				"Must start betting phase before starting round",
			);
		}

		// Check if any players have placed bets
		const playersWithBets = Array.from(this.playerHands.entries()).filter(
			([_, hands]) => hands.length > 0,
		);
		if (playersWithBets.length === 0) {
			throw new GameStateError("No players have placed bets");
		}

		this.gamePhase = GamePhase.DEAL_PHASE;

		// Increment hands played counter
		this.gameStats.handsPlayed += 1;

		// Deal initial cards to all players with bets
		for (const [_playerId, hands] of playersWithBets) {
			for (const hand of hands) {
				if (hand.cards.length === 0) {
					hand.cards.push(...this.shoe.draw(2));
					this.updateHandState(hand);
				}
			}
		}

		// Deal dealer cards (2 cards, one face down)
		this.dealer.cards.push(...this.shoe.draw(2));
		this.dealer.isBlackjack = this.isBlackjack(this.dealer.cards);

		this.gamePhase = GamePhase.PLAYER_ACTION_PHASE;
	}

	/**
	 * Gets the dealer's current hand cards.
	 *
	 * @returns Array of cards in the dealer's hand
	 */
	public getDealerHand(): PlayingCard[] {
		return this.dealer.cards;
	}

	/**
	 * Executes dealer play according to standard blackjack rules.
	 * Dealer hits until reaching 17 or higher (soft 17 rule applies).
	 */
	public dealerPlay(): void {
		while (this.shouldDealerHit()) {
			this.dealer.cards.push(this.shoe.draw(1)[0]);
		}
	}

	/**
	 * Gets the dealer's current hand value.
	 *
	 * @returns Numerical value of the dealer's hand
	 */
	public getDealerHandValue(): number {
		return this.getHandValuePrivate(this.dealer.cards);
	}

	// Multi-player versions
	/**
	 * Gets a specific player's hand cards.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands, default: 0)
	 * @returns Array of cards in the specified hand
	 */
	public getPlayerHandMulti(playerId: string, handIndex = 0): PlayingCard[] {
		const hands = this.playerHands.get(playerId);
		return hands?.[handIndex]?.cards || [];
	}

	/**
	 * Gets the value of a specific player's hand.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands, default: 0)
	 * @returns Numerical value of the specified hand
	 */
	public getPlayerHandValueMulti(playerId: string, handIndex = 0): number {
		const hand = this.getPlayerHandMulti(playerId, handIndex);
		return this.getHandValuePrivate(hand);
	}

	/**
	 * Checks if a specific player's hand has busted.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands, default: 0)
	 * @returns True if the specified hand value exceeds 21
	 */
	public isPlayerBustedMulti(playerId: string, handIndex = 0): boolean {
		const hands = this.playerHands.get(playerId);
		return hands?.[handIndex]?.isBusted || false;
	}

	/**
	 * Determines the winner between a specific player's hand and the dealer.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands, default: 0)
	 * @returns "player", "dealer", "tie" | null if no active hand
	 */
	public getWinnerMulti(
		playerId: string,
		handIndex = 0,
	): "player" | "dealer" | "tie" | null {
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) return null;

		const playerValue = this.getHandValuePrivate(hand.cards);
		const dealerValue = this.getHandValuePrivate(this.dealer.cards);

		if (playerValue > 21) return "dealer";
		if (dealerValue > 21) return "player";
		if (playerValue > dealerValue) return "player";
		if (dealerValue > playerValue) return "dealer";
		return "tie";
	}

	// Multi-player action methods with legacy compatibility
	/**
	 * Deals one card to a specific player's hand.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands)
	 * @returns The card that was dealt
	 * @throws {GameStateError} If no active round or invalid hand
	 */
	public hit(playerId: string, handIndex: number = 0): PlayingCard {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		if (hand.isStanding || hand.isBusted || hand.isSurrendered) {
			throw new GameStateError("Cannot hit: hand is already finished");
		}
		const card = this.shoe.draw(1)[0];
		hand.cards.push(card);
		this.updateHandState(hand);
		hand.canDoubleDown = false;
		hand.canSurrender = false;
		return card;
	}

	/**
	 * Makes a specific player stand on their hand.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands)
	 * @throws {GameStateError} If no active round or player already stood
	 */
	public stand(playerId: string, handIndex: number = 0): void {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		if (hand.isStanding) {
			throw new GameStateError("Player has already stood");
		}
		hand.isStanding = true;
		hand.canDoubleDown = false;
		hand.canSurrender = false;
	}

	/**
	 * Doubles down on a player's hand, doubling the bet and dealing exactly one more card.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands, default: 0)
	 * @returns The card that was dealt
	 * @throws {GameStateError} If no active round, invalid hand, or double down not allowed
	 * @throws {InsufficientFundsError} If player lacks sufficient funds
	 */
	public doubleDown(playerId: string, handIndex = 0): PlayingCard {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		if (!hand.canDoubleDown) {
			throw new GameStateError("Cannot double down on this hand");
		}
		const player = this.players.get(playerId);
		if (!player) {
			throw new GameStateError(`Player ${playerId} not found`);
		}
		if (player.balance < hand.bet) {
			throw new InsufficientFundsError("Insufficient funds to double down");
		}
		player.balance -= hand.bet;
		hand.bet *= 2;
		hand.isDoubledDown = true;
		hand.canDoubleDown = false;
		hand.canSurrender = false;
		const playerBets = this.activeBets.get(playerId);
		if (playerBets) {
			const mainBet = playerBets.find(
				(bet) => bet.type === BetType.BLACKJACK_MAIN,
			);
			if (mainBet) {
				mainBet.amount = hand.bet;
			}
		}
		this.gameStats.totalBetAmount += hand.bet / 2;
		const card = this.shoe.draw(1)[0];
		hand.cards.push(card);
		this.updateHandState(hand);
		hand.isStanding = true;
		return card;
	}

	/**
	 * Splits a player's hand into two separate hands when they have a pair.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand to split (default: 0)
	 * @throws {GameStateError} If no active round, invalid hand, split not allowed, or max hands reached
	 * @throws {InsufficientFundsError} If player lacks sufficient funds
	 */
	public split(playerId: string, handIndex = 0): void {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		if (!hand.canSplit) {
			throw new GameStateError("Cannot split this hand");
		}
		const player = this.players.get(playerId);
		if (!player) {
			throw new GameStateError(`Player ${playerId} not found`);
		}
		if (player.balance < hand.bet) {
			throw new InsufficientFundsError("Insufficient funds to split");
		}
		if (hands.length >= this.options.maxSplitHands) {
			throw new GameStateError(
				`Maximum ${this.options.maxSplitHands} split hands allowed`,
			);
		}
		const secondCard = hand.cards.pop();
		if (!secondCard) {
			throw new GameStateError("Cannot split: hand does not have enough cards");
		}
		const newHand: BlackjackHand = {
			cards: [secondCard],
			bet: hand.bet,
			isDoubledDown: false,
			isStanding: false,
			canSplit: false,
			canDoubleDown: true,
			canSurrender: false,
			isBlackjack: false,
			isBusted: false,
			isSurrendered: false,
		};
		hand.cards.push(this.shoe.draw(1)[0]);
		newHand.cards.push(this.shoe.draw(1)[0]);
		this.updateHandState(hand);
		this.updateHandState(newHand);
		hands.push(newHand);
		player.balance -= hand.bet;
	}

	/**
	 * Allows a player to surrender their hand, getting back half their bet.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand to surrender (default: 0)
	 * @throws {GameStateError} If no active round, invalid hand, or surrender not allowed
	 */
	public surrender(playerId: string, handIndex = 0): void {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		if (!hand.canSurrender) {
			throw new GameStateError("Cannot surrender this hand");
		}
		const player = this.players.get(playerId);
		if (!player) {
			throw new GameStateError(`Player ${playerId} not found`);
		}
		player.balance += hand.bet / 2;
		hand.isSurrendered = true;
		hand.isStanding = true;
		hand.canDoubleDown = false;
		hand.canSurrender = false;
	}

	/**
	 * Finishes the current round, processes all results, and pays out winnings.
	 *
	 * @returns Array of game results for each player's hand
	 * @throws {GameStateError} If no active round
	 */
	public finishRound(): GameResult[] {
		if (
			this.gamePhase !== GamePhase.PLAYER_ACTION_PHASE &&
			this.gamePhase !== GamePhase.DEALER_PLAY_PHASE &&
			this.gamePhase !== GamePhase.INSURANCE_OFFERED
		) {
			throw new GameStateError("No active round");
		}

		// Dealer plays
		this.dealerPlay();

		const results: GameResult[] = [];
		const dealerValue = this.getHandValuePrivate(this.dealer.cards);

		// Process each player's hands
		for (const [playerId, hands] of this.playerHands.entries()) {
			const player = this.players.get(playerId);
			if (!player) continue;

			hands.forEach((hand, handIndex) => {
				if (hand.cards.length === 0) return; // Skip empty hands

				const playerValue = this.getHandValuePrivate(hand.cards);
				let result: GameResult["result"];
				let payout = 0;

				if (hand.isSurrendered) {
					result = "surrender";
					// Payout already handled in surrender method
				} else if (hand.isBusted) {
					result = "lose";
				} else if (hand.isBlackjack && !this.dealer.isBlackjack) {
					result = "blackjack";
					payout = hand.bet * this.options.blackjackPayout;
					player.balance += hand.bet + payout; // Return bet + bonus
				} else if (this.dealer.isBlackjack && !hand.isBlackjack) {
					result = "lose";
				} else if (this.dealer.isBlackjack && hand.isBlackjack) {
					result = "push";
					player.balance += hand.bet; // Return bet
				} else if (dealerValue > 21) {
					result = "win";
					payout = hand.bet;
					player.balance += hand.bet * 2; // Return bet + winnings
				} else if (playerValue > dealerValue) {
					result = "win";
					payout = hand.bet;
					player.balance += hand.bet * 2; // Return bet + winnings
				} else if (dealerValue > playerValue) {
					result = "lose";
				} else {
					result = "push";
					player.balance += hand.bet; // Return bet
				}

				results.push({
					playerId,
					handIndex,
					result,
					payout,
					playerValue,
					dealerValue,
				});
			});
		}

		// Reset game state
		this.gamePhase = GamePhase.ROUND_RESULTS;
		this.currentPlayer = null;

		return results;
	}

	/**
	 * Gets the hand value for a specific player.
	 *
	 * @param playerId - ID of the player
	 * @param handIndex - Index of the hand (for split hands)
	 * @returns Numerical value of the specified hand
	 * @throws {GameStateError} If no active hand found
	 */
	public getHandValue(playerId: string, handIndex: number = 0): number {
		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}
		return this.getHandValuePrivate(hand.cards);
	}

	/**
	 * Evaluates the value of a hand of cards for blackjack.
	 * Returns a number if only one value is possible, or a tuple [low, high] for soft hands.
	 * @param cards Array of PlayingCard
	 * @returns number | [number, number] (tuple for soft hands)
	 */
	public static evaluateHandValue(
		cards: PlayingCard[],
	): number | [number, number] {
		let value = 0;
		let aces = 0;
		for (const card of cards) {
			if (card.value === 1) {
				aces++;
				value += 11;
			} else if (card.value >= 11) {
				value += 10;
			} else {
				value += card.value;
			}
		}
		if (aces === 0) {
			return value;
		}
		let lowValue = value;
		while (lowValue > 21 && aces > 0) {
			lowValue -= 10;
			aces--;
		}
		if (lowValue !== value && lowValue <= 21) {
			return [lowValue, value];
		}
		return lowValue;
	}

	// Helper methods for blackjack logic
	/**
	 * Updates the state flags of a hand based on current cards and game options.
	 *
	 * @param hand - The hand to update
	 * @private
	 */
	private updateHandState(hand: BlackjackHand): void {
		const handValue = this.getHandValuePrivate(hand.cards);

		// Update blackjack status (21 with exactly 2 cards)
		hand.isBlackjack = this.isBlackjack(hand.cards);

		// Update bust status
		hand.isBusted = handValue > 21;

		// Update split eligibility (two cards of same rank)
		hand.canSplit =
			this.options.allowSplit &&
			hand.cards.length === 2 &&
			hand.cards[0].value === hand.cards[1].value &&
			!hand.isDoubledDown;

		// Double down is only allowed on initial 2 cards and if enabled
		hand.canDoubleDown =
			this.options.allowDoubleDown &&
			hand.cards.length === 2 &&
			!hand.isDoubledDown &&
			!hand.isBlackjack;

		// Surrender is only allowed on initial 2 cards and if enabled
		hand.canSurrender =
			this.options.allowSurrender &&
			hand.cards.length === 2 &&
			!hand.isDoubledDown &&
			!hand.isBlackjack;
	}

	/**
	 * Calculates the optimal value of a hand of cards according to blackjack rules.
	 * Aces are counted as 11 unless that would cause a bust, then as 1.
	 *
	 * @param cards - Array of cards to calculate value for
	 * @returns The optimal numerical value of the hand
	 * @private
	 */
	private getHandValuePrivate(cards: PlayingCard[]): number {
		let value = 0;
		let aces = 0;

		// Count value and aces
		for (const card of cards) {
			if (card.value === 1) {
				// Ace
				aces++;
				value += 11; // Start with ace as 11
			} else if (card.value >= 11) {
				// Face cards
				value += 10;
			} else {
				value += card.value;
			}
		}

		// Convert aces from 11 to 1 while over 21
		while (value > 21 && aces > 0) {
			value -= 10; // Convert ace from 11 to 1
			aces--;
		}

		return value;
	}

	/**
	 * Determines if a hand is a blackjack (21 with exactly 2 cards).
	 *
	 * @param cards - Array of cards to check
	 * @returns True if the hand is a blackjack
	 * @private
	 */
	private isBlackjack(cards: PlayingCard[]): boolean {
		return cards.length === 2 && this.getHandValuePrivate(cards) === 21;
	}

	/**
	 * Determines if the dealer should hit based on standard blackjack rules.
	 * Dealer hits on 16 or less, stands on 17 or more.
	 * Respects the soft 17 rule if configured.
	 *
	 * @returns True if dealer should take another card
	 * @private
	 */
	private shouldDealerHit(): boolean {
		const dealerValue = this.getHandValuePrivate(this.dealer.cards);

		// Basic rule: dealer hits on 16 or less, stands on 17 or more
		if (dealerValue < 17) {
			return true;
		}

		// Check for soft 17 rule (Ace counted as 11 with total 17)
		if (dealerValue === 17 && this.options.dealerHitsSoft17) {
			// Check if this is a soft 17 (contains an ace counted as 11)
			let value = 0;
			let hasAceCounted11 = false;

			for (const card of this.dealer.cards) {
				if (card.value === 1) {
					// Ace
					value += 11;
					hasAceCounted11 = true;
				} else if (card.value >= 11) {
					// Face cards
					value += 10;
				} else {
					value += card.value;
				}
			}

			// If we had to convert any aces, check if we still have a soft 17
			if (value > 21 && hasAceCounted11) {
				value = this.dealer.cards.reduce((sum, card) => {
					if (card.value === 1) return sum + 1;
					if (card.value >= 11) return sum + 10;
					return sum + card.value;
				}, 0);

				// Add back one ace as 11 if possible
				if (value + 10 === 17) {
					return true; // This is a soft 17
				}
			}
		}

		return false;
	}
}
