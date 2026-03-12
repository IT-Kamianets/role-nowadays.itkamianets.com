import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription, EMPTY } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { TrueFaceService, TrueFaceGameData, TrueFaceGuess } from '../../services/true-face.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-true-face',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#0d0812]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 bg-[#0d0812]/95 border-b border-purple-900/40">
          <div class="px-5 pt-10 pb-3 flex items-center gap-3">
            <button (click)="back()"
              class="w-10 h-10 rounded-xl bg-[#1a1025] border border-purple-900/40 flex items-center justify-center text-purple-100/50 hover:bg-purple-900/20 transition-colors shrink-0">
              ←
            </button>
            <h1 class="text-lg font-black text-purple-100 flex-1 uppercase tracking-wide">🔮 True Face</h1>
            @if (currentGame()?.pass) {
              <div class="bg-purple-700/20 border border-purple-600/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <span class="text-[10px] text-purple-100/40 uppercase tracking-wider">PIN</span>
                <span class="text-sm font-mono font-bold text-purple-400">{{ currentGame()!.pass }}</span>
              </div>
            }
          </div>
          @if (tfData() && tfPhase() !== 'lobby') {
            <div class="px-5 pb-3 flex items-center justify-between">
              <span class="text-xs font-bold text-purple-100/50 uppercase tracking-widest">
                Раунд {{ tfData()!.round }} / {{ tfData()!.roundLimit }}
              </span>
              @if (tfPhase() === 'guessing' && tfData()!.settings.roundDuration) {
                <span class="text-lg font-black tabular-nums"
                  [class]="timeLeft() <= 10 ? 'text-red-400' : 'text-purple-300'">
                  {{ timeLeft() }}с
                </span>
              }
            </div>
          }
        </header>

        <!-- LOBBY PHASE -->
        @if (!tfData() || tfPhase() === 'lobby') {
          <div class="px-5 py-6 space-y-6">
            <div class="bg-[#1a1025] border border-purple-900/40 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30 mb-4">Гравці у лобі</p>
              <div class="space-y-2">
                @for (player of currentGame()?.players || []; track $index) {
                  <div class="flex items-center gap-3 py-2">
                    <div class="w-8 h-8 rounded-lg bg-purple-700/30 flex items-center justify-center text-sm font-black text-purple-300">
                      {{ $index + 1 }}
                    </div>
                    <span class="text-sm text-purple-100/80">{{ player.name }}</span>
                    @if ($index === 0) {
                      <span class="text-[10px] font-bold text-purple-400/60 uppercase">Організатор</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Role pool preview -->
            @if (lobbySettings()) {
              <div class="bg-[#1a1025] border border-purple-900/40 rounded-2xl p-5 space-y-3">
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30">Ролі у грі</p>
                <div class="flex flex-wrap gap-2">
                  @for (role of lobbySettings()!.roles; track role) {
                    <span class="text-xs font-bold px-3 py-1 rounded-lg bg-purple-800/30 border border-purple-700/30 text-purple-200">
                      {{ role }}
                    </span>
                  }
                </div>
                <p class="text-xs text-purple-100/30">Ліміт раундів: {{ lobbySettings()!.roundLimit }}</p>
              </div>
            }

            @if (isCreator) {
              <button (click)="startGame()"
                [disabled]="(currentGame()?.players?.length || 0) < 2 || starting() || !lobbySettings()?.roles?.length"
                class="w-full bg-purple-700 hover:bg-purple-600 text-purple-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-40">
                {{ starting() ? 'Початок...' : 'Почати гру' }}
              </button>
            } @else {
              <div class="text-center text-purple-100/30 text-sm py-4">Очікування організатора...</div>
            }
          </div>
        }

        <!-- GUESSING PHASE -->
        @if (tfData() && tfPhase() === 'guessing') {
          <div class="px-5 py-6 space-y-5">

            <!-- My role -->
            <div class="bg-purple-900/20 border border-purple-700/40 rounded-2xl p-4 flex items-center gap-4">
              <span class="text-3xl">🎭</span>
              <div>
                <p class="text-[10px] text-purple-100/40 uppercase tracking-widest">Ваша роль</p>
                <p class="text-lg font-black text-purple-100">{{ myRole() }}</p>
              </div>
            </div>

            <!-- Прогрес здогадок (видно всім) -->
            @if (tfData()!.phase === 'guessing') {
              <div class="bg-[#1a1025] border border-purple-900/40 rounded-xl px-4 py-2 flex items-center justify-between">
                <span class="text-xs text-purple-100/40">Подали здогадки</span>
                <span class="text-sm font-black text-purple-300">{{ guessesSubmitted() }} / {{ playerCount() }}</span>
              </div>
            }

            @if (myGuessSubmitted()) {
              <div class="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4 text-center">
                <p class="text-purple-100/60 text-sm">✅ Здогадки подано · Очікування {{ guessesSubmitted() }}/{{ playerCount() }}</p>
              </div>
            } @else {
              <!-- Guess form -->
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30 mb-3">
                  Вкажіть ролі інших гравців
                </p>
                <div class="space-y-4">
                  @for (entry of otherPlayers(); track entry.index) {
                    <div class="bg-[#1a1025] border border-purple-900/40 rounded-2xl p-4">
                      <div class="flex items-center gap-2 mb-3">
                        <div class="w-7 h-7 rounded-lg bg-purple-700/30 flex items-center justify-center text-sm font-black text-purple-300">
                          {{ entry.index + 1 }}
                        </div>
                        <span class="text-sm text-purple-100/70">{{ playerName(entry.index) }}</span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        @for (role of rolePool(); track role) {
                          <button (click)="selectGuess(entry.index, role)"
                            class="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
                            [class]="currentGuesses()[key(entry.index)] === role
                              ? 'bg-purple-700 border-purple-500 text-white'
                              : 'bg-[#0d0812] border-purple-900/40 text-purple-200/60 hover:border-purple-600/50'">
                            {{ role }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <button (click)="submitGuess()"
                [disabled]="!allGuessesSelected() || submittingGuess()"
                class="w-full bg-purple-700 hover:bg-purple-600 text-purple-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-40">
                {{ submittingGuess() ? 'Надсилання...' : 'Підтвердити здогадки' }}
              </button>
            }
          </div>
        }

        <!-- RESULTS PHASE -->
        @if (tfData() && tfPhase() === 'results') {
          <div class="px-5 py-6 space-y-5">
            <div class="bg-[#1a1025] border border-purple-700/30 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30 mb-4">
                Результати раунду {{ lastRoundResult()?.round }}
              </p>
              @if (lastRoundResult()) {
                <div class="space-y-2">
                  @for (entry of allPlayersList(); track entry.index) {
                    <div class="flex items-center justify-between py-2 border-b border-purple-900/20 last:border-0">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-purple-700/30 flex items-center justify-center text-xs font-black text-purple-300">
                          {{ entry.index + 1 }}
                        </div>
                        <span class="text-sm text-purple-100/70">{{ playerName(entry.index) }}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-sm font-black text-purple-300">
                          +{{ lastRoundResult()!.correctCounts[key(entry.index)] }}
                        </span>
                        <span class="text-xs text-purple-100/30 ml-1">/ {{ playerCount() - 1 }}</span>
                        <span class="text-xs text-purple-100/20 ml-2">Σ{{ tfData()!.players[key(entry.index)].score }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            @if (isCreator) {
              <button (click)="triggerNextRound()"
                [disabled]="nextRoundLoading()"
                class="w-full bg-purple-700 hover:bg-purple-600 text-purple-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-40">
                {{ nextRoundLoading() ? 'Завантаження...' : 'Наступний раунд →' }}
              </button>
            } @else {
              <div class="text-center text-purple-100/30 text-sm py-4">Очікування організатора...</div>
            }
          </div>
        }

        <!-- FINISHED PHASE -->
        @if (tfData() && tfPhase() === 'finished') {
          <div class="px-5 py-6 space-y-5">
            <div class="bg-[#1a1025] border border-purple-700/40 rounded-2xl p-6 text-center">
              @if (tfData()!.winners.length > 0) {
                <p class="text-4xl mb-3">🏆</p>
                <p class="text-xl font-black text-purple-100 mb-2">Перемога!</p>
                <div class="space-y-1">
                  @for (wi of tfData()!.winners; track wi) {
                    <p class="text-sm text-purple-200">{{ playerName(wi) }} (Гравець {{ wi + 1 }})</p>
                  }
                </div>
              } @else {
                <p class="text-4xl mb-3">💀</p>
                <p class="text-xl font-black text-purple-100 mb-2">Ліміт раундів вичерпано</p>
                <p class="text-sm text-purple-100/40">Ніхто не вгадав усі ролі</p>
              }
            </div>

            <!-- Final scores -->
            <div class="bg-[#1a1025] border border-purple-900/40 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30 mb-4">Підсумок</p>
              <div class="space-y-2">
                @for (entry of allPlayersList(); track entry.index) {
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-purple-700/30 flex items-center justify-center text-xs font-black text-purple-300">
                        {{ entry.index + 1 }}
                      </div>
                      <span class="text-sm text-purple-100/70">{{ playerName(entry.index) }}</span>
                      <span class="text-xs text-purple-100/30">{{ tfData()!.players[key(entry.index)].role }}</span>
                    </div>
                    <span class="text-sm font-black text-purple-300">{{ tfData()!.players[key(entry.index)].score }} очок</span>
                  </div>
                }
              </div>
            </div>

            <!-- Round history -->
            <div class="bg-[#1a1025] border border-purple-900/40 rounded-2xl p-5 space-y-4">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-100/30">Лог раундів</p>
              @for (result of tfData()!.roundHistory; track result.round) {
                <div>
                  <p class="text-xs font-black text-purple-400/60 mb-2 uppercase">Раунд {{ result.round }}</p>
                  <div class="space-y-1">
                    @for (entry of allPlayersList(); track entry.index) {
                      <p class="text-xs text-purple-100/50">
                        Гравець {{ entry.index + 1 }}: {{ result.correctCounts[key(entry.index)] }}/{{ playerCount() - 1 }} правильних
                        @if (result.solvedBy.includes(entry.index)) {
                          <span class="text-yellow-400">★</span>
                        }
                      </p>
                    }
                  </div>
                </div>
              }
            </div>

            <button (click)="back()"
              class="w-full bg-purple-700 hover:bg-purple-600 text-purple-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98]">
              На головну
            </button>
          </div>
        }

      </div>
    </div>
  `,
})
export class TrueFaceComponent implements OnInit, OnDestroy {
  currentGame = signal<Game | null>(null);
  tfData = signal<TrueFaceGameData | null>(null);
  starting = signal(false);
  nextRoundLoading = signal(false);
  submittingGuess = signal(false);
  timeLeft = signal(0);
  currentGuesses = signal<Record<string, string>>({});

  private gameId = '';
  isCreator = false;
  myIndex = -1;

  private pollSub?: Subscription;
  private timerSub?: Subscription;
  private roundTransitionSent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private trueFaceService: TrueFaceService,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isCreator = this.gameService.isCreator(this.gameId);
    this.myIndex = this.gameService.getPlayerIndex(this.gameId);

    this.pollSub = interval(3000).pipe(
      startWith(0),
      switchMap(() => this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY))),
    ).subscribe(game => {
      this.currentGame.set(game);
      const raw = (game as any).data;
      if (raw) {
        try {
          const parsed: TrueFaceGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
          this.tfData.set(parsed);
          this.syncTimer(parsed);
        } catch {}
      }
    });

    this.timerSub = interval(1000).subscribe(() => this.tickTimer());
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  // ---------- Getters ----------

  tfPhase() { return this.tfData()?.phase ?? 'lobby'; }

  myRole(): string {
    const d = this.tfData();
    if (!d || this.myIndex < 0) return '';
    return d.players[String(this.myIndex)]?.role ?? '';
  }

  rolePool(): string[] {
    return this.tfData()?.settings.roles ?? [];
  }

  playerCount(): number {
    return Object.keys(this.tfData()?.players ?? {}).length;
  }

  otherPlayers(): { index: number }[] {
    const count = this.playerCount();
    const result: { index: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (i !== this.myIndex) result.push({ index: i });
    }
    return result;
  }

  allPlayersList(): { index: number }[] {
    const count = this.playerCount();
    const result: { index: number }[] = [];
    for (let i = 0; i < count; i++) result.push({ index: i });
    return result;
  }

  key(index: number): string { return String(index); }

  playerName(index: number): string {
    const players = this.currentGame()?.players ?? [];
    return (players[index] as any)?.name ?? `Гравець ${index + 1}`;
  }

  myGuessSubmitted(): boolean {
    const d = this.tfData();
    if (!d) return false;
    return String(this.myIndex) in d.currentGuesses && d.currentGuesses[String(this.myIndex)] !== null;
  }

  guessesSubmitted(): number {
    const d = this.tfData();
    if (!d) return 0;
    return Object.values(d.currentGuesses).filter(g => g !== null).length;
  }

  allGuessesSelected(): boolean {
    const others = this.otherPlayers();
    const guesses = this.currentGuesses();
    return others.every(p => !!guesses[String(p.index)]);
  }

  lastRoundResult() {
    const d = this.tfData();
    if (!d || d.roundHistory.length === 0) return null;
    return d.roundHistory[d.roundHistory.length - 1];
  }

  lobbySettings(): { roles: string[]; roundLimit: number } | null {
    try {
      const raw = localStorage.getItem('gameSettings_' + this.gameId);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  // ---------- Timer ----------

  private syncTimer(data: TrueFaceGameData) {
    if (data.phase !== 'guessing' || !data.settings.roundDuration) { this.timeLeft.set(0); return; }
    const elapsed = Math.floor((Date.now() - data.roundStartedAt) / 1000);
    const left = Math.max(0, data.settings.roundDuration - elapsed);
    this.timeLeft.set(left);
  }

  private tickTimer() {
    const d = this.tfData();
    if (!d || d.phase !== 'guessing' || !d.settings.roundDuration) return;
    const elapsed = Math.floor((Date.now() - d.roundStartedAt) / 1000);
    const left = Math.max(0, d.settings.roundDuration - elapsed);
    this.timeLeft.set(left);

    if (left === 0 && !this.roundTransitionSent && this.isCreator) {
      this.roundTransitionSent = true;
      this.triggerRoundResolution();
    }
  }

  // ---------- Actions ----------

  startGame() {
    const game = this.currentGame();
    if (!game) return;
    this.starting.set(true);
    const settings = this.loadSettings();
    const data = this.trueFaceService.initGameData(game.players.length, settings);
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(data), status: 'running' }).subscribe({
      next: () => this.starting.set(false),
      error: () => this.starting.set(false),
    });
  }

  selectGuess(targetIndex: number, role: string) {
    this.currentGuesses.update(g => ({ ...g, [String(targetIndex)]: role }));
  }

  submitGuess() {
    if (!this.allGuessesSelected()) return;
    this.submittingGuess.set(true);
    const guess: Record<string, string> = this.currentGuesses();
    this.gameService.submitTrueFaceAction(this.gameId, this.myIndex, guess).subscribe({
      next: (game) => {
        this.submittingGuess.set(false);
        const raw = (game as any).data;
        if (raw) {
          try {
            const parsed: TrueFaceGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            this.tfData.set(parsed);

            // Auto-resolve if all players submitted and creator
            const submitted = Object.values(parsed.currentGuesses).filter(g => g !== null).length;
            if (submitted >= this.playerCount() && this.isCreator && !this.roundTransitionSent) {
              this.roundTransitionSent = true;
              this.triggerRoundResolution();
            }
          } catch {}
        }
      },
      error: () => this.submittingGuess.set(false),
    });
  }

  triggerRoundResolution() {
    const d = this.tfData();
    if (!d || d.phase !== 'guessing') return;
    const resolved = this.trueFaceService.resolveRound(d);
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(resolved) }).subscribe({
      next: (game) => {
        const raw = (game as any).data;
        if (raw) {
          try {
            const parsed: TrueFaceGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            this.tfData.set(parsed);
          } catch {}
        }
      },
    });
  }

  triggerNextRound() {
    const d = this.tfData();
    if (!d || d.phase !== 'results') return;
    this.nextRoundLoading.set(true);
    this.roundTransitionSent = false;
    this.currentGuesses.set({});
    const next: TrueFaceGameData = {
      ...d,
      phase: 'guessing',
      roundStartedAt: Date.now(),
      currentGuesses: {},
    };
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(next) }).subscribe({
      next: () => this.nextRoundLoading.set(false),
      error: () => this.nextRoundLoading.set(false),
    });
  }

  back() { this.router.navigate(['/home']); }

  private loadSettings(): { roles: string[]; roundLimit: number; roundDuration: number | null } {
    try {
      const raw = localStorage.getItem('gameSettings_' + this.gameId);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.roles && s.roundLimit !== undefined) return s;
      }
    } catch {}
    return { roles: ['Knight', 'Healer', 'Assassin', 'Defender', 'Rogue'], roundLimit: 10, roundDuration: null };
  }
}
