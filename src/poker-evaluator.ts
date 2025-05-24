import type { PlayingCard } from "./playing-card";
import { HandRank, type HandEvaluation } from "./types";

export class PokerHandEvaluator {
	private static readonly RANK_VALUES: { [key: string]: number } = {
		"2": 2,
		"3": 3,
		"4": 4,
		"5": 5,
		"6": 6,
		"7": 7,
		"8": 8,
		"9": 9,
		"10": 10,
		J: 11,
		Q: 12,
		K: 13,
		A: 14,
	};

	private static readonly RANK_NAMES: { [key: string]: string } = {
		"2": "Two",
		"3": "Three",
		"4": "Four",
		"5": "Five",
		"6": "Six",
		"7": "Seven",
		"8": "Eight",
		"9": "Nine",
		"10": "Ten",
		J: "Jack",
		Q: "Queen",
		K: "King",
		A: "Ace",
	};

	/**
	 * Evaluates the best 5-card poker hand from up to 7 cards
	 */
	public static evaluateHand(cards: PlayingCard[]): HandEvaluation {
		if (cards.length < 5) {
			throw new Error("Need at least 5 cards to evaluate a poker hand");
		}

		if (cards.length === 5) {
			return this.evaluateFiveCards(cards);
		}

		// Generate all possible 5-card combinations
		const combinations = this.getCombinations(cards, 5);
		let bestHand: HandEvaluation | null = null;

		for (const combo of combinations) {
			const evaluation = this.evaluateFiveCards(combo);
			if (!bestHand || evaluation.value > bestHand.value) {
				bestHand = evaluation;
			}
		}

		return bestHand!;
	}

