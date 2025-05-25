# Usage in React/React Native

This guide demonstrates how to integrate the casino games library with React and React Native applications. The library provides complete game engines for Blackjack, Roulette, and Texas Hold'em Poker.

## Installation

```bash
pnpm install @charliewilco/casino-games
```

## Core Concepts

The library follows a state-driven approach perfect for React applications:

- **Game engines**: Self-contained classes that manage game state
- **Player management**: Add/remove players with balance tracking
- **Event-driven actions**: Methods that trigger state changes
- **Immutable data access**: Getters that return current game state

## Basic Integration Pattern

```tsx
import React, { useState, useCallback } from 'react';
import { BlackjackGame, BetType } from '@charliewilco/casino-games';

function useBlackjackGame() {
	const [game] = useState(() => new BlackjackGame());
	const [gameState, setGameState] = useState({
		players: game.getPlayers(),
		dealerHand: game.getDealerHand(),
		gameInProgress: false,
		bettingPhase: false,
	});

	const updateGameState = useCallback(() => {
		setGameState({
			players: game.getPlayers(),
			dealerHand: game.getDealerHand(),
			gameInProgress: game.gameInProgress,
			bettingPhase: game.bettingPhase,
		});
	}, [game]);

	return { game, gameState, updateGameState };
}
```

## Blackjack Integration

### Basic Blackjack Component

```tsx
import React, { useState, useEffect } from 'react';
import { BlackjackGame, BetType, type PlayingCard } from '@charliewilco/casino-games';

interface BlackjackProps {
	shuffleFn?: (array: any[]) => any[];
}

export function BlackjackTable({ shuffleFn }: BlackjackProps) {
	const [game] = useState(() => {
		const gameInstance = new BlackjackGame(6, {
			allowDoubleDown: true,
			allowSplit: true,
			allowSurrender: true,
			blackjackPayout: 1.5,
		});
		
		// Provide custom shuffle function if needed
		if (shuffleFn) {
			gameInstance.shoe.shuffleFn = shuffleFn;
		}
		
		return gameInstance;
	});
	
	const [gameState, setGameState] = useState({
		players: game.getPlayers(),
		currentBets: game.getCurrentBets(),
		bettingPhase: false,
		gameInProgress: false,
	});

	const updateState = () => {
		setGameState({
			players: game.getPlayers(),
			currentBets: game.getCurrentBets(),
			bettingPhase: game.bettingPhase,
			gameInProgress: game.gameInProgress,
		});
	};

	const addPlayer = (name: string, balance: number) => {
		const playerId = `player_${Date.now()}`;
		game.addPlayer({ id: playerId, name, balance });
		updateState();
	};

	const placeBet = (playerId: string, amount: number) => {
		try {
			game.placeBet(playerId, amount, BetType.BLACKJACK_MAIN);
			updateState();
		} catch (error) {
			console.error('Bet failed:', error.message);
		}
	};

	const startRound = () => {
		try {
			game.startRound();
			updateState();
		} catch (error) {
			console.error('Failed to start round:', error.message);
		}
	};

	const hit = (playerId: string) => {
		try {
			game.hit(playerId);
			updateState();
		} catch (error) {
			console.error('Hit failed:', error.message);
		}
	};

	const stand = (playerId: string) => {
		try {
			game.stand(playerId);
			updateState();
		} catch (error) {
			console.error('Stand failed:', error.message);
		}
	};

	return (
		<div className="blackjack-table">
			<div className="dealer-section">
				<h3>Dealer</h3>
				<HandDisplay cards={game.getDealerHand()} />
			</div>
			
			<div className="players-section">
				{gameState.players.map(player => (
					<PlayerHand
						key={player.id}
						player={player}
						cards={game.getPlayerHandMulti(player.id)}
						handValue={game.getPlayerHandValueMulti(player.id)}
						onHit={() => hit(player.id)}
						onStand={() => stand(player.id)}
						canAct={gameState.gameInProgress}
					/>
				))}
			</div>
			
			<div className="controls">
				<button onClick={() => game.startBettingPhase()}>
					Start Betting
				</button>
				<button 
					onClick={startRound}
					disabled={gameState.currentBets.length === 0}
				>
					Deal Cards
				</button>
			</div>
		</div>
	);
}

function HandDisplay({ cards }: { cards: PlayingCard[] }) {
	return (
		<div className="hand">
			{cards.map((card, i) => (
				<div key={i} className={`card ${card.suit}`}>
					{card.rank}
				</div>
			))}
		</div>
	);
}

function PlayerHand({ 
	player, 
	cards, 
	handValue, 
	onHit, 
	onStand, 
	canAct 
}: {
	player: any;
	cards: PlayingCard[];
	handValue: number;
	onHit: () => void;
	onStand: () => void;
	canAct: boolean;
}) {
	return (
		<div className="player-hand">
			<h4>{player.name} (${player.balance})</h4>
			<HandDisplay cards={cards} />
			<p>Value: {handValue}</p>
			{canAct && (
				<div className="actions">
					<button onClick={onHit}>Hit</button>
					<button onClick={onStand}>Stand</button>
				</div>
			)}
		</div>
	);
}
```

