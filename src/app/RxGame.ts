import { Subject, merge, interval } from 'rxjs';
import {
  scan,
  startWith,
  map,
  switchMap,
  takeUntil,
  takeWhile,
} from 'rxjs/operators';

type Target = 0 | 5 | 10 | 20 | null;
type HandsToShow = 0 | 1 | 2 | null;
type Result = {
  showingHands: HandsToShow;
  target: Target;
  score: number;
};

type GameState = {
  player: Result;
  cpu: Result;
  countdown: number | null;
};

const initialState: GameState = {
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
          };
        case 'SHOW_HANDS':
          const { player: playerHands, cpu } = payload as {
            player: HandsToShow;
            cpu: Result;
          };

          const totalSum =
            (playerHands as number) + (cpu.showingHands as number);

          const winner =
            cpu.target === state.player.target ||
            (cpu.target !== totalSum && state.player.target !== totalSum)
              ? null
              : state.player.target === totalSum
              ? 'player'
              : 'cpu';

          return {
            ...state,
            player: {
              ...state.player,
              showingHands: playerHands,
              score:
                winner === 'player'
                  ? state.player.score + 1
                  : state.player.score,
            },
            cpu: {
              ...cpu,
              score: winner === 'cpu' ? state.cpu.score + 1 : state.cpu.score,
            },
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
    startWith(initialState)
  );

  return { state$, actions };
};
