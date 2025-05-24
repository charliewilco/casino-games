# Casino Games Engine

A comprehensive TypeScript library for implementing casino games with advanced features including multi-player support, sophisticated betting systems, and complete game mechanics.

## Features

### Core Components
- **Deck Management**: Standard 52-card deck with shuffle functionality and multi-deck shoe support
- **Card System**: Complete playing card implementation with suits, values, and utilities
- **Error Handling**: Comprehensive error system with specialized casino game exceptions

### Game Engines

#### 🃏 Blackjack Game
- **Multi-player Support**: Add/remove players with individual balance tracking
- **Advanced Betting**: Main bets, side bets, insurance with configurable limits
- **Game Features**: Double down, split hands, surrender, insurance
- **Hand Management**: Soft 17 rules, blackjack detection, automatic dealer play
- **Statistics**: Game history, win/loss tracking, betting analytics

#### 🎰 Roulette Game  
- **Complete Betting System**: All roulette bet types with proper payouts
  - Inside bets: Straight-up (35:1), Split (17:1), Street (11:1), Corner (8:1)
  - Outside bets: Red/Black (1:1), Odd/Even (1:1), High/Low (1:1)
  - Dozens/Columns (2:1), and more
- **Wheel Support**: European (37 numbers) and American (38 numbers) wheels
- **Table Management**: Configurable betting limits per bet type
- **Multi-player**: Player balance tracking and bet history

#### 🎲 Texas Hold'em Poker
- **Complete Game Flow**: Preflop, flop, turn, river with proper betting rounds
- **Advanced Betting**: Check, call, bet, raise, fold, all-in with validation
- **Position Management**: Dealer button rotation, blinds system
- **Pot Management**: Main pot and side pot calculations for all-in scenarios
- **Hand Evaluation**: Integration with comprehensive poker hand evaluator
- **Tournament Ready**: Configurable blinds, player limits, and game settings

#### 🎮 Poker Hand Evaluator
- **Complete Hand Rankings**: Royal Flush through High Card with proper ordering
- **7-Card Evaluation**: Find best 5-card hand from any number of cards
- **Hand Comparison**: Sophisticated tiebreaking with kicker evaluation
- **Descriptive Results**: Human-readable hand descriptions
- **Low Ace Straights**: Proper handling of A-2-3-4-5 straights

## Installation

```bash
npm install @charliewilco/casino-games
```

## Quick Start

### Basic Deck Usage

```typescript
import { Deck, DeckShoe } from '@charliewilco/casino-games';

// Single deck
const deck = new Deck();
const cards = deck.draw(5);
console.log(`Remaining: ${deck.getRemainingCount()}`);

// Multi-deck shoe
const shoe = new DeckShoe(6); // 6-deck shoe
const dealtCards = shoe.draw(10);
```

### Enhanced Blackjack with Multi-Player

```typescript
import { BlackjackGame, BetType } from '@charliewilco/casino-games';

const game = new BlackjackGame();

// Add players
game.addPlayer({ id: "player1", balance: 1000, name: "Alice" });
game.addPlayer({ id: "player2", balance: 500, name: "Bob" });

// Place bets
game.placeBet("player1", 100, BetType.BLACKJACK_MAIN);
game.placeBet("player2", 50, BetType.BLACKJACK_MAIN);

// Start round
game.startRound();

// Player actions
game.hit("player1");
game.doubleDown("player1");
game.stand("player2");

// Advanced features
game.split("player1"); // If player has a pair
game.surrender("player2"); // Early surrender
game.placeBet("player1", 50, BetType.BLACKJACK_INSURANCE); // Insurance bet

// Complete round
game.finishRound();

// Check results
const stats = game.getGameStatistics();
console.log(`Hands played: ${stats.handsPlayed}`);
```

### Comprehensive Roulette

```typescript
import { RouletteGame, BetType } from '@charliewilco/casino-games';

const game = new RouletteGame(false, { // European wheel
  minBet: 1,
  maxBet: 1000,
  maxStraightUp: 100
});

// Add players
game.addPlayer({ id: "player1", balance: 1000 });

// Place various bets
game.placeBet("player1", {
  type: BetType.ROULETTE_STRAIGHT_UP,
  amount: 50,
  numbers: [7], // Bet on number 7
  playerId: "player1"
});

game.placeBet("player1", {
  type: BetType.ROULETTE_RED,
  amount: 100,
  numbers: [],
  playerId: "player1"
});

// Spin the wheel
const result = game.spin();
console.log(`Winning number: ${result.winningNumber}`);
console.log(`Color: ${result.color}`);
console.log(`Total winnings for player1: ${result.totalWinnings.player1 || 0}`);
```

### Advanced Texas Hold'em

