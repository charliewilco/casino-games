export enum CardValue {
	ACE = 1,
	TWO = 2,
	THREE = 3,
	FOUR = 4,
	FIVE = 5,
	SIX = 6,
	SEVEN = 7,
	EIGHT = 8,
	NINE = 9,
	TEN = 10,
	JACK = 11,
	QUEEN = 12,
	KING = 13,
}

export enum CardText {
	ACE = "A",
	TWO = "2",
	THREE = "3",
	FOUR = "4",
	FIVE = "5",
	SIX = "6",
	SEVEN = "7",
	EIGHT = "8",
	NINE = "9",
	TEN = "10",
	JACK = "J",
	QUEEN = "Q",
	KING = "K",
}

export enum CardSuite {
	HEARTS = "♥",
	DIAMONDS = "♦",
	CLUBS = "♣",
	SPADES = "♠",
}

// PlayingCard type
export interface PlayingCard {
	value: CardValue;
	rank: CardText;
	suit: CardSuite;
}

export const createStandardDeck = (): PlayingCard[] => {
	const deck: PlayingCard[] = [];

	// Create mapping between enums
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

	for (const suite of Object.values(CardSuite)) {
		for (const value of Object.values(CardValue)) {
			if (typeof value === "number") {
				deck.push({
					value: value as CardValue,
					rank: valueToText[value as CardValue],
					suit: suite,
				});
			}
		}
	}

	return deck;
};

export function getCardText(card: PlayingCard): string {
	return `${card.rank}${card.suit}`;
}
