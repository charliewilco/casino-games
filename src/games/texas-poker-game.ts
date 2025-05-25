import { Deck } from "../deck.ts";
import type { PlayingCard } from "../playing-card.ts";
import { PokerHandEvaluator } from "../poker-evaluator.ts";
import {
	GameStateError,
	InvalidBetError,
	InsufficientFundsError,
	type HandEvaluation,
	type PokerShowdown,
} from "../types.ts";

export interface PokerPlayer {
	id: string;
	name: string;
	hand: PlayingCard[];
	chips: number;
	currentBet: number;
	totalBet: number; // Total bet for the current hand
	folded: boolean;
	allIn: boolean;
	position: number;
	isDealer: boolean;
	isSmallBlind: boolean;
	isBigBlind: boolean;
}

export interface BettingRound {
	phase: "preflop" | "flop" | "turn" | "river";
	actions: PlayerAction[];
	isComplete: boolean;
	currentBet: number;
	minRaise: number;
}

export interface PlayerAction {
	playerId: string;
	action: "fold" | "check" | "call" | "bet" | "raise" | "all-in";
	amount: number;
	timestamp: Date;
}

export interface PotInfo {
	mainPot: number;
	sidePots: { amount: number; eligiblePlayers: string[] }[];
	totalPot: number;
}

export interface GameSettings {
	smallBlind: number;
	bigBlind: number;
	ante?: number;
	maxPlayers: number;
	timeLimit?: number; // seconds per action
}

export interface ShowdownResult {
	winners: PokerPlayer[];
	winningHand: HandEvaluation;
	potWon: number;
	showdown: PokerShowdown;
}

export class TexasPokerGame {
	private deck: Deck;
	private players: PokerPlayer[];
	private communityCards: PlayingCard[];
	private pots: PotInfo;
	private currentPlayerIndex: number;
	private dealerPosition: number;
	private gamePhase:
		| "waiting"
		| "preflop"
		| "flop"
		| "turn"
		| "river"
		| "showdown"
		| "ended";
	private bettingRounds: BettingRound[];
	private settings: GameSettings;
	private handNumber: number;
	private currentBet: number;
	private minRaise: number;

	constructor(settings: Partial<GameSettings> = {}) {
		this.deck = new Deck();
		this.players = [];
		this.communityCards = [];
		this.pots = { mainPot: 0, sidePots: [], totalPot: 0 };
		this.currentPlayerIndex = 0;
		this.dealerPosition = 0;
		this.gamePhase = "waiting";
		this.bettingRounds = [];
		this.handNumber = 0;
		this.currentBet = 0;
		this.minRaise = 0;
		this.settings = {
			smallBlind: 5,
			bigBlind: 10,
			maxPlayers: 10,
			...settings,
		};
	}

	public addPlayer(id: string, name: string, chips = 1000): void {
		if (this.players.length >= this.settings.maxPlayers) {
			throw new GameStateError(
				`Maximum ${this.settings.maxPlayers} players allowed`,
			);
		}

		if (this.gamePhase !== "waiting") {
			throw new GameStateError("Cannot add players while game is in progress");
		}

		if (this.players.some((p) => p.id === id)) {
			throw new GameStateError(`Player with id ${id} already exists`);
		}

		const position = this.players.length;
		this.players.push({
			id,
			name,
			hand: [],
			chips,
			currentBet: 0,
			totalBet: 0,
			folded: false,
			allIn: false,
			position,
			isDealer: position === 0, // First player is initially dealer
			isSmallBlind: false,
			isBigBlind: false,
		});
	}

