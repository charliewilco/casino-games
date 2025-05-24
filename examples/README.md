# Casino Games Examples

This directory contains comprehensive examples demonstrating the advanced features of the casino games engine. Each example showcases real-world usage patterns and best practices.

## Examples Overview

### 🃏 Blackjack Tournament (`blackjack-tournament.ts`)

A complete multi-player blackjack tournament simulation featuring:

- **Multi-player Support**: Up to 8 players with individual balance tracking
- **Advanced Betting Strategies**: Smart AI players with different risk profiles
- **Game Features**: Splitting, doubling down, insurance bets
- **Tournament Mechanics**: Elimination system, round-by-round progression
- **Statistics Tracking**: Win rates, profit/loss, betting patterns

**Key Features Demonstrated:**
- Player management (add/remove players)
- Advanced betting with side bets
- Hand splitting and doubling down
- Tournament-style progression
- Statistical analysis

### 🎰 Roulette Simulation (`roulette-simulation.ts`)

A comprehensive roulette casino simulation with:

- **Multiple Betting Strategies**: Conservative, aggressive, martingale, and random
- **Complete Bet Types**: All inside and outside bets with proper payouts
- **Realistic Casino Environment**: Betting limits, player elimination
- **Statistical Analysis**: Number frequency, color distribution, ROI tracking
- **Multi-player Competition**: Up to 8 players with different strategies

**Key Features Demonstrated:**
- All roulette bet types (straight-up, split, corner, dozens, etc.)
- Betting strategy implementation
- Casino-style bankroll management
- Comprehensive statistics and analysis
- European vs American wheel support

### 🎲 Poker Tournament (`poker-tournament.ts`)

A full Texas Hold'em tournament with:

- **Complete Poker Mechanics**: All betting rounds (preflop, flop, turn, river)
- **Advanced AI Players**: Different play styles (tight, loose, aggressive, conservative)
- **Tournament Structure**: Blind escalation, elimination system
- **Hand Evaluation**: Integration with poker hand evaluator
- **Realistic Gameplay**: Position play, pot odds, all-in scenarios

**Key Features Demonstrated:**
- Complete poker game flow
- AI decision making with hand strength evaluation
- Tournament blind structure
- Multi-pot scenarios (main pot, side pots)
- Hand ranking and comparison

## Running the Examples

### Prerequisites

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running Individual Examples

Each example can be run by uncommenting the example function call at the bottom of the file and running:

```bash
# Run blackjack tournament
npx tsx examples/blackjack-tournament.ts

# Run roulette simulation  
npx tsx examples/roulette-simulation.ts

# Run poker tournament
npx tsx examples/poker-tournament.ts
```

### Integration Examples

You can also import and use these classes in your own projects:

```typescript
import { BlackjackTournament } from './examples/blackjack-tournament';
import { RouletteSimulation } from './examples/roulette-simulation';
import { PokerTournament } from './examples/poker-tournament';

// Create a blackjack tournament
const tournament = new BlackjackTournament(50); // 50 rounds
tournament.addPlayer('player1', 'Alice', 1000);
tournament.addPlayer('player2', 'Bob', 1000);
await tournament.runTournament();

// Create a roulette simulation
const casino = new RouletteSimulation(false); // European wheel
casino.addPlayer('player1', 'Alice', 500, 'conservative');
casino.addPlayer('player2', 'Bob', 500, 'aggressive');
await casino.runSimulation(100); // 100 spins

// Create a poker tournament
const poker = new PokerTournament(30); // 30 hands
poker.addPlayer('player1', 'Alice', 1500, 0, 'tight');
poker.addPlayer('player2', 'Bob', 1500, 1, 'loose');
await poker.runTournament();
```

## Example Features

### Smart AI Players

Each example includes sophisticated AI players that demonstrate realistic gameplay:

- **Blackjack AI**: Uses basic strategy with card counting hints
- **Roulette AI**: Implements various betting systems (Martingale, D'Alembert, etc.)
- **Poker AI**: Uses hand strength evaluation and position-based decisions

### Statistical Analysis

All examples provide comprehensive statistics:

- Win/loss tracking
- Profit and loss analysis
- Betting pattern analysis
- Game-specific metrics (hit frequency, hand rankings, etc.)

### Realistic Casino Environment

Examples simulate real casino conditions:

- Betting limits and table rules
- Player elimination and bankroll management
- House edge and payout calculations
- Tournament structures and blind escalation

## Customization

### Modifying Player Strategies

You can easily modify the AI strategies in each example:

```typescript
// Custom blackjack strategy
private playPlayerHand(playerId: string, player: TournamentPlayer): void {
  const handValue = this.game.getPlayerHandValue(playerId);
  
  // Your custom strategy here
  if (handValue < 12) {
    this.game.hit(playerId);
  } else if (handValue < 17 && dealerUpCard < 7) {
    this.game.hit(playerId);
  } else {
    this.game.stand(playerId);
  }
}

// Custom roulette betting
private customBetting(playerId: string, player: CasinoPlayer): void {
  // Your custom betting strategy
  const betAmount = calculateBetAmount(player.balance, this.history);
  const betType = chooseBetType(this.history, player.strategy);
  
  this.game.placeBet(playerId, {
    type: betType,
    amount: betAmount,
    numbers: [],
    playerId
  });
}
```

### Adding New Features

The examples are designed to be extensible. You can add:

- New betting strategies
- Additional statistics tracking
- Tournament variations (rebuy, freeze-out, etc.)
- Custom game rules and variations
- Real-time visualization and reporting

## Performance Notes

- Examples include artificial delays for readability
- Remove `setTimeout` calls for maximum performance
- Consider batching operations for large simulations
- Use the provided statistics methods for analysis

## License

These examples are provided under the same ISC license as the main package.
