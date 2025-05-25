# Advanced Usage: useSyncExternalStore for React State Sync

For advanced React state management, useSyncExternalStore is the recommended way to connect your UI to the casino games library. This ensures reliable, performant updates and works with React's concurrent features.

## Minimal Store Wrapper Example

```typescript
import { BlackjackGame, BetType } from '@charliewilco/casino-games';

export class BlackjackGameStore {
	private game: BlackjackGame;
	private listeners = new Set<() => void>();
	private _lastSnapshot = '';

	constructor(numDecks = 6, options = {}) {
		this.game = new BlackjackGame(numDecks, options);
		this._lastSnapshot = JSON.stringify(this.getSnapshot());
	}

	getSnapshot() {
		return {
			players: this.game.getPlayers(),
			dealerHand: this.game.getDealerHand(),
			bettingPhase: this.game.bettingPhase,
			gameInProgress: this.game.gameInProgress,
			currentBets: this.game.getCurrentBets(),
		};
	}

	subscribe(cb: () => void) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	private notify() {
		const snap = JSON.stringify(this.getSnapshot());
		if (snap !== this._lastSnapshot) {
			this._lastSnapshot = snap;
			this.listeners.forEach(cb => cb());
		}
	}

	addPlayer(player: { id: string; name: string; balance: number }) {
		this.game.addPlayer(player);
		this.notify();
	}

	removePlayer(playerId: string) {
		this.game.removePlayer(playerId);
		this.notify();
	}

	startBettingPhase() {
		this.game.startBettingPhase();
		this.notify();
	}

	placeBet(playerId: string, amount: number, betType: BetType = BetType.BLACKJACK_MAIN) {
		this.game.placeBet(playerId, amount, betType);
		this.notify();
	}

	startRound() {
		this.game.startRound();
		this.notify();
	}

	hit(playerId: string, handIndex = 0) {
		const card = this.game.hit(playerId, handIndex);
		this.notify();
		return card;
	}

	stand(playerId: string, handIndex = 0) {
		this.game.stand(playerId, handIndex);
		this.notify();
	}

	doubleDown(playerId: string, handIndex = 0) {
		const card = this.game.doubleDown(playerId, handIndex);
		this.notify();
		return card;
	}

	split(playerId: string, handIndex = 0) {
		this.game.split(playerId, handIndex);
		this.notify();
	}

	surrender(playerId: string, handIndex = 0) {
		this.game.surrender(playerId, handIndex);
		this.notify();
	}

	finishRound() {
		const results = this.game.finishRound();
		this.notify();
		return results;
	}

	// Read-only accessors (no notifications needed)
	getPlayerHandMulti(playerId: string, handIndex = 0) {
		return this.game.getPlayerHandMulti(playerId, handIndex);
	}

	getPlayerHandValueMulti(playerId: string, handIndex = 0) {
		return this.game.getPlayerHandValueMulti(playerId, handIndex);
	}

	getDealerHandValue() {
		return this.game.getDealerHandValue();
	}

	getGameStatistics() {
		return this.game.getGameStatistics();
	}

	// Expose the underlying game for advanced usage
	get rawGame() {
		return this.game;
	}

	// Set shuffle function
	setShuffleFn(shuffleFn: (array: any[]) => any[]) {
		this.game.shoe.shuffleFn = shuffleFn;
	}
}
```

## Minimal React Hook

```tsx
import { useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { BlackjackGameStore } from './blackjack-store';

export function useBlackjackStore(numDecks = 6, options = {}) {
	const storeRef = useRef<BlackjackGameStore>();
	if (!storeRef.current) storeRef.current = new BlackjackGameStore(numDecks, options);
	const store = storeRef.current;
	const state = useSyncExternalStore(store.subscribe.bind(store), store.getSnapshot.bind(store));
	return { state, store };
}
```

## Simple React Component Example