	public removePlayer(playerId: string): void {
		if (this.gamePhase !== "waiting") {
			throw new GameStateError(
				"Cannot remove players while game is in progress",
			);
		}

		const playerIndex = this.players.findIndex((p) => p.id === playerId);
		if (playerIndex === -1) {
			throw new GameStateError(`Player ${playerId} not found`);
		}

		this.players.splice(playerIndex, 1);

		// Reassign positions
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].position = i;
		}
	}

	public startNewHand(): void {
		if (this.players.length < 2) {
			throw new GameStateError("At least 2 players required to start a hand");
		}

		const activePlayers = this.players.filter((p) => p.chips > 0);
		if (activePlayers.length < 2) {
			throw new GameStateError("At least 2 players with chips required");
		}

		// Move dealer position
		this.moveDealer();
		this.handNumber++;

		// Reset game state
		this.deck.reset();
		this.communityCards = [];
		this.pots = { mainPot: 0, sidePots: [], totalPot: 0 };
		this.gamePhase = "preflop";
		this.bettingRounds = [];
		this.currentBet = this.settings.bigBlind;
		this.minRaise = this.settings.bigBlind;

		// Reset player states
		for (const player of this.players) {
			player.hand = [];
			player.currentBet = 0;
			player.totalBet = 0;
			player.folded = false;
			player.allIn = false;
			player.isSmallBlind = false;
			player.isBigBlind = false;
		}

		// Set blinds
		this.setBlinds();

		// Deal hole cards
		for (let i = 0; i < 2; i++) {
			for (const player of this.getActivePlayers()) {
				player.hand.push(this.deck.draw(1)[0]);
			}
		}

		// Start first betting round
		this.startBettingRound("preflop");
	}

	private moveDealer(): void {
		for (const player of this.players) {
			player.isDealer = false;
		}
		this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
		this.players[this.dealerPosition].isDealer = true;
	}

	private setBlinds(): void {
		const activePlayers = this.getActivePlayers();
		if (activePlayers.length < 2) return;

		let smallBlindPos: number;
		let bigBlindPos: number;

		if (activePlayers.length === 2) {
			// Heads up: dealer is small blind
			smallBlindPos = this.dealerPosition;
			bigBlindPos = (this.dealerPosition + 1) % this.players.length;
		} else {
			// Multi-way: small blind is left of dealer
			smallBlindPos = (this.dealerPosition + 1) % this.players.length;
			bigBlindPos = (this.dealerPosition + 2) % this.players.length;
		}

		// Find active players at blind positions
		const smallBlindPlayer = this.players[smallBlindPos];
		const bigBlindPlayer = this.players[bigBlindPos];

		if (smallBlindPlayer && smallBlindPlayer.chips > 0) {
			smallBlindPlayer.isSmallBlind = true;
			this.forceBet(
				smallBlindPlayer.id,
				Math.min(this.settings.smallBlind, smallBlindPlayer.chips),
			);
		}

		if (bigBlindPlayer && bigBlindPlayer.chips > 0) {
			bigBlindPlayer.isBigBlind = true;
			this.forceBet(
				bigBlindPlayer.id,
				Math.min(this.settings.bigBlind, bigBlindPlayer.chips),
			);
		}

		// Set current player (left of big blind)
		this.currentPlayerIndex = (bigBlindPos + 1) % this.players.length;
		this.findNextActivePlayer();
	}

	private forceBet(playerId: string, amount: number): void {
		const player = this.findPlayer(playerId);
		const betAmount = Math.min(amount, player.chips);

		player.chips -= betAmount;
		player.currentBet = betAmount;
		player.totalBet += betAmount;
		this.pots.mainPot += betAmount;
		this.pots.totalPot += betAmount;

		if (player.chips === 0) {
			player.allIn = true;
		}
	}

	private startBettingRound(
		phase: "preflop" | "flop" | "turn" | "river",
	): void {
		const round: BettingRound = {
			phase,
			actions: [],
			isComplete: false,
			currentBet: this.currentBet,
			minRaise: this.minRaise,
		};

		this.bettingRounds.push(round);

		// Reset current bets for new round (except preflop which has blinds)
		if (phase !== "preflop") {
			for (const player of this.players) {
				player.currentBet = 0;
			}
			this.currentBet = 0;
			this.minRaise = this.settings.bigBlind;
		}
	}

	public getValidActions(playerId: string): string[] {
		if (
			this.gamePhase === "showdown" ||
			this.gamePhase === "ended" ||
			this.gamePhase === "waiting"
		) {
			return [];
		}

		const player = this.findPlayer(playerId);
		if (
			player.folded ||
			player.allIn ||
			this.getCurrentPlayer()?.id !== playerId
		) {
			return [];
		}

		const actions: string[] = ["fold"];
		const callAmount = this.getCallAmount(playerId);

		if (callAmount === 0) {
			actions.push("check");
		} else if (callAmount <= player.chips) {
			actions.push("call");
		}

		// Can bet/raise if has enough chips
		const minBetAmount =
			this.currentBet === 0
				? this.settings.bigBlind
				: this.currentBet + this.minRaise;
		if (player.chips >= minBetAmount) {
			if (this.currentBet === 0) {
				actions.push("bet");
			} else {
				actions.push("raise");
			}
		}

		// Can always go all-in if has chips
		if (player.chips > 0) {
			actions.push("all-in");
		}

		return actions;
	}

	public fold(playerId: string): void {
		const player = this.findPlayer(playerId);

		if (player.folded) {
			throw new GameStateError(`Player ${playerId} has already folded`);
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		player.folded = true;
		this.recordAction(playerId, "fold", 0);
		this.moveToNextPlayer();
	}

	public check(playerId: string): void {
		const player = this.findPlayer(playerId);
		const callAmount = this.getCallAmount(playerId);

		if (callAmount > 0) {
			throw new InvalidBetError(
				`Cannot check, must call ${callAmount} or fold`,
			);
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		this.recordAction(playerId, "check", 0);
		this.moveToNextPlayer();
	}

	public call(playerId: string): void {
		const player = this.findPlayer(playerId);
		const callAmount = this.getCallAmount(playerId);

		if (callAmount === 0) {
			throw new InvalidBetError("Cannot call when no bet to call");
		}

		if (callAmount > player.chips) {
			throw new InsufficientFundsError(
				`Insufficient chips to call ${callAmount}`,
			);
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		this.processBet(player, callAmount);
		this.recordAction(playerId, "call", callAmount);
		this.moveToNextPlayer();
	}

	public bet(playerId: string, amount: number): void {
		const player = this.findPlayer(playerId);

		// Legacy compatibility: if no betting rounds exist, allow simple betting
		if (this.bettingRounds.length === 0) {
			if (amount > player.chips) {
				throw new InsufficientFundsError(`Insufficient chips to bet ${amount}`);
			}

			player.chips -= amount;
			player.currentBet = amount;
			player.totalBet += amount;
			this.pots.mainPot += amount;
			this.pots.totalPot += amount;
			return;
		}

		if (this.currentBet > 0) {
			throw new InvalidBetError(
				"Cannot bet when there's already a bet, use raise instead",
			);
		}

		if (amount < this.settings.bigBlind) {
			throw new InvalidBetError(`Minimum bet is ${this.settings.bigBlind}`);
		}

		if (amount > player.chips) {
			throw new InsufficientFundsError(`Insufficient chips to bet ${amount}`);
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		this.currentBet = amount;
		this.minRaise = amount;
		this.processBet(player, amount);
		this.recordAction(playerId, "bet", amount);
		this.moveToNextPlayer();
	}

	public raise(playerId: string, amount: number): void {
		const player = this.findPlayer(playerId);
		const callAmount = this.getCallAmount(playerId);
		const minRaiseAmount = this.currentBet + this.minRaise;

		if (this.currentBet === 0) {
			throw new InvalidBetError(
				"Cannot raise when there's no bet, use bet instead",
			);
		}

		if (amount < minRaiseAmount) {
			throw new InvalidBetError(`Minimum raise is ${minRaiseAmount}`);
		}

		if (amount > player.chips) {
			throw new InsufficientFundsError(
				`Insufficient chips to raise to ${amount}`,
			);
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		const raiseAmount = amount - this.currentBet;
		this.minRaise = raiseAmount;
		this.currentBet = amount;

		this.processBet(player, amount);
		this.recordAction(playerId, "raise", amount);
		this.moveToNextPlayer();
	}

	public allIn(playerId: string): void {
		const player = this.findPlayer(playerId);

		if (player.chips === 0) {
			throw new InsufficientFundsError("Player has no chips");
		}

		if (this.getCurrentPlayer()?.id !== playerId) {
			throw new GameStateError(`Not ${playerId}'s turn`);
		}

		const allInAmount = player.chips;
		this.processBet(player, allInAmount);
		player.allIn = true;

		this.recordAction(playerId, "all-in", allInAmount);
		this.moveToNextPlayer();
	}

	private processBet(player: PokerPlayer, amount: number): void {
		const actualBet = Math.min(amount, player.chips);
		player.chips -= actualBet;
		player.currentBet = actualBet;
		player.totalBet += actualBet;
		this.pots.mainPot += actualBet;
		this.pots.totalPot += actualBet;

		if (player.chips === 0) {
			player.allIn = true;
		}
	}

	private recordAction(
		playerId: string,
		action: PlayerAction["action"],
		amount: number,
	): void {
		const currentRound = this.bettingRounds[this.bettingRounds.length - 1];
		currentRound.actions.push({
			playerId,
			action,
			amount,
			timestamp: new Date(),
		});
	}

	private moveToNextPlayer(): void {
		if (this.isBettingRoundComplete()) {
			this.completeBettingRound();
			return;
		}

		this.findNextActivePlayer();
	}

	private findNextActivePlayer(): void {
		const activePlayers = this.getActivePlayers();
		let attempts = 0;

		while (attempts < this.players.length) {
			this.currentPlayerIndex =
				(this.currentPlayerIndex + 1) % this.players.length;
			const player = this.players[this.currentPlayerIndex];

			if (activePlayers.includes(player)) {
				break;
			}
			attempts++;
		}
	}

	private isBettingRoundComplete(): boolean {
		const activePlayers = this.getActivePlayers();
		const playersWhoCanAct = activePlayers.filter((p) => !p.allIn);

		if (playersWhoCanAct.length <= 1) {
			return true;
		}

		// Check if all active players have acted and called/checked
		const currentBets = activePlayers.map((p) => p.currentBet);
		const maxBet = Math.max(...currentBets);

		return activePlayers.every((p) => p.allIn || p.currentBet === maxBet);
	}

	private completeBettingRound(): void {
		const currentRound = this.bettingRounds[this.bettingRounds.length - 1];
		currentRound.isComplete = true;

		switch (this.gamePhase) {
			case "preflop":
				this.flop();
				break;
			case "flop":
				this.turn();
				break;
			case "turn":
				this.river();
				break;
			case "river":
				this.showdown();
				break;
		}
	}

	public flop(): void {
		if (this.gamePhase !== "preflop") {
			throw new GameStateError("Can only flop after preflop");
		}

		// Burn one card, then deal 3 community cards
		this.deck.draw(1);
		this.communityCards.push(...this.deck.draw(3));
		this.gamePhase = "flop";
		this.startBettingRound("flop");
	}

	public turn(): void {
		if (this.gamePhase !== "flop") {
			throw new GameStateError("Can only turn after flop");
		}

		// Burn one card, then deal 1 community card
		this.deck.draw(1);
		this.communityCards.push(this.deck.draw(1)[0]);
		this.gamePhase = "turn";
		this.startBettingRound("turn");
	}

	public river(): void {
		if (this.gamePhase !== "turn") {
			throw new GameStateError("Can only river after turn");
		}

		// Burn one card, then deal 1 community card
		this.deck.draw(1);
		this.communityCards.push(this.deck.draw(1)[0]);
		this.gamePhase = "river";
		this.startBettingRound("river");
	}

	public showdown(): ShowdownResult {
		if (this.gamePhase !== "river") {
			throw new GameStateError("Can only showdown after river");
		}

		this.gamePhase = "showdown";
		const activePlayers = this.getActivePlayers();

		if (activePlayers.length === 1) {
			// Only one player left, they win
			const winner = activePlayers[0];
			winner.chips += this.pots.totalPot;

			return {
				winners: [winner],
				winningHand: PokerHandEvaluator.evaluateHand([
					...winner.hand,
					...this.communityCards,
				]),
				potWon: this.pots.totalPot,
				showdown: {
					playerId: winner.id,
					hand: PokerHandEvaluator.evaluateHand([
						...winner.hand,
						...this.communityCards,
					]),
					holeCards: winner.hand,
					bestHand: PokerHandEvaluator.evaluateHand([
						...winner.hand,
						...this.communityCards,
					]).cards,
				},
			};
		}

		// Evaluate all hands
		const handEvaluations = activePlayers.map((player) => ({
			player,
			hand: PokerHandEvaluator.evaluateHand([
				...player.hand,
				...this.communityCards,
			]),
		}));

		// Find winners
		handEvaluations.sort((a, b) =>
			PokerHandEvaluator.compareHands(b.hand, a.hand),
		);
		const winningHand = handEvaluations[0].hand;
		const winners = handEvaluations
			.filter(
				(evaluation) =>
					PokerHandEvaluator.compareHands(evaluation.hand, winningHand) === 0,
			)
			.map((evaluation) => evaluation.player);

		// Distribute pot
		const potPerWinner = Math.floor(this.pots.totalPot / winners.length);
		for (const winner of winners) {
			winner.chips += potPerWinner;
		}

		this.gamePhase = "ended";

		return {
			winners,
			winningHand,
			potWon: potPerWinner,
			showdown: {
				playerId: winners[0].id,
				hand: winningHand,
				holeCards: winners[0].hand,
				bestHand: winningHand.cards,
			},
		};
	}

	// Helper methods
	private findPlayer(playerId: string): PokerPlayer {
		const player = this.players.find((p) => p.id === playerId);
		if (!player) {
			throw new GameStateError(`Player ${playerId} not found`);
		}
		return player;
	}

	private getCurrentPlayer(): PokerPlayer | null {
		if (
			this.currentPlayerIndex >= 0 &&
			this.currentPlayerIndex < this.players.length
		) {
			return this.players[this.currentPlayerIndex];
		}
		return null;
	}

	private getActivePlayers(): PokerPlayer[] {
		return this.players.filter((p) => !p.folded && p.chips >= 0);
	}

	public getCallAmount(playerId: string): number {
		const player = this.findPlayer(playerId);
		return Math.max(0, this.currentBet - player.currentBet);
	}

	// Public getters
	public getPlayers(): PokerPlayer[] {
		return [...this.players];
	}

	public getCommunityCards(): PlayingCard[] {
		return [...this.communityCards];
	}

	public getPot(): number;
	public getPot(detailed: true): PotInfo;
	public getPot(detailed?: boolean): number | PotInfo {
		if (detailed) {
			return { ...this.pots };
		}
		return this.pots.totalPot;
	}

	// Legacy compatibility method for tests
	public getPotTotal(): number {
		return this.pots.totalPot;
	}

	public getGamePhase(): string {
		return this.gamePhase;
	}

	public getCurrentBet(): number {
		return this.currentBet;
	}

	public getMinRaise(): number {
		return this.minRaise;
	}

	public getHandNumber(): number {
		return this.handNumber;
	}

	public getBettingRounds(): BettingRound[] {
		return [...this.bettingRounds];
	}

	public getSettings(): GameSettings {
		return { ...this.settings };
	}

	// Legacy compatibility methods for existing tests
	public startNewGame(): void {
		this.startNewHand();
	}
}
