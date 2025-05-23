# Casino Games Engine

A TypeScript library for implementing various casino games including Blackjack, Roulette, and Texas Hold'em Poker.

## Features

- **Deck Management**: Standard 52-card deck with shuffle functionality and drawn card tracking
- **Multiple Deck Shoe**: Support for multi-deck games
- **Blackjack Game**: Complete implementation with dealer logic and hand evaluation
- **Roulette Game**: Betting system with red/black and other bet types
- **Texas Hold'em Poker**: Player management, betting, and game phases (preflop, flop, turn, river)

## Installation

```bash
npm install @charliewilco/casino-games
```

## Usage

### Deck

```typescript
import { Deck } from '@charliewilco/casino-games';

const deck = new Deck();
const cards = deck.draw(5); // Draw 5 cards
console.log(`Remaining cards: ${deck.getRemainingCount()}`);
console.log(`Drawn cards: ${deck.getDrawnCount()}`);
```

### Blackjack

```typescript
import { BlackjackGame } from '@charliewilco/casino-games';

const game = new BlackjackGame();
game.startNewRound();

const playerHand = game.getPlayerHand();
const dealerHand = game.getDealerHand();

// Player hits
const newCard = game.hit();

// Dealer plays
game.dealerPlay();

// Check winner
const winner = game.getWinner();
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
