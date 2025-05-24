import type { PlayingCard } from "./playing-card";
import { createStandardDeck } from "./playing-card";

export type ShuffleFn<T> = (input: T[], seed?: number) => T[];

export interface SerializedDeck {
	cards: PlayingCard[];
	shuffleFn?: string;
}

// Seeded random number generator for deterministic shuffles
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed % 2147483647;
		if (this.seed <= 0) this.seed += 2147483646;
	}

	next(): number {
		this.seed = (this.seed * 16807) % 2147483647;
		return (this.seed - 1) / 2147483646;
	}
}

const defaultShuffleFn: ShuffleFn<PlayingCard> = (deck, seed) => {
	const shuffledDeck = [...deck];
	const rng = seed ? new SeededRandom(seed) : null;

	for (let i = shuffledDeck.length - 1; i > 0; i--) {
		const j = Math.floor((rng ? rng.next() : Math.random()) * (i + 1));
		[shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
	}
	return shuffledDeck;
};

export class Deck {
	private cards: PlayingCard[];
	private drawnCards: PlayingCard[];
	private shuffleFn: ShuffleFn<PlayingCard>;
	private seed?: number;

	constructor(
		shuffleFn: ShuffleFn<PlayingCard> = defaultShuffleFn,
		seed?: number,
	) {
		this.shuffleFn = shuffleFn;
		this.seed = seed;
		this.cards = createStandardDeck();
		this.drawnCards = [];
		this.shuffle();
	}

	private shuffle(): void {
		this.cards = this.shuffleFn(this.cards, this.seed);
	}

	public forceShuffle(newSeed?: number): void {
		if (newSeed !== undefined) {
			this.seed = newSeed;
		}
		this.shuffle();
		console.warn("Deck was reshuffled");
	}

	public draw(count = 1): PlayingCard[] {
		if (count <= 0) {
			throw new Error("Count must be greater than 0");
		}

		if (count > this.cards.length) {
			throw new Error(
				`Cannot draw ${count} cards, only ${this.cards.length} remaining`,
			);
		}

		const drawnCards = this.cards.splice(0, count);
		this.drawnCards.push(...drawnCards);
		return drawnCards;
	}

	public getRemainingCount(): number {
		return this.cards.length;
	}

	public getDrawnCards(): PlayingCard[] {
		return [...this.drawnCards]; // Return a copy to prevent external modification
	}

	public getDrawnCount(): number {
		return this.drawnCards.length;
	}

	// For testing purposes - get current cards order
	public getCards(): PlayingCard[] {
		return [...this.cards]; // Return a copy to prevent external modification
	}

	public serialize(): SerializedDeck {
		return {
			cards: [...this.cards], // Create a copy
		};
	}

	public static deserialize(
		data: SerializedDeck,
		shuffleFn: ShuffleFn<PlayingCard>,
	): Deck {
		const deck = new Deck(shuffleFn);
		deck.cards = [...data.cards]; // Create a copy of the serialized cards
		return deck;
	}

	// Utility method to reset and reshuffle the deck
	public reset(): void {
		this.cards = createStandardDeck();
		this.drawnCards = [];
		this.shuffle();
	}
}

export class DeckShoe {
	private decks: Deck[];
	private currentDeckIndex: number;
	private burnCards: PlayingCard[];
	private totalDecks: number;

	constructor(
		deckCount: number,
		shuffleFn: ShuffleFn<PlayingCard> = defaultShuffleFn,
		seed?: number,
	) {
		this.totalDecks = deckCount;
		this.decks = Array.from(
			{ length: deckCount },
			(_, i) => new Deck(shuffleFn, seed ? seed + i : undefined),
		);
		this.currentDeckIndex = 0;
		this.burnCards = [];
	}

	public draw(count = 1): PlayingCard[] {
		const drawnCards: PlayingCard[] = [];
		let remaining = count;

		while (remaining > 0 && this.currentDeckIndex < this.decks.length) {
			const currentDeck = this.decks[this.currentDeckIndex];
			const availableCards = Math.min(
				remaining,
				currentDeck.getRemainingCount(),
			);

			if (availableCards === 0) {
				this.currentDeckIndex++;
				continue;
			}

			drawnCards.push(...currentDeck.draw(availableCards));
			remaining -= availableCards;

			if (currentDeck.getRemainingCount() === 0) {
				this.currentDeckIndex++;
			}
		}

		if (remaining > 0) {
			throw new Error(
				`Cannot draw ${count} cards, only ${drawnCards.length} available`,
			);
		}

		return drawnCards;
	}

	public burnCard(): PlayingCard | null {
		try {
			const burned = this.draw(1)[0];
			this.burnCards.push(burned);
			return burned;
		} catch {
			return null;
		}
	}

	public getRemainingCards(): number {
		return this.decks
			.slice(this.currentDeckIndex)
			.reduce((total, deck, index) => {
				return total + (index === 0 ? deck.getRemainingCount() : 52);
			}, 0);
	}

	public getCurrentDeckIndex(): number {
		return this.currentDeckIndex;
	}

	public getTotalDecks(): number {
		return this.totalDecks;
	}

	public getBurnCards(): PlayingCard[] {
		return [...this.burnCards];
	}

	public resetShoe(newSeed?: number): void {
		this.currentDeckIndex = 0;
		this.burnCards = [];
		this.decks = Array.from(
			{ length: this.totalDecks },
			(_, i) =>
				new Deck(
					this.decks[0]?.shuffleFn || defaultShuffleFn,
					newSeed ? newSeed + i : undefined,
				),
		);
	}

	public getDeck(index: number): Deck | null {
		return this.decks[index] || null;
	}
}
