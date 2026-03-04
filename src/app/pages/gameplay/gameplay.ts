import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { ClassicMafiaService, MafiaGameData } from '../../services/classic-mafia.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [CommonModule],
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
          @if (currentGame()?.pass) {
            <div class="bg-violet-600/20 border border-violet-500/30 rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <span class="text-[10px] text-white/40 uppercase tracking-wider">PIN</span>
              <span class="text-sm font-mono font-bold text-violet-300">{{ currentGame()!.pass }}</span>
            </div>
          }
        </header>

        <main class="px-5 pt-5 pb-28 space-y-5">

          <!-- LOADING -->
          @if (effectivePhase === 'loading') {
            <div class="flex items-center justify-center py-20">
              <div class="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
          }

          <!-- ═══════════════════════════════════════════════════ LOBBY -->
          @if (effectivePhase === 'lobby') {
            <div class="bg-violet-600/10 border border-violet-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">🏛️</span>
              <div>
                <p class="text-sm font-bold text-white">Лобі · Очікування гравців</p>
                <p class="text-xs text-white/40">Режим: {{ currentGame()?.mode ?? '—' }}</p>
              </div>
            </div>

            <!-- Player list -->
            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">
                Гравці · {{ currentGame()?.players?.length ?? 0 }} / {{ currentGame()?.maxPlayers ?? 0 }}
              </p>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                @for (i of playerIndices; track i) {
                  <div class="flex items-center gap-3 px-4 py-3">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                      {{ i + 1 }}
                    </div>
                    <span class="text-sm text-white/80">Гравець {{ i + 1 }}</span>
                    @if (i === myIndexVal) {
                      <span class="ml-auto text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full">Ви</span>
                    }
                    @if (i === 0) {
                      <span class="ml-auto text-[10px] text-yellow-400/70">ведучий</span>
                    }
                  </div>
                }
                @if ((currentGame()?.players?.length ?? 0) === 0) {
                  <div class="px-4 py-6 text-center text-sm text-white/30">Немає гравців</div>
                }
              </div>
            </div>

            <!-- Creator controls -->
            @if (isCreatorVal) {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p class="text-xs text-white/40">Ви — ведучий гри. Почніть коли збереться достатньо гравців (мін. 5).</p>
                <button (click)="startGame()" [disabled]="loading() || (currentGame()?.players?.length ?? 0) < 2"
                  class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black py-3.5 rounded-xl disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-violet-900/30">
                  {{ loading() ? 'Запуск...' : '⚔️ Розподілити ролі та почати' }}
                </button>
              </div>
            } @else {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center">
                <div class="w-8 h-8 rounded-full border-2 border-white/20 border-t-violet-500 animate-spin mx-auto mb-3"></div>
                <p class="text-sm text-white/50">Очікування на ведучого...</p>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ NIGHT -->
          @if (effectivePhase === 'night') {

            <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">🌙</span>
              <div>
                <p class="text-sm font-bold text-white">Ніч · Раунд {{ gameData?.round }}</p>
                <p class="text-xs text-white/40">Ролі виконують свої дії</p>
              </div>
            </div>

            @if (isCreatorVal) {
              <!-- Creator: alive players overview -->
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Живі гравці</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                  @for (p of alivePlayers; track p.index) {
                    <div class="flex items-center gap-3 px-4 py-2.5">
                      <div class="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0"
                        [class]="roleDef(p.role).team === 'mafia' ? 'bg-red-900/70 text-red-300' : 'bg-blue-900/70 text-blue-300'">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-white/70 flex-1">{{ p.label }}</span>
                      <span class="text-xs font-semibold"
                        [class]="roleDef(p.role).team === 'mafia' ? 'text-red-400' : 'text-blue-400'">
                        {{ p.role }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Night action selectors -->
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em]">Нічні дії</p>

                <div>
                  <label class="text-xs text-red-400 font-bold mb-1.5 block">🔪 Мафія — вибрати жертву</label>
                  <select (change)="onMafiaTarget($event)"
                    class="w-full bg-[#12122a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-red-500/40">
                    <option value="-1" class="bg-[#12122a]">— Без дії —</option>
                    @for (p of alivePlayers; track p.index) {
                      <option [value]="p.index" class="bg-[#12122a]">{{ p.label }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="text-xs text-green-400 font-bold mb-1.5 block">💊 Лікар — врятувати</label>
                  <select (change)="onDoctorTarget($event)"
                    class="w-full bg-[#12122a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-green-500/40">
                    <option value="-1" class="bg-[#12122a]">— Без дії —</option>
                    @for (p of alivePlayers; track p.index) {
                      <option [value]="p.index" class="bg-[#12122a]">{{ p.label }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="text-xs text-yellow-400 font-bold mb-1.5 block">🔍 Детектив — перевірити</label>
                  <select (change)="onDetectiveTarget($event)"
                    class="w-full bg-[#12122a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-yellow-500/40">
                    <option value="-1" class="bg-[#12122a]">— Без дії —</option>
                    @for (p of alivePlayers; track p.index) {
                      <option [value]="p.index" class="bg-[#12122a]">{{ p.label }}</option>
                    }
                  </select>
                </div>

                <button (click)="resolveNight()" [disabled]="loading()"
                  class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-3.5 rounded-xl disabled:opacity-40 active:scale-[0.97] transition-all">
                  {{ loading() ? 'Обробка...' : 'Завершити ніч →' }}
                </button>
              </div>
            } @else {
              <!-- Player: role card + night message -->
              @if (myRoleDef) {
                <div class="relative overflow-hidden rounded-2xl p-5 border" [class]="roleCardBg(myRoleDef.team)">
                  <div class="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-20"
                    [class]="myRoleDef.team === 'mafia' ? 'bg-red-500' : 'bg-blue-500'"></div>
                  <p class="text-[10px] uppercase tracking-[0.2em] mb-3" [class]="teamAccent(myRoleDef.team)">Ваша роль</p>
                  <div class="flex items-start gap-4">
                    <div class="text-4xl shrink-0 mt-0.5">{{ roleIcon(myRoleDef.team) }}</div>
                    <div class="flex-1 min-w-0">
                      <h2 class="text-2xl font-black text-white mb-1.5 leading-tight">{{ myRole }}</h2>
                      <span class="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold mb-2 border" [class]="teamBadge(myRoleDef.team)">
                        {{ teamLabel(myRoleDef.team) }}
                      </span>
                      <p class="text-sm text-white/60 leading-relaxed">{{ myRoleDef.description }}</p>
                    </div>
                  </div>
                </div>
              }

              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                <div class="text-4xl mb-3">🌙</div>
                <h3 class="text-base font-black text-white mb-1.5">Ніч настала...</h3>
                <p class="text-sm text-white/50 leading-relaxed">Всі заснули. Ведучий розв'язує нічні дії.</p>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ DAY -->
          @if (effectivePhase === 'day') {

            <div class="bg-amber-600/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">☀️</span>
              <div>
                <p class="text-sm font-bold text-white">День · Раунд {{ gameData?.round }}</p>
                <p class="text-xs text-white/40">Обговорення та голосування</p>
              </div>
            </div>

            <!-- Night result -->
            <div class="rounded-2xl p-5 border text-center"
              [class]="gameData?.eliminated !== null && gameData?.eliminated !== undefined
                ? 'bg-red-950/40 border-red-800/30'
                : 'bg-green-950/40 border-green-800/30'">
              @if (gameData?.eliminated !== null && gameData?.eliminated !== undefined) {
                <div class="text-3xl mb-3">💀</div>
                <h3 class="text-base font-black text-white mb-1">Гравець {{ (gameData?.eliminated ?? 0) + 1 }} загинув</h3>
                <p class="text-sm text-white/50">{{ gameData?.roles?.[(gameData?.eliminated ?? 0).toString()] }}</p>
              } @else {
                <div class="text-3xl mb-3">✨</div>
                <h3 class="text-base font-black text-white mb-1">Ніхто не загинув!</h3>
                <p class="text-sm text-white/50">Лікар захистив або мафія не діяла.</p>
              }
            </div>

            <!-- Detective result (visible to detective player) -->
            @if (myRole === 'Detective' && gameData?.night?.detectiveResult) {
              <div class="rounded-2xl p-4 border"
                [class]="gameData?.night?.detectiveResult === 'mafia'
                  ? 'bg-red-950/40 border-red-800/30'
                  : 'bg-green-950/40 border-green-800/30'">
                <p class="text-xs font-bold mb-2"
                  [class]="gameData?.night?.detectiveResult === 'mafia' ? 'text-red-400' : 'text-green-400'">
                  🔍 Результат вашої перевірки
                </p>
                <p class="text-sm text-white/80">
                  Гравець {{ (gameData?.night?.detectiveTarget ?? 0) + 1 }} —
                  <strong>{{ gameData?.night?.detectiveResult === 'mafia' ? 'МАФІЯ' : 'МІСТЯНИН' }}</strong>
                </p>
              </div>
            }

            <!-- Alive players -->
            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Живі · {{ alivePlayers.length }}</p>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                @for (p of alivePlayers; track p.index) {
                  <div class="flex items-center gap-3 px-4 py-3">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                    @if (isCreatorVal) {
                      <span class="text-xs" [class]="roleDef(p.role).team === 'mafia' ? 'text-red-400' : 'text-blue-400/70'">
                        {{ p.role }}
                      </span>
                    }
                    @if (p.index === myIndexVal && !isCreatorVal) {
                      <span class="text-[10px] text-violet-400 font-bold">Ви</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Event log -->
            @if (gameData?.log?.length) {
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Журнал подій</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  @for (entry of gameData?.log ?? []; track $index) {
                    <p class="text-xs text-white/50 leading-relaxed">{{ entry }}</p>
                  }
                </div>
              </div>
            }

            <!-- Creator: start voting -->
            @if (isCreatorVal) {
              <button (click)="startVoting()" [disabled]="loading()"
                class="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-black py-4 rounded-2xl disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-red-900/20">
                {{ loading() ? 'Обробка...' : '⚖️ Почати голосування' }}
              </button>
            } @else {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                <p class="text-sm text-white/40">Обговорюйте з гравцями. Ведучий оголосить голосування.</p>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ VOTING -->
          @if (effectivePhase === 'voting') {

            <div class="bg-red-600/10 border border-red-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">⚖️</span>
              <div>
                <p class="text-sm font-bold text-white">Голосування · Раунд {{ gameData?.round }}</p>
                <p class="text-xs text-white/40">Оберіть кого усунути</p>
              </div>
            </div>

            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Живі гравці</p>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
                @for (p of alivePlayers; track p.index) {
                  <button (click)="isCreatorVal ? votingTarget.set(p.index) : null"
                    class="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    [class]="votingTarget() === p.index
                      ? 'bg-red-900/30'
                      : isCreatorVal ? 'hover:bg-white/[0.04] active:bg-white/[0.07]' : 'cursor-default'">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-colors"
                      [class]="votingTarget() === p.index ? 'bg-red-600' : 'bg-gradient-to-br from-violet-600 to-indigo-700'">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                    @if (p.index === myIndexVal && !isCreatorVal) {
                      <span class="text-[10px] text-violet-400 font-bold">Ви</span>
                    }
                    @if (votingTarget() === p.index) {
                      <span class="text-[10px] text-red-400 font-bold">Вибрано ✗</span>
                    }
                  </button>
                }
              </div>
            </div>

            @if (isCreatorVal) {
              <button (click)="eliminatePlayer()" [disabled]="votingTarget() === null || loading()"
                class="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-black py-4 rounded-2xl disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-red-900/30">
                @if (loading()) { Обробка... }
                @else if (votingTarget() !== null) { Усунути гравця {{ (votingTarget() ?? 0) + 1 }} }
                @else { Оберіть гравця }
              </button>
            } @else {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                <p class="text-sm text-white/40">Ведучий проводить голосування...</p>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ FINISHED -->
          @if (effectivePhase === 'finished') {

            <!-- Winner banner -->
            <div class="relative overflow-hidden rounded-2xl p-8 border text-center"
              [class]="gameData?.winner === 'mafia'
                ? 'bg-gradient-to-br from-red-950/80 to-rose-950/80 border-red-800/30'
                : 'bg-gradient-to-br from-blue-950/80 to-indigo-950/80 border-blue-800/30'">
              <div class="absolute inset-0 opacity-10"
                [class]="gameData?.winner === 'mafia' ? 'bg-red-500' : 'bg-blue-500'"></div>
              <div class="text-5xl mb-4">{{ gameData?.winner === 'mafia' ? '🔪' : '🛡️' }}</div>
              <h2 class="text-2xl font-black text-white mb-2">
                {{ gameData?.winner === 'mafia' ? 'Мафія перемогла!' : 'Місто перемогло!' }}
              </h2>
              <p class="text-sm text-white/50">
                {{ gameData?.winner === 'mafia' ? 'Мафія захопила місто.' : 'Всіх мафіозів знешкоджено.' }}
              </p>
            </div>

            <!-- All roles reveal -->
            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Всі ролі</p>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                @for (p of allPlayers; track p.index) {
                  <div class="flex items-center gap-3 px-4 py-3" [class]="!p.isAlive ? 'opacity-40' : ''">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                      [class]="roleDef(p.role).team === 'mafia' ? 'bg-red-700' : 'bg-blue-700'">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                    <span class="text-xs font-semibold"
                      [class]="roleDef(p.role).team === 'mafia' ? 'text-red-400' : 'text-blue-400'">
                      {{ p.role }}
                    </span>
                    @if (!p.isAlive) {
                      <span class="text-[10px] text-white/25 ml-1">✝</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Game log -->
            @if (gameData?.log?.length) {
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Журнал гри</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  @for (entry of gameData?.log ?? []; track $index) {
                    <p class="text-xs text-white/50 leading-relaxed">{{ entry }}</p>
                  }
                </div>
              </div>
            }

            <button (click)="back()"
              class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black py-4 rounded-2xl active:scale-[0.97] transition-all shadow-xl shadow-violet-900/40">
              Нова гра
            </button>
          }

        </main>
      </div>
    </div>
  `,
})
export class GameplayComponent implements OnInit, OnDestroy {
  currentGame = signal<Game | null>(null);
  nightMafiaTarget = signal<number | null>(null);
  nightDoctorTarget = signal<number | null>(null);
  nightDetectiveTarget = signal<number | null>(null);
  votingTarget = signal<number | null>(null);
  loading = signal(false);

  isCreatorVal = false;
  myIndexVal = -1;

  private gameId = '';
  private pollSub?: Subscription;

  constructor(
    private gameService: GameService,
    private classicMafia: ClassicMafiaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isCreatorVal = this.gameService.isCreator(this.gameId);
    this.myIndexVal = this.gameService.getPlayerIndex(this.gameId);

    if (this.gameId) {
      this.pollSub = interval(3000).pipe(
        startWith(0),
        switchMap(() => this.gameService.getGames()),
      ).subscribe(games => {
        const found = games.find(g => g._id === this.gameId) ?? null;
        this.currentGame.set(found);
      });
    }
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  // ── Derived state ────────────────────────────────────────────────────

  get effectivePhase(): string {
    const g = this.currentGame();
    if (!g) return 'loading';
    if (g.status === 'lobby') return 'lobby';
    const data = g.data as Partial<MafiaGameData>;
    return data?.phase ?? 'lobby';
  }

  get gameData(): MafiaGameData | null {
    const g = this.currentGame();
    if (!g || g.status === 'lobby') return null;
    return g.data as MafiaGameData;
  }

  get myRole(): string | null {
    const d = this.gameData;
    if (!d || this.myIndexVal < 0) return null;
    return d.roles?.[String(this.myIndexVal)] ?? null;
  }

  get myRoleDef() {
    const role = this.myRole;
    if (!role) return null;
    return this.classicMafia.ROLE_DEFS[role] ?? null;
  }

  get playerIndices(): number[] {
    const g = this.currentGame();
    return g ? Array.from({ length: g.players.length }, (_, i) => i) : [];
  }

  get alivePlayers() {
    const g = this.currentGame();
    const d = this.gameData;
    if (!g) return [];
    const indices = d?.alive ?? Array.from({ length: g.players.length }, (_, i) => i);
    return indices.map(i => ({ index: i, label: `Гравець ${i + 1}`, role: d?.roles?.[String(i)] ?? '?' }));
  }

  get allPlayers() {
    const g = this.currentGame();
    const d = this.gameData;
    if (!g || !d) return [];
    return Array.from({ length: g.players.length }, (_, i) => ({
      index: i,
      label: `Гравець ${i + 1}`,
      role: d.roles?.[String(i)] ?? '?',
      isAlive: d.alive?.includes(i) ?? true,
    }));
  }

  // ── Actions ───────────────────────────────────────────────────────────

  back() { this.router.navigate(['/home']); }

  startGame() {
    const g = this.currentGame();
    if (!g) return;
    const data = this.classicMafia.initGameData(g.players.length);
    this.loading.set(true);
    this.gameService.updateGame(this.gameId, { status: 'running', data }).subscribe({
      next: game => { this.currentGame.set(game); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resolveNight() {
    const d = this.gameData;
    if (!d) return;
    const withTargets: MafiaGameData = {
      ...d,
      night: {
        mafiaTarget: this.nightMafiaTarget(),
        doctorTarget: this.nightDoctorTarget(),
        detectiveTarget: this.nightDetectiveTarget(),
        detectiveResult: null,
      },
    };
    const { data: resolved } = this.classicMafia.resolveNight(withTargets);
    const winner = this.classicMafia.checkWin(resolved);
    if (winner) {
      resolved.phase = 'finished';
      resolved.winner = winner;
      resolved.log.push(winner === 'village' ? 'Місто перемогло!' : 'Мафія перемогла!');
    }
    this.nightMafiaTarget.set(null);
    this.nightDoctorTarget.set(null);
    this.nightDetectiveTarget.set(null);
    this.loading.set(true);
    const fields: Record<string, any> = { data: resolved };
    if (winner) fields['status'] = 'finished';
    this.gameService.updateGame(this.gameId, fields).subscribe({
      next: game => { this.currentGame.set(game); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startVoting() {
    const d = this.gameData;
    if (!d) return;
    const updated: MafiaGameData = { ...d, phase: 'voting' };
    this.loading.set(true);
    this.gameService.updateGame(this.gameId, { data: updated }).subscribe({
      next: game => { this.currentGame.set(game); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  eliminatePlayer() {
    const idx = this.votingTarget();
    if (idx === null) return;
    const d = this.gameData;
    if (!d) return;
    const resolved = this.classicMafia.resolveVoting(d, idx);
    const winner = this.classicMafia.checkWin(resolved);
    if (winner) {
      resolved.phase = 'finished';
      resolved.winner = winner;
      resolved.log.push(winner === 'village' ? 'Місто перемогло!' : 'Мафія перемогла!');
    }
    this.votingTarget.set(null);
    this.loading.set(true);
    const fields: Record<string, any> = { data: resolved };
    if (winner) fields['status'] = 'finished';
    this.gameService.updateGame(this.gameId, fields).subscribe({
      next: game => { this.currentGame.set(game); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Select event handlers ─────────────────────────────────────────────

  onMafiaTarget(e: Event) { this.nightMafiaTarget.set(this.parseSelectVal(e)); }
  onDoctorTarget(e: Event) { this.nightDoctorTarget.set(this.parseSelectVal(e)); }
  onDetectiveTarget(e: Event) { this.nightDetectiveTarget.set(this.parseSelectVal(e)); }

  private parseSelectVal(e: Event): number | null {
    const val = parseInt((e.target as HTMLSelectElement).value, 10);
    return val === -1 ? null : val;
  }

  // ── UI helpers ────────────────────────────────────────────────────────

  roleDef(role: string) {
    return this.classicMafia.ROLE_DEFS[role] ?? null;
  }

  teamLabel(team: string): string {
    return team === 'mafia' ? 'Мафія' : 'Місто';
  }

  roleIcon(team: string): string {
    return team === 'mafia' ? '🔪' : '🛡️';
  }

  teamAccent(team: string): string {
    return team === 'mafia' ? 'text-red-400' : 'text-blue-400';
  }

  teamBadge(team: string): string {
    return team === 'mafia'
      ? 'bg-red-500/15 text-red-300 border-red-500/30'
      : 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }

  roleCardBg(team: string): string {
    return team === 'mafia'
      ? 'bg-gradient-to-br from-red-950/70 to-rose-950/70 border-red-800/30'
      : 'bg-gradient-to-br from-blue-950/70 to-indigo-950/70 border-blue-800/30';
  }
}
