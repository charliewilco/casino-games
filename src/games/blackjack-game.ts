import { DeckShoe } from "../deck.ts";
import type { PlayingCard } from "../playing-card.ts";
import {
	InvalidBetError,
	GameStateError,
	InsufficientFundsError,
	BetType,
} from "../types.ts";

export interface BlackjackPlayer {
	id: string;
	balance: number;
	name?: string;
}

export interface BlackjackHand {
	cards: PlayingCard[];
	bet: number;
	isDoubledDown: boolean;
	isStanding: boolean;
	canSplit: boolean;
	canDoubleDown: boolean;
	canSurrender: boolean;
	isBlackjack: boolean;
	isBusted: boolean;
	isSurrendered: boolean;
}

export interface BlackjackOptions {
	allowDoubleDown: boolean;
	allowSplit: boolean;
	allowSurrender: boolean;
	allowInsurance: boolean;
	dealerHitsSoft17: boolean;
	maxSplitHands: number;
	blackjackPayout: number; // 1.5 for 3:2, 1.2 for 6:5
	minBet: number;
	maxBet: number;
}

export interface GameResult {
	playerId: string;
	handIndex: number;
	result: "win" | "lose" | "push" | "blackjack" | "surrender";
	payout: number;
	playerValue: number;
	dealerValue: number;
}