	/**
	 * Evaluates exactly 5 cards for poker hand ranking
	 */
	private static evaluateFiveCards(cards: PlayingCard[]): HandEvaluation {
		const sortedCards = [...cards].sort(
			(a, b) => this.RANK_VALUES[b.rank] - this.RANK_VALUES[a.rank],
		);

		// Check for flush
		const isFlush = this.isFlush(sortedCards);

		// Check for straight
		const straightInfo = this.isStraight(sortedCards);
		const isStraight = straightInfo.isStraight;

		// Count ranks
		const rankCounts = this.getRankCounts(sortedCards);
		const counts = Object.values(rankCounts).sort((a, b) => b - a);
		const ranks = Object.keys(rankCounts).sort(
			(a, b) =>
				rankCounts[b] - rankCounts[a] ||
				this.RANK_VALUES[b] - this.RANK_VALUES[a],
		);

		// Determine hand type and value
		if (isStraight && isFlush) {
			if (
				straightInfo.highCard === 14 &&
				sortedCards.some((c) => this.RANK_VALUES[c.rank] === 10)
			) {
				// Royal flush
				return {
					rank: HandRank.ROYAL_FLUSH,
					value: HandRank.ROYAL_FLUSH * 1000000 + straightInfo.highCard,
					description: "Royal Flush",
					cards: sortedCards,
					kickers: [],
				};
			} else {
				// Straight flush
				return {
					rank: HandRank.STRAIGHT_FLUSH,
					value: HandRank.STRAIGHT_FLUSH * 1000000 + straightInfo.highCard,
					description: `Straight Flush, ${this.RANK_NAMES[straightInfo.highCard.toString()]} high`,
					cards: sortedCards,
					kickers: [],
				};
			}
		}

		if (counts[0] === 4) {
			// Four of a kind
			const quadRank = ranks[0];
			const kicker = ranks[1];
			return {
				rank: HandRank.FOUR_OF_A_KIND,
				value:
					HandRank.FOUR_OF_A_KIND * 1000000 +
					this.RANK_VALUES[quadRank] * 100 +
					this.RANK_VALUES[kicker],
				description: `Four ${this.RANK_NAMES[quadRank]}s`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (counts[0] === 3 && counts[1] === 2) {
			// Full house
			const tripRank = ranks[0];
			const pairRank = ranks[1];
			return {
				rank: HandRank.FULL_HOUSE,
				value:
					HandRank.FULL_HOUSE * 1000000 +
					this.RANK_VALUES[tripRank] * 100 +
					this.RANK_VALUES[pairRank],
				description: `Full House, ${this.RANK_NAMES[tripRank]}s over ${this.RANK_NAMES[pairRank]}s`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (isFlush) {
			// Flush
			const values = sortedCards.map((c) => this.RANK_VALUES[c.rank]);
			let value = HandRank.FLUSH * 1000000;
			for (let i = 0; i < values.length; i++) {
				value += values[i] * Math.pow(100, 4 - i);
			}
			return {
				rank: HandRank.FLUSH,
				value,
				description: `Flush, ${this.RANK_NAMES[sortedCards[0].rank]} high`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (isStraight) {
			// Straight
			return {
				rank: HandRank.STRAIGHT,
				value: HandRank.STRAIGHT * 1000000 + straightInfo.highCard,
				description: `Straight, ${this.RANK_NAMES[straightInfo.highCard.toString()]} high`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (counts[0] === 3) {
			// Three of a kind
			const tripRank = ranks[0];
			const kicker1 = ranks[1];
			const kicker2 = ranks[2];
			return {
				rank: HandRank.THREE_OF_A_KIND,
				value:
					HandRank.THREE_OF_A_KIND * 1000000 +
					this.RANK_VALUES[tripRank] * 10000 +
					this.RANK_VALUES[kicker1] * 100 +
					this.RANK_VALUES[kicker2],
				description: `Three ${this.RANK_NAMES[tripRank]}s`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (counts[0] === 2 && counts[1] === 2) {
			// Two pair
			const highPair = ranks[0];
			const lowPair = ranks[1];
			const kicker = ranks[2];
			return {
				rank: HandRank.TWO_PAIR,
				value:
					HandRank.TWO_PAIR * 1000000 +
					this.RANK_VALUES[highPair] * 10000 +
					this.RANK_VALUES[lowPair] * 100 +
					this.RANK_VALUES[kicker],
				description: `Two Pair, ${this.RANK_NAMES[highPair]}s and ${this.RANK_NAMES[lowPair]}s`,
				cards: sortedCards,
				kickers: [],
			};
		}

		if (counts[0] === 2) {
			// One pair
			const pairRank = ranks[0];
			const kickers = ranks.slice(1);
			let value =
				HandRank.PAIR * 1000000 + this.RANK_VALUES[pairRank] * 1000000;
			for (let i = 0; i < kickers.length; i++) {
				value += this.RANK_VALUES[kickers[i]] * Math.pow(100, 2 - i);
			}
			return {
				rank: HandRank.PAIR,
				value,
				description: `Pair of ${this.RANK_NAMES[pairRank]}s`,
				cards: sortedCards,
				kickers: [],
			};
		}

		// High card
		const values = sortedCards.map((c) => this.RANK_VALUES[c.rank]);
		let value = HandRank.HIGH_CARD * 1000000;
		for (let i = 0; i < values.length; i++) {
			value += values[i] * Math.pow(100, 4 - i);
		}
		return {
			rank: HandRank.HIGH_CARD,
			value,
			description: `${this.RANK_NAMES[sortedCards[0].rank]} high`,
			cards: sortedCards,
			kickers: [],
		};
	}

	private static isFlush(cards: PlayingCard[]): boolean {
		const suit = cards[0].suit;
		return cards.every((card) => card.suit === suit);
	}

	private static isStraight(cards: PlayingCard[]): {
		isStraight: boolean;
		highCard: number;
	} {
		const values = cards
			.map((c) => this.RANK_VALUES[c.rank])
			.sort((a, b) => b - a);

		// Check for regular straight
		for (let i = 0; i < values.length - 1; i++) {
			if (values[i] - values[i + 1] !== 1) {
				break;
			}
			if (i === values.length - 2) {
				return { isStraight: true, highCard: values[0] };
			}
		}

		// Check for wheel straight (A-2-3-4-5)
		if (
			values[0] === 14 &&
			values[1] === 5 &&
			values[2] === 4 &&
			values[3] === 3 &&
			values[4] === 2
		) {
			return { isStraight: true, highCard: 5 };
		}

		return { isStraight: false, highCard: 0 };
	}

	private static getRankCounts(cards: PlayingCard[]): {
		[rank: string]: number;
	} {
		const counts: { [rank: string]: number } = {};
		for (const card of cards) {
			counts[card.rank] = (counts[card.rank] || 0) + 1;
		}
		return counts;
	}

	private static getCombinations<T>(array: T[], size: number): T[][] {
		if (size > array.length) return [];
		if (size === 1) return array.map((item) => [item]);

		const combinations: T[][] = [];
		for (let i = 0; i <= array.length - size; i++) {
			const head = array[i];
			const tailCombinations = this.getCombinations(
				array.slice(i + 1),
				size - 1,
			);
			for (const tail of tailCombinations) {
				combinations.push([head, ...tail]);
			}
		}
		return combinations;
	}

	/**
	 * Compares two poker hands and returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie
	 */
	public static compareHands(
		hand1: HandEvaluation,
		hand2: HandEvaluation,
	): number {
		if (hand1.value > hand2.value) return 1;
		if (hand1.value < hand2.value) return -1;
		return 0;
	}

	/**
	 * Gets a human-readable description of a hand ranking
	 */
	public static getHandRankName(rank: HandRank): string {
		const names = {
			[HandRank.HIGH_CARD]: "High Card",
			[HandRank.PAIR]: "Pair",
			[HandRank.TWO_PAIR]: "Two Pair",
			[HandRank.THREE_OF_A_KIND]: "Three of a Kind",
			[HandRank.STRAIGHT]: "Straight",
			[HandRank.FLUSH]: "Flush",
			[HandRank.FULL_HOUSE]: "Full House",
			[HandRank.FOUR_OF_A_KIND]: "Four of a Kind",
			[HandRank.STRAIGHT_FLUSH]: "Straight Flush",
			[HandRank.ROYAL_FLUSH]: "Royal Flush",
		};
		return names[rank];
	}
}
