import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
      <!-- Left mode accent strip -->
      <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" [class]="modeAccent[game.mode]"></div>

      <div class="pl-5 pr-4 py-4 flex items-center gap-3">
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-1.5 mb-2">
            <span class="text-sm font-bold text-white">{{ modeLabels[game.mode] }}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
              [class]="game.status === 'lobby'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'">
              {{ game.status === 'lobby' ? 'Відкрита' : 'Триває' }}
            </span>
          </div>
          <!-- Player count + progress bar -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-white/40 shrink-0">{{ game.players.length }} / {{ game.maxPlayers }}</span>
            <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                [class]="game.status === 'lobby'
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'"
                [style.width]="(game.players.length / game.maxPlayers * 100) + '%'">
              </div>
            </div>
          </div>
        </div>

        <!-- Action -->
        @if (game.status === 'lobby' && game.players.length < game.maxPlayers) {
          <button (click)="join.emit(game)"
            class="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-violet-900/30 transition-all active:scale-95">
            Приєднатись
          </button>
        } @else {
          <span class="shrink-0 text-white/20 text-xs">Заповнена</span>
        }
      </div>
    </div>
  `,
})
export class GameCardComponent {
  @Input({ required: true }) game!: Game;
  @Output() join = new EventEmitter<Game>();

  readonly modeLabels: Record<string, string> = {
    Classic: 'Класик',
    Extended: 'Розширена',
    Custom: 'Власна',
  };

  readonly modeAccent: Record<string, string> = {
    Classic:  'bg-blue-500',
    Extended: 'bg-violet-500',
    Custom:   'bg-emerald-500',
  };
}
