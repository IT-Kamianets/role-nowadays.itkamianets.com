import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';

type GameMode = 'Classic' | 'Extended' | 'Custom';

interface ModeOption {
  value: GameMode;
  label: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-create-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#0b0b17]">
      <div class="max-w-md mx-auto px-5">

        <!-- Header -->
        <header class="pt-12 pb-6 flex items-center gap-4">
          <button (click)="back()"
            class="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors">
            ←
          </button>
          <h1 class="text-2xl font-black text-white tracking-tight">Нова гра</h1>
        </header>

        <div class="space-y-6 pb-36">

          <!-- Mode Selection -->
          <div>
            <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Режим гри</p>
            <div class="space-y-2">
              @for (opt of modeOptions; track opt.value) {
                <button (click)="selectedMode.set(opt.value)"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left"
                  [class]="selectedMode() === opt.value
                    ? 'bg-violet-600/15 border-violet-500/40 shadow-lg shadow-violet-900/20'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'">
                  <span class="text-2xl w-10 text-center">{{ opt.icon }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-white">{{ opt.label }}</p>
                    <p class="text-xs text-white/40 mt-0.5">{{ opt.desc }}</p>
                  </div>
                  @if (selectedMode() === opt.value) {
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                      <span class="text-white text-[10px] font-black">✓</span>
                    </div>
                  } @else {
                    <div class="w-5 h-5 rounded-full border border-white/10 shrink-0"></div>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Player Limit -->
          <div>
            <div class="flex items-baseline justify-between mb-3">
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em]">Ліміт гравців</p>
              <span class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                {{ playerLimit() }}
              </span>
            </div>
            <div class="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
              <input type="range" min="4" max="16"
                [ngModel]="playerLimit()"
                (ngModelChange)="playerLimit.set($event)"
                class="w-full accent-violet-500 cursor-pointer">
              <div class="flex justify-between text-xs text-white/25 mt-2">
                <span>4 мін</span>
                <span>16 макс</span>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <p class="text-[10px] text-white/30 uppercase tracking-[0.2em]">Підсумок</p>
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/50">Режим</span>
              <span class="text-sm font-semibold text-white">{{ modeLabel(selectedMode()) }}</span>
            </div>
            <div class="h-px bg-white/[0.06]"></div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/50">Макс. гравців</span>
              <span class="text-sm font-semibold text-white">{{ playerLimit() }}</span>
            </div>
          </div>

        </div>

        <!-- Create Button (fixed) -->
        <div class="fixed bottom-0 left-0 right-0 px-5 py-5 bg-[#0b0b17]/90 backdrop-blur-xl border-t border-white/[0.06]">
          <div class="max-w-md mx-auto">
            <button (click)="create()" [disabled]="loading()"
              class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-base font-black py-4 rounded-2xl shadow-xl shadow-violet-900/40 transition-transform active:scale-[0.98] disabled:opacity-50">
              {{ loading() ? 'Створення...' : 'Створити гру' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class CreateGameComponent {
  modeOptions: ModeOption[] = [
    { value: 'Classic',  label: 'Класик',    icon: '⚔️', desc: 'Класична Мафія · мафія, детектив, лікар · від 5 гравців' },
    { value: 'Extended', label: 'Розширена', icon: '🎭', desc: 'Більше ролей та складніша механіка' },
    { value: 'Custom',   label: 'Власна',    icon: '⚙️', desc: 'Налаштовуй ролі повністю вручну' },
  ];

  selectedMode = signal<GameMode>('Classic');
  playerLimit = signal(8);
  loading = signal(false);

  constructor(private gameService: GameService, private router: Router) {}

  modeLabel(mode: GameMode): string {
    return this.modeOptions.find(o => o.value === mode)?.label ?? mode;
  }

  back() { this.router.navigate(['/home']); }

  create() {
    this.loading.set(true);
    this.gameService.createGame(this.selectedMode(), this.playerLimit()).subscribe({
      next: (game) => this.router.navigate(['/gameplay', game._id]),
      error: () => this.loading.set(false),
    });
  }
}