### Advanced Blackjack Hook

```tsx
import { useState, useCallback, useRef } from 'react';
import { BlackjackGame, BetType, type GameResult } from '@charliewilco/casino-games';

interface BlackjackState {
	players: any[];
	bettingPhase: boolean;
	gameInProgress: boolean;
	roundResults: GameResult[] | null;
	dealerHand: any[];
	statistics: { handsPlayed: number; totalBetAmount: number };
}

export function useBlackjack(options = {}) {
	const gameRef = useRef(new BlackjackGame(6, options));
	const game = gameRef.current;
	
	const [state, setState] = useState<BlackjackState>({
		players: [],
		bettingPhase: false,
		gameInProgress: false,
		roundResults: null,
		dealerHand: [],
		statistics: { handsPlayed: 0, totalBetAmount: 0 },
	});

	const updateState = useCallback(() => {
		setState({
			players: game.getPlayers(),
			bettingPhase: game.bettingPhase,
			gameInProgress: game.gameInProgress,
			roundResults: state.roundResults,
			dealerHand: game.getDealerHand(),
			statistics: game.getGameStatistics(),
		});
	}, [game, state.roundResults]);

	const actions = {
		addPlayer: useCallback((id: string, name: string, balance: number) => {
			game.addPlayer({ id, name, balance });
			updateState();
		}, [game, updateState]),

		startBetting: useCallback(() => {
			game.startBettingPhase();
			setState(prev => ({ ...prev, roundResults: null }));
			updateState();
		}, [game, updateState]),

		placeBet: useCallback((playerId: string, amount: number) => {
			game.placeBet(playerId, amount, BetType.BLACKJACK_MAIN);
			updateState();
		}, [game, updateState]),

		startRound: useCallback(() => {
			game.startRound();
			updateState();
		}, [game, updateState]),

		hit: useCallback((playerId: string, handIndex = 0) => {
			const card = game.hit(playerId, handIndex);
			updateState();
			return card;
		}, [game, updateState]),

		stand: useCallback((playerId: string, handIndex = 0) => {
			game.stand(playerId, handIndex);
			updateState();
		}, [game, updateState]),

		doubleDown: useCallback((playerId: string, handIndex = 0) => {
			const card = game.doubleDown(playerId, handIndex);
			updateState();
			return card;
		}, [game, updateState]),

		split: useCallback((playerId: string, handIndex = 0) => {
			game.split(playerId, handIndex);
			updateState();
		}, [game, updateState]),

		surrender: useCallback((playerId: string, handIndex = 0) => {
			game.surrender(playerId, handIndex);
			updateState();
		}, [game, updateState]),

		finishRound: useCallback(() => {
			const results = game.finishRound();
			setState(prev => ({ ...prev, roundResults: results }));
			updateState();
			return results;
		}, [game, updateState]),

		getPlayerHand: useCallback((playerId: string, handIndex = 0) => {
			return game.getPlayerHandMulti(playerId, handIndex);
		}, [game]),

		getPlayerHandValue: useCallback((playerId: string, handIndex = 0) => {
			return game.getPlayerHandValueMulti(playerId, handIndex);
		}, [game]),
	};

	return { state, actions, game };
}
```

## Texas Hold'em Poker Integration

### Basic Poker Hook

