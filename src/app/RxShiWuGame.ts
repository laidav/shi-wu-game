import { Subject, merge, interval, tap } from 'rxjs';
import {
  scan,
  startWith,
  map,
  switchMap,
  takeUntil,
  takeWhile,
} from 'rxjs/operators';

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
  ['RESET_GAME']: Subject<undefined>;
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

export const RxShiWuGame = ({
  simulateResult,
}: {
  simulateResult: () => Result;
}) => {
  const actions = {
    ['PICK_TARGET']: new Subject<Target>(),
    ['SHOW_HANDS']: new Subject<HandsToShow>(),
    ['RESET_GAME']: new Subject<undefined>(),
  };

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
            countdown: COUNT_DOWN_SECONDS,
          };
        case 'SHOW_HANDS':
          const { player: playerHands, cpu } = payload as {
            player: HandsToShow;
            cpu: Result;
          };

          const result = ((playerHands as number) +
            (cpu.showingHands as number)) as Target;

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
