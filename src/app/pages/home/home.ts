import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { GameCardComponent } from '../../components/game-card/game-card';
import { Game } from '../../models/game.model';

type ModeFilter = string | null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, GameCardComponent],
  template: `
    <div class="min-h-screen bg-[#0b0b17]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 px-5 pt-12 pb-4 bg-[#0b0b17]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">Ласкаво просимо</p>
              <h1 class="text-3xl font-black tracking-tight leading-none">
                <span class="text-white">Role </span>
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Nowadays</span>
              </h1>
            </div>
            <button (click)="createGame()"
              class="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-violet-900/40 transition-transform active:scale-95">
              + Створити
            </button>
          </div>
        </header>

        <!-- Filter Tabs -->
        <div class="px-5 py-4 flex gap-2 overflow-x-auto no-scrollbar">
          @for (tab of filterTabs; track tab.value) {
            <button (click)="setFilter(tab.value)"
              class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all"
              [class]="activeFilter() === tab.value
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30'
                : 'bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/10'">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Game List -->
        <main class="px-5 space-y-3 pb-12">
          @if (filteredGames().length === 0) {
            <div class="text-center text-white/25 py-20 text-sm">Ігор не знайдено</div>
          }
          @for (game of filteredGames(); track game._id) {
            <app-game-card [game]="game" (join)="joinGame($event)" />
          }
        </main>

      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  activeFilter = signal<ModeFilter>(null);
  allGames = signal<Game[]>([]);

  filterTabs: { label: string; value: ModeFilter }[] = [
    { label: 'Всі',      value: null },
    { label: 'Класик',   value: 'Classic' },
    { label: 'Розширена',value: 'Extended' },
    { label: 'Власна',   value: 'Custom' },
  ];

  filteredGames = computed(() => {
    const filter = this.activeFilter();
    const games = this.allGames().filter(g => g.status === 'lobby');
    return filter ? games.filter(g => g.mode === filter) : games;
  });

  private pollSub?: Subscription;

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit() {
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.gameService.getGames()),
    ).subscribe(games => this.allGames.set(games));
  }

  ngOnDestroy() { this.pollSub?.unsubscribe(); }

  setFilter(mode: ModeFilter) { this.activeFilter.set(mode); }
  createGame() { this.router.navigate(['/create']); }

  joinGame(game: Game) {
    this.gameService.joinGame(game._id).subscribe(() => {
      this.router.navigate(['/gameplay', game._id]);
    });
  }
}
