import { Component, Signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, merge, interval, tap } from 'rxjs';
import {
  scan,
  startWith,
  map,
  switchMap,
  takeUntil,
  takeWhile,
} from 'rxjs/operators';

const simulateResult = () => ({
  showingHands: HANDS_TO_SHOW[Math.floor(Math.random() * HANDS_TO_SHOW.length)],
  target: TARGETS[Math.floor(Math.random() * TARGETS.length)],
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [NgClass],
  styles: `
  
.container {
  display: flex;
}

.countdown {
  font-weight: bold;
  font-size: 24px;
  color: red;
}

.hands {
  display: flex;
  gap: 3;
}

.reset {
  font-size: 20px;
}

.results-container {
  font-size: 24px;
}

.hand-picker,
.target-picker {
  display: flex;
  gap: 16px;
  font-size: 24px;
  display: flex;
  align-items: center;
}

button {
  padding: 16px;
  font-size: 24px;
  cursor: pointer;
  border-radius: 8px;
}

.hands {
  font-size: 48px;
}

.winner {
  font-weight: bold;
}

.winner--player {
  color: green;
}

.winner--cpu {
  color: red;
}

.score {
  font-size: 24px;
  color: blue;
}
  `,
})
export class AppComponent {
  private state: Signal<GameState>;
  actions: GameActions;

  constructor() {
    const { state$, actions } = RxShiWuGame({ simulateResult });
    this.state = toSignal(state$, { initialValue: initialState });
    this.actions = actions;
  }

  TARGETS = TARGETS;
  HANDS_TO_SHOW = HANDS_TO_SHOW;

  promptTargetPicking = computed(
    () =>
      this.playerTarget() === null ||
      this.playerShowingHands() !== null ||
      this.countdown() === 0
  );

  promptChooseHands = computed(() => !this.promptTargetPicking());

  playerTarget = computed(() => this.state().player.target);
  playerShowingHands = computed(() => this.state().player.showingHands);
  playerLeftHandOpen = computed(() => (this.playerShowingHands() || 0) > 0);
  playerRightHandOpen = computed(() => this.playerShowingHands() === 2);
  playerScore = computed(() => this.state().player.score);

  cpuTarget = computed(() => this.state().cpu.target);
  cpuShowingHands = computed(() => this.state().cpu.showingHands);
  cpuLeftHandOpen = computed(() => (this.cpuShowingHands() || 0) > 0);
  cpuRightHandOpen = computed(() => this.cpuShowingHands() === 2);
  cpuScore = computed(() => this.state().cpu.score);

  countdown = computed(() => this.state().countdown);
  result = computed(() =>
    getSum(this.playerShowingHands(), this.cpuShowingHands())
  );
  winner = computed(() => {
    const { cpu, player } = this.state();

    const result = getSum(player.showingHands, cpu.showingHands);
    return getWinner(result, player.target, cpu.target);
  });
}

// TYPES & CONSTANTS

export type Target = 0 | 5 | 10 | 15 | 20 | null;
export const TARGETS: Target[] = [0, 5, 10, 15, 20];

type HandsToShow = 0 | 1 | 2 | null;
export const HANDS_TO_SHOW: HandsToShow[] = [0, 1, 2];

export type Result = {
  showingHands: HandsToShow;
  target: Target;
};

export type GameState = {
  player: Result & { score: number };
  cpu: Result & { score: number };
  countdown: number | null;
};

export type GameActions = {
  ['PICK_TARGET']: Subject<Target>;
  ['SHOW_HANDS']: Subject<HandsToShow>;
  ['RESET_GAME']: Subject<void>;
};

export const initialState: GameState = {
  player: {
    showingHands: null,
    target: null,
    score: 0,
  },
  cpu: {
    showingHands: null,
    target: null,
    score: 0,
  },
  countdown: null,
};

// STATE MANAGEMENT
export const RxShiWuGame = ({
  simulateResult,
}: {
  simulateResult: () => Result;
}) => {
  const actions = {
    ['PICK_TARGET']: new Subject<Target>(),
    ['SHOW_HANDS']: new Subject<HandsToShow>(),
    ['RESET_GAME']: new Subject<void>(),
  };

  // Mapping all the Subject Events to an action to be received by reducers later
  const actions$ = Object.entries(actions).map(([key, subject]) =>
    (subject as Subject<Target | HandsToShow | undefined>).pipe(
      map((payload) => {
        if (key === 'SHOW_HANDS') {
          // When hands are shown we will generate a result for the cpu
          // and add it to the payload
          return {
            type: key,
            payload: {
              player: payload as HandsToShow,
              cpu: simulateResult(),
            },
          };
        }

        return { type: key, payload };
      })
    )
  );

  // Countdown when user has picked a target and prompted to choose how many hands to show
  const COUNT_DOWN_SECONDS = 3;

  const countdown$ = actions.PICK_TARGET.pipe(
    switchMap(() =>
      interval(1000).pipe(
        map((value) => ({
          type: 'COUNTDOWN_TICK',
          payload: COUNT_DOWN_SECONDS - value,
        })),
        takeWhile(({ payload: countdown }) => countdown >= 0),
        takeUntil(actions.SHOW_HANDS)
      )
    )
  );

  // State observable reacting to imcoming actions
  const state$ = merge(...actions$, countdown$).pipe(
    scan((state, { type, payload }) => {
      switch (type) {
        case 'PICK_TARGET':
          return {
            ...state,
            player: {
              ...state.player,
              showingHands: null,
              target: payload as Target,
            },
            cpu: {
              ...state.cpu,
              showingHands: null,
              target: null,
            },
            countdown: COUNT_DOWN_SECONDS,
          };
        case 'SHOW_HANDS':
          const { player: playerHands, cpu } = payload as {
            player: HandsToShow;
            cpu: Result;
          };

          const result = getSum(playerHands, cpu.showingHands);
          const winner = getWinner(result, state.player.target, cpu.target);

          return {
            ...state,
            player: {
              ...state.player,
              showingHands: playerHands,
              score:
                winner === 'PLAYER'
                  ? state.player.score + 1
                  : state.player.score,
            },
            cpu: {
              ...cpu,
              score: winner === 'CPU' ? state.cpu.score + 1 : state.cpu.score,
            },
            countdown: null,
          };
        case 'COUNTDOWN_TICK':
          return {
            ...state,
            countdown: payload as number,
          };
        case 'RESET_GAME':
          return initialState;
      }
      return state;
    }, initialState),
    startWith(initialState),
    tap((state) => {
      console.log(state);
    })
  );

  return { state$, actions };
};

// HELPER FUNCTIONS
export const getSum = (playerHands: HandsToShow, cpuHands: HandsToShow) => {
  if (playerHands === null || cpuHands === null) return null;

  const result = ((playerHands as number) * 5 +
    (cpuHands as number) * 5) as Target;

  return result;
};

export const getWinner = (
  result: Target,
  playerTarget: Target,
  cpuTarget: Target
) => {
  return cpuTarget === playerTarget ||
    (cpuTarget !== result && playerTarget !== result)
    ? null
    : playerTarget === result
    ? 'PLAYER'
    : 'CPU';
};
