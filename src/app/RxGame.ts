import { Subject, merge, Observable } from 'rxjs';
import { scan, startWith, map } from 'rxjs/operators';

type Target = 0 | 5 | 10 | 20 | null;
type HandsToShow = 0 | 1 | 2 | null;
type Result = {
  showingHands: HandsToShow;
  target: Target;
};

type GameState = {
  player: Result;
  cpu: Result;
  score: number;
  timer: number | null;
};

const initialState: GameState = {
  player: {
    showingHands: null,
    target: null,
  },
  cpu: {
    showingHands: null,
    target: null,
  },
  score: 0,
  timer: null,
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

  const state$ = merge(...actions$).pipe(
    scan((state, { type, payload }) => {
      switch (type) {
        case 'PICK_TARGET':
          return {
            ...state,
            player: {
              showingHands: null,
              target: payload as Target,
            },
          };
        case 'SHOW_HANDS':
          const { player: playerHands, cpu } = payload as {
            player: HandsToShow;
            cpu: Result;
          };
          return {
            ...state,
            player: {
              ...state.player,
              showingHands: playerHands,
            },
            cpu,
          };
        case 'RESET_GAME':
          return initialState;
      }
      return state;
    }, initialState),
    startWith(initialState)
  );
};
