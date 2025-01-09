import { Subject, merge, Observable } from 'rxjs';
import { scan, startWith, map } from 'rxjs/operators';

type Target = 0 | 5 | 10 | 20 | null;
type HandsToShow = 0 | 1 | 2 | null;

type GameState = {
  player: {
    showingHands: HandsToShow;
    target: Target;
  };
  cpu: {
    showingHands: HandsToShow;
    target: Target;
  };
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
  numberService,
}: {
  numberService: () => number;
}) => {
  const actions = {
    ['PICK_TARGET']: new Subject<Target>(),
    ['SHOW_HANDS']: new Subject<HandsToShow>(),
    ['RESET_GAME']: new Subject<undefined>(),
  };

  const actions$ = Object.entries(actions).map(([key, subject]) =>
    (subject as Subject<Target | HandsToShow | undefined>).pipe(
      map((payload) => ({ type: key, payload }))
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
          return {
            ...state,
            player: {
              ...state.player,
              showingHands: payload as HandsToShow,
            },
          };
        case 'RESET_GAME':
          return initialState;
      }
      return state;
    }, initialState),
    startWith(initialState)
  );
};
