import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription, EMPTY } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { SocketService } from '../../services/socket.service';
import { KnightService, KnightGameData, KnightAction, KnightRole } from '../../services/knight.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-knight',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#080c12]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 bg-[#080c12]/95 border-b border-sky-900/40">
          <div class="px-5 pt-10 pb-3 flex items-center gap-3">
            <button (click)="back()"
              class="w-10 h-10 rounded-xl bg-[#0e1520] border border-sky-900/40 flex items-center justify-center text-sky-100/50 hover:bg-sky-900/20 transition-colors shrink-0">
              ←
            </button>
            <h1 class="text-lg font-black text-sky-100 flex-1 uppercase tracking-wide">⚔️ Knight Mode</h1>
            @if (currentGame()?.pass) {
              <div class="bg-sky-700/20 border border-sky-600/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <span class="text-[10px] text-sky-100/40 uppercase tracking-wider">PIN</span>
                <span class="text-sm font-mono font-bold text-sky-400">{{ currentGame()!.pass }}</span>
              </div>
            }
          </div>
          @if (knightData() && knightPhase() !== 'lobby') {
            <div class="px-5 pb-3 flex items-center justify-between">
              <span class="text-xs font-bold text-sky-100/50 uppercase tracking-widest">Раунд {{ knightData()!.round }}</span>
              @if (knightPhase() === 'action') {
                <span class="text-lg font-black tabular-nums"
                  [class]="timeLeft() <= 10 ? 'text-red-400' : 'text-sky-300'">
                  {{ timeLeft() }}с
                </span>
              }
            </div>
          }
        </header>

        <!-- LOBBY PHASE -->
        @if (!knightData() || knightPhase() === 'lobby') {
          <div class="px-5 py-6 space-y-6">
            <div class="bg-[#0e1520] border border-sky-900/40 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30 mb-4">Гравці у лобі</p>
              <div class="space-y-2">
                @for (player of currentGame()?.players || []; track $index) {
                  <div class="flex items-center gap-3 py-2">
                    <div class="w-8 h-8 rounded-lg bg-sky-700/30 flex items-center justify-center text-sm font-black text-sky-300">
                      {{ $index + 1 }}
                    </div>
                    <span class="text-sm text-sky-100/80">{{ player }}</span>
                    @if ($index === 0) {
                      <span class="text-[10px] font-bold text-sky-400/60 uppercase">Організатор</span>
                    }
                  </div>
                }
              </div>
              @if ((currentGame()?.players?.length || 0) < 3) {
                <p class="text-xs text-sky-100/30 mt-4 text-center">Мінімум 3 гравці для початку</p>
              }
            </div>

            <!-- Roles description -->
            <div class="bg-[#0e1520] border border-sky-900/40 rounded-2xl p-5 space-y-3">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30">Ролі</p>
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-xl">⚔️</span>
                  <div><p class="text-sm font-bold text-sky-100">Атакер</p><p class="text-xs text-sky-100/40">7 HP · Атака 2 шкоди (4 при подвійному ударі)</p></div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xl">💚</span>
                  <div><p class="text-sm font-bold text-sky-100">Лікар</p><p class="text-xs text-sky-100/40">8 HP · Лікує +2 або надлікує +3 (собі -1 HP)</p></div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xl">🛡️</span>
                  <div><p class="text-sm font-bold text-sky-100">Захисник</p><p class="text-xs text-sky-100/40">10 HP · Захищає (собі -1 HP), поглинає 3 шкоди</p></div>
                </div>
              </div>
            </div>

            @if (isCreator) {
              <button (click)="startGame()"
                [disabled]="(currentGame()?.players?.length || 0) < 3 || starting()"
                class="w-full bg-sky-700 hover:bg-sky-600 text-sky-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-40">
                {{ starting() ? 'Початок...' : 'Почати гру' }}
              </button>
            } @else {
              <div class="text-center text-sky-100/30 text-sm py-4">Очікування організатора...</div>
            }
          </div>
        }

        <!-- ACTION PHASE -->
        @if (knightData() && knightPhase() === 'action') {
          <div class="px-5 py-6 space-y-5">

            <!-- My role card -->
            @if (myPlayerState()) {
              <div class="rounded-2xl p-4 border"
                [class]="myRole() === 'Attacker' ? 'bg-red-950/30 border-red-700/30' :
                          myRole() === 'Healer'   ? 'bg-green-950/30 border-green-700/30' :
                                                    'bg-sky-950/40 border-sky-700/40'">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ roleEmoji(myRole()!) }}</span>
                    <div>
                      <p class="text-[10px] text-sky-100/40 uppercase tracking-widest">Ваша роль</p>
                      <p class="text-base font-black text-sky-100">{{ roleLabel(myRole()!) }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] text-sky-100/40 uppercase">HP</p>
                    <p class="text-xl font-black" [class]="hpColor(myPlayerState()!.hp, myPlayerState()!.maxHp)">
                      {{ myPlayerState()!.hp }}/{{ myPlayerState()!.maxHp }}
                    </p>
                  </div>
                </div>
                <div class="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all"
                    [class]="myRole() === 'Attacker' ? 'bg-red-500' : myRole() === 'Healer' ? 'bg-green-500' : 'bg-sky-500'"
                    [style.width]="(myPlayerState()!.hp / myPlayerState()!.maxHp * 100) + '%'"></div>
                </div>
                @if (myPlayerState()!.lockedTarget !== null && myPlayerState()!.lockExpiresAfterRound >= (knightData()?.round || 0)) {
                  <p class="text-[10px] text-amber-400/70 mt-2">
                    ⚠️ Ціль заблокована: Гравець {{ myPlayerState()!.lockedTarget! + 1 }}
                  </p>
                }
              </div>
            }

            <!-- My action submitted -->
            @if (myActionSubmitted()) {
              <div class="bg-sky-900/20 border border-sky-700/30 rounded-2xl p-4 text-center">
                <p class="text-sky-100/60 text-sm">✅ Дію подано · Очікування {{ actionsSubmitted() }}/{{ alivePlayers().length }}</p>
              </div>
            }

            <!-- Players list with actions -->
            @if (!myActionSubmitted() && myPlayerState()?.alive) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30 mb-3">
                  {{ myRole() === 'Attacker' ? 'Оберіть ціль для атаки' :
                     myRole() === 'Defender' ? 'Оберіть гравця для захисту' :
                     'Оберіть гравця для лікування' }}
                </p>
                <div class="space-y-2">
                  @for (entry of alivePlayerEntries(); track entry.index) {
                    @if (entry.index !== myIndex) {
                      <div class="bg-[#0e1520] border border-sky-900/40 rounded-2xl p-4">
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                              [class]="entry.index === myIndex ? 'bg-sky-700 text-sky-100' : 'bg-sky-900/50 text-sky-300'">
                              {{ entry.index + 1 }}
                            </div>
                            <span class="text-sm text-sky-100/70">{{ playerName(entry.index) }}</span>
                          </div>
                          <span class="text-sm font-black" [class]="hpColor(entry.state.hp, entry.state.maxHp)">
                            {{ entry.state.hp }}/{{ entry.state.maxHp }} HP
                          </span>
                        </div>
                        <div class="h-1.5 bg-black/30 rounded-full overflow-hidden mb-3">
                          <div class="h-full rounded-full transition-all"
                            [class]="roleBarColor(entry.state.role)"
                            [style.width]="(entry.state.hp / entry.state.maxHp * 100) + '%'"></div>
                        </div>

                        <!-- Action buttons per role -->
                        @if (myRole() === 'Attacker') {
                          <button (click)="submitAction('strike', entry.index)"
                            class="w-full py-2.5 rounded-xl font-black text-sm uppercase text-white bg-red-700 hover:bg-red-600 transition-all active:scale-95">
                            ⚔️ Атакувати
                          </button>
                        }
                        @if (myRole() === 'Defender') {
                          <button (click)="submitAction('guard', entry.index)"
                            class="w-full py-2.5 rounded-xl font-black text-sm uppercase text-white bg-sky-700 hover:bg-sky-600 transition-all active:scale-95">
                            🛡️ Захищати
                          </button>
                        }
                        @if (myRole() === 'Healer') {
                          <div class="grid grid-cols-2 gap-2">
                            <button (click)="submitAction('heal', entry.index)"
                              class="py-2.5 rounded-xl font-black text-sm uppercase text-white bg-green-700 hover:bg-green-600 transition-all active:scale-95">
                              💊 +2 HP
                            </button>
                            <button (click)="submitAction('overheal', entry.index)"
                              [disabled]="myPlayerState()!.hp <= 1"
                              class="py-2.5 rounded-xl font-black text-sm uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-40"
                              [title]="myPlayerState()!.hp <= 1 ? 'Замало HP для надлікування' : ''">
                              ✨ +3 HP
                            </button>
                          </div>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }

            <!-- Dead players -->
            @if (deadPlayers().length > 0) {
              <div class="bg-[#0e1520] border border-sky-900/20 rounded-2xl p-4">
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/20 mb-3">Загинули</p>
                <div class="space-y-1">
                  @for (entry of deadPlayers(); track entry.index) {
                    <div class="flex items-center gap-2 opacity-40">
                      <span class="text-sm">💀</span>
                      <span class="text-sm text-sky-100/60 line-through">{{ playerName(entry.index) }}</span>
                      <span class="text-xs text-sky-100/30">{{ roleLabel(entry.state.role) }}</span>
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        }

        <!-- RESULTS PHASE -->
        @if (knightData() && knightPhase() === 'results') {
          <div class="px-5 py-6 space-y-5">
            <div class="bg-[#0e1520] border border-sky-700/30 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30 mb-4">
                Результати раунду {{ (knightData()?.round || 1) - 1 }}
              </p>
              @if (lastRoundEvents().length > 0) {
                <div class="space-y-2">
                  @for (event of lastRoundEvents(); track $index) {
                    <div class="flex items-start gap-2">
                      <span class="text-sky-400/60 text-xs mt-0.5 shrink-0">›</span>
                      <p class="text-sm text-sky-100/70">{{ event }}</p>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sky-100/30 text-sm">Дії не було здійснено</p>
              }
            </div>

            <!-- HP Summary -->
            <div class="bg-[#0e1520] border border-sky-900/40 rounded-2xl p-5">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30 mb-4">Стан гравців</p>
              <div class="space-y-3">
                @for (entry of allPlayerEntries(); track entry.index) {
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex items-center gap-2">
                        <span class="text-base">{{ roleEmoji(entry.state.role) }}</span>
                        <span class="text-sm" [class]="entry.state.alive ? 'text-sky-100/80' : 'text-sky-100/30 line-through'">
                          {{ playerName(entry.index) }}
                        </span>
                        <span class="text-xs text-sky-100/30">{{ roleLabel(entry.state.role) }}</span>
                      </div>
                      <span class="text-sm font-black" [class]="entry.state.alive ? hpColor(entry.state.hp, entry.state.maxHp) : 'text-sky-100/20'">
                        {{ entry.state.alive ? entry.state.hp + '/' + entry.state.maxHp + ' HP' : '💀' }}
                      </span>
                    </div>
                    @if (entry.state.alive) {
                      <div class="h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all"
                          [class]="roleBarColor(entry.state.role)"
                          [style.width]="(entry.state.hp / entry.state.maxHp * 100) + '%'"></div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            @if (isCreator) {
              <button (click)="triggerNextRound()"
                [disabled]="nextRoundLoading()"
                class="w-full bg-sky-700 hover:bg-sky-600 text-sky-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-40">
                {{ nextRoundLoading() ? 'Завантаження...' : 'Наступний раунд →' }}
              </button>
            } @else {
              <div class="text-center text-sky-100/30 text-sm py-4">Очікування організатора...</div>
            }
          </div>
        }

        <!-- FINISHED PHASE -->
        @if (knightData() && knightPhase() === 'finished') {
          <div class="px-5 py-6 space-y-5">
            <div class="bg-[#0e1520] border border-sky-700/40 rounded-2xl p-6 text-center">
              <p class="text-4xl mb-3">🏆</p>
              @if (knightData()!.winner !== null && knightData()!.winner! >= 0) {
                <p class="text-xl font-black text-sky-100 mb-1">
                  Переможець: Гравець {{ knightData()!.winner! + 1 }}
                </p>
                <p class="text-sm text-sky-100/50">{{ playerName(knightData()!.winner!) }}</p>
                <div class="mt-3 inline-flex items-center gap-2 bg-sky-700/20 border border-sky-600/30 rounded-xl px-4 py-2">
                  <span>{{ roleEmoji(winnerRole()) }}</span>
                  <span class="text-sm font-bold text-sky-300">{{ roleLabel(winnerRole()) }}</span>
                </div>
              } @else {
                <p class="text-xl font-black text-sky-100">Нічия!</p>
              }
            </div>

            <!-- Round history -->
            <div class="bg-[#0e1520] border border-sky-900/40 rounded-2xl p-5 space-y-4">
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-sky-100/30">Лог раундів</p>
              @for (round of knightData()!.roundHistory; track round.round) {
                <div>
                  <p class="text-xs font-black text-sky-400/60 mb-2 uppercase">Раунд {{ round.round }}</p>
                  <div class="space-y-1">
                    @for (event of round.events; track $index) {
                      <p class="text-xs text-sky-100/50">› {{ event }}</p>
                    }
                    @if (round.events.length === 0) {
                      <p class="text-xs text-sky-100/25">— Без подій</p>
                    }
                  </div>
                </div>
              }
            </div>

            <button (click)="back()"
              class="w-full bg-sky-700 hover:bg-sky-600 text-sky-50 font-black py-4 rounded-2xl uppercase tracking-wide transition-all active:scale-[0.98]">
              На головну
            </button>
          </div>
        }

      </div>
    </div>

    <!-- Lock override confirmation modal -->
    @if (showLockModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5">
        <div class="w-full max-w-sm bg-[#0e1520] border border-sky-700/40 rounded-2xl p-6 space-y-4">
          <p class="text-base font-black text-sky-100">⚠️ Ціль заблокована</p>
          <p class="text-sm text-sky-100/60">
            Гравець {{ (pendingLockTarget ?? 0) + 1 }} заблокований. Зміна цілі дасть -1&nbsp;HP штраф наступного раунду.
          </p>
          <div class="grid grid-cols-2 gap-3 pt-1">
            <button (click)="cancelLockOverride()"
              class="py-3 rounded-xl font-black text-sm uppercase text-sky-100/60 bg-[#1a2535] border border-sky-900/40 transition-all active:scale-95">
              Скасувати
            </button>
            <button (click)="confirmLockOverride()"
              class="py-3 rounded-xl font-black text-sm uppercase text-sky-50 bg-red-700 hover:bg-red-600 transition-all active:scale-95">
              Продовжити
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class KnightComponent implements OnInit, OnDestroy {
  currentGame = signal<Game | null>(null);
  knightData = signal<KnightGameData | null>(null);
  starting = signal(false);
  nextRoundLoading = signal(false);
  timeLeft = signal(0);
  showLockModal = signal(false);

  private pendingActionType: 'strike' | 'heal' | 'overheal' | 'guard' | null = null;
  pendingLockTarget: number | null = null;

  private gameId = '';
  isCreator = false;
  myIndex = -1;

  private pollSub?: Subscription;
  private socketSub?: Subscription;
  private timerSub?: Subscription;
  private roundTransitionSent = false;
  private resultsTransitionSent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private knightService: KnightService,
    private socketService: SocketService,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isCreator = this.gameService.isCreator(this.gameId);
    this.myIndex = this.gameService.getPlayerIndex(this.gameId);

    // Initial load
    this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY)).subscribe(game => {
      this.handleGameUpdate(game);
    });

    // WebSocket real-time updates
    this.socketService.connect();
    this.socketSub = this.socketService.onGameUpdate().subscribe(game => {
      if (game._id === this.gameId) this.handleGameUpdate(game);
    });

    // Fallback polling every 30s
    this.pollSub = interval(30000).pipe(
      switchMap(() => this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY))),
    ).subscribe(game => this.handleGameUpdate(game));

    this.timerSub = interval(1000).subscribe(() => this.tickTimer());
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.socketSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  private handleGameUpdate(game: Game) {
    this.currentGame.set(game);
    const raw = game.data;
    if (raw) {
      try {
        const parsed: KnightGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
        this.knightData.set(parsed);
        this.syncTimer(parsed);
      } catch {}
    }
  }

  // ---------- Computed getters ----------

  knightPhase() { return this.knightData()?.phase ?? 'lobby'; }

  myPlayerState() {
    const d = this.knightData();
    if (!d || this.myIndex < 0) return null;
    return d.players[String(this.myIndex)] ?? null;
  }

  myRole(): KnightRole | null {
    return this.myPlayerState()?.role ?? null;
  }

  myActionSubmitted() {
    const d = this.knightData();
    if (!d) return false;
    return this.myIndex in d.currentActions && d.currentActions[String(this.myIndex)] !== null;
  }

  actionsSubmitted() {
    const d = this.knightData();
    if (!d) return 0;
    return Object.values(d.currentActions).filter(a => a !== null).length;
  }

  alivePlayers() {
    const d = this.knightData();
    if (!d) return [];
    return Object.entries(d.players).filter(([, p]) => p.alive).map(([k, p]) => ({ index: +k, state: p }));
  }

  alivePlayerEntries() { return this.alivePlayers(); }

  deadPlayers() {
    const d = this.knightData();
    if (!d) return [];
    return Object.entries(d.players).filter(([, p]) => !p.alive).map(([k, p]) => ({ index: +k, state: p }));
  }

  allPlayerEntries() {
    const d = this.knightData();
    if (!d) return [];
    return Object.entries(d.players).map(([k, p]) => ({ index: +k, state: p }));
  }

  lastRoundEvents(): string[] {
    const d = this.knightData();
    if (!d || d.roundHistory.length === 0) return [];
    return d.roundHistory[d.roundHistory.length - 1].events;
  }

  playerName(index: number): string {
    const players = this.currentGame()?.players ?? [];
    return players[index]?.name ?? `Гравець ${index + 1}`;
  }

  winnerRole(): KnightRole | undefined {
    const d = this.knightData();
    if (!d || d.winner === null || d.winner < 0) return undefined;
    return d.players[String(d.winner)]?.role;
  }

  // ---------- Timer ----------

  private syncTimer(data: KnightGameData) {
    if (data.phase !== 'action') { this.timeLeft.set(0); return; }
    const elapsed = Math.floor((Date.now() - data.roundStartedAt) / 1000);
    const left = Math.max(0, data.settings.roundDuration - elapsed);
    this.timeLeft.set(left);
  }

  private tickTimer() {
    const d = this.knightData();
    if (!d || d.phase !== 'action') return;
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
    const data = this.knightService.initGameData(game.players.length, settings);
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(data), status: 'running' }).subscribe({
      next: (updatedGame) => {
        this.starting.set(false);
        if (updatedGame) this.gameService.emitUpdate(updatedGame);
      },
      error: () => this.starting.set(false),
    });
  }

  submitAction(type: 'strike' | 'heal' | 'overheal' | 'guard', target: number) {
    const d = this.knightData();
    if (!d || this.myIndex < 0) return;

    const player = d.players[String(this.myIndex)];
    if (!player?.alive) return;

    const isLocked = player.lockedTarget !== null && d.round <= player.lockExpiresAfterRound;
    if (isLocked && target !== player.lockedTarget) {
      this.pendingActionType = type;
      this.pendingLockTarget = target;
      this.showLockModal.set(true);
      return;
    }

    const action: KnightAction = { type, target };
    // Оновлюємо локальний стан для pendingPenalty/lock
    const localUpdated = this.knightService.submitAction(this.myIndex, action, d);
    this.knightData.set(localUpdated);

    // Надсилаємо дію через дозволений ендпоінт (будь-який гравець)
    this.gameService.submitKnightAction(this.gameId, this.myIndex, action).subscribe(game => {
      const raw = game.data;
      if (raw) {
        try {
          const parsed: KnightGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
          // Зберігаємо pendingPenalty з локального стану
          if (parsed.players[String(this.myIndex)]) {
            parsed.players[String(this.myIndex)].pendingPenalty = localUpdated.players[String(this.myIndex)].pendingPenalty;
          }
          this.knightData.set(parsed);
          this.gameService.emitUpdate(game);

          // Auto-resolve якщо всі живі подали дію
          const alive = Object.entries(parsed.players).filter(([, p]) => p.alive);
          const submitted = Object.values(parsed.currentActions).filter(a => a !== null).length;
          if (submitted >= alive.length && this.isCreator && !this.roundTransitionSent) {
            this.roundTransitionSent = true;
            this.triggerRoundResolution();
          }
        } catch {}
      }
    });
  }

  cancelLockOverride() {
    this.pendingActionType = null;
    this.pendingLockTarget = null;
    this.showLockModal.set(false);
  }

  confirmLockOverride() {
    this.showLockModal.set(false);
    if (this.pendingActionType !== null && this.pendingLockTarget !== null) {
      const type = this.pendingActionType;
      const target = this.pendingLockTarget;
      this.pendingActionType = null;
      this.pendingLockTarget = null;
      this.submitAction(type, target);
    }
  }

  triggerRoundResolution() {
    const d = this.knightData();
    if (!d || d.phase !== 'action') return;
    const { data: resolved } = this.knightService.resolveRound(d);
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(resolved) }).subscribe({
      next: (game) => {
        const raw = game.data;
        if (raw) {
          try {
            const parsed: KnightGameData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            this.knightData.set(parsed);
            this.gameService.emitUpdate(game);
          } catch {}
        }
      },
    });
  }

  triggerNextRound() {
    const d = this.knightData();
    if (!d || d.phase !== 'results') return;
    this.nextRoundLoading.set(true);
    this.roundTransitionSent = false;
    const next = { ...d, phase: 'action' as const, roundStartedAt: Date.now(), currentActions: {} };
    this.gameService.updateGame(this.gameId, { data: JSON.stringify(next) }).subscribe({
      next: (game) => {
        this.nextRoundLoading.set(false);
        if (game) this.gameService.emitUpdate(game);
      },
      error: () => this.nextRoundLoading.set(false),
    });
  }

  back() { this.router.navigate(['/home']); }

  // ---------- Helpers ----------

  roleLabel(role: KnightRole | undefined): string {
    if (!role) return '';
    return role === 'Attacker' ? 'Атакер' : role === 'Healer' ? 'Лікар' : 'Захисник';
  }

  roleEmoji(role: KnightRole | undefined): string {
    if (!role) return '';
    return role === 'Attacker' ? '⚔️' : role === 'Healer' ? '💚' : '🛡️';
  }

  hpColor(hp: number, maxHp: number): string {
    const pct = hp / maxHp;
    if (pct > 0.6) return 'text-green-400';
    if (pct > 0.3) return 'text-amber-400';
    return 'text-red-400';
  }

  roleBarColor(role: KnightRole): string {
    return role === 'Attacker' ? 'bg-red-500' : role === 'Healer' ? 'bg-green-500' : 'bg-sky-500';
  }

  private loadSettings(): { roundDuration: number } {
    try {
      const raw = localStorage.getItem('gameSettings_' + this.gameId);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.roundDuration) return { roundDuration: s.roundDuration };
      }
    } catch {}
    return { roundDuration: 60 };
  }
}
