import { Component, OnInit, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import {
  GameState,
  GameActions,
  RxShiWuGame,
  HANDS_TO_SHOW,
  TARGETS,
  initialState,
} from './RxShiWuGame';

const simulateResult = () => ({
  showingHands: HANDS_TO_SHOW[Math.floor(Math.random() * HANDS_TO_SHOW.length)],
  target: TARGETS[Math.floor(Math.random() * TARGETS.length)],
});

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private state!: Signal<GameState>;

  actions!: GameActions;
  ngOnInit() {
    const { state$, actions } = RxShiWuGame({ simulateResult });
    this.state = toSignal(state$, { initialValue: initialState });
    this.actions = actions;
  }
}
