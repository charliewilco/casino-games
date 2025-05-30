/**
 * Shoe class for managing one or more decks of cards for blackjack.
 * Handles shuffling and drawing cards. Shuffling is supplied by the consumer.
 * No dependencies; React-friendly and testable.
 */
import { type PlayingCard, createStandardDeck } from "./playing-card.ts";

export type ShuffleFn = (cards: PlayingCard[]) => PlayingCard[];

export class Shoe {
	static createDeck(shuffle: ShuffleFn) {
		return shuffle(createStandardDeck());
	}
	private cards: PlayingCard[];
	private shuffleFn: ShuffleFn;
	private decks: number;

	/**
	 * @param cards Initial cards (already shuffled or to be shuffled)
	 * @param shuffleFn Function to shuffle cards (default: identity)
	 */
	constructor(shuffleFn: ShuffleFn = (c) => c, numberOfDecks = 6) {
		this.shuffleFn = shuffleFn;
		this.cards = shuffleFn(
			Array.from({ length: numberOfDecks }).flatMap(() =>
				shuffleFn(createStandardDeck()),
			),
		);
		this.decks = numberOfDecks;
	}

	/**
	 * Draws a card from the shoe. Returns undefined if empty.
	 */
	draw(): PlayingCard | undefined {
		return this.cards.shift();
	}

	/**
	 * Returns the number of cards left in the shoe.
	 */
	count(): number {
		return this.cards.length;
	}

	/**
	 * Returns a copy of the remaining cards (for inspection/testing).
	 */
	peek(): PlayingCard[] {
		return [...this.cards];
	}

	/**
	 * Reshuffles the remaining cards in the shoe using the shuffle function.
	 */
	reshuffle(): void {
		this.cards = this.shuffleFn([...this.cards]);
	}

	/**
	 * Returns true if the number of cards left is less than or equal to the threshold.
	 */
	needsResupply(): boolean {
		const threshold = this.decks * 52 * 0.25; // 25% of total cards

		return threshold >= this.cards.length;
	}
}
