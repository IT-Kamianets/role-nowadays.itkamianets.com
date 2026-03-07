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
        <header class="pt-12 pb-6 flex items-center gap-4 border-b border-[#1e1e30]">
          <button (click)="back()"
            class="w-10 h-10 rounded-xl bg-[#12121e] border border-[#1e1e30] flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors">
            ←
          </button>
          <h1 class="text-2xl font-black text-white uppercase tracking-wide">Нова гра</h1>
        </header>

        <div class="space-y-6 pb-36 pt-6">

          <!-- Mode Selection -->
          <div>
            <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 mb-3">Режим гри</p>
            <div class="space-y-2">
              @for (opt of modeOptions; track opt.value) {
                <button (click)="selectedMode.set(opt.value)"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left"
                  [class]="selectedMode() === opt.value
                    ? 'border-violet-500/60 bg-violet-900/20'
                    : 'bg-[#12121e] border-[#1e1e30] hover:bg-white/[0.06]'">
                  <span class="text-3xl w-10 text-center">{{ opt.icon }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-black uppercase tracking-wide text-white">{{ opt.label }}</p>
                    <p class="text-xs text-white/40 mt-0.5">{{ opt.desc }}</p>
                  </div>
                  @if (selectedMode() === opt.value) {
                    <div class="w-5 h-5 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                      <span class="text-white text-[10px] font-black">✓</span>
                    </div>
                  } @else {
                    <div class="w-5 h-5 rounded-lg border border-white/10 shrink-0"></div>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Player Limit -->
          <div>
            <div class="flex items-baseline justify-between mb-3">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Ліміт гравців</p>
              <span class="text-3xl font-black text-violet-400">{{ playerLimit() }}</span>
            </div>
            <div class="bg-[#12121e] border border-[#1e1e30] rounded-2xl p-4">
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

          <!-- Timer Settings -->
          <div>
            <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 mb-3">Налаштування таймерів</p>
            <div class="bg-[#12121e] border border-[#1e1e30] rounded-2xl p-4 space-y-5">

              <!-- Day duration -->
              <div>
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-sm text-white/70">☀️ Тривалість дня</span>
                  <span class="text-base font-black text-amber-400">{{ dayDuration() }}с</span>
                </div>
                <input type="range" min="30" max="180" step="10"
                  [ngModel]="dayDuration()"
                  (ngModelChange)="dayDuration.set(+$event)"
                  class="w-full accent-amber-500 cursor-pointer">
                <div class="flex justify-between text-xs text-white/25 mt-1">
                  <span>30с</span>
                  <span>180с</span>
                </div>
              </div>

              <!-- Night duration -->
              <div>
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-sm text-white/70">🌙 Тривалість ночі</span>
                  <span class="text-base font-black text-indigo-400">{{ nightDuration() }}с</span>
                </div>
                <input type="range" min="15" max="90" step="5"
                  [ngModel]="nightDuration()"
                  (ngModelChange)="nightDuration.set(+$event)"
                  class="w-full accent-indigo-500 cursor-pointer">
                <div class="flex justify-between text-xs text-white/25 mt-1">
                  <span>15с</span>
                  <span>90с</span>
                </div>
              </div>

              <!-- Voting duration -->
              <div>
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-sm text-white/70">⚖️ Тривалість голосування</span>
                  <span class="text-base font-black text-red-400">{{ votingDuration() }}с</span>
                </div>
                <input type="range" min="15" max="90" step="5"
                  [ngModel]="votingDuration()"
                  (ngModelChange)="votingDuration.set(+$event)"
                  class="w-full accent-red-500 cursor-pointer">
                <div class="flex justify-between text-xs text-white/25 mt-1">
                  <span>15с</span>
                  <span>90с</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Summary -->
          <div class="bg-[#12121e] border border-[#1e1e30] rounded-2xl p-4 space-y-3">
            <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Підсумок</p>
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/50">Режим</span>
              <span class="text-sm font-semibold text-white">{{ modeLabel(selectedMode()) }}</span>
            </div>
            <div class="h-px bg-[#1e1e30]"></div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/50">Макс. гравців</span>
              <span class="text-sm font-semibold text-white">{{ playerLimit() }}</span>
            </div>
            <div class="h-px bg-[#1e1e30]"></div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-white/50">Таймери</span>
              <span class="text-sm font-semibold text-white">День {{ dayDuration() }}с / Ніч {{ nightDuration() }}с / Голос. {{ votingDuration() }}с</span>
            </div>
          </div>

        </div>

        <!-- Create Button (fixed) -->
        <div class="fixed bottom-0 left-0 right-0 px-5 py-5 bg-[#0b0b17]/90 border-t border-[#1e1e30]">
          <div class="max-w-md mx-auto">
            <button (click)="create()" [disabled]="loading()"
              class="w-full bg-violet-600 text-white text-base font-black py-4 rounded-2xl uppercase tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50">
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
  dayDuration = signal(60);
  nightDuration = signal(30);
  votingDuration = signal(30);
  loading = signal(false);

  constructor(private gameService: GameService, private router: Router) {}

  modeLabel(mode: GameMode): string {
    return this.modeOptions.find(o => o.value === mode)?.label ?? mode;
  }

  back() { this.router.navigate(['/home']); }

  create() {
    this.loading.set(true);
    this.gameService.createGame(this.selectedMode(), this.playerLimit()).subscribe({
      next: (game) => {
        if (game?._id) {
          localStorage.setItem('gameSettings_' + game._id, JSON.stringify({
            dayDuration: this.dayDuration(),
            nightDuration: this.nightDuration(),
            votingDuration: this.votingDuration(),
          }));
          this.router.navigate(['/gameplay', game._id]);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
