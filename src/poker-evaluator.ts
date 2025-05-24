import type { PlayingCard } from "./playing-card";
import { HandRank, type HandEvaluation } from "./types";

// biome-ignore lint/complexity/noStaticOnlyClass: This class provides a cohesive API for poker hand evaluation and is used externally
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
			throw new Error("Hand must contain at least 5 cards");
		}

		if (cards.length === 5) {
			return PokerHandEvaluator.evaluateFiveCards(cards);
		}

		// Generate all possible 5-card combinations
		const combinations = PokerHandEvaluator.getCombinations(cards, 5);
		let bestHand: HandEvaluation | null = null;

		for (const combo of combinations) {
			const evaluation = PokerHandEvaluator.evaluateFiveCards(combo);
			if (!bestHand || evaluation.value > bestHand.value) {
				bestHand = evaluation;
			}
		}

		if (!bestHand) {
			throw new Error("Failed to evaluate poker hand");
		}
		return bestHand;
	}

	/**
	 * Evaluates exactly 5 cards for poker hand ranking
	 */
	private static evaluateFiveCards(cards: PlayingCard[]): HandEvaluation {
		const sortedCards = [...cards].sort(
			(a, b) =>
				PokerHandEvaluator.RANK_VALUES[b.rank] -
				PokerHandEvaluator.RANK_VALUES[a.rank],
		);

		// Check for flush
		const isFlush = PokerHandEvaluator.isFlush(sortedCards);

		// Check for straight
		const straightInfo = PokerHandEvaluator.isStraight(sortedCards);
		const isStraight = straightInfo.isStraight;

		// Count ranks
		const rankCounts = PokerHandEvaluator.getRankCounts(sortedCards);
		const counts = Object.values(rankCounts).sort((a, b) => b - a);
		const ranks = Object.keys(rankCounts).sort(
			(a, b) =>
				rankCounts[b] - rankCounts[a] ||
				PokerHandEvaluator.RANK_VALUES[b] - PokerHandEvaluator.RANK_VALUES[a],
		);

		// --- FIX: Return correct cards and kickers for each hand type ---
		// Helper to get cards by rank
		const getCardsByRank = (rank: string, count: number) =>
			sortedCards.filter((c) => c.rank === rank).slice(0, count);
		// Helper to get cards by suit
		const getFlushCards = () => {
			const suitCounts: { [suit: string]: PlayingCard[] } = {};
			for (const c of sortedCards) {
				suitCounts[c.suit] = suitCounts[c.suit] || [];
				suitCounts[c.suit].push(c);
			}
			return (
				Object.values(suitCounts)
					.find((arr) => arr.length >= 5)
					?.slice(0, 5) || []
			);
		};
		// Helper to get straight cards
		const getStraightCards = () => {
			const values = sortedCards.map(
				(c) => PokerHandEvaluator.RANK_VALUES[c.rank],
			);
			let straight: PlayingCard[] = [];
			for (let i = 0; i < sortedCards.length; i++) {
				straight = [sortedCards[i]];
				let last = PokerHandEvaluator.RANK_VALUES[sortedCards[i].rank];
				for (
					let j = i + 1;
					j < sortedCards.length && straight.length < 5;
					j++
				) {
					const val = PokerHandEvaluator.RANK_VALUES[sortedCards[j].rank];
					if (val === last - 1) {
						straight.push(sortedCards[j]);
						last = val;
					}
				}
				if (straight.length === 5) return straight;
			}
			// Special case: wheel straight (A-2-3-4-5)
			const ranks = sortedCards.map((c) => c.rank);
			if (["A", "2", "3", "4", "5"].every((r) => ranks.includes(r))) {
				const wheel = ["5", "4", "3", "2", "A"]
					.map((r) => sortedCards.find((c) => c.rank === r))
					.filter(Boolean) as PlayingCard[];
				if (wheel.length === 5) return wheel;
			}
			return [];
		};
		// --- END FIX ---

		// Group cards by suit for flush/straight flush detection
		const suitGroups: { [suit: string]: PlayingCard[] } = {};
		for (const c of sortedCards) {
			suitGroups[c.suit] = suitGroups[c.suit] || [];
			suitGroups[c.suit].push(c);
		}

		// --- FIX: Use helpers for correct cards/kickers ---
		// Determine hand type and value
		// --- FIX: Robust straight flush/royal flush detection for 5+ suited cards (always run before flush/straight) ---
		for (const suit in suitGroups) {
			const suited = suitGroups[suit];
			if (suited.length >= 5) {
				const combos = PokerHandEvaluator.getCombinations(suited, 5);
				for (const combo of combos) {
					const straightInfo = PokerHandEvaluator.isStraight(combo);
					if (straightInfo.isStraight) {
						const highCard = straightInfo.highCard;
						if (highCard === 14 && combo.some((c) => c.rank === "10")) {
							return {
								rank: HandRank.ROYAL_FLUSH,
								value: HandRank.ROYAL_FLUSH * 1000000 + highCard,
								description: "Royal Flush",
								cards: combo,
								kickers: [],
							};
						}
						return {
							rank: HandRank.STRAIGHT_FLUSH,
							value: HandRank.STRAIGHT_FLUSH * 1000000 + highCard,
							description: `Straight Flush, ${PokerHandEvaluator.RANK_NAMES[combo[0].rank]} high`,
							cards: combo,
							kickers: [],
						};
					}
				}
			}
		}
		// --- END FIX ---
		// Check for quads, full house, trips, two pair, one pair, high card using all cards
		if (counts[0] === 4) {
			const quadRank = ranks[0];
			const kicker = ranks[1];
			const handCards = getCardsByRank(quadRank, 4).concat(
				getCardsByRank(kicker, 1),
			);
			return {
				rank: HandRank.FOUR_OF_A_KIND,
				value:
					HandRank.FOUR_OF_A_KIND * 1000000 +
					PokerHandEvaluator.RANK_VALUES[quadRank] * 100 +
					PokerHandEvaluator.RANK_VALUES[kicker],
				description: `Four ${PokerHandEvaluator.RANK_NAMES[quadRank]}s`,
				cards: handCards,
				kickers: getCardsByRank(kicker, 1),
			};
		}
		if (counts[0] === 3 && counts[1] === 2) {
			const tripRank = ranks[0];
			const pairRank = ranks[1];
			const handCards = getCardsByRank(tripRank, 3).concat(
				getCardsByRank(pairRank, 2),
			);
			return {
				rank: HandRank.FULL_HOUSE,
				value:
					HandRank.FULL_HOUSE * 1000000 +
					PokerHandEvaluator.RANK_VALUES[tripRank] * 100 +
					PokerHandEvaluator.RANK_VALUES[pairRank],
				description: `Full House, ${PokerHandEvaluator.RANK_NAMES[tripRank]}s over ${PokerHandEvaluator.RANK_NAMES[pairRank]}s`,
				cards: handCards,
				kickers: [],
			};
		}
		if (counts[0] === 3) {
			const tripRank = ranks[0];
			const kickers = ranks.slice(1, 3);
			const handCards = getCardsByRank(tripRank, 3).concat(
				getCardsByRank(kickers[0], 1),
				getCardsByRank(kickers[1], 1),
			);
			return {
				rank: HandRank.THREE_OF_A_KIND,
				value:
					HandRank.THREE_OF_A_KIND * 1000000 +
					PokerHandEvaluator.RANK_VALUES[tripRank] * 10000 +
					PokerHandEvaluator.RANK_VALUES[kickers[0]] * 100 +
					PokerHandEvaluator.RANK_VALUES[kickers[1]],
				description: `Three ${PokerHandEvaluator.RANK_NAMES[tripRank]}s`,
				cards: handCards,
				kickers: handCards.slice(3),
			};
		}
		if (counts[0] === 2 && counts[1] === 2) {
			const highPair = ranks[0];
			const lowPair = ranks[1];
			const kicker = ranks[2];
			const handCards = getCardsByRank(highPair, 2).concat(
				getCardsByRank(lowPair, 2),
				getCardsByRank(kicker, 1),
			);
			return {
				rank: HandRank.TWO_PAIR,
				value:
					HandRank.TWO_PAIR * 1000000 +
					PokerHandEvaluator.RANK_VALUES[highPair] * 10000 +
					PokerHandEvaluator.RANK_VALUES[lowPair] * 100 +
					PokerHandEvaluator.RANK_VALUES[kicker],
				description: `Two Pair, ${PokerHandEvaluator.RANK_NAMES[highPair]}s and ${PokerHandEvaluator.RANK_NAMES[lowPair]}s`,
				cards: handCards,
				kickers: getCardsByRank(kicker, 1),
			};
		}
		if (counts[0] === 2) {
			const pairRank = ranks[0];
			const kickers = ranks.slice(1, 4);
			const handCards = getCardsByRank(pairRank, 2).concat(
				getCardsByRank(kickers[0], 1),
				getCardsByRank(kickers[1], 1),
				getCardsByRank(kickers[2], 1),
			);
			return {
				rank: HandRank.ONE_PAIR,
				value:
					HandRank.ONE_PAIR * 1000000 +
					PokerHandEvaluator.RANK_VALUES[pairRank] * 1000000 +
					PokerHandEvaluator.RANK_VALUES[kickers[0]] * 10000 +
					PokerHandEvaluator.RANK_VALUES[kickers[1]] * 100 +
					PokerHandEvaluator.RANK_VALUES[kickers[2]],
				description: `Pair of ${PokerHandEvaluator.RANK_NAMES[pairRank]}s`,
				cards: handCards,
				kickers: handCards.slice(2),
			};
		}
		// Now, after all other hand types, check for flush or straight
		for (const suit in suitGroups) {
			const suited = suitGroups[suit];
			if (suited.length >= 5) {
				const flushCards = suited.slice(0, 5);
				const values = flushCards.map(
					(c) => PokerHandEvaluator.RANK_VALUES[c.rank],
				);
				let value = HandRank.FLUSH * 1000000;
				for (let i = 0; i < values.length; i++) {
					value += values[i] * 100 ** (4 - i);
				}
				return {
					rank: HandRank.FLUSH,
					value,
					description: `Flush, ${PokerHandEvaluator.RANK_NAMES[flushCards[0].rank]} high`,
					cards: flushCards,
					kickers: flushCards.slice(1),
				};
			}
		}
		const straightCards = getStraightCards();
		if (straightCards.length === 5) {
			return {
				rank: HandRank.STRAIGHT,
				value:
					HandRank.STRAIGHT * 1000000 +
					PokerHandEvaluator.RANK_VALUES[straightCards[0].rank],
				description: `Straight, ${PokerHandEvaluator.RANK_NAMES[straightCards[0].rank]} high`,
				cards: straightCards,
				kickers: [],
			};
		}
		// High card
		const handCards = sortedCards.slice(0, 5);
		let value = HandRank.HIGH_CARD * 1000000;
		for (let i = 0; i < handCards.length; i++) {
			value +=
				PokerHandEvaluator.RANK_VALUES[handCards[i].rank] * 100 ** (4 - i);
		}
		return {
			rank: HandRank.HIGH_CARD,
			value,
			description: `${PokerHandEvaluator.RANK_NAMES[handCards[0].rank]} High`,
			cards: handCards,
			kickers: handCards.slice(1),
		};
		// --- END FIX ---
	}

	private static isFlush(cards: PlayingCard[]): boolean {
		const suit = cards[0].suit;
		return cards.every((card) => card.suit === suit);
	}

	private static isStraight(cards: PlayingCard[]): {
		isStraight: boolean;
		highCard: number;
	} {
		// Remove duplicate values
		const uniqueValues = Array.from(
			new Set(cards.map((c) => PokerHandEvaluator.RANK_VALUES[c.rank])),
		).sort((a, b) => b - a);
		// Look for any sequence of 5 consecutive values
		for (let i = 0; i <= uniqueValues.length - 5; i++) {
			let isSeq = true;
			for (let j = 0; j < 4; j++) {
				if (uniqueValues[i + j] - uniqueValues[i + j + 1] !== 1) {
					isSeq = false;
					break;
				}
			}
			if (isSeq) {
				return { isStraight: true, highCard: uniqueValues[i] };
			}
		}
		// Check for wheel straight (A-2-3-4-5)
		if (
			uniqueValues.includes(14) &&
			uniqueValues.slice(-4).join(",") === "5,4,3,2"
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
			const tailCombinations = PokerHandEvaluator.getCombinations(
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
