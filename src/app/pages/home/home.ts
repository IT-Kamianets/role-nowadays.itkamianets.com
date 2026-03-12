import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription, of } from 'rxjs';
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
    <div class="min-h-screen bg-[#0d0905]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 px-5 pt-10 pb-4 bg-[#0d0905]/95 border-b border-[#2d1f10]">
          <div class="flex items-center justify-between gap-3">

            <!-- Logo -->
            <div class="flex items-center gap-3 min-w-0">
              <img src="/mafia-card.jpg" alt="Role Nowadays"
                class="w-10 h-[52px] object-cover object-top rounded-lg border border-amber-900/50 shadow-md shadow-black/60 shrink-0">
              <div class="min-w-0">
                <p class="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-700/60 mb-0.5">Соціальна гра</p>
                <h1 class="text-2xl font-black tracking-tight leading-none">
                  <span class="text-amber-100">Role </span>
                  <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">Nowadays</span>
                </h1>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button (click)="openNicknameModal()"
                class="flex items-center gap-1.5 bg-[#1a110a] border border-[#2d1f10] rounded-xl px-3 py-2 transition-colors hover:bg-amber-900/20">
                <span class="text-xs">👤</span>
                <span class="text-xs font-semibold text-amber-100/70 max-w-[70px] truncate">{{ nickname() }}</span>
              </button>
              <button (click)="createGame()"
                class="bg-amber-700 hover:bg-amber-600 text-amber-50 text-sm font-black px-4 py-2.5 rounded-2xl transition-all active:scale-95 uppercase tracking-wide">
                + Створити
              </button>
            </div>

          </div>
        </header>

        <!-- Filter Tabs -->
        <div class="px-5 py-4 flex gap-2 overflow-x-auto no-scrollbar">
          @for (tab of filterTabs; track tab.value) {
            <button (click)="setFilter(tab.value)"
              class="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all"
              [class]="activeFilter() === tab.value
                ? 'bg-amber-700 text-amber-50'
                : 'bg-[#1a110a] text-amber-100/35 border border-[#2d1f10] hover:bg-amber-900/20 hover:text-amber-100/60'">
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Game List -->
        <main class="px-5 space-y-4 pb-6">
          @if (loadError()) {
            <div class="text-center py-10 space-y-2">
              <p class="text-red-400/70 text-sm">Помилка завантаження ігор</p>
              <button (click)="retryLoad()" class="text-xs text-amber-100/40 hover:text-amber-100/60 underline">Спробувати знову</button>
            </div>
          } @else if (filteredGames().length === 0) {
            <div class="text-center text-amber-100/20 py-20 text-sm">Ігор не знайдено</div>
          }
          @for (game of filteredGames(); track game._id) {
            <app-game-card [game]="game" (join)="joinGame($event)" />
          }
        </main>

        <footer class="px-5 py-6 border-t border-[#2d1f10] text-center space-y-3">
          <button (click)="goFaq()"
            class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-100/35 hover:text-amber-100/60 transition-colors uppercase tracking-wider">
            <span>❓</span> Часті запитання
          </button>
          <div class="space-y-1">
            <p class="text-[10px] text-amber-100/20 leading-relaxed">
              Developed by
              <span class="text-amber-100/40 font-semibold">Danylchuk Andriy</span>
              <span class="text-amber-100/15 mx-1">·</span>
              Frontend
            </p>
            <p class="text-[10px] text-amber-100/20 leading-relaxed">
              <span class="text-amber-100/40 font-semibold">Honchar Denys</span>
              <span class="text-amber-100/15 mx-1">·</span>
              Backend
            </p>
          </div>
        </footer>

      </div>
    </div>

    <!-- Nickname modal -->
    @if (showModal()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/80"
        (click)="onBackdropClick($event)">
        <div class="w-full max-w-md bg-[#1a110a] border border-[#2d1f10] rounded-t-3xl p-6 pb-10 space-y-5"
          (click)="$event.stopPropagation()">
          <div class="w-10 h-1 bg-amber-700/30 rounded-full mx-auto"></div>
          <div>
            <h2 class="text-xl font-black text-amber-100 mb-1">Ваш нікнейм</h2>
            <p class="text-sm text-amber-100/40">Його побачать інші гравці у грі</p>
          </div>
          <input #nicknameInput
            [(ngModel)]="nicknameValue"
            (keyup.enter)="saveNickname()"
            placeholder="Введіть нікнейм..."
            maxlength="30"
            class="w-full bg-[#0d0905] border border-[#2d1f10] rounded-2xl px-4 py-3.5 text-amber-100 text-base placeholder-amber-100/20 outline-none focus:border-amber-700 transition-all" />
          <button (click)="saveNickname()"
            [disabled]="nicknameValue.trim().length < 2 || tokenLoading()"
            class="w-full bg-amber-700 text-amber-50 font-black py-3.5 rounded-2xl disabled:opacity-40 transition-all active:scale-[0.98] uppercase tracking-wide">
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
  loadError = signal(false);
  nicknameValue = '';

  filterTabs: { label: string; value: ModeFilter }[] = [
    { label: 'Всі',       value: null },
    { label: 'Класик',    value: 'Classic' },
    { label: 'Розширена', value: 'Extended' },
    { label: 'Власна',    value: 'Custom' },
    { label: 'Лицар',     value: 'Knight' },
    { label: 'True Face', value: 'TrueFace' },
  ];

  filteredGames = computed(() => {
    const filter = this.activeFilter();
    const cutoff = Date.now() - 20 * 60 * 1000;
    const games = this.allGames().filter(g => {
      if (g.status !== 'lobby') return false;
      const created = parseInt(g._id.substring(0, 8), 16) * 1000;
      return created > cutoff;
    });
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
      switchMap(() => this.gameService.getGames().pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
      )),
    ).subscribe(games => {
      if (!Array.isArray(games)) return;
      this.loadError.set(false);
      this.allGames.set(games);
    });
  }

  retryLoad() {
    this.loadError.set(false);
    this.pollSub?.unsubscribe();
    this.startPolling();
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
      if (result !== false) {
        const routeMap: Record<string, string> = { Knight: '/knight', TrueFace: '/true-face' };
        const route = routeMap[game.mode] ?? '/gameplay';
        this.router.navigate([route, game._id]);
      }
    });
  }

  goFaq() { this.router.navigate(['/faq']); }
}
