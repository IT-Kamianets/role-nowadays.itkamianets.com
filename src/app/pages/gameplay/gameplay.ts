import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription, EMPTY } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { ClassicMafiaService, MafiaGameData } from '../../services/classic-mafia.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Role Reveal Overlay -->
    @if (showRoleReveal() && myRoleDef && myRole) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b17] px-6"
        [class]="roleRevealed() ? 'pointer-events-none' : 'cursor-pointer'"
        (click)="revealRole()">
        <div class="w-full transition-all duration-[600ms] ease-in-out"
          [class]="roleRevealed()
            ? 'max-w-[280px] scale-[0.55] opacity-0'
            : 'max-w-md scale-100 opacity-100'">
          <div class="relative overflow-hidden rounded-3xl p-8 border-2 text-center"
            [class]="revealCardBg(myRole)">
            <div class="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-25"
              [class]="revealGlowColor(myRole)"></div>
            <div class="text-8xl mb-6 relative">{{ revealRoleIcon(myRole) }}</div>
            <h2 class="text-4xl font-black text-white mb-3 leading-tight relative">{{ myRole }}</h2>
            <span class="inline-block text-xs px-3 py-1.5 rounded-full font-bold mb-4 border relative"
              [class]="revealBadge(myRole)">
              {{ teamLabel(myRoleDef.team) }}
            </span>
            <p class="text-sm text-white/60 leading-relaxed mb-8 relative">{{ myRoleDef.description }}</p>
            <p class="text-xs text-white/30 animate-pulse relative">Торкніться щоб продовжити</p>
          </div>
        </div>
      </div>
    }

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
                    <span class="text-sm text-white/80">{{ playerName(i) }}</span>
                    @if (i === myIndexVal) {
                      <span class="ml-auto text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full">Ви</span>
                    }
                  </div>
                }
                @if ((currentGame()?.players?.length ?? 0) === 0) {
                  <div class="px-4 py-6 text-center text-sm text-white/30">Немає гравців</div>
                }
              </div>
            </div>

            <!-- Start button — creator only -->
            @if (isCreator) {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p class="text-xs text-white/40">Почніть гру коли збереться достатньо гравців (мін. 2).</p>
                <button (click)="startGame()" [disabled]="loading() || (currentGame()?.players?.length ?? 0) < 2"
                  class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black py-3.5 rounded-xl disabled:opacity-40 active:scale-[0.97] transition-all shadow-lg shadow-violet-900/30">
                  {{ loading() ? 'Запуск...' : '⚔️ Розподілити ролі та почати' }}
                </button>
                @if (errorMsg()) {
                  <p class="text-xs text-red-400 text-center mt-2">{{ errorMsg() }}</p>
                }
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

            <!-- Role card -->
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

            <!-- Villager: sleeping -->
            @if (myRole === 'Villager') {
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                <div class="text-4xl mb-3">😴</div>
                <h3 class="text-base font-black text-white mb-1.5">Ви заснули...</h3>
                <p class="text-sm text-white/50">Містяни сплять. Чекайте ранку.</p>
              </div>
            }

            <!-- Role player: pick target -->
            @if (myRole === 'Mafia' || myRole === 'Doctor' || myRole === 'Detective') {
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">{{ roleNightActionLabel }}</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
                  @for (p of nightTargets; track p.index) {
                    <button (click)="submitNightAction(p.index)"
                      class="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left active:bg-white/[0.07]"
                      [class]="myNightTarget === p.index ? 'bg-violet-900/30' : 'hover:bg-white/[0.04]'">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-colors"
                        [class]="myNightTarget === p.index ? 'bg-violet-600' : 'bg-gradient-to-br from-violet-600 to-indigo-700'">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                      @if (myNightTarget === p.index) {
                        <span class="text-[10px] text-violet-400 font-bold">Вибрано ✓</span>
                      }
                    </button>
                  }
                </div>
                @if (hasSubmittedNightAction) {
                  <div class="mt-3 bg-green-900/20 border border-green-700/30 rounded-xl p-3 text-center">
                    <p class="text-xs text-green-400">Дію подано. Очікування інших гравців...</p>
                  </div>
                }
              </div>
            }

            <!-- Night mafia chat -->
            @if (myRole === 'Mafia') {
              <div>
                <p class="text-[10px] text-red-400/60 uppercase tracking-[0.2em] mb-3">🔪 Чат мафії</p>
                <div class="bg-red-950/20 border border-red-800/20 rounded-2xl overflow-hidden">
                  <div class="max-h-40 overflow-y-auto p-3 space-y-2 min-h-[40px]">
                    @for (msg of nightMessages; track $index) {
                      <div class="text-xs">
                        <span class="font-bold text-red-400">{{ msg.creator?.name }}</span>
                        <span class="text-white/60 ml-1">{{ msg.text }}</span>
                      </div>
                    }
                    @if (nightMessages.length === 0) {
                      <p class="text-xs text-white/20 text-center">Порожньо</p>
                    }
                  </div>
                  <div class="border-t border-red-800/20 flex">
                    <input [(ngModel)]="nightChatText"
                      (keyup.enter)="sendNightMessage()"
                      placeholder="Повідомлення мафії..."
                      class="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none" />
                    <button (click)="sendNightMessage()"
                      class="px-4 text-red-400 font-bold text-sm hover:text-red-300 transition-colors">
                      →
                    </button>
                  </div>
                </div>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ DAY -->
          @if (effectivePhase === 'day') {

            <div class="bg-amber-600/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">☀️</span>
              <div class="flex-1">
                <p class="text-sm font-bold text-white">День · Раунд {{ gameData?.round }}</p>
                <p class="text-xs text-white/40">Обговорюйте та шукайте мафію</p>
              </div>
              <!-- Day countdown timer -->
              <div class="shrink-0 text-right">
                <div class="text-2xl font-black"
                  [class]="daySecondsLeft() <= 10 ? 'text-red-400' : 'text-amber-300'">
                  {{ daySecondsLeft() }}
                </div>
                <div class="text-[10px] text-white/30 uppercase tracking-wider">сек</div>
              </div>
            </div>

            <!-- Night result -->
            <div class="rounded-2xl p-5 border text-center"
              [class]="gameData?.eliminated !== null && gameData?.eliminated !== undefined
                ? 'bg-red-950/40 border-red-800/30'
                : 'bg-green-950/40 border-green-800/30'">
              @if (gameData?.eliminated !== null && gameData?.eliminated !== undefined) {
                <div class="text-3xl mb-3">💀</div>
                <h3 class="text-base font-black text-white mb-1">{{ playerName(gameData?.eliminated ?? 0) }} загинув</h3>
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
                  {{ playerName(gameData?.night?.detectiveTarget ?? 0) }} —
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
                    @if (p.index === myIndexVal) {
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

            <!-- Day chat -->
            <div>
              <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Чат · День</p>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div class="max-h-48 overflow-y-auto p-3 space-y-2 min-h-[48px]">
                  @for (msg of dayMessages; track $index) {
                    <div class="text-xs">
                      <span class="font-bold text-violet-400">{{ msg.creator?.name }}</span>
                      <span class="text-white/60 ml-1">{{ msg.text }}</span>
                    </div>
                  }
                  @if (dayMessages.length === 0) {
                    <p class="text-xs text-white/20 text-center">Немає повідомлень</p>
                  }
                </div>
                <div class="border-t border-white/[0.06] flex">
                  <input [(ngModel)]="dayChatText"
                    (keyup.enter)="sendDayMessage()"
                    placeholder="Повідомлення..."
                    class="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none" />
                  <button (click)="sendDayMessage()"
                    class="px-4 text-violet-400 font-bold text-sm hover:text-violet-300 transition-colors">
                    →
                  </button>
                </div>
              </div>
            </div>

            <!-- Timer notice -->
            <div class="bg-amber-900/10 border border-amber-700/20 rounded-2xl p-4 text-center">
              @if (daySecondsLeft() > 0) {
                <p class="text-sm text-amber-300/70">Голосування розпочнеться автоматично через {{ daySecondsLeft() }} сек</p>
              } @else {
                <p class="text-sm text-amber-300/70">Переходимо до голосування...</p>
              }
            </div>
          }

          <!-- ═══════════════════════════════════════════════════ VOTING -->
          @if (effectivePhase === 'voting') {

            <div class="bg-red-600/10 border border-red-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">⚖️</span>
              <div class="flex-1">
                <p class="text-sm font-bold text-white">Голосування · Раунд {{ gameData?.round }}</p>
                <p class="text-xs text-white/40">Оберіть кого усунути</p>
              </div>
              <div class="text-xs text-white/50 shrink-0">
                {{ voteCount }}/{{ alivePlayers.length }}
              </div>
            </div>

            @if (!hasVoted()) {
              <!-- Voting: pick target -->
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Живі гравці</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
                  @for (p of votingTargets; track p.index) {
                    <button (click)="submitVote(p.index)"
                      class="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-white/[0.04] active:bg-white/[0.07]">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- Already voted: waiting -->
              <div class="bg-green-900/20 border border-green-700/30 rounded-2xl p-5 text-center">
                <div class="text-3xl mb-3">✅</div>
                <h3 class="text-base font-black text-white mb-1.5">Ви проголосували за {{ playerName(myVoteTarget() ?? 0) }}</h3>
                <p class="text-sm text-white/50">Очікування інших... ({{ voteCount }}/{{ alivePlayers.length }})</p>
              </div>

              <!-- Vote progress -->
              <div>
                <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Живі гравці</p>
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                  @for (p of alivePlayers; track p.index) {
                    <div class="flex items-center gap-3 px-4 py-3">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-white/80 flex-1">{{ p.label }}</span>
                      @if (hasPlayerVoted(p.index)) {
                        <span class="text-[10px] text-green-400 font-bold">Проголосував ✓</span>
                      } @else {
                        <span class="text-[10px] text-white/25">очікує...</span>
                      }
                    </div>
                  }
                </div>
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
  myVoteTarget = signal<number | null>(null);
  hasVoted = signal(false);
  daySecondsLeft = signal(60);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  allMessages = signal<any[]>([]);
  showRoleReveal = signal(false);
  roleRevealed = signal(false);

  myIndexVal = -1;
  dayChatText = '';
  nightChatText = '';

  private gameId = '';
  private pollSub?: Subscription;
  private msgPollSub?: Subscription;
  private timerInterval?: ReturnType<typeof setInterval>;
  private dayTransitionSent = false;

  constructor(
    private gameService: GameService,
    private classicMafia: ClassicMafiaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.myIndexVal = this.gameService.getPlayerIndex(this.gameId);

    if (this.gameId) {
      this.pollSub = interval(3000).pipe(
        startWith(0),
        switchMap(() => this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY))),
      ).subscribe(game => {
        if (!game || typeof game !== 'object') return;

        const prevStatus = this.currentGame()?.status;
        const prevPhase = (this.currentGame()?.data as Partial<MafiaGameData>)?.phase;
        const newPhase  = (game.data as Partial<MafiaGameData>)?.phase;
        if (prevPhase === 'voting' && newPhase !== 'voting') {
          this.hasVoted.set(false);
          this.myVoteTarget.set(null);
        }
        this.currentGame.set(game);
        if (prevStatus === 'lobby' && newPhase === 'night') {
          const round = (game.data as Partial<MafiaGameData>)?.round;
          if (round === 1 && this.myIndexVal >= 0) {
            this.showRoleReveal.set(true);
            this.roleRevealed.set(false);
          }
        }
      });

      this.msgPollSub = interval(3000).pipe(
        startWith(0),
        switchMap(() => this.gameService.getMessages(this.gameId).pipe(catchError(() => EMPTY))),
      ).subscribe(msgs => {
        if (Array.isArray(msgs)) this.allMessages.set(msgs);
      });
    }

    // 1-second interval: update day countdown + trigger day→voting transition
    this.timerInterval = setInterval(() => {
      const d = this.gameData;
      if (d?.phase === 'day' && d.phaseStartedAt) {
        const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
        const left = Math.max(0, 60 - elapsed);
        this.daySecondsLeft.set(left);
        if (left === 0 && !this.dayTransitionSent) {
          this.dayTransitionSent = true;
          this.triggerDayToVoting();
        }
      } else {
        if (d?.phase !== 'day') {
          this.daySecondsLeft.set(60);
          this.dayTransitionSent = false;
        }
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.msgPollSub?.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
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
    return indices.map(i => ({ index: i, label: this.playerName(i), role: d?.roles?.[String(i)] ?? '?' }));
  }

  get votingTargets() {
    // Cannot vote for yourself
    return this.alivePlayers.filter(p => p.index !== this.myIndexVal);
  }

  get allPlayers() {
    const g = this.currentGame();
    const d = this.gameData;
    if (!g || !d) return [];
    return Array.from({ length: g.players.length }, (_, i) => ({
      index: i,
      label: this.playerName(i),
      role: d.roles?.[String(i)] ?? '?',
      isAlive: d.alive?.includes(i) ?? true,
    }));
  }

  playerName(index: number): string {
    return this.currentGame()?.players?.[index]?.name || `Гравець ${index + 1}`;
  }

  get dayMessages() { return this.allMessages().filter(m => m?.data?.type === 'day'); }
  get nightMessages() { return this.allMessages().filter(m => m?.data?.type === 'night'); }

  get voteCount(): number {
    const d = this.gameData;
    if (!d?.votes) return 0;
    return Object.keys(d.votes).length;
  }

  hasPlayerVoted(playerIndex: number): boolean {
    const d = this.gameData;
    if (!d?.votes) return false;
    return d.votes[String(playerIndex)] !== undefined;
  }

  // ── Actions ───────────────────────────────────────────────────────────

  back() { this.router.navigate(['/home']); }

  startGame() {
    const g = this.currentGame();
    if (!g) return;
    const data = this.classicMafia.initGameData(g.players.length);
    this.loading.set(true);
    this.errorMsg.set(null);
    this.gameService.updateGame(this.gameId, { status: 'running', data }).subscribe({
      next: game => { if (game && typeof game === 'object') this.currentGame.set(game); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? err?.message ?? `HTTP ${err?.status ?? '?'}`;
        this.errorMsg.set(msg);
        console.error('[startGame]', err);
      },
    });
  }

  submitNightAction(target: number) {
    const role = this.myRole;
    if (!role) return;
    const roleToField: Record<string, string> = {
      Mafia: 'mafiaTarget', Doctor: 'doctorTarget', Detective: 'detectiveTarget',
    };
    const field = roleToField[role];
    if (!field) return;

    this.gameService.submitNightAction(this.gameId, field, target).subscribe({
      next: game => { if (game && typeof game === 'object') this.currentGame.set(game); },
    });
  }

  triggerDayToVoting() {
    if (!this.isCreator) { this.dayTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'day') { this.dayTransitionSent = false; return; }
    this.gameService.updateGame(this.gameId, { data: { ...d, phase: 'voting', phaseStartedAt: Date.now() } }).subscribe({
      next: game => { if (game && typeof game === 'object') this.currentGame.set(game); },
      error: () => { this.dayTransitionSent = false; },
    });
  }

  submitVote(targetIndex: number) {
    if (this.hasVoted() || this.myIndexVal < 0) return;
    this.hasVoted.set(true);
    this.myVoteTarget.set(targetIndex);
    this.gameService.submitVote(this.gameId, this.myIndexVal, targetIndex).subscribe({
      next: game => {
        if (!game || typeof game !== 'object') return;
        this.currentGame.set(game);
      },
      error: () => { this.hasVoted.set(false); this.myVoteTarget.set(null); },
    });
  }

  sendDayMessage() {
    const text = this.dayChatText.trim();
    if (!text) return;
    this.dayChatText = '';
    this.gameService.sendMessage(this.gameId, text, 'day').subscribe({
      next: msg => { if (msg) this.allMessages.update(msgs => [...msgs, msg]); },
    });
  }

  sendNightMessage() {
    const text = this.nightChatText.trim();
    if (!text) return;
    this.nightChatText = '';
    this.gameService.sendMessage(this.gameId, text, 'night').subscribe({
      next: msg => { if (msg) this.allMessages.update(msgs => [...msgs, msg]); },
    });
  }

  revealRole() {
    if (this.roleRevealed()) return;
    this.roleRevealed.set(true);
    setTimeout(() => this.showRoleReveal.set(false), 600);
  }

  // ── Night action helpers ──────────────────────────────────────────────

  get hasSubmittedNightAction(): boolean {
    const d = this.gameData;
    const role = this.myRole;
    if (!d || !role) return false;
    if (role === 'Mafia')      return d.night.mafiaTarget !== null;
    if (role === 'Doctor')     return d.night.doctorTarget !== null;
    if (role === 'Detective')  return d.night.detectiveTarget !== null;
    return true;
  }

  get myNightTarget(): number | null {
    const d = this.gameData;
    const role = this.myRole;
    if (!d || !role) return null;
    if (role === 'Mafia')     return d.night.mafiaTarget;
    if (role === 'Doctor')    return d.night.doctorTarget;
    if (role === 'Detective') return d.night.detectiveTarget;
    return null;
  }

  get roleNightActionLabel(): string {
    const map: Record<string, string> = {
      Mafia:     '🔪 Оберіть жертву',
      Doctor:    '💊 Оберіть кого захистити',
      Detective: '🔍 Оберіть кого перевірити',
    };
    return map[this.myRole ?? ''] ?? '';
  }

  get nightTargets() {
    return this.alivePlayers.filter(p => p.index !== this.myIndexVal);
  }

  get isCreator(): boolean {
    return this.gameService.isCreator(this.gameId);
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

  revealCardBg(role: string): string {
    const map: Record<string, string> = {
      Mafia:     'bg-gradient-to-br from-red-950 to-rose-950 border-red-600/40',
      Doctor:    'bg-gradient-to-br from-green-950 to-emerald-950 border-green-600/40',
      Detective: 'bg-gradient-to-br from-blue-950 to-indigo-950 border-blue-600/40',
      Villager:  'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40',
    };
    return map[role] ?? 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40';
  }

  revealRoleIcon(role: string): string {
    const map: Record<string, string> = {
      Mafia: '🔪', Doctor: '💊', Detective: '🔍', Villager: '🏘️',
    };
    return map[role] ?? '❓';
  }

  revealGlowColor(role: string): string {
    const map: Record<string, string> = {
      Mafia: 'bg-red-500', Doctor: 'bg-green-500', Detective: 'bg-blue-500', Villager: 'bg-slate-400',
    };
    return map[role] ?? 'bg-white';
  }

  revealBadge(role: string): string {
    const map: Record<string, string> = {
      Mafia:     'bg-red-500/20 text-red-300 border-red-500/40',
      Doctor:    'bg-green-500/20 text-green-300 border-green-500/40',
      Detective: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      Villager:  'bg-slate-500/20 text-slate-300 border-slate-500/40',
    };
    return map[role] ?? 'bg-white/10 text-white/60 border-white/20';
  }
}
