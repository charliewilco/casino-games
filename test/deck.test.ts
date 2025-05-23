import { describe, expect, test } from "@jest/globals";
import { Deck } from "../src/deck";

describe("Deck", () => {
	test("should create a standard deck of cards", () => {
		const deck = new Deck();
		expect(deck.getRemainingCount()).toBe(52);
	});

	test("should shuffle the deck", () => {
		const deck = new Deck();
		const originalCards = [...deck.getCards()];
		deck.forceShuffle();
		expect(deck.getCards()).not.toEqual(originalCards);
	});

	test("should draw cards from the deck", () => {
		const deck = new Deck();
		const drawnCards = deck.draw(5);
		expect(drawnCards.length).toBe(5);
		expect(deck.getRemainingCount()).toBe(47);
	});

	test("should throw an error when drawing more cards than available", () => {
		const deck = new Deck();
		deck.draw(52); // Draw all cards
		expect(() => deck.draw(1)).toThrow("Cannot draw 1 cards, only 0 remaining");
	});

	test("should track drawn cards", () => {
		const deck = new Deck();
		const drawnCards = deck.draw(3);
		expect(deck.getDrawnCards()).toEqual(drawnCards);
		expect(deck.getDrawnCount()).toBe(3);
	});

	test("should reset deck properly", () => {
		const deck = new Deck();
		deck.draw(10);
		expect(deck.getDrawnCount()).toBe(10);
		expect(deck.getRemainingCount()).toBe(42);

		deck.reset();
		expect(deck.getDrawnCount()).toBe(0);
		expect(deck.getRemainingCount()).toBe(52);
	});
});
