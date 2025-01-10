import { Component, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  GameState,
  GameActions,
  RxShiWuGame,
  HANDS_TO_SHOW,
  TARGETS,
  initialState,
  getWinner,
  Target,
  getSum,
} from './RxShiWuGame';

const simulateResult = () => ({
  showingHands: HANDS_TO_SHOW[Math.floor(Math.random() * HANDS_TO_SHOW.length)],
  target: TARGETS[Math.floor(Math.random() * TARGETS.length)],
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private state!: Signal<GameState>;
  actions!: GameActions;

  TARGETS = TARGETS;
  HANDS_TO_SHOW = HANDS_TO_SHOW;

  playerTarget = computed(() => this.state().player.target);
  playerShowingHands = computed(() => this.state().cpu.showingHands);
  playerLeftHandOpen = computed(() => (this.playerShowingHands() || 0) > 0);
  playerRightHandOpen = computed(() => this.playerShowingHands() === 2);

  cpuTarget = computed(() => this.state().player.target);
  cpuShowingHands = computed(() => this.state().cpu.showingHands);
  cpuLeftHandOpen = computed(() => (this.cpuShowingHands() || 0) > 0);
  cpuRightHandOpen = computed(() => this.cpuShowingHands() === 2);

  countdown = computed(() => this.state().countdown);
  winner = computed(() => {
    const { cpu, player } = this.state();

    const result = getSum(player.showingHands, cpu.showingHands);
    return getWinner(result, player.target, cpu.target);
  });

  constructor() {
    const { state$, actions } = RxShiWuGame({ simulateResult });
    this.state = toSignal(state$, { initialValue: initialState });
    this.actions = actions;
  }
}
