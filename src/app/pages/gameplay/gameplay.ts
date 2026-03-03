import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MockGameService } from '../../services/mock-game.service';
import { PlayerListComponent } from '../../components/player-list/player-list';
import { PhaseBannerComponent } from '../../components/phase-banner/phase-banner';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [CommonModule, PlayerListComponent, PhaseBannerComponent],
  template: `
    <div class="min-h-screen bg-[#0b0b17]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 px-5 pt-12 pb-4 bg-[#0b0b17]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center gap-3">
          <button (click)="back()"
            class="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors shrink-0">
            ←
          </button>
          <h1 class="text-lg font-black text-white flex-1 tracking-tight">Ігрова кімната</h1>
          <div class="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span class="text-sm font-mono font-bold text-white">{{ formatTime(timer()) }}</span>
          </div>
        </header>

        <main class="px-5 pt-5 space-y-5 pb-28">

          <!-- Phase Banner -->
          <app-phase-banner [phase]="gameService.currentPhase" />

          <!-- Role Card -->
          <div class="relative overflow-hidden rounded-2xl p-5 border"
            [class]="roleCardBg(gameService.myRole.team)">
            <!-- Decorative glow -->
            <div class="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-25"
              [class]="roleGlowColor(gameService.myRole.team)"></div>

            <p class="text-[10px] uppercase tracking-[0.2em] mb-3" [class]="teamAccent(gameService.myRole.team)">
              Ваша роль
            </p>
            <div class="flex items-start gap-4">
              <div class="text-4xl shrink-0 mt-0.5">{{ roleIcon(gameService.myRole.team) }}</div>
              <div class="flex-1 min-w-0">
                <h2 class="text-2xl font-black text-white mb-1.5 leading-tight">{{ gameService.myRole.name }}</h2>
                <span class="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold mb-2 border"
                  [class]="teamBadge(gameService.myRole.team)">
                  {{ teamLabel(gameService.myRole.team) }}
                </span>
                <p class="text-sm text-white/60 leading-relaxed">{{ gameService.myRole.description }}</p>
              </div>
            </div>
          </div>

          <!-- Players -->
          <div>
            <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">
              Гравці · {{ aliveCount() }} з {{ gameService.players.length }}
            </p>
            <app-player-list [players]="gameService.players" />
          </div>

          <!-- Chat -->
          <div>
            <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Обговорення</p>
            <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
              @for (msg of gameService.chatMessages; track msg.author + msg.text) {
                <div class="flex gap-3">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                    {{ msg.author[0] }}
                  </div>
                  <div>
                    <p class="text-xs font-bold text-violet-400 mb-0.5">{{ msg.author }}</p>
                    <p class="text-sm text-white/70 leading-relaxed">{{ msg.text }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

        </main>

        <!-- Action Bar -->
        <div class="fixed bottom-0 left-0 right-0 px-5 py-4 bg-[#0b0b17]/90 backdrop-blur-xl border-t border-white/[0.06]">
          <div class="max-w-md mx-auto flex gap-3">
            <button class="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-900/30 active:scale-[0.97] transition-transform text-base">
              Голосувати
            </button>
            <button class="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 font-bold py-4 rounded-2xl active:scale-[0.97] transition-transform text-base hover:bg-white/10">
              Пропустити
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class GameplayComponent implements OnInit, OnDestroy {
  timer = signal(120);
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(public gameService: MockGameService, private router: Router) {}

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.timer.update(t => (t > 0 ? t - 1 : 0));
    }, 1000);
  }

  ngOnDestroy() { clearInterval(this.intervalId); }

  back() { this.router.navigate(['/home']); }

  formatTime(s: number): string {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  aliveCount(): number {
    return this.gameService.players.filter(p => p.isAlive).length;
  }

  teamLabel(team: string): string {
    const map: Record<string, string> = { city: 'Місто', mafia: 'Мафія', neutral: 'Нейтрал' };
    return map[team] ?? team;
  }

  roleIcon(team: string): string {
    const map: Record<string, string> = { city: '🛡️', mafia: '🔪', neutral: '🎭' };
    return map[team] ?? '❓';
  }

  teamAccent(team: string): string {
    const map: Record<string, string> = { city: 'text-blue-400', mafia: 'text-red-400', neutral: 'text-gray-400' };
    return map[team] ?? 'text-gray-400';
  }

  teamBadge(team: string): string {
    const map: Record<string, string> = {
      city:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
      mafia:   'bg-red-500/15 text-red-300 border-red-500/30',
      neutral: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    };
    return map[team] ?? 'bg-gray-500/15 text-gray-300 border-gray-500/30';
  }

  roleCardBg(team: string): string {
    const map: Record<string, string> = {
      city:    'bg-gradient-to-br from-blue-950/70 to-indigo-950/70 border-blue-800/30',
      mafia:   'bg-gradient-to-br from-red-950/70 to-rose-950/70 border-red-800/30',
      neutral: 'bg-gradient-to-br from-gray-900/70 to-slate-900/70 border-gray-700/30',
    };
    return map[team] ?? 'bg-gradient-to-br from-gray-900/70 to-slate-900/70 border-gray-700/30';
  }

  roleGlowColor(team: string): string {
    const map: Record<string, string> = { city: 'bg-blue-500', mafia: 'bg-red-500', neutral: 'bg-gray-500' };
    return map[team] ?? 'bg-gray-500';
  }
}
