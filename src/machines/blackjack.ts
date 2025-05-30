import { assign, setup } from "xstate";
import type { PlayingCard } from "../playing-card.ts";
import type { Shoe } from "../shoe.ts";
import type { BetType } from "../types.ts";

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
	blackjackPayout: number;
	minBet: number;
	maxBet: number;
}

export interface BlackjackContext {
	players: BlackjackPlayer[];
	playerHands: Record<string, BlackjackHand[]>;
	dealer: { cards: PlayingCard[]; isBlackjack: boolean };
	currentPlayer: string | null;
	activeBets: Record<string, Array<{ amount: number; type: BetType }>>;
	insuranceBets: Record<string, number>;
	statistics: { handsPlayed: number; totalBetAmount: number };
	options: BlackjackOptions;
	shoe: Shoe;
}

export const createBlackjackMachine = (
	shoe: Shoe,
	options?: Partial<BlackjackOptions>,
	players?: BlackjackPlayer[],
) =>
	setup({
		actors: {},
		guards: {},
		actions: {},
		delays: {},
	}).createMachine({
		id: "blackjack",
		initial: "waitingForPlayers",
		context: {
			players: players ?? [],
			playerHands: {} as Record<string, BlackjackHand[]>,
			dealer: { cards: [], isBlackjack: false },
			currentPlayer: null,
			activeBets: {} as Record<
				string,
				Array<{ amount: number; type: BetType }>
			>,
			insuranceBets: {} as Record<string, number>,
			statistics: { handsPlayed: 0, totalBetAmount: 0 },
			options: {
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
			},
			shoe,
		} as BlackjackContext,
		states: {
			waitingForPlayers: {
				on: {
					ADD_PLAYER: {
						actions: assign({
							players: ({ context, event }) =>
								event.type === "ADD_PLAYER"
									? [...context.players, event.player]
									: context.players,
							playerHands: ({ context, event }) =>
								event.type === "ADD_PLAYER"
									? { ...context.playerHands, [event.player.id]: [] }
									: context.playerHands,
						}),
					},
					REMOVE_PLAYER: {
						actions: assign({
							players: ({ context, event }) =>
								event.type === "REMOVE_PLAYER"
									? context.players.filter(
											(p: BlackjackPlayer) => p.id !== event.playerId,
										)
									: context.players,
							playerHands: ({ context, event }) => {
								if (event.type === "REMOVE_PLAYER") {
									const hands = { ...context.playerHands };
									delete hands[event.playerId];
									return hands;
								}
								return context.playerHands;
							},
						}),
					},
					START_BETTING: "betting",
				},
			},
			betting: {
				on: {
					PLACE_BET: {
						actions: assign({
							activeBets: ({ context, event }) => {
								if (event.type === "PLACE_BET") {
									const newActiveBets = { ...context.activeBets };
									if (!newActiveBets[event.playerId])
										newActiveBets[event.playerId] = [];
									newActiveBets[event.playerId].push({
										amount: event.amount,
										type: event.betType,
									});
									return newActiveBets;
								}
								return context.activeBets;
							},
							players: ({ context, event }) => {
								if (event.type === "PLACE_BET") {
									return context.players.map((p: BlackjackPlayer) =>
										p.id === event.playerId
											? { ...p, balance: p.balance - event.amount }
											: p,
									);
								}
								return context.players;
							},
							statistics: ({ context, event }) => {
								if (event.type === "PLACE_BET") {
									return {
										...context.statistics,
										totalBetAmount:
											context.statistics.totalBetAmount + event.amount,
									};
								}
								return context.statistics;
							},
						}),
					},
					DEAL: "dealing",
				},
			},
			dealing: {
				entry: assign(({ context }) => {
					const playerHands = { ...context.playerHands };
					const shoe = context.shoe.clone();
					// Deal two cards to each player and dealer
					for (const playerId of Object.keys(context.activeBets)) {
						const hand: BlackjackHand = {
							cards: [shoe.draw(), shoe.draw()],
							bet: context.activeBets[playerId][0].amount,
							isDoubledDown: false,
							isStanding: false,
							canSplit: false,
							canDoubleDown: true,
							canSurrender: true,
							isBlackjack: false,
							isBusted: false,
							isSurrendered: false,
						};
						playerHands[playerId] = [hand];
					}
					const dealerCards = [shoe.draw(), shoe.draw()];
					return {
						playerHands,
						dealer: {
							cards: dealerCards,
							isBlackjack: isBlackjack(dealerCards),
						},
						shoe,
						statistics: {
							...context.statistics,
							handsPlayed: context.statistics.handsPlayed + 1,
						},
					};
				}),
				always: "playerTurn",
			},
			playerTurn: {
				on: {
					HIT: {
						actions: assign(({ context, event }) => {
							if (event.type !== "HIT") return context;
							const { playerId, handIndex } = event;
							const hands = (context.playerHands[playerId] || []).slice();
							if (!hands[handIndex]) return context;
							const shoe = context.shoe.clone();
							hands[handIndex] = {
								...hands[handIndex],
								cards: [...hands[handIndex].cards, shoe.draw()],
							};
							return {
								playerHands: {
									...context.playerHands,
									[playerId]: hands,
								},
								shoe,
							};
						}),
					},
					STAND: {
						actions: assign(({ context, event }) => {
							if (event.type !== "STAND") return context;
							const { playerId, handIndex } = event;
							const hands = (context.playerHands[playerId] || []).slice();
							if (!hands[handIndex]) return context;
							hands[handIndex] = {
								...hands[handIndex],
								isStanding: true,
							};
							return {
								playerHands: {
									...context.playerHands,
									[playerId]: hands,
								},
							};
						}),
					},
					DOUBLE: {
						actions: assign(({ context, event }) => {
							if (event.type !== "DOUBLE") return context;
							const { playerId, handIndex } = event;
							const hands = (context.playerHands[playerId] || []).slice();
							const player = context.players.find(
								(p: BlackjackPlayer) => p.id === playerId,
							);
							if (
								!hands[handIndex] ||
								!player ||
								player.balance < hands[handIndex].bet
							)
								return context;
							const shoe = context.shoe.clone();
							hands[handIndex] = {
								...hands[handIndex],
								bet: hands[handIndex].bet * 2,
								isDoubledDown: true,
								cards: [...hands[handIndex].cards, shoe.draw()],
								isStanding: true,
							};
							return {
								playerHands: {
									...context.playerHands,
									[playerId]: hands,
								},
								players: context.players.map((p: BlackjackPlayer) =>
									p.id === playerId
										? { ...p, balance: p.balance - hands[handIndex].bet }
										: p,
								),
								shoe,
							};
						}),
					},
					SPLIT: {
						actions: assign(({ context, event }) => {
							if (event.type !== "SPLIT") return context;
							const { playerId, handIndex } = event;
							const hands = (context.playerHands[playerId] || []).slice();
							const player = context.players.find(
								(p: BlackjackPlayer) => p.id === playerId,
							);
							if (
								!hands[handIndex] ||
								!player ||
								hands.length >= context.options.maxSplitHands
							)
								return context;
							const hand = hands[handIndex];
							if (
								hand.cards.length !== 2 ||
								hand.cards[0].value !== hand.cards[1].value ||
								player.balance < hand.bet
							)
								return context;
							const shoe = context.shoe.clone();
							const newHand: BlackjackHand = {
								cards: [hand.cards[1], shoe.draw()],
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
							hands[handIndex] = {
								...hand,
								cards: [hand.cards[0], shoe.draw()],
							};
							hands.push(newHand);
							return {
								playerHands: {
									...context.playerHands,
									[playerId]: hands,
								},
								players: context.players.map((p: BlackjackPlayer) =>
									p.id === playerId
										? { ...p, balance: p.balance - hand.bet }
										: p,
								),
								shoe,
							};
						}),
					},
					SURRENDER: {
						actions: assign(({ context, event }) => {
							if (event.type !== "SURRENDER") return context;
							const { playerId, handIndex } = event;
							const hands = (context.playerHands[playerId] || []).slice();
							const player = context.players.find(
								(p: BlackjackPlayer) => p.id === playerId,
							);
							if (!hands[handIndex] || !player) return context;
							hands[handIndex] = {
								...hands[handIndex],
								isSurrendered: true,
								isStanding: true,
							};
							return {
								playerHands: {
									...context.playerHands,
									[playerId]: hands,
								},
								players: context.players.map((p: BlackjackPlayer) =>
									p.id === playerId
										? { ...p, balance: p.balance + hands[handIndex].bet / 2 }
										: p,
								),
							};
						}),
					},
					PLAYER_TURN_OVER: "dealerTurn",
				},
			},
			dealerTurn: {
				entry: assign(({ context }) => {
					let dealerCards = [...context.dealer.cards];
					const shoe = context.shoe.clone();
					// Draw cards for dealer: must hit until 17 or higher (soft 17 rule applies)
					const getValue = (cards: PlayingCard[]) => {
						const val = evaluateHandValue(cards);
						if (typeof val === "number") return val;
						return val[1] <= 21 ? val[1] : val[0];
					};
					const isSoft17 = (cards: PlayingCard[]) => {
						const val = evaluateHandValue(cards);
						return Array.isArray(val) && val[1] === 17;
					};
					while (
						getValue(dealerCards) < 17 ||
						(context.options.dealerHitsSoft17 && isSoft17(dealerCards))
					) {
						const nextCard = shoe.draw();
						if (!nextCard) break;
						dealerCards.push(nextCard);
					}
					return {
						dealer: {
							cards: dealerCards,
							isBlackjack: isBlackjack(dealerCards),
						},
						shoe,
					};
				}),
				always: "results",
			},
			results: {
				on: {
					RESET: {
						target: "waitingForPlayers",
						actions: assign(() => ({
							playerHands: {},
							dealer: { cards: [], isBlackjack: false },
							activeBets: {},
							insuranceBets: {},
						})),
					},
				},
				type: "final",
			},
		},
	});

/**
 * Evaluate the value of a blackjack hand.
 * Returns a number if only one value is possible, or a tuple [low, high] for soft hands.
 * @param cards Array of PlayingCard
 * @returns number | [number, number] (tuple for soft hands)
 */
export function evaluateHandValue(
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

/**
 * Returns the optimal value of a hand (highest <= 21, else lowest).
 */
export function getHandValue(cards: PlayingCard[]): number {
	const val = evaluateHandValue(cards);
	if (typeof val === "number") return val;
	return val[1] <= 21 ? val[1] : val[0];
}

/**
 * Returns true if the hand is a blackjack (21 with exactly 2 cards).
 */
export function isBlackjack(cards: PlayingCard[]): boolean {
	return cards.length === 2 && getHandValue(cards) === 21;
}

/**
 * Returns true if the hand is busted (over 21).
 */
export function isBusted(cards: PlayingCard[]): boolean {
	return getHandValue(cards) > 21;
}