```tsx
import React from 'react';
import { useBlackjackStore } from './useBlackjackStore';

export function BlackjackTable() {
	const { state, store } = useBlackjackStore();
	return (
		<div>
			<h2>Blackjack Table</h2>
			<p>Players: {state.players.length}</p>
			<button onClick={() => store.addPlayer({ id: 'p1', name: 'Alice', balance: 1000 })}>
				Add Player
			</button>
			{/* Render hands, betting, etc. using state */}
		</div>
	);
}
```

---

## Further Patterns

- **Selectors**: Use a selector function with useSyncExternalStore for fine-grained updates.
- **Global Store Manager**: Manage multiple tables with a global registry.
- **Middleware**: Wrap store actions for logging, analytics, or validation.
- **Testing**: Use Jest and @testing-library/react for hooks and UI.

See below for advanced examples:

```tsx
import { useSyncExternalStore, useMemo } from 'react';

export function useBlackjackSelector<T>(
	store: BlackjackGameStore,
	selector: (state: ReturnType<BlackjackGameStore['getSnapshot']>) => T
) {
	const selectedValue = useSyncExternalStore(
		(callback) => store.subscribe(callback),
		() => selector(store.getSnapshot()),
		() => selector(store.getSnapshot())
	);

	return selectedValue;
}

// Usage example - only re-render when specific data changes
export function PlayerHandComponent({ store, playerId }: { 
	store: BlackjackGameStore; 
	playerId: string; 
}) {
	// Only re-render when this specific player's hand changes
	const playerHand = useBlackjackSelector(store, (state) => {
		const player = state.players.find(p => p.id === playerId);
		return player ? {
			name: player.name,
			balance: player.balance,
			hand: store.getPlayerHandMulti(playerId, 0),
			handValue: store.getPlayerHandValueMulti(playerId, 0),
		} : null;
	});

	if (!playerHand) return null;

	return (
		<div className="player-hand">
			<h4>{playerHand.name} (${playerHand.balance})</h4>
			<p>Hand Value: {playerHand.handValue}</p>
			<div className="cards">
				{playerHand.hand.map((card, i) => (
					<div key={i} className="card">
						{card.rank} {card.suit}
					</div>
				))}
			</div>
		</div>
	);
}
```

### Testing with useSyncExternalStore

```tsx
import { renderHook, act } from '@testing-library/react';
import { useBlackjackStore } from './useBlackjackStore';

describe('useBlackjackStore', () => {
	test('should update state when player is added', () => {
		const { result } = renderHook(() => useBlackjackStore());
		
		expect(result.current.state.players).toHaveLength(0);
		
		act(() => {
			result.current.actions.addPlayer('player1', 'Test Player', 1000);
		});
		
		expect(result.current.state.players).toHaveLength(1);
		expect(result.current.state.players[0]).toMatchObject({
			id: 'player1',
			name: 'Test Player',
			balance: 1000
		});
	});

	test('should handle game flow correctly', () => {
		const { result } = renderHook(() => useBlackjackStore());
		
		// Add player
		act(() => {
			result.current.actions.addPlayer('player1', 'Test Player', 1000);
		});
		
		// Start betting
		act(() => {
			result.current.actions.startBettingPhase();
		});
		
		expect(result.current.state.bettingPhase).toBe(true);
		
		// Place bet
		act(() => {
			result.current.actions.placeBet('player1', 100);
		});
		
		expect(result.current.state.currentBets).toHaveLength(1);
		
		// Start round
		act(() => {
			result.current.actions.startRound();
		});
		
		expect(result.current.state.gameInProgress).toBe(true);
		expect(result.current.state.bettingPhase).toBe(false);
	});
});

## Benefits of Event-Driven Architecture

1. **Separation of Concerns**: Game logic is completely separate from UI concerns
2. **Real-time Updates**: Components automatically re-render when game state changes
3. **Debugging**: All game events are trackable and loggable
4. **Testing**: Easy to test by emitting events and verifying state changes
5. **Extensibility**: New features can subscribe to existing events without modifying core logic
6. **Performance**: useSyncExternalStore ensures optimal re-rendering
7. **Multiplayer Ready**: Events can be easily synchronized across multiple clients

This event-driven approach provides a robust foundation for building complex, interactive casino games with React while maintaining clean architecture and excellent developer experience.
