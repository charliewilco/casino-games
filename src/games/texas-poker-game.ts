import { Deck } from "../deck";
import type { PlayingCard } from "../playing-card";

export interface Player {
	id: string;
	name: string;
	hand: PlayingCard[];
	chips: number;
	currentBet: number;
	folded: boolean;
}

export class TexasPokerGame {
	private deck: Deck;
	private players: Player[];
	private communityCards: PlayingCard[];
	private pot: number;
	private currentPlayerIndex: number;
	private gamePhase:
		| "preflop"
		| "flop"
		| "turn"
		| "river"
		| "showdown"
		| "ended";

	constructor() {
		this.deck = new Deck();
		this.players = [];
		this.communityCards = [];
		this.pot = 0;
		this.currentPlayerIndex = 0;
		this.gamePhase = "preflop";
	}

	public addPlayer(id: string, name: string, chips = 1000): void {
		if (this.players.length >= 10) {
			throw new Error("Maximum 10 players allowed");
		}

		this.players.push({
			id,
			name,
			hand: [],
			chips,
			currentBet: 0,
			folded: false,
		});
	}

	public startNewGame(): void {
		if (this.players.length < 2) {
			throw new Error("At least 2 players required");
		}

		// Reset game state
		this.deck.reset();
		this.communityCards = [];
		this.pot = 0;
		this.currentPlayerIndex = 0;
		this.gamePhase = "preflop";

		// Reset player states
		for (const player of this.players) {
			player.hand = [];
			player.currentBet = 0;
			player.folded = false;
		}

		// Deal hole cards
		for (let i = 0; i < 2; i++) {
			for (const player of this.players) {
				player.hand.push(this.deck.draw(1)[0]);
			}
		}
	}

	public getPlayers(): Player[] {
		return [...this.players];
	}

	public getCommunityCards(): PlayingCard[] {
		return [...this.communityCards];
	}

	public getPot(): number {
		return this.pot;
	}

	public getGamePhase(): string {
		return this.gamePhase;
	}

	public flop(): void {
		if (this.gamePhase !== "preflop") {
			throw new Error("Can only flop after preflop");
		}

		// Burn one card, then deal 3 community cards
		this.deck.draw(1);
		this.communityCards.push(...this.deck.draw(3));
		this.gamePhase = "flop";
	}

	public turn(): void {
		if (this.gamePhase !== "flop") {
			throw new Error("Can only turn after flop");
		}

		// Burn one card, then deal 1 community card
		this.deck.draw(1);
		this.communityCards.push(this.deck.draw(1)[0]);
		this.gamePhase = "turn";
	}

	public river(): void {
		if (this.gamePhase !== "turn") {
			throw new Error("Can only river after turn");
		}

		// Burn one card, then deal 1 community card
		this.deck.draw(1);
		this.communityCards.push(this.deck.draw(1)[0]);
		this.gamePhase = "river";
	}

	public fold(playerId: string): void {
		const player = this.players.find((p) => p.id === playerId);
		if (!player) {
			throw new Error("Player not found");
		}
		player.folded = true;
	}

	public bet(playerId: string, amount: number): void {
		const player = this.players.find((p) => p.id === playerId);
		if (!player) {
			throw new Error("Player not found");
		}
		if (amount > player.chips) {
			throw new Error("Insufficient chips");
		}

		player.chips -= amount;
		player.currentBet += amount;
		this.pot += amount;
	}
}
