import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription, EMPTY } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { GameCardComponent } from '../../components/game-card/game-card';
import { Game } from '../../models/game.model';

type ModeFilter = string | null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, GameCardComponent],
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
            <div class="flex items-center gap-2 shrink-0">
              <!-- Current nickname chip -->
              <button (click)="openNicknameModal()"
                class="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-2 transition-colors hover:bg-white/10">
                <span class="text-xs text-white/60">👤</span>
                <span class="text-xs font-semibold text-white/80 max-w-[80px] truncate">{{ nickname() }}</span>
              </button>
              <button (click)="createGame()"
                class="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-violet-900/40 transition-transform active:scale-95">
                + Створити
              </button>
            </div>
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

    <!-- Nickname modal -->
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
        (click)="onBackdropClick($event)">
        <div class="w-full max-w-md bg-[#12121f] border border-white/[0.08] rounded-t-3xl p-6 pb-10 space-y-5"
          (click)="$event.stopPropagation()">
          <div class="w-10 h-1 bg-white/20 rounded-full mx-auto"></div>
          <div>
            <h2 class="text-xl font-black text-white mb-1">Ваш нікнейм</h2>
            <p class="text-sm text-white/40">Його побачать інші гравці у грі</p>
          </div>
          <input #nicknameInput
            [(ngModel)]="nicknameValue"
            (keyup.enter)="saveNickname()"
            placeholder="Введіть нікнейм..."
            maxlength="30"
            class="w-full bg-white/[0.06] border border-white/[0.10] rounded-2xl px-4 py-3.5 text-white text-base placeholder-white/25 outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all" />
          <button (click)="saveNickname()"
            [disabled]="nicknameValue.trim().length < 2 || tokenLoading()"
            class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-violet-900/30 disabled:opacity-40 transition-all active:scale-[0.98]">
            {{ tokenLoading() ? 'Підключення...' : 'Зберегти' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  activeFilter = signal<ModeFilter>(null);
  allGames = signal<Game[]>([]);
  showModal = signal(false);
  nickname = signal('');
  tokenLoading = signal(false);
  nicknameValue = '';

  filterTabs: { label: string; value: ModeFilter }[] = [
    { label: 'Всі',       value: null },
    { label: 'Класик',    value: 'Classic' },
    { label: 'Розширена', value: 'Extended' },
    { label: 'Власна',    value: 'Custom' },
  ];

  filteredGames = computed(() => {
    const filter = this.activeFilter();
    const games = this.allGames().filter(g => g.status === 'lobby');
    return filter ? games.filter(g => g.mode === filter) : games;
  });

  private pollSub?: Subscription;

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit() {
    const saved = this.gameService.getNickname();
    if (saved && this.gameService.isAuthenticated()) {
      this.nickname.set(saved);
      this.startPolling();
    } else {
      this.nicknameValue = saved;
      this.showModal.set(true);
    }
  }

  private startPolling() {
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.gameService.getGames().pipe(catchError(() => EMPTY))),
    ).subscribe(games => {
      if (!Array.isArray(games)) return;
      this.allGames.set(games);
    });
  }

  ngOnDestroy() { this.pollSub?.unsubscribe(); }

  setFilter(mode: ModeFilter) { this.activeFilter.set(mode); }

  openNicknameModal() {
    this.nicknameValue = this.nickname();
    this.showModal.set(true);
  }

  saveNickname() {
    const name = this.nicknameValue.trim();
    if (name.length < 2) return;
    this.tokenLoading.set(true);
    this.gameService.setNickname(name);
    this.nickname.set(name);
    this.gameService.initToken(name).subscribe({
      next: () => {
        this.tokenLoading.set(false);
        this.showModal.set(false);
        if (!this.pollSub) this.startPolling();
      },
      error: () => {
        this.tokenLoading.set(false);
        this.nickname.set('');
      },
    });
  }

  onBackdropClick(e: MouseEvent) {
    // Allow closing only if nickname already set
    if (this.nickname()) this.showModal.set(false);
  }

  createGame() {
    if (!this.nickname()) { this.showModal.set(true); return; }
    this.router.navigate(['/create']);
  }

  joinGame(game: Game) {
    if (!this.nickname()) { this.showModal.set(true); return; }
    this.gameService.joinGame(game._id).subscribe(result => {
      if (result !== false) this.router.navigate(['/gameplay', game._id]);
    });
  }
}