```tsx
import { useState, useCallback, useRef } from 'react';
import { TexasPokerGame, type PokerPlayer, type ShowdownResult } from '@charliewilco/casino-games';

export function useTexasPoker(settings = {}) {
	const gameRef = useRef(new TexasPokerGame(settings));
	const game = gameRef.current;
	
	const [state, setState] = useState({
		players: [] as PokerPlayer[],
		communityCards: [],
		pot: 0,
		gamePhase: 'waiting',
		currentBet: 0,
		showdownResult: null as ShowdownResult | null,
	});

	const updateState = useCallback(() => {
		setState({
			players: game.getPlayers(),
			communityCards: game.getCommunityCards(),
			pot: game.getPot() as number,
			gamePhase: game.getGamePhase(),
			currentBet: game.getCurrentBet(),
			showdownResult: state.showdownResult,
		});
	}, [game, state.showdownResult]);

	const actions = {
		addPlayer: useCallback((id: string, name: string, chips = 1000) => {
			game.addPlayer(id, name, chips);
			updateState();
		}, [game, updateState]),

		startHand: useCallback(() => {
			game.startNewHand();
			setState(prev => ({ ...prev, showdownResult: null }));
			updateState();
		}, [game, updateState]),

		fold: useCallback((playerId: string) => {
			game.fold(playerId);
			updateState();
		}, [game, updateState]),

		check: useCallback((playerId: string) => {
			game.check(playerId);
			updateState();
		}, [game, updateState]),

		call: useCallback((playerId: string) => {
			game.call(playerId);
			updateState();
		}, [game, updateState]),

		bet: useCallback((playerId: string, amount: number) => {
			game.bet(playerId, amount);
			updateState();
		}, [game, updateState]),

		raise: useCallback((playerId: string, amount: number) => {
			game.raise(playerId, amount);
			updateState();
		}, [game, updateState]),

		allIn: useCallback((playerId: string) => {
			game.allIn(playerId);
			updateState();
		}, [game, updateState]),

		getCallAmount: useCallback((playerId: string) => {
			return game.getCallAmount(playerId);
		}, [game]),

		showdown: useCallback(() => {
			const result = game.showdown();
			setState(prev => ({ ...prev, showdownResult: result }));
			updateState();
			return result;
		}, [game, updateState]),
	};

	return { state, actions, game };
}
```

### Poker Table Component

```tsx
import React from 'react';
import { useTexasPoker } from './useTexasPoker';
import { type PlayingCard } from '@charliewilco/casino-games';

export function PokerTable() {
	const { state, actions } = useTexasPoker({
		smallBlind: 25,
		bigBlind: 50,
		maxPlayers: 6,
	});

	const handlePlayerAction = (playerId: string, action: string, amount?: number) => {
		switch (action) {
			case 'fold':
				actions.fold(playerId);
				break;
			case 'check':
				actions.check(playerId);
				break;
			case 'call':
				actions.call(playerId);
				break;
			case 'bet':
				if (amount) actions.bet(playerId, amount);
				break;
			case 'raise':
				if (amount) actions.raise(playerId, amount);
				break;
			case 'all-in':
				actions.allIn(playerId);
				break;
		}
	};

	return (
		<div className="poker-table">
			<div className="community-cards">
				<h3>Community Cards</h3>
				<div className="cards">
					{state.communityCards.map((card: PlayingCard, i: number) => (
						<div key={i} className={`card ${card.suit}`}>
							{card.rank}
						</div>
					))}
				</div>
				<p>Pot: ${state.pot}</p>
				<p>Phase: {state.gamePhase}</p>
			</div>

			<div className="players">
				{state.players.map(player => (
					<PlayerPosition
						key={player.id}
						player={player}
						onAction={(action, amount) => handlePlayerAction(player.id, action, amount)}
						callAmount={actions.getCallAmount(player.id)}
						canAct={state.gamePhase !== 'waiting' && !player.folded}
					/>
				))}
			</div>

			<div className="controls">
				<button 
					onClick={() => actions.startHand()}
					disabled={state.players.length < 2}
				>
					Start Hand
				</button>
			</div>
		</div>
	);
}

function PlayerPosition({ 
	player, 
	onAction, 
	callAmount, 
	canAct 
}: {
	player: any;
	onAction: (action: string, amount?: number) => void;
	callAmount: number;
	canAct: boolean;
}) {
	const [betAmount, setBetAmount] = useState(callAmount);

	return (
		<div className={`player ${player.isDealer ? 'dealer' : ''}`}>
			<h4>{player.name}</h4>
			<p>Chips: ${player.chips}</p>
			<p>Bet: ${player.currentBet}</p>
			
			{canAct && (
				<div className="actions">
					<button onClick={() => onAction('fold')}>Fold</button>
					<button onClick={() => onAction('check')}>Check</button>
					{callAmount > 0 && (
						<button onClick={() => onAction('call')}>
							Call ${callAmount}
						</button>
					)}
					<input
						type="number"
						value={betAmount}
						onChange={(e) => setBetAmount(Number(e.target.value))}
						min={callAmount}
						max={player.chips}
					/>
					<button onClick={() => onAction('bet', betAmount)}>
						Bet
					</button>
					<button onClick={() => onAction('all-in')}>All In</button>
				</div>
			)}
		</div>
	);
}
```

