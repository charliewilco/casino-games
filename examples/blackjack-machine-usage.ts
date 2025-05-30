import { createActor } from "xstate";
import { createBlackjackMachine } from "../src/machines/blackjack.ts";
import { Shoe } from "../src/shoe.ts";

// Example player
const player = { id: "p1", balance: 1000, name: "Alice" };

// Deterministic shoe for testing
const mockShoe = new Shoe();

// Inject player at machine creation
const blackjackMachine = createBlackjackMachine(mockShoe, undefined, [player]);
const blackjack = createActor(blackjackMachine);
blackjack.start();

// No need to send ADD_PLAYER

// Start betting phase
blackjack.send({ type: "START_BETTING" });

// Place a bet
blackjack.send({
	type: "PLACE_BET",
	playerId: player.id,
	amount: 100,
	betType: "BLACKJACK_MAIN",
});

// Deal cards
blackjack.send({ type: "DEAL" });

// Example: Player hits
blackjack.send({ type: "HIT", playerId: player.id, handIndex: 0 });

// Example: Player stands
blackjack.send({ type: "STAND", playerId: player.id, handIndex: 0 });

// Move to dealer turn
blackjack.send({ type: "PLAYER_TURN_OVER" });

// Dealer logic now runs automatically in the machine (dealerTurn state)
console.log("Dealer's hand:", blackjack.getSnapshot().context.dealer.cards);
console.log("Final state:", blackjack.getSnapshot().value);
console.log("Game context:", blackjack.getSnapshot().context);

/**
 * This example demonstrates basic usage of the blackjack state machine:
 * - Inject players at creation
 * - Start betting
 * - Place a bet
 * - Deal cards
 * - Play a turn (hit/stand)
 * - Move to dealer/results
 *
 * In a real app, you would use the state/context to drive your UI and send events based on user actions.
 */

// To reset the game
// blackjack.send({ type: "RESET" });