export class BlackjackGame {
	private shoe: DeckShoe;
	private dealer: { cards: PlayingCard[]; isBlackjack: boolean };
	private players: Map<string, BlackjackPlayer>;
	private playerHands: Map<string, BlackjackHand[]>;
	private currentPlayer: string | null = null;
	private gameInProgress = false;
	private bettingPhase = false;
	private options: BlackjackOptions;
	private insuranceBets: Map<string, number> = new Map();
	private activeBets: Map<string, Array<{ amount: number; type: BetType }>> =
		new Map();
	private gameStats = { handsPlayed: 0, totalBetAmount: 0 };

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
	}

	// Player management
	public addPlayer(player: BlackjackPlayer): void {
		if (this.players.has(player.id)) {
			throw new GameStateError(`Player ${player.id} already exists`);
		}
		this.players.set(player.id, player);
		this.playerHands.set(player.id, []);
	}

	public removePlayer(playerId: string): void {
		if (this.gameInProgress && this.currentPlayer === playerId) {
			throw new GameStateError("Cannot remove current player during game");
		}
		this.players.delete(playerId);
		this.playerHands.delete(playerId);
	}

	public getPlayer(playerId: string): BlackjackPlayer | undefined {
		return this.players.get(playerId);
	}

	public getPlayers(): BlackjackPlayer[] {
		return Array.from(this.players.values());
	}

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

	public getGameStatistics(): { handsPlayed: number; totalBetAmount: number } {
		return { ...this.gameStats };
	}

	// Betting phase
	public startBettingPhase(): void {
		if (this.gameInProgress) {
			throw new GameStateError("Game already in progress");
		}
		this.bettingPhase = true;
		this.playerHands.forEach((hands, playerId) => {
			this.playerHands.set(playerId, []);
		});
		this.dealer.cards = [];
		this.dealer.isBlackjack = false;
		this.insuranceBets.clear();
		this.activeBets.clear();
	}

	public placeBet(playerId: string, amount: number): void;
	public placeBet(playerId: string, amount: number, betType: BetType): void;
	public placeBet(
		playerId: string,
		amount: number,
		betType: BetType = BetType.BLACKJACK_MAIN,
	): void {
		// Auto-start betting phase if not already started
		if (!this.bettingPhase && !this.gameInProgress) {
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
			if (!this.gameInProgress) {
				throw new GameStateError(
					"Insurance bets can only be placed during a round",
				);
			}
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
			if (!this.bettingPhase && finalBetType !== BetType.INSURANCE) {
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

	public startRound(): void {
		if (!this.bettingPhase) {
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

		this.bettingPhase = false;
		this.gameInProgress = true;

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
	}

	// Legacy compatibility methods
	public startNewRound(): void {
		// For backwards compatibility - create a simple game for testing
		this.dealer.cards = [];
		this.dealer.isBlackjack = false;
		this.gameInProgress = true;

		// Create a default player if none exists
		if (this.players.size === 0) {
			this.addPlayer({ id: "player1", balance: 1000 });
		}

		// Create hand for the default player
		const hand: BlackjackHand = {
			cards: this.shoe.draw(2),
			bet: 10,
			isDoubledDown: false,
			isStanding: false,
			canSplit: false,
			canDoubleDown: true,
			canSurrender: false,
			isBlackjack: false,
			isBusted: false,
			isSurrendered: false,
		};

		// Update hand state with proper blackjack rules
		this.updateHandState(hand);
		this.playerHands.set("player1", [hand]);

		this.dealer.cards.push(...this.shoe.draw(2));
		this.currentPlayer = "player1";
	}

	public getPlayerHand(): PlayingCard[] {
		const hands = this.playerHands.get("player1");
		return hands?.[0]?.cards || [];
	}

	public getDealerHand(): PlayingCard[] {
		return this.dealer.cards;
	}

	public dealerPlay(): void {
		while (this.shouldDealerHit()) {
			this.dealer.cards.push(this.shoe.draw(1)[0]);
		}
	}

	public getPlayerHandValue(): number {
		const hands = this.playerHands.get("player1");
		const hand = hands?.[0]?.cards || [];
		return this.getHandValuePrivate(hand);
	}

	public getDealerHandValue(): number {
		return this.getHandValuePrivate(this.dealer.cards);
	}

	public isPlayerBusted(): boolean {
		const hands = this.playerHands.get("player1");
		return hands?.[0]?.isBusted || false;
	}

	public getWinner(): "player" | "dealer" | "tie" | null {
		const hands = this.playerHands.get("player1");
		const hand = hands?.[0];
		if (!hand) return null;

		const playerValue = this.getHandValuePrivate(hand.cards);
		const dealerValue = this.getHandValuePrivate(this.dealer.cards);

		if (playerValue > 21) return "dealer";
		if (dealerValue > 21) return "player";
		if (playerValue > dealerValue) return "player";
		if (dealerValue > playerValue) return "dealer";
		return "tie";
	}

	// Multi-player versions
	public getPlayerHandMulti(playerId: string, handIndex = 0): PlayingCard[] {
		const hands = this.playerHands.get(playerId);
		return hands?.[handIndex]?.cards || [];
	}

	public getPlayerHandValueMulti(playerId: string, handIndex = 0): number {
		const hand = this.getPlayerHandMulti(playerId, handIndex);
		return this.getHandValuePrivate(hand);
	}

	public isPlayerBustedMulti(playerId: string, handIndex = 0): boolean {
		const hands = this.playerHands.get(playerId);
		return hands?.[handIndex]?.isBusted || false;
	}

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
	public hit(): PlayingCard;
	public hit(playerId: string, handIndex?: number): PlayingCard;
	public hit(playerId?: string, handIndex = 0): PlayingCard {
		// Legacy compatibility - if no playerId provided, use "player1"
		if (!playerId) {
			// Auto-initialize for legacy tests
			if (this.players.size === 0) {
				this.addPlayer({ id: "player1", balance: 1000 });
			}

			let hand = this.playerHands.get("player1")?.[0];
			if (!hand) {
				// Auto-create a hand for legacy compatibility
				if (!this.bettingPhase && !this.gameInProgress) {
					this.startBettingPhase();
				}
				this.placeBet("player1", 100);
				this.startRound();
				hand = this.playerHands.get("player1")?.[0];
			}

			if (!hand) {
				throw new GameStateError("No active hand");
			}

			const card = this.shoe.draw(1)[0];
			hand.cards.push(card);
			this.updateHandState(hand);
			return card;
		}

		// Multi-player version
		if (!this.gameInProgress) {
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

		// After hit, can no longer double down or surrender
		hand.canDoubleDown = false;
		hand.canSurrender = false;

		return card;
	}

	public stand(): void;
	public stand(playerId: string, handIndex?: number): void;
	public stand(playerId?: string, handIndex = 0): void {
		// Legacy compatibility - if no playerId provided, use "player1"
		if (!playerId) {
			// Auto-initialize for legacy tests
			if (this.players.size === 0) {
				this.addPlayer({ id: "player1", balance: 1000 });
			}

			let hand = this.playerHands.get("player1")?.[0];
			if (!hand) {
				// Auto-create a hand for legacy compatibility
				if (!this.bettingPhase && !this.gameInProgress) {
					this.startBettingPhase();
				}
				this.placeBet("player1", 100);
				this.startRound();
				hand = this.playerHands.get("player1")?.[0];
			}

			if (!hand) {
				throw new GameStateError("No active hand");
			}

			hand.isStanding = true;
			hand.canDoubleDown = false;
			hand.canSurrender = false;
			return;
		}

		if (!this.gameInProgress) {
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

	public doubleDown(playerId: string, handIndex = 0): PlayingCard {
		if (!this.gameInProgress) {
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

		// Double the bet
		player.balance -= hand.bet;
		hand.bet *= 2;
		hand.isDoubledDown = true;
		hand.canDoubleDown = false;
		hand.canSurrender = false;

		// Update the tracked bet amount in activeBets
		const playerBets = this.activeBets.get(playerId);
		if (playerBets) {
			const mainBet = playerBets.find(
				(bet) => bet.type === BetType.BLACKJACK_MAIN,
			);
			if (mainBet) {
				mainBet.amount = hand.bet;
			}
		}

		// Update game stats for the additional bet amount
		this.gameStats.totalBetAmount += hand.bet / 2;

		// Draw exactly one card and stand
		const card = this.shoe.draw(1)[0];
		hand.cards.push(card);
		this.updateHandState(hand);
		hand.isStanding = true;

		return card;
	}

	public split(playerId: string, handIndex = 0): void {
		if (!this.gameInProgress) {
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

		// Create new hand with the second card
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

		// Add card to each hand
		hand.cards.push(this.shoe.draw(1)[0]);
		newHand.cards.push(this.shoe.draw(1)[0]);

		// Update states
		this.updateHandState(hand);
		this.updateHandState(newHand);

		// Add new hand and charge for split
		hands.push(newHand);
		player.balance -= hand.bet;
	}

	public surrender(playerId: string, handIndex = 0): void {
		if (!this.gameInProgress) {
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

		// Player gets half their bet back
		player.balance += hand.bet / 2;
		hand.isSurrendered = true;
		hand.isStanding = true;
		hand.canDoubleDown = false;
		hand.canSurrender = false;
	}

	public finishRound(): GameResult[] {
		if (!this.gameInProgress) {
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
		this.gameInProgress = false;
		this.currentPlayer = null;

		return results;
	}

	// Public method for legacy compatibility
	public getHandValue(): number;
	public getHandValue(playerId: string, handIndex?: number): number;
	public getHandValue(playerId?: string, handIndex = 0): number {
		// Legacy compatibility - if no playerId provided, use "player1"
		if (!playerId) {
			const hand = this.playerHands.get("player1")?.[0];
			if (!hand) {
				throw new GameStateError("No active hand");
			}
			return this.getHandValuePrivate(hand.cards);
		}

		const hands = this.playerHands.get(playerId);
		const hand = hands?.[handIndex];
		if (!hand) {
			throw new GameStateError(`Player ${playerId} has no active hand`);
		}

		return this.getHandValuePrivate(hand.cards);
	}

	// Helper methods for blackjack logic
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

	private isBlackjack(cards: PlayingCard[]): boolean {
		return cards.length === 2 && this.getHandValuePrivate(cards) === 21;
	}

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