## Roulette Integration

### Roulette Hook

```tsx
import { useState, useCallback, useRef } from 'react';
import { RouletteGame, BetType } from '@charliewilco/casino-games';

export function useRoulette(useAmericanWheel = false) {
	const gameRef = useRef(new RouletteGame(useAmericanWheel));
	const game = gameRef.current;
	
	const [state, setState] = useState({
		players: game.getPlayers(),
		currentBets: [],
		lastSpin: null,
		bettingOpen: true,
	});

	const updateState = useCallback(() => {
		setState(prev => ({
			...prev,
			players: game.getPlayers(),
			currentBets: game.getCurrentBets(),
		}));
	}, [game]);

	const actions = {
		addPlayer: useCallback((id: string, name: string, balance: number) => {
			game.addPlayer(id, name, balance);
			updateState();
		}, [game, updateState]),

		placeBet: useCallback((playerId: string, amount: number, betType: BetType, numbers?: number[]) => {
			game.placeBet(playerId, amount, betType, numbers);
			updateState();
		}, [game, updateState]),

		spin: useCallback(() => {
			setState(prev => ({ ...prev, bettingOpen: false }));
			const result = game.spin();
			setState(prev => ({ 
				...prev, 
				lastSpin: result,
				bettingOpen: true,
			}));
			updateState();
			return result;
		}, [game, updateState]),

		clearBets: useCallback(() => {
			game.clearBets();
			updateState();
		}, [game, updateState]),
	};

	return { state, actions, game };
}
```

## React Native Specific Considerations

### Touch Interactions

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function CardComponent({ card, onPress }: { card: PlayingCard; onPress?: () => void }) {
	const cardColor = card.suit === '♠' || card.suit === '♣' ? '#000' : '#e53e3e';
	
	return (
		<TouchableOpacity style={styles.card} onPress={onPress}>
			<Text style={[styles.cardText, { color: cardColor }]}>
				{card.rank}
			</Text>
			<Text style={[styles.suitText, { color: cardColor }]}>
				{card.suit}
			</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 60,
		height: 80,
		backgroundColor: 'white',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ccc',
		justifyContent: 'center',
		alignItems: 'center',
		margin: 2,
	},
	cardText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	suitText: {
		fontSize: 20,
	},
});
```

### State Persistence

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersistentGame(gameKey: string) {
	const saveGameState = async (gameData: any) => {
		try {
			await AsyncStorage.setItem(gameKey, JSON.stringify(gameData));
		} catch (error) {
			console.error('Failed to save game state:', error);
		}
	};

	const loadGameState = async () => {
		try {
			const savedState = await AsyncStorage.getItem(gameKey);
			return savedState ? JSON.parse(savedState) : null;
		} catch (error) {
			console.error('Failed to load game state:', error);
			return null;
		}
	};

	return { saveGameState, loadGameState };
}
```

## Key Integration Tips

### 1. State Management
- Use React's `useState` and `useCallback` for optimal performance
- Always call game methods in response to user actions
- Update component state after each game action

### 2. Custom Shuffle Functions
The library accepts custom shuffle functions for deterministic behavior:

```tsx
// Custom shuffle for testing or specific behavior
const customShuffle = (array: any[]) => {
	// Your shuffle logic here
	return [...array].reverse(); // Example: reverse instead of random
};

const game = new BlackjackGame(6, { /* options */ });
game.shoe.shuffleFn = customShuffle;
```

### 3. Error Handling
Always wrap game actions in try-catch blocks:

```tsx
const handleHit = useCallback(async (playerId: string) => {
	try {
		const card = game.hit(playerId);
		updateGameState();
		// Optional: animate card dealing
	} catch (error) {
		setError(error.message);
	}
}, [game, updateGameState]);
```

### 4. Performance Optimization
- Use `React.memo` for card components
- Implement virtual scrolling for large player lists
- Debounce rapid user actions

### 5. Accessibility
- Add ARIA labels for screen readers
- Implement keyboard navigation
- Provide audio cues for game events

This library provides a robust foundation for building casino games in React and React Native applications while maintaining separation of concerns between game logic and UI presentation.