```typescript
import { TexasPokerGame } from '@charliewilco/casino-games';

const game = new TexasPokerGame({
  smallBlind: 25,
  bigBlind: 50,
  maxPlayers: 9
});

// Add players
game.addPlayer({ id: "player1", name: "Alice", chips: 2000, position: 0 });
game.addPlayer({ id: "player2", name: "Bob", chips: 1500, position: 1 });
game.addPlayer({ id: "player3", name: "Charlie", chips: 3000, position: 2 });

// Start a hand
game.startNewHand();
console.log(`Current phase: ${game.getCurrentPhase()}`); // "preflop"

// Betting actions
game.call("player1"); // Call the big blind
game.raise("player2", 100); // Raise to 150
game.fold("player3"); // Fold

// Progress through betting rounds
// Flop (3 community cards)
console.log(`Community cards: ${game.getCommunityCards().length}`); // 3

game.check("player1");
game.bet("player2", 200);
game.call("player1");

// Turn and River continue similarly...

// Get showdown result
if (game.getCurrentPhase() === "showdown") {
  const result = game.getShowdownResult();
  console.log(`Winner: ${result?.winners[0].player.name}`);
  console.log(`Winning hand: ${result?.winners[0].evaluation.description}`);
}
```

### Poker Hand Evaluation

```typescript
import { PokerHandEvaluator, createStandardDeck } from '@charliewilco/casino-games';

const deck = createStandardDeck();
const hand = deck.slice(0, 7); // 7 cards (Texas Hold'em style)

const evaluation = PokerHandEvaluator.evaluateHand(hand);
console.log(`Hand rank: ${evaluation.rank}`);
console.log(`Description: ${evaluation.description}`);
console.log(`Best 5 cards:`, evaluation.cards);

// Compare hands
const hand2 = deck.slice(7, 14);
const evaluation2 = PokerHandEvaluator.evaluateHand(hand2);

const comparison = PokerHandEvaluator.compareHands(evaluation, evaluation2);
if (comparison > 0) {
  console.log("Hand 1 wins");
} else if (comparison < 0) {
  console.log("Hand 2 wins");
} else {
  console.log("Tie");
}
```

### Roulette

```typescript
import { RouletteGame } from '@charliewilco/casino-games';

const roulette = new RouletteGame();
roulette.placeBet({ type: "red", amount: 100 });

const winningNumber = roulette.spinWheel();
const payout = roulette.getPayout({ type: "red", amount: 100 });
```

### Texas Hold'em Poker

```typescript
import { TexasPokerGame } from '@charliewilco/casino-games';

const poker = new TexasPokerGame();
poker.addPlayer("player1", "Alice", 1000);
poker.addPlayer("player2", "Bob", 1000);

poker.startNewGame();
poker.flop(); // Deal 3 community cards
poker.turn(); // Deal 1 community card
poker.river(); // Deal final community card

poker.bet("player1", 100);
poker.fold("player2");
```

## API Reference

### Deck

- `draw(count?: number)`: Draw cards from the deck
- `getRemainingCount()`: Get number of cards remaining
- `getDrawnCards()`: Get array of drawn cards
- `getDrawnCount()`: Get number of drawn cards
- `reset()`: Reset and reshuffle the deck
- `forceShuffle()`: Force shuffle the current deck

### BlackjackGame

- `startNewRound()`: Start a new round with fresh hands
- `hit()`: Player draws a card
- `dealerPlay()`: Dealer plays according to rules
- `getPlayerHandValue()`: Get player's hand value
- `getDealerHandValue()`: Get dealer's hand value
- `isPlayerBusted()`: Check if player is busted
- `getWinner()`: Determine the winner

### RouletteGame

- `placeBet(bet)`: Place a bet on the table
- `spinWheel()`: Spin the wheel and get winning number
- `checkWin(bet)`: Check if a bet wins
- `getPayout(bet)`: Calculate payout for a bet

### TexasPokerGame

- `addPlayer(id, name, chips)`: Add a player to the game
- `startNewGame()`: Start a new poker game
- `flop()`: Deal the flop (3 community cards)
- `turn()`: Deal the turn (1 community card)
- `river()`: Deal the river (1 community card)
- `bet(playerId, amount)`: Player places a bet
- `fold(playerId)`: Player folds

## Examples

The `examples/` directory contains comprehensive demonstrations of the casino engine's capabilities:

- **🃏 Blackjack Tournament** (`examples/blackjack-tournament.ts`) - Multi-player tournament with AI strategies
- **🎰 Roulette Simulation** (`examples/roulette-simulation.ts`) - Casino simulation with multiple betting strategies  
- **🎲 Poker Tournament** (`examples/poker-tournament.ts`) - Texas Hold'em tournament with realistic gameplay
- **🏛️ Multi-Game Casino** (`examples/multi-game-casino.ts`) - Integrated platform combining all games

### Running Examples

```bash
# Install tsx for running TypeScript directly
npm install -g tsx

# Run individual examples
npx tsx examples/blackjack-tournament.ts
npx tsx examples/roulette-simulation.ts
npx tsx examples/poker-tournament.ts
npx tsx examples/multi-game-casino.ts
```

See `examples/README.md` for detailed documentation and customization options.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Lint and format
npx biome check --write .
```

## License

ISC
