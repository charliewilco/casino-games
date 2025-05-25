import { describe, test, expect } from "@jest/globals";
import { PokerHandEvaluator } from "../src/poker-evaluator.ts";
import { HandRank } from "../src/types.ts";
import {
	type PlayingCard,
	CardValue,
	CardSuite,
	CardText,
} from "../src/playing-card.ts";

describe("PokerHandEvaluator", () => {
	const valueToText: Record<CardValue, CardText> = {
		[CardValue.ACE]: CardText.ACE,
		[CardValue.TWO]: CardText.TWO,
		[CardValue.THREE]: CardText.THREE,
		[CardValue.FOUR]: CardText.FOUR,
		[CardValue.FIVE]: CardText.FIVE,
		[CardValue.SIX]: CardText.SIX,
		[CardValue.SEVEN]: CardText.SEVEN,
		[CardValue.EIGHT]: CardText.EIGHT,
		[CardValue.NINE]: CardText.NINE,
		[CardValue.TEN]: CardText.TEN,
		[CardValue.JACK]: CardText.JACK,
		[CardValue.QUEEN]: CardText.QUEEN,
		[CardValue.KING]: CardText.KING,
	};
	// Helper function to create cards
	const createCard = (value: CardValue, suit: CardSuite): PlayingCard => ({
		value: value as CardValue,
		rank: valueToText[value as CardValue],
		suit: suit,
	});

	describe("Hand Ranking Detection", () => {
		test("should detect Royal Flush", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
				createCard(CardValue.TEN, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.ROYAL_FLUSH);
			expect(evaluation.description).toContain("Royal Flush");
		});

		test("should detect Straight Flush", () => {
			const hand = [
				createCard(CardValue.NINE, CardSuite.SPADES),
				createCard(CardValue.EIGHT, CardSuite.SPADES),
				createCard(CardValue.SEVEN, CardSuite.SPADES),
				createCard(CardValue.SIX, CardSuite.SPADES),
				createCard(CardValue.FIVE, CardSuite.SPADES),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.STRAIGHT_FLUSH);
			expect(evaluation.description).toContain("Straight Flush");
		});

		test("should detect Four of a Kind", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.ACE, CardSuite.SPADES),
				createCard(CardValue.ACE, CardSuite.CLUBS),
				createCard(CardValue.ACE, CardSuite.DIAMONDS),
				createCard(CardValue.KING, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.FOUR_OF_A_KIND);
			expect(evaluation.description).toContain("Four Aces");
		});

		test("should detect Full House", () => {
			const hand = [
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.CLUBS),
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.SPADES),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.FULL_HOUSE);
			expect(evaluation.description).toContain("Full House");
		});

		test("should detect Flush", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
				createCard(CardValue.NINE, CardSuite.HEARTS),
				createCard(CardValue.SEVEN, CardSuite.HEARTS),
				createCard(CardValue.THREE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.FLUSH);
			expect(evaluation.description).toContain("Flush");
		});

		test("should detect Straight", () => {
			const hand = [
				createCard(CardValue.TEN, CardSuite.HEARTS),
				createCard(CardValue.NINE, CardSuite.SPADES),
				createCard(CardValue.EIGHT, CardSuite.CLUBS),
				createCard(CardValue.SEVEN, CardSuite.DIAMONDS),
				createCard(CardValue.SIX, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.STRAIGHT);
			expect(evaluation.description).toContain("Straight");
		});

		test("should detect low Ace straight (A-2-3-4-5)", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.TWO, CardSuite.SPADES),
				createCard(CardValue.THREE, CardSuite.CLUBS),
				createCard(CardValue.FOUR, CardSuite.DIAMONDS),
				createCard(CardValue.FIVE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.STRAIGHT);
			expect(evaluation.description).toContain("Straight");
		});

		test("should detect Three of a Kind", () => {
			const hand = [
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.SPADES),
				createCard(CardValue.QUEEN, CardSuite.CLUBS),
				createCard(CardValue.JACK, CardSuite.DIAMONDS),
				createCard(CardValue.NINE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.THREE_OF_A_KIND);
			expect(evaluation.description).toContain("Three Queens");
		});

		test("should detect Two Pair", () => {
			const hand = [
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.SEVEN, CardSuite.CLUBS),
				createCard(CardValue.SEVEN, CardSuite.DIAMONDS),
				createCard(CardValue.ACE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.TWO_PAIR);
			expect(evaluation.description).toContain("Two Pair");
		});

		test("should detect One Pair", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.ACE, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.CLUBS),
				createCard(CardValue.QUEEN, CardSuite.DIAMONDS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.ONE_PAIR);
			expect(evaluation.description).toContain("Pair of Aces");
		});

		test("should detect High Card", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.QUEEN, CardSuite.CLUBS),
				createCard(CardValue.JACK, CardSuite.DIAMONDS),
				createCard(CardValue.NINE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation.rank).toBe(HandRank.HIGH_CARD);
			expect(evaluation.description).toContain("Ace High");
		});
	});

	describe.skip("7-Card Hand Evaluation", () => {
		test("should find best 5-card hand from 7 cards", () => {
			const sevenCards = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
				createCard(CardValue.TEN, CardSuite.HEARTS),
				createCard(CardValue.TWO, CardSuite.SPADES),
				createCard(CardValue.THREE, CardSuite.CLUBS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(sevenCards);
			expect(evaluation.rank).toBe(HandRank.ROYAL_FLUSH);
			expect(evaluation.cards).toHaveLength(5);
		});

		test("should handle mixed hands correctly", () => {
			const sevenCards = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.ACE, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.CLUBS),
				createCard(CardValue.TWO, CardSuite.DIAMONDS),
				createCard(CardValue.THREE, CardSuite.HEARTS),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(sevenCards);
			expect(evaluation.rank).toBe(HandRank.FULL_HOUSE);
			expect(evaluation.description).toContain("Full House");
		});
	});

	describe("Hand Comparison", () => {
		test("should compare hands correctly", () => {
			const royalFlush = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
				createCard(CardValue.TEN, CardSuite.HEARTS),
			];

			const straightFlush = [
				createCard(CardValue.NINE, CardSuite.SPADES),
				createCard(CardValue.EIGHT, CardSuite.SPADES),
				createCard(CardValue.SEVEN, CardSuite.SPADES),
				createCard(CardValue.SIX, CardSuite.SPADES),
				createCard(CardValue.FIVE, CardSuite.SPADES),
			];

			const eval1 = PokerHandEvaluator.evaluateHand(royalFlush);
			const eval2 = PokerHandEvaluator.evaluateHand(straightFlush);

			const comparison = PokerHandEvaluator.compareHands(eval1, eval2);
			expect(comparison).toBeGreaterThan(0); // Royal flush wins
		});

		test("should handle ties correctly", () => {
			const aceHigh1 = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.QUEEN, CardSuite.CLUBS),
				createCard(CardValue.JACK, CardSuite.DIAMONDS),
				createCard(CardValue.NINE, CardSuite.HEARTS),
			];

			const aceHigh2 = [
				createCard(CardValue.ACE, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.DIAMONDS),
				createCard(CardValue.JACK, CardSuite.CLUBS),
				createCard(CardValue.NINE, CardSuite.SPADES),
			];

			const eval1 = PokerHandEvaluator.evaluateHand(aceHigh1);
			const eval2 = PokerHandEvaluator.evaluateHand(aceHigh2);

			const comparison = PokerHandEvaluator.compareHands(eval1, eval2);
			expect(comparison).toBe(0); // Tie
		});

		test("should compare same rank hands with different kickers", () => {
			const pairAces1 = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.ACE, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.CLUBS),
				createCard(CardValue.QUEEN, CardSuite.DIAMONDS),
				createCard(CardValue.JACK, CardSuite.HEARTS),
			];

			const pairAces2 = [
				createCard(CardValue.ACE, CardSuite.CLUBS),
				createCard(CardValue.ACE, CardSuite.DIAMONDS),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.SPADES),
				createCard(CardValue.TEN, CardSuite.CLUBS),
			];

			const eval1 = PokerHandEvaluator.evaluateHand(pairAces1);
			const eval2 = PokerHandEvaluator.evaluateHand(pairAces2);

			const comparison = PokerHandEvaluator.compareHands(eval1, eval2);
			expect(comparison).toBeGreaterThan(0); // Jack kicker wins over Ten
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty hand", () => {
			expect(() => {
				PokerHandEvaluator.evaluateHand([]);
			}).toThrow("Hand must contain at least 5 cards");
		});

		test("should handle insufficient cards", () => {
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
			];

			expect(() => {
				PokerHandEvaluator.evaluateHand(hand);
			}).toThrow("Hand must contain at least 5 cards");
		});

		test("should handle duplicate cards gracefully", () => {
			// Note: In a real game, this shouldn't happen, but the evaluator should handle it
			const hand = [
				createCard(CardValue.ACE, CardSuite.HEARTS),
				createCard(CardValue.ACE, CardSuite.HEARTS), // Duplicate
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.QUEEN, CardSuite.CLUBS),
				createCard(CardValue.JACK, CardSuite.DIAMONDS),
			];

			// Should not throw an error
			const evaluation = PokerHandEvaluator.evaluateHand(hand);
			expect(evaluation).toBeDefined();
		});
	});

	describe("Description Generation", () => {
		test("should generate descriptive hand names", () => {
			const fullHouse = [
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.KING, CardSuite.SPADES),
				createCard(CardValue.KING, CardSuite.CLUBS),
				createCard(CardValue.QUEEN, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.SPADES),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(fullHouse);
			expect(evaluation.description).toContain("Full House");
			expect(evaluation.description).toContain("King");
			expect(evaluation.description).toContain("Queen");
		});

		test("should handle face card names correctly", () => {
			const pair = [
				createCard(CardValue.JACK, CardSuite.HEARTS),
				createCard(CardValue.JACK, CardSuite.SPADES),
				createCard(CardValue.ACE, CardSuite.CLUBS),
				createCard(CardValue.KING, CardSuite.HEARTS),
				createCard(CardValue.QUEEN, CardSuite.SPADES),
			];

			const evaluation = PokerHandEvaluator.evaluateHand(pair);
			expect(evaluation.description).toContain("Pair of Jacks");
		});
	});
});
