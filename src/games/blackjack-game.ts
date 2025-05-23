import { DeckShoe } from "../deck";
import type { PlayingCard } from "../playing-card";

export class BlackjackGame {
	private shoe: DeckShoe;
	private playerHand: PlayingCard[] = [];
	private dealerHand: PlayingCard[] = [];

	constructor(decks = 8) {
		this.shoe = new DeckShoe(decks);
	}

	public startNewRound(): void {
		this.playerHand = [];
		this.dealerHand = [];
		this.playerHand.push(...this.shoe.draw(2));
		this.dealerHand.push(...this.shoe.draw(2));
	}

	public getPlayerHand(): PlayingCard[] {
		return this.playerHand;
	}

	public getDealerHand(): PlayingCard[] {
		return this.dealerHand;
	}

	public hit(): PlayingCard {
		const card = this.shoe.draw(1)[0];
		this.playerHand.push(card);
		return card;
	}

	public dealerPlay(): void {
		while (this.getHandValue(this.dealerHand) < 17) {
			const card = this.shoe.draw(1)[0];
			this.dealerHand.push(card);
		}
	}

	public getPlayerHandValue(): number {
		return this.getHandValue(this.playerHand);
	}

	public getDealerHandValue(): number {
		return this.getHandValue(this.dealerHand);
	}

	public isPlayerBusted(): boolean {
		return this.getHandValue(this.playerHand) > 21;
	}

	public isDealerBusted(): boolean {
		return this.getHandValue(this.dealerHand) > 21;
	}

	public getWinner(): "player" | "dealer" | "tie" | null {
		const playerValue = this.getHandValue(this.playerHand);
		const dealerValue = this.getHandValue(this.dealerHand);

		if (playerValue > 21) return "dealer";
		if (dealerValue > 21) return "player";
		if (playerValue > dealerValue) return "player";
		if (dealerValue > playerValue) return "dealer";
		return "tie";
	}

	private getHandValue(hand: PlayingCard[]): number {
		let value = 0;
		let aces = 0;
		for (const card of hand) {
			if (card.rank === "A") {
				aces++;
				value += 11;
			} else if (["K", "Q", "J"].includes(card.rank)) {
				value += 10;
			} else {
				value += Number.parseInt(card.rank);
			}
		}
		while (value > 21 && aces > 0) {
			value -= 10;
			aces--;
		}
		return value;
	}
}
