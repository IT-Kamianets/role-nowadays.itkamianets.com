import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden">
      <!-- Mode header -->
      <div class="px-4 py-3 flex items-center justify-between" [class]="modeHeaderBg[game.mode]">
        <div class="flex items-center gap-2">
          <span class="text-base">{{ modeIcon[game.mode] }}</span>
          <span class="font-black uppercase tracking-wide text-sm text-white">{{ modeLabels[game.mode] }}</span>
        </div>
        <div class="flex items-center gap-2">
          @if (game.status === 'lobby') {
            <span class="text-[10px] font-bold tabular-nums"
              [class]="lobbyMinutesLeft <= 5 ? 'text-red-200' : 'text-white/50'">
              ⏱ {{ lobbyMinutesLeft }}хв
            </span>
          }
          <span class="bg-black/25 text-white/80 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
            {{ game.status === 'lobby' ? 'Лобі' : 'Триває' }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <div class="px-4 pt-3 pb-4 space-y-3">
        <!-- Players + progress bar -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30">Гравці</span>
            <span class="text-xs font-bold text-amber-100/50">{{ game.players.length }} / {{ game.maxPlayers }}</span>
          </div>
          <div class="h-1.5 bg-black/30 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" [class]="modeProgressBar[game.mode]"
              [style.width]="(game.players.length / game.maxPlayers * 100) + '%'">
            </div>
          </div>
        </div>

        <!-- Join button -->
        @if (game.status === 'lobby' && game.players.length < game.maxPlayers) {
          <button (click)="join.emit(game)"
            class="w-full py-3 rounded-xl font-black text-sm uppercase text-white transition-all active:scale-95"
            [class]="modeButtonBg[game.mode]">
            Приєднатись →
          </button>
        } @else {
          <div class="w-full py-3 rounded-xl text-center text-xs font-bold uppercase text-red-400/50 bg-red-950/20 border border-red-900/30">
            🔒 Заповнена ({{ game.players.length }}/{{ game.maxPlayers }})
          </div>
        }
      </div>
    </div>
  `,
})
export class GameCardComponent {
  @Input({ required: true }) game!: Game;
  @Output() join = new EventEmitter<Game>();

  readonly modeLabels: Record<string, string> = {
    Classic:   'Класик',
    Extended:  'Розширена',
    Custom:    'Власна',
    Knight:    'Лицар',
    TrueFace:  'True Face',
  };

  readonly modeIcon: Record<string, string> = {
    Classic:  '⚔️',
    Extended: '🎭',
    Custom:   '⚙️',
    Knight:   '🛡️',
    TrueFace: '🔮',
  };

  readonly modeHeaderBg: Record<string, string> = {
    Classic:  'bg-amber-700',
    Extended: 'bg-violet-600',
    Custom:   'bg-teal-600',
    Knight:   'bg-sky-700',
    TrueFace: 'bg-purple-700',
  };

  readonly modeProgressBar: Record<string, string> = {
    Classic:  'bg-amber-600',
    Extended: 'bg-violet-500',
    Custom:   'bg-teal-500',
    Knight:   'bg-sky-500',
    TrueFace: 'bg-purple-500',
  };

  readonly modeButtonBg: Record<string, string> = {
    Classic:  'bg-amber-700 hover:bg-amber-600',
    Extended: 'bg-violet-600 hover:bg-violet-500',
    Custom:   'bg-teal-600 hover:bg-teal-500',
    Knight:   'bg-sky-700 hover:bg-sky-600',
    TrueFace: 'bg-purple-700 hover:bg-purple-600',
  };

  get lobbyMinutesLeft(): number {
    const created = parseInt(this.game._id.substring(0, 8), 16) * 1000;
    return Math.max(0, Math.ceil((created + 20 * 60 * 1000 - Date.now()) / 60000));
  }
}
