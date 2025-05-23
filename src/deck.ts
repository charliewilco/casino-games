import type { PlayingCard } from "./playing-card";
import { createStandardDeck } from "./playing-card";

export type ShuffleFn<T> = (input: T[]) => T[];

export interface SerializedDeck {
	cards: PlayingCard[];
	shuffleFn?: string;
}

const defaultShuffleFn: ShuffleFn<PlayingCard> = (deck) => {
	const shuffledDeck = [...deck];
	for (let i = shuffledDeck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
	}
	return shuffledDeck;
};

export class Deck {
	private cards: PlayingCard[];
	private drawnCards: PlayingCard[];
	private shuffleFn: ShuffleFn<PlayingCard>;

	constructor(shuffleFn: ShuffleFn<PlayingCard> = defaultShuffleFn) {
		this.shuffleFn = shuffleFn;
		this.cards = createStandardDeck();
		this.drawnCards = [];
		this.shuffle();
	}

	private shuffle(): void {
		this.cards = this.shuffleFn(this.cards);
	}

	public forceShuffle(): void {
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

	constructor(
		deckCount: number,
		shuffleFn: ShuffleFn<PlayingCard> = defaultShuffleFn,
	) {
		this.decks = Array.from({ length: deckCount }, () => new Deck(shuffleFn));
		this.currentDeckIndex = 0;
	}

	public draw(count = 1): PlayingCard[] {
		if (this.currentDeckIndex >= this.decks.length) {
			throw new Error("No more decks available");
		}

		const drawnCards = this.decks[this.currentDeckIndex].draw(count);
		if (this.decks[this.currentDeckIndex].getRemainingCount() === 0) {
			this.currentDeckIndex++;
		}
		return drawnCards;
	}
}
