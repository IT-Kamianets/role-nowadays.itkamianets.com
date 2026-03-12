import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription, EMPTY } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { SocketService } from '../../services/socket.service';
import { ClassicMafiaService, MafiaGameData } from '../../services/classic-mafia.service';
import { ExtendedMafiaService } from '../../services/extended-mafia.service';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Phase Transition Video Overlay -->
    @if (transitionVideo()) {
      <div class="fixed inset-0 z-50 bg-black">
        <video [src]="transitionVideo()!" autoplay muted playsinline preload="auto"
          class="w-full h-full object-cover"
          (ended)="onTransitionEnd()"
          (error)="onTransitionEnd()"
          (stalled)="onVideoStalled()">
        </video>
      </div>
    }

    <!-- Role Reveal Overlay -->
    @if (showRoleReveal() && myRoleDef && myRole) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black px-8"
        [class]="roleRevealed() ? 'pointer-events-none' : ''">
        <div class="w-full max-w-sm"
          [class.card-fly-right]="roleRevealed()">
          <div class="flip-card w-full">
            <div class="flip-inner w-full rounded-2xl shadow-2xl shadow-black/80"
              [class.flipped]="cardFlipped()">
              <img src="/card-back.jpg" alt="Card back"
                class="flip-face w-full rounded-2xl block" />
              <img [src]="roleCardImage(myRole!)" [alt]="myRole!"
                class="flip-back-face w-full rounded-2xl block" />
            </div>
          </div>
        </div>
      </div>
    }

    <div class="min-h-screen bg-[#0d0905]">
      <div class="max-w-md mx-auto">

        <!-- Header -->
        <header class="sticky top-0 z-10 bg-[#0d0905]/95 border-b border-[#2d1f10]">
          <div class="px-5 pt-10 pb-3 flex items-center gap-3">
            <button (click)="back()"
              class="w-10 h-10 rounded-xl bg-[#1a110a] border border-[#2d1f10] flex items-center justify-center text-amber-100/50 hover:bg-amber-900/20 transition-colors shrink-0">
              ←
            </button>
            <h1 class="text-lg font-black text-amber-100 flex-1 uppercase tracking-wide">Ігрова кімната</h1>
            @if (currentGame()?.pass) {
              <div class="bg-amber-700/20 border border-amber-600/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <span class="text-[10px] text-amber-100/40 uppercase tracking-wider">PIN</span>
                <span class="text-sm font-mono font-bold text-amber-400">{{ currentGame()!.pass }}</span>
              </div>
            }
          </div>
          @if (splitLayoutVisible() && myRoleDef && myRole) {
            <div class="px-5 py-3 border-t border-[#2d1f10]">
              <div class="grid grid-cols-2 gap-3 items-start">
                <!-- Left: phase panel (animates on phase change) -->
                @for (key of [phaseAnimKey()]; track key) {
                  <div class="phase-panel-anim rounded-xl p-3 flex flex-col gap-1"
                    [class]="effectivePhase === 'night'
                      ? 'bg-indigo-950/60 border border-indigo-800/40'
                      : effectivePhase === 'voting'
                        ? 'bg-red-950/50 border border-red-800/30'
                        : 'bg-amber-950/50 border border-amber-700/30'">
                    <div class="text-2xl">
                      {{ effectivePhase === 'night' ? '🌙' : effectivePhase === 'voting' ? '⚖️' : '☀️' }}
                    </div>
                    <p class="text-sm font-black uppercase text-amber-100 leading-tight">
                      {{ effectivePhase === 'night' ? 'Ніч' : effectivePhase === 'voting' ? 'Голосування' : 'День' }}
                      {{ (effectivePhase === 'night' || effectivePhase === 'day') ? '· ' + gameData?.round : '' }}
                    </p>
                    <p class="text-xl font-black tabular-nums leading-tight"
                      [class]="effectivePhase === 'night'
                        ? (nightSecondsLeft() <= 10 ? 'text-red-400' : 'text-indigo-300')
                        : effectivePhase === 'voting'
                          ? (votingSecondsLeft() <= 10 ? 'text-red-400' : 'text-red-300')
                          : (daySecondsLeft() <= 10 ? 'text-red-400' : 'text-amber-400')">
                      {{ effectivePhase === 'night' ? nightSecondsLeft() : effectivePhase === 'voting' ? votingSecondsLeft() : daySecondsLeft() }}
                      <span class="text-[10px] text-amber-100/30 font-normal">сек</span>
                    </p>
                  </div>
                }
                <!-- Right: role card (tappable — hides role from bystanders) -->
                <div class="role-card-anim flip-card rounded-xl shadow-lg shadow-black/50 cursor-pointer relative"
                  (click)="toggleRoleCard()">
                  <div class="flip-inner rounded-xl" [class.flipped]="!roleCardHidden()">
                    <img src="/card-back.jpg" alt="Card back" class="flip-face w-full rounded-xl block" />
                    <img [src]="roleCardImage(myRole!)" [alt]="myRole!" class="flip-back-face w-full rounded-xl block" />
                  </div>
                  <div class="absolute bottom-1 right-1 text-[10px] leading-none pointer-events-none">
                    {{ roleCardHidden() ? '🔓' : '🔒' }}
                  </div>
                </div>
              </div>
            </div>
          }
        </header>

        <main class="px-5 pt-5 pb-28 space-y-5">

          <!-- LOADING -->
          @if (effectivePhase === 'loading') {
            <div class="flex items-center justify-center py-20">
              <div class="w-8 h-8 rounded-full border-2 border-amber-700 border-t-transparent animate-spin"></div>
            </div>
          }

          <!-- ═══════════════════════════════════════════════════ LOBBY -->
          @if (effectivePhase === 'lobby') {

            <!-- Hero banner -->
            <div class="relative overflow-hidden rounded-2xl border border-[#2d1f10] p-5 bg-[#1a110a]">
              <div class="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-700/10 blur-2xl pointer-events-none"></div>
              <div class="relative flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-amber-900/40 border border-amber-700/20 flex items-center justify-center text-2xl shrink-0">
                  🏛️
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-700/80 mb-0.5">Очікування гравців</p>
                  <p class="text-lg font-black text-amber-100 uppercase tracking-wide">{{ currentGame()?.mode ?? '—' }}</p>
                  <p class="text-xs text-amber-100/30 mt-0.5">{{ currentGame()?.players?.length ?? 0 }} з {{ currentGame()?.maxPlayers ?? '?' }} приєдналось</p>
                </div>
              </div>
              <div class="mt-4 bg-amber-900/20 rounded-full h-1 overflow-hidden">
                <div class="bg-amber-700 h-full rounded-full transition-all duration-500"
                  [style.width.%]="((currentGame()?.players?.length ?? 0) / (currentGame()?.maxPlayers ?? 1)) * 100">
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <p class="text-[10px] text-amber-100/25 uppercase tracking-wider">Лобі дійсне</p>
                <p class="text-[11px] font-mono font-bold tabular-nums"
                  [class]="lobbySecondsLeft() <= 120 ? 'text-red-400' : 'text-amber-100/40'">
                  {{ formatLobbyTime(lobbySecondsLeft()) }}
                </p>
              </div>
            </div>

            <!-- PIN card -->
            @if (currentGame()?.pass) {
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl px-5 py-4 flex items-center gap-4">
                <div class="flex-1">
                  <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-1.5">PIN для входу</p>
                  <p class="text-3xl font-black font-mono tracking-[0.2em] text-amber-400">{{ currentGame()!.pass }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-700/15 border border-amber-600/20 flex items-center justify-center text-lg">
                  🔑
                </div>
              </div>
            }

            <!-- Player list -->
            <div>
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">
                Гравці · {{ currentGame()?.players?.length ?? 0 }} / {{ currentGame()?.maxPlayers ?? 0 }}
              </p>
              <div class="space-y-2">
                @for (i of playerIndices; track i) {
                  <div class="bg-[#1a110a] border border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3">
                    <div class="w-9 h-9 rounded-xl bg-amber-700 flex items-center justify-center text-xs font-black text-amber-50 shrink-0">
                      {{ i + 1 }}
                    </div>
                    <span class="text-sm text-amber-100/80">{{ playerName(i) }}</span>
                    @if (i === myIndexVal) {
                      <span class="ml-auto text-[10px] text-amber-400 font-bold bg-amber-700/15 px-2 py-0.5 rounded-lg">Ви</span>
                    }
                  </div>
                }
                @for (i of emptySlotIndices; track i) {
                  <div class="border border-dashed border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3 opacity-35">
                    <div class="w-9 h-9 rounded-xl bg-[#2d1f10] flex items-center justify-center text-xs font-black text-amber-100/20 shrink-0">
                      {{ (currentGame()?.players?.length ?? 0) + i + 1 }}
                    </div>
                    <span class="text-sm text-amber-100/20 italic">Очікується...</span>
                  </div>
                }
              </div>
            </div>

            <!-- Start button — creator only -->
            @if (isCreator) {
              <div class="space-y-3">
                <p class="text-xs text-amber-100/30 text-center">Почніть гру коли збереться достатньо гравців (мін. 2)</p>
                <button (click)="startGame()" [disabled]="loading() || (currentGame()?.players?.length ?? 0) < 2"
                  class="w-full bg-amber-700 hover:bg-amber-600 text-amber-50 font-black py-4 rounded-2xl uppercase tracking-wide disabled:opacity-40 active:scale-[0.97] transition-all">
                  {{ loading() ? 'Запуск...' : '⚔️ Розподілити ролі та почати' }}
                </button>
                @if (errorMsg()) {
                  <p class="text-xs text-red-400 text-center">{{ errorMsg() }}</p>
                }
              </div>
            } @else {
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-4 text-center">
                <div class="w-5 h-5 rounded-full border-2 border-amber-700 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p class="text-sm text-amber-100/40">Очікування хоста для початку гри...</p>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ NIGHT -->
          @if (effectivePhase === 'night') {

            <!-- Sleeping roles: no night action -->
            @if (isSleepingRole(myRole)) {
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-6 text-center">
                <div class="text-4xl mb-3">😴</div>
                <h3 class="text-base font-black text-amber-100 mb-1.5">Ви заснули...</h3>
                <p class="text-sm text-amber-100/50">Містяни сплять. Чекайте ранку.</p>
              </div>
            }

            <!-- Standard night action roles (all except Arsonist) -->
            @if (hasNightAction(myRole) && myRole !== 'Arsonist') {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">{{ roleNightActionLabel }}</p>
                <div class="space-y-2">
                  @for (p of currentNightTargets; track p.index) {
                    <button (click)="submitNightAction(p.index)"
                      class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left"
                      [class]="myNightTarget === p.index ? 'border-amber-600/60 bg-amber-900/20' : 'bg-[#1a110a] border-[#2d1f10] hover:bg-amber-900/10'">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-amber-50 shrink-0"
                        [class]="myNightTarget === p.index ? 'bg-amber-600' : 'bg-amber-700'">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                      @if (myNightTarget === p.index) {
                        <span class="text-[10px] text-amber-400 font-bold">Вибрано ✓</span>
                      }
                    </button>
                  }
                </div>
                @if (hasSubmittedNightAction) {
                  <div class="mt-3 bg-green-950/40 border border-green-800/30 rounded-xl p-3 text-center">
                    <p class="text-xs text-green-400">Дію подано. Очікування інших гравців...</p>
                  </div>
                }
              </div>
            }

            <!-- Arsonist special UI -->
            @if (myRole === 'Arsonist') {
              <div class="space-y-4">
                <div>
                  <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-orange-400/70 mb-3">🔥 Облити бензином</p>
                  <div class="space-y-2">
                    @for (p of nightTargets; track p.index) {
                      <button (click)="submitNightAction(p.index)"
                        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left"
                        [class]="myNightTarget === p.index ? 'border-orange-600/60 bg-orange-900/20' : 'bg-[#1a110a] border-[#2d1f10] hover:bg-orange-900/10'">
                        <div class="w-9 h-9 rounded-xl bg-orange-700/80 flex items-center justify-center text-xs font-black text-amber-50 shrink-0">
                          {{ p.index + 1 }}
                        </div>
                        <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                        @if (dousedPlayers.includes(p.index)) {
                          <span class="text-[10px] text-orange-400 font-bold">Облито 🔥</span>
                        }
                        @if (myNightTarget === p.index) {
                          <span class="text-[10px] text-amber-400 font-bold">Вибрано ✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
                @if (dousedPlayers.length > 0) {
                  <button (click)="submitArsonistIgnite()"
                    class="w-full bg-red-700 hover:bg-red-600 text-white font-black py-3 rounded-xl uppercase tracking-wide text-sm transition-all active:scale-[0.97]">
                    🔥 Підпалити всіх! ({{ dousedPlayers.length }})
                  </button>
                }
                @if (hasSubmittedNightAction) {
                  <div class="bg-green-950/40 border border-green-800/30 rounded-xl p-3 text-center">
                    <p class="text-xs text-green-400">Дію подано. Очікування інших гравців...</p>
                  </div>
                }
              </div>
            }

            <!-- Mafia team night chat -->
            @if (isMafiaTeamMember(myRole)) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-red-400/70 mb-3">🔪 Чат мафії</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden">
                  <div class="max-h-40 overflow-y-auto p-3 space-y-2 min-h-[40px]">
                    @for (msg of nightMessages; track $index) {
                      <div class="text-xs">
                        <span class="font-bold text-red-400">{{ msg.creator?.name }}</span>
                        <span class="text-amber-100/60 ml-1">{{ msg.text }}</span>
                      </div>
                    }
                    @if (nightMessages.length === 0) {
                      <p class="text-xs text-amber-100/20 text-center">Порожньо</p>
                    }
                  </div>
                  <div class="border-t border-[#2d1f10] flex">
                    <input [(ngModel)]="nightChatText"
                      (keyup.enter)="sendNightMessage()"
                      placeholder="Повідомлення мафії..."
                      class="flex-1 bg-transparent px-3 py-2.5 text-sm text-amber-100 placeholder-amber-100/20 outline-none" />
                    <button (click)="sendNightMessage()"
                      class="bg-red-700 rounded-xl px-4 my-1.5 mr-1.5 font-black text-white text-sm transition-colors">
                      →
                    </button>
                  </div>
                </div>
              </div>
            }

            @if (myLog().length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал дій</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden divide-y divide-[#2d1f10]">
                  @for (entry of myLog(); track $index) {
                    <div class="px-4 py-2.5 flex items-start gap-2.5">
                      <span class="text-sm shrink-0 mt-0.5">{{ logEntryIcon(entry) }}</span>
                      <p class="text-xs leading-relaxed" [class]="logEntryClass(entry)">{{ entry.text }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          }

          <!-- ═══════════════════════════════════════════════════ DAY -->
          @if (effectivePhase === 'day') {

            <!-- Night result -->
            <div class="rounded-2xl p-5 border text-center"
              [class]="gameData?.eliminated !== null && gameData?.eliminated !== undefined
                ? 'bg-red-950/50 border-red-900/50'
                : 'bg-green-950/50 border-green-900/50'">
              @if (gameData?.eliminated !== null && gameData?.eliminated !== undefined) {
                <div class="text-3xl mb-3">💀</div>
                <h3 class="text-base font-black text-amber-100 mb-1">{{ playerName(gameData?.eliminated ?? 0) }} загинув</h3>
                <p class="text-sm text-amber-100/50">{{ roleNameUk(gameData?.roles?.[(gameData?.eliminated ?? 0).toString()] ?? '') }}</p>
              } @else {
                <div class="text-3xl mb-3">✨</div>
                <h3 class="text-base font-black text-amber-100 mb-1">Ніхто не загинув!</h3>
                <p class="text-sm text-amber-100/50">Лікар захистив або мафія не діяла.</p>
              }
            </div>

            <!-- Detective result -->
            @if (myRole === 'Detective' && gameData?.night?.detectiveResult) {
              <div class="rounded-2xl p-4 border"
                [class]="gameData?.night?.detectiveResult === 'mafia'
                  ? 'bg-red-950/40 border-red-900/30'
                  : 'bg-green-950/40 border-green-900/30'">
                <p class="text-xs font-bold mb-2"
                  [class]="gameData?.night?.detectiveResult === 'mafia' ? 'text-red-400' : 'text-green-400'">
                  🔍 Результат вашої перевірки
                </p>
                <p class="text-sm text-amber-100/80">
                  {{ playerName(gameData?.night?.detectiveTarget ?? 0) }} —
                  <strong>{{ gameData?.night?.detectiveResult === 'mafia' ? 'МАФІЯ' : 'МІСТЯНИН' }}</strong>
                </p>
              </div>
            }

            <!-- Sheriff result -->
            @if (myRole === 'Sheriff' && gameData?.night?.sheriffResult) {
              <div class="rounded-2xl p-4 border"
                [class]="gameData?.night?.sheriffResult === 'mafia'
                  ? 'bg-red-950/40 border-red-900/30'
                  : 'bg-green-950/40 border-green-900/30'">
                <p class="text-xs font-bold mb-2"
                  [class]="gameData?.night?.sheriffResult === 'mafia' ? 'text-red-400' : 'text-green-400'">
                  ⭐ Результат перевірки шерифа
                </p>
                <p class="text-sm text-amber-100/80">
                  {{ playerName(gameData?.night?.sheriffTarget ?? 0) }} —
                  <strong>{{ gameData?.night?.sheriffResult === 'mafia' ? 'МАФІЯ' : 'МІСТО' }}</strong>
                </p>
              </div>
            }

            <!-- Consigliere result -->
            @if (myRole === 'Consigliere' && gameData?.night?.consigliereResult) {
              <div class="rounded-2xl p-4 border bg-orange-950/40 border-orange-900/30">
                <p class="text-xs font-bold text-orange-400 mb-2">📖 Результат розвідки</p>
                <p class="text-sm text-amber-100/80">
                  {{ playerName(gameData?.night?.consigliereTarget ?? 0) }} —
                  <strong>{{ roleNameUk(gameData?.night?.consigliereResult ?? '') }}</strong>
                </p>
              </div>
            }

            <!-- Tracker result -->
            @if (myRole === 'Tracker' && gameData?.night?.trackerResult !== null && gameData?.night?.trackerResult !== undefined) {
              <div class="rounded-2xl p-4 border bg-cyan-950/40 border-cyan-900/30">
                <p class="text-xs font-bold text-cyan-400 mb-2">👁️ Результат відстеження</p>
                <p class="text-sm text-amber-100/80">
                  {{ playerName(gameData?.night?.trackerTarget ?? 0) }} відвідав
                  <strong>{{ playerName(gameData?.night?.trackerResult ?? 0) }}</strong>
                </p>
              </div>
            }

            <!-- Watcher result -->
            @if (myRole === 'Watcher' && gameData?.night?.watcherResult?.length) {
              <div class="rounded-2xl p-4 border bg-purple-950/40 border-purple-900/30">
                <p class="text-xs font-bold text-purple-400 mb-2">🔭 Відвідувачі цілі</p>
                <div class="space-y-1">
                  @for (visitorIdx of (gameData?.night?.watcherResult ?? []); track visitorIdx) {
                    <p class="text-sm text-amber-100/80">Гравець {{ visitorIdx + 1 }} — {{ playerName(visitorIdx) }}</p>
                  }
                </div>
              </div>
            }

            <!-- Alive players -->
            <div>
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Живі · {{ alivePlayers.length }}</p>
              <div class="space-y-2">
                @for (p of alivePlayers; track p.index) {
                  <div class="bg-[#1a110a] border border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3">
                    <div class="w-9 h-9 rounded-xl bg-amber-700 flex items-center justify-center text-xs font-black text-amber-50 shrink-0">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                    @if (p.index === myIndexVal) {
                      <span class="text-[10px] text-amber-400 font-bold bg-amber-700/15 px-2 py-0.5 rounded-lg">Ви</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Event log -->
            @if (myLog().length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал дій</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden divide-y divide-[#2d1f10]">
                  @for (entry of myLog(); track $index) {
                    <div class="px-4 py-2.5 flex items-start gap-2.5">
                      <span class="text-sm shrink-0 mt-0.5">{{ logEntryIcon(entry) }}</span>
                      <p class="text-xs leading-relaxed" [class]="logEntryClass(entry)">{{ entry.text }}</p>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Day chat -->
            <div>
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Чат · День</p>
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden">
                <div class="max-h-48 overflow-y-auto p-3 space-y-2 min-h-[48px]">
                  @for (msg of dayMessages; track $index) {
                    <div class="text-xs">
                      <span class="font-bold text-amber-400">{{ msg.creator?.name }}</span>
                      <span class="text-amber-100/60 ml-1">{{ msg.text }}</span>
                    </div>
                  }
                  @if (dayMessages.length === 0) {
                    <p class="text-xs text-amber-100/20 text-center">Немає повідомлень</p>
                  }
                </div>
                <div class="border-t border-[#2d1f10] flex">
                  <input [(ngModel)]="dayChatText"
                    (keyup.enter)="sendDayMessage()"
                    placeholder="Повідомлення..."
                    class="flex-1 bg-transparent px-3 py-2.5 text-sm text-amber-100 placeholder-amber-100/20 outline-none" />
                  <button (click)="sendDayMessage()"
                    class="bg-amber-700 rounded-xl px-4 my-1.5 mr-1.5 font-black text-amber-50 text-sm transition-colors">
                    →
                  </button>
                </div>
              </div>
            </div>

            <!-- Timer notice -->
            <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-4 text-center">
              @if (daySecondsLeft() > 0) {
                <p class="text-sm text-amber-400/70">Голосування розпочнеться автоматично через {{ daySecondsLeft() }} сек</p>
              } @else {
                <p class="text-sm text-amber-400/70">Переходимо до голосування...</p>
              }
            </div>
          }

          <!-- ═══════════════════════════════════════════════════ VOTING -->
          @if (effectivePhase === 'voting') {

            <div class="bg-red-950/50 border border-red-800/30 rounded-2xl p-5 flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-red-800/50 flex items-center justify-center text-3xl shrink-0">⚖️</div>
              <div class="flex-1">
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-red-400 mb-0.5">Поточна фаза</p>
                <p class="text-2xl font-black uppercase text-amber-100">Голосування</p>
                <p class="text-xs text-amber-100/50 mt-0.5">{{ voteCount }}/{{ alivePlayers.length }} проголосували</p>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-2xl font-black tabular-nums"
                  [class]="votingSecondsLeft() <= 10 ? 'text-red-400' : 'text-red-300'">
                  {{ votingSecondsLeft() }}
                </div>
                <div class="text-[10px] text-amber-100/30 uppercase tracking-wider">сек</div>
              </div>
            </div>

            @if (isMyPlayerAlive) {
              @if (!hasVoted()) {
              <!-- Voting: pick target -->
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Живі гравці</p>
                <div class="space-y-2">
                  @for (p of votingTargets; track p.index) {
                    <button (click)="submitVote(p.index)"
                      class="w-full flex items-center gap-3 px-4 py-3.5 bg-[#1a110a] border border-[#2d1f10] rounded-xl transition-colors text-left hover:bg-amber-900/10 active:bg-amber-900/20">
                      <div class="w-9 h-9 rounded-xl bg-amber-700 flex items-center justify-center text-xs font-black text-amber-50 shrink-0">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                    </button>
                  }
                </div>
              </div>
              } @else {
              <!-- Already voted: waiting -->
              <div class="bg-[#1a110a] border border-green-800/40 rounded-2xl p-5 text-center">
                <div class="text-3xl mb-3">✅</div>
                <h3 class="text-base font-black text-amber-100 mb-1.5">Ви проголосували за {{ playerName(myVoteTarget() ?? 0) }}</h3>
                <p class="text-sm text-amber-100/50">Очікування інших... ({{ voteCount }}/{{ alivePlayers.length }})</p>
                <button (click)="changeVote()" class="mt-4 px-4 py-2 rounded-xl bg-amber-900/40 border border-amber-700/40 text-amber-300 text-sm font-bold active:opacity-70">Змінити голос</button>
              </div>

              <!-- Vote progress -->
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Живі гравці</p>
                <div class="space-y-2">
                  @for (p of alivePlayers; track p.index) {
                    <div class="bg-[#1a110a] border border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3">
                      <div class="w-9 h-9 rounded-xl bg-amber-700 flex items-center justify-center text-xs font-black text-amber-50 shrink-0">
                        {{ p.index + 1 }}
                      </div>
                      <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                      @if (hasPlayerVoted(p.index)) {
                        <span class="text-[10px] font-black text-green-400 uppercase">Проголосував ✓</span>
                      } @else {
                        <span class="text-[10px] text-amber-100/25">очікує...</span>
                      }
                    </div>
                  }
                </div>
              </div>
              }
            } @else {
              <!-- Dead player spectator -->
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-5 text-center">
                <div class="text-3xl mb-3">💀</div>
                <p class="text-sm text-amber-100/50">Ви вибули. Спостерігайте за голосуванням.</p>
              </div>
            }

            @if (myLog().length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал дій</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden divide-y divide-[#2d1f10]">
                  @for (entry of myLog(); track $index) {
                    <div class="px-4 py-2.5 flex items-start gap-2.5">
                      <span class="text-sm shrink-0 mt-0.5">{{ logEntryIcon(entry) }}</span>
                      <p class="text-xs leading-relaxed" [class]="logEntryClass(entry)">{{ entry.text }}</p>
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
              [class]="winnerBannerClass()">
              <div class="text-5xl mb-4">{{ winnerIcon() }}</div>
              <h2 class="text-2xl font-black text-amber-100 mb-2 uppercase tracking-wide">
                {{ winnerLabel() }}
              </h2>
              <p class="text-sm text-amber-100/50">{{ winnerDescription() }}</p>
            </div>

            <!-- All roles reveal -->
            <div>
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Всі ролі</p>
              <div class="space-y-2">
                @for (p of allPlayers; track p.index) {
                  <div class="bg-[#1a110a] border border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3" [class]="!p.isAlive ? 'opacity-40' : ''">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      [class]="roleTeamBadgeClass(p.role)">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                    <span class="text-xs font-semibold" [class]="roleTeamTextClass(p.role)">
                      {{ roleIcon(p.role) }} {{ roleNameUk(p.role) }}
                    </span>
                    @if (!p.isAlive) {
                      <span class="text-[10px] text-amber-100/25 ml-1">✝</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Game log -->
            @if (myLog().length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал дій</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden divide-y divide-[#2d1f10]">
                  @for (entry of myLog(); track $index) {
                    <div class="px-4 py-2.5 flex items-start gap-2.5">
                      <span class="text-sm shrink-0 mt-0.5">{{ logEntryIcon(entry) }}</span>
                      <p class="text-xs leading-relaxed" [class]="logEntryClass(entry)">{{ entry.text }}</p>
                    </div>
                  }
                </div>
              </div>
            }

            <button (click)="back()"
              class="w-full bg-amber-700 hover:bg-amber-600 text-amber-50 font-black py-4 rounded-2xl uppercase tracking-wide active:scale-[0.97] transition-all">
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
  lobbySecondsLeft = signal(1200);
  daySecondsLeft = signal(60);
  nightSecondsLeft = signal(30);
  votingSecondsLeft = signal(30);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  allMessages = signal<any[]>([]);
  showRoleReveal = signal(false);
  roleRevealed = signal(false);
  cardFlipped = signal(false);
  splitLayoutVisible = signal(false);
  phaseAnimKey = signal(0);
  transitionVideo = signal<string | null>(null);
  roleCardHidden = signal(false);

  myLog = signal<{ text: string; type: 'event' | 'action' }[]>([]);
  private lastLogLength = 0;

  myIndexVal = -1;
  dayChatText = '';
  nightChatText = '';

  private gameId = '';
  private roleRevealShown = false;
  private revealAfterTransition = false;
  private pollSub?: Subscription;
  private socketSub?: Subscription;
  private msgPollSub?: Subscription;
  private timerInterval?: ReturnType<typeof setInterval>;
  private revealTimeout1?: ReturnType<typeof setTimeout>;
  private revealTimeout2?: ReturnType<typeof setTimeout>;
  private revealTimeout3?: ReturnType<typeof setTimeout>;
  private videoFallbackTimeout?: ReturnType<typeof setTimeout>;
  private dayTransitionSent = false;
  private nightTransitionSent = false;
  private votingTransitionSent = false;

  constructor(
    private gameService: GameService,
    private socketService: SocketService,
    private classicMafia: ClassicMafiaService,
    private extendedMafia: ExtendedMafiaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.myIndexVal = this.gameService.getPlayerIndex(this.gameId);

    if (this.gameId) {
      // Initial load
      this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY)).subscribe(game => {
        if (game && typeof game === 'object') this.applyGameUpdate(game);
      });

      // WebSocket real-time updates
      this.socketService.connect();
      this.socketSub = this.socketService.onGameUpdate().subscribe(game => {
        if (game._id === this.gameId) this.applyGameUpdate(game);
      });

      // Fallback polling every 30s
      this.pollSub = interval(30000).pipe(
        switchMap(() => this.gameService.getGame(this.gameId).pipe(catchError(() => EMPTY))),
      ).subscribe(game => {
        if (game && typeof game === 'object') this.applyGameUpdate(game);
      });

      this.msgPollSub = interval(3000).pipe(
        switchMap(() => this.gameService.getMessages(this.gameId).pipe(catchError(() => EMPTY))),
      ).subscribe(msgs => {
        if (Array.isArray(msgs)) this.allMessages.set(msgs);
      });
    }

    this.timerInterval = setInterval(() => {
      const id = this.gameId;
      if (id && this.effectivePhase === 'lobby') {
        const created = parseInt(id.substring(0, 8), 16) * 1000;
        const left = Math.max(0, 1200 - Math.floor((Date.now() - created) / 1000));
        this.lobbySecondsLeft.set(left);
      }

      const d = this.gameData;
      const revealActive = this.showRoleReveal() || this.revealAfterTransition || !!this.transitionVideo();

      if (d?.phase === 'day' && d.phaseStartedAt) {
        if (revealActive) {
          this.daySecondsLeft.set(d.settings?.dayDuration ?? 60);
        } else {
          const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
          const left = Math.max(0, (d.settings?.dayDuration ?? 60) - elapsed);
          this.daySecondsLeft.set(left);
          if (left === 0 && !this.dayTransitionSent) {
            this.dayTransitionSent = true;
            this.triggerDayToVoting();
          }
        }
      } else {
        this.daySecondsLeft.set(d?.settings?.dayDuration ?? 60);
        this.dayTransitionSent = false;
      }

      if (d?.phase === 'night' && d.phaseStartedAt) {
        if (revealActive) {
          // Freeze the timer display at full duration while role reveal animation plays
          this.nightSecondsLeft.set(d.settings?.nightDuration ?? 30);
        } else {
          const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
          const left = Math.max(0, (d.settings?.nightDuration ?? 30) - elapsed);
          this.nightSecondsLeft.set(left);
          if (left === 0 && !this.nightTransitionSent) {
            this.nightTransitionSent = true;
            this.triggerNightToDay();
          }
        }
      } else {
        this.nightSecondsLeft.set(d?.settings?.nightDuration ?? 30);
        this.nightTransitionSent = false;
      }

      if (d?.phase === 'voting' && d.phaseStartedAt) {
        if (revealActive) {
          this.votingSecondsLeft.set(d.settings?.votingDuration ?? 30);
        } else {
          const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
          const left = Math.max(0, (d.settings?.votingDuration ?? 30) - elapsed);
          this.votingSecondsLeft.set(left);
          if (left === 0 && !this.votingTransitionSent) {
            this.votingTransitionSent = true;
            this.triggerVotingEnd();
          }
        }
      } else {
        this.votingSecondsLeft.set(d?.settings?.votingDuration ?? 30);
        this.votingTransitionSent = false;
      }
    }, 1000);
  }

  private applyGameUpdate(game: Game) {
    const prevPhase = (this.currentGame()?.data as Partial<MafiaGameData>)?.phase;
    const newPhase  = (game.data as Partial<MafiaGameData>)?.phase;
    if (prevPhase === 'voting' && newPhase !== 'voting') {
      this.hasVoted.set(false);
      this.myVoteTarget.set(null);
    }
    this.currentGame.set(game);
    const newData = game.data as Partial<MafiaGameData>;
    const globalLog = newData?.log ?? [];
    if (globalLog.length > this.lastLogLength) {
      const newEntries = globalLog.slice(this.lastLogLength);
      this.myLog.update(l => [
        ...l,
        ...newEntries.map(text => ({ text, type: 'event' as const }))
      ]);
      this.lastLogLength = globalLog.length;
    }
    if (newPhase === 'night') {
      const round = (game.data as Partial<MafiaGameData>)?.round;
      if (round === 1 && this.myIndexVal >= 0 && !this.roleRevealShown) {
        this.roleRevealShown = true;
        this.revealAfterTransition = true;
        this.playTransitionVideo('/day-to-night.mp4');
      }
    }
    const isActivePhase = ['night', 'day', 'voting'].includes(newPhase ?? '');
    if (isActivePhase && !this.splitLayoutVisible() && !this.showRoleReveal()) {
      this.splitLayoutVisible.set(true);
    }
    if (prevPhase && prevPhase !== newPhase && isActivePhase && this.splitLayoutVisible()) {
      if (prevPhase === 'night' && newPhase === 'day') {
        this.playTransitionVideo('/night-to-day.mp4');
      } else if ((prevPhase === 'day' || prevPhase === 'voting') && newPhase === 'night') {
        this.playTransitionVideo('/day-to-night.mp4');
      } else {
        this.phaseAnimKey.update(k => k + 1);
      }
    }
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.socketSub?.unsubscribe();
    this.msgPollSub?.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
    clearTimeout(this.revealTimeout1);
    clearTimeout(this.revealTimeout2);
    clearTimeout(this.revealTimeout3);
    clearTimeout(this.videoFallbackTimeout);
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
    return this.extendedMafia.ROLE_DEFS[role] ?? this.classicMafia.ROLE_DEFS[role] ?? null;
  }

  get playerIndices(): number[] {
    const g = this.currentGame();
    return g ? Array.from({ length: g.players.length }, (_, i) => i) : [];
  }

  get emptySlotIndices(): number[] {
    const current = this.currentGame()?.players?.length ?? 0;
    const max = this.currentGame()?.maxPlayers ?? 0;
    const empty = Math.max(0, max - current);
    return Array.from({ length: Math.min(empty, 4) }, (_, i) => i);
  }

  get alivePlayers() {
    const g = this.currentGame();
    const d = this.gameData;
    if (!g) return [];
    const indices = d?.alive ?? Array.from({ length: g.players.length }, (_, i) => i);
    return indices.map(i => ({ index: i, label: this.playerName(i), role: d?.roles?.[String(i)] ?? '?' }));
  }

  get votingTargets() {
    return this.alivePlayers.filter(p => p.index !== this.myIndexVal);
  }

  get isMyPlayerAlive(): boolean {
    return this.alivePlayers.some(p => p.index === this.myIndexVal);
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

  get dousedPlayers(): number[] {
    return this.gameData?.arsonistDoused ?? [];
  }

  // ── Actions ───────────────────────────────────────────────────────────

  back() { this.router.navigate(['/home']); }

  startGame() {
    const g = this.currentGame();
    if (!g) return;
    const raw = localStorage.getItem('gameSettings_' + this.gameId);
    const parsed = raw ? JSON.parse(raw) : {};
    const settings = {
      dayDuration: parsed.dayDuration ?? 60,
      nightDuration: parsed.nightDuration ?? 30,
      votingDuration: parsed.votingDuration ?? 30,
    };
    const mode = g.mode;
    let data: MafiaGameData;
    if (mode === 'Classic') {
      data = this.classicMafia.initGameData(g.players.length, settings);
    } else {
      const customRoles = parsed.customRoles ?? undefined;
      data = this.extendedMafia.initGameData(g.players.length, settings, customRoles);
    }
    this.loading.set(true);
    this.errorMsg.set(null);
    this.gameService.updateGame(this.gameId, { status: 'running', data }).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          const newPhase = (game.data as Partial<MafiaGameData>)?.phase;
          const round = (game.data as Partial<MafiaGameData>)?.round;
          if (newPhase === 'night' && round === 1 && this.myIndexVal >= 0 && !this.roleRevealShown) {
            this.roleRevealShown = true;
            this.revealAfterTransition = true;
            this.playTransitionVideo('/day-to-night.mp4');
          }
          this.gameService.emitUpdate(game);
        }
        this.loading.set(false);
      },
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
      Mafia: 'mafiaTarget', Godfather: 'mafiaTarget',
      Doctor: 'doctorTarget', Detective: 'detectiveTarget',
      Bodyguard: 'bodyguardTarget', Sheriff: 'sheriffTarget',
      Tracker: 'trackerTarget', Watcher: 'watcherTarget',
      Consigliere: 'consigliereTarget', Roleblocker: 'roleblockerTarget',
      Poisoner: 'poisonerTarget', Framer: 'framerTarget',
      SerialKiller: 'serialKillerTarget', Arsonist: 'arsonistTarget', Priest: 'priestTarget',
    };
    const field = roleToField[role];
    if (!field) return;
    // Add personal log entry
    const actionText = this.getNightActionLogText(target, role);
    this.myLog.update(l => [...l, { text: actionText, type: 'action' }]);
    this.gameService.submitNightAction(this.gameId, field, target).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
    });
  }

  submitArsonistIgnite() {
    this.myLog.update(l => [...l, { text: 'Ви підпалили всіх облитих!', type: 'action' }]);
    this.gameService.submitNightAction(this.gameId, 'arsonistIgnite', 1).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
    });
  }

  triggerDayToVoting() {
    if (!this.isCreator) { this.dayTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'day') { this.dayTransitionSent = false; return; }
    this.gameService.updateGame(this.gameId, { data: { ...d, phase: 'voting', votes: {}, phaseStartedAt: Date.now() } }).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
      error: () => { this.dayTransitionSent = false; },
    });
  }

  triggerNightToDay() {
    if (!this.isCreator) { this.nightTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'night') { this.nightTransitionSent = false; return; }
    const mode = this.currentGame()?.mode;
    let resolved: MafiaGameData;
    let winner: MafiaGameData['winner'];
    if (mode === 'Classic') {
      resolved = this.classicMafia.resolveNight(d).data;
      winner = this.classicMafia.checkWin(resolved);
    } else {
      resolved = this.extendedMafia.resolveNight(d).data;
      winner = this.extendedMafia.checkWin(resolved);
    }
    const finalData: MafiaGameData = winner
      ? { ...resolved, phase: 'finished', winner }
      : { ...resolved, phaseStartedAt: Date.now() };
    this.gameService.updateGame(this.gameId, { data: finalData }).subscribe({
      next: game => {
        if (game) {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
      error: () => { this.nightTransitionSent = false; },
    });
  }

  triggerVotingEnd() {
    if (!this.isCreator) { this.votingTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'voting') { this.votingTransitionSent = false; return; }
    const tally: Record<number, number> = {};
    for (const [voter, target] of Object.entries(d.votes ?? {})) {
      const weight = d.roles[voter] === 'Mayor' ? 2 : 1;
      tally[target] = (tally[target] ?? 0) + weight;
    }
    const aliveSet = new Set(d.alive);
    let maxVotes = 0, eliminated = d.alive[0];
    for (const [idx, cnt] of Object.entries(tally)) {
      if (aliveSet.has(+idx) && cnt > maxVotes) { maxVotes = cnt; eliminated = +idx; }
    }
    const mode = this.currentGame()?.mode;
    let resolved: MafiaGameData;
    let winner: MafiaGameData['winner'];
    if (mode === 'Classic') {
      resolved = this.classicMafia.resolveVoting(d, eliminated);
      winner = this.classicMafia.checkWin(resolved);
    } else {
      resolved = this.extendedMafia.resolveVoting(d, eliminated);
      winner = resolved.winner ?? this.extendedMafia.checkWin(resolved);
    }
    const finalData: MafiaGameData = winner
      ? { ...resolved, phase: 'finished', winner }
      : { ...resolved, phaseStartedAt: Date.now() };
    this.gameService.updateGame(this.gameId, { data: finalData }).subscribe({
      next: game => {
        if (game) {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
      error: () => { this.votingTransitionSent = false; },
    });
  }

  toggleRoleCard() {
    this.roleCardHidden.update(v => !v);
  }

  changeVote() {
    this.hasVoted.set(false);
    this.myVoteTarget.set(null);
  }

  submitVote(targetIndex: number) {
    if (this.myIndexVal < 0 || !this.isMyPlayerAlive) return;
    this.hasVoted.set(true);
    this.myVoteTarget.set(targetIndex);
    this.myLog.update(l => [...l, { text: `Ви проголосували за ${this.playerName(targetIndex)}`, type: 'action' }]);
    this.gameService.submitVote(this.gameId, this.myIndexVal, targetIndex).subscribe({
      next: game => {
        if (!game || typeof game !== 'object') return;
        this.currentGame.set(game);
        this.gameService.emitUpdate(game);
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

  onTransitionEnd() {
    if (!this.transitionVideo()) return; // already handled
    clearTimeout(this.videoFallbackTimeout);
    this.transitionVideo.set(null);
    if (this.revealAfterTransition) {
      this.revealAfterTransition = false;
      this.showRoleReveal.set(true);
      this.roleRevealed.set(false);
      this.cardFlipped.set(false);
      this.startAutoReveal();
      return;
    }
    this.phaseAnimKey.update(k => k + 1);
  }

  onVideoStalled() {
    // Video buffering or suspended — skip after short delay instead of waiting forever
    clearTimeout(this.videoFallbackTimeout);
    this.videoFallbackTimeout = setTimeout(() => this.onTransitionEnd(), 2_000);
  }

  private playTransitionVideo(src: string) {
    clearTimeout(this.videoFallbackTimeout);
    this.transitionVideo.set(src);
    // Fallback: if ended/error/stalled events all fail — force continue after 12s (video is 8s)
    this.videoFallbackTimeout = setTimeout(() => this.onTransitionEnd(), 12_000);
  }

  private startAutoReveal() {
    this.revealTimeout1 = setTimeout(() => {
      this.cardFlipped.set(true);
      this.revealTimeout2 = setTimeout(() => {
        this.roleRevealed.set(true);
        this.splitLayoutVisible.set(true);
        this.revealTimeout3 = setTimeout(() => {
          this.showRoleReveal.set(false);
          this.cardFlipped.set(false);
        }, 600);
      }, 650 + 2000);
    }, 600);
  }

  // ── Night action helpers ──────────────────────────────────────────────

  isSleepingRole(role: string | null): boolean {
    const sleepers = ['Villager', 'Mayor', 'Survivor', 'Jester', 'Executioner'];
    return !!role && sleepers.includes(role);
  }

  hasNightAction(role: string | null): boolean {
    const actors = ['Mafia', 'Godfather', 'Doctor', 'Detective', 'Bodyguard', 'Sheriff',
      'Tracker', 'Watcher', 'Consigliere', 'Roleblocker', 'Poisoner', 'Framer',
      'SerialKiller', 'Arsonist', 'Priest'];
    return !!role && actors.includes(role);
  }

  isMafiaTeamMember(role: string | null): boolean {
    return !!role && this.extendedMafia.ROLE_DEFS[role]?.team === 'mafia';
  }

  get hasSubmittedNightAction(): boolean {
    const d = this.gameData;
    const role = this.myRole;
    if (!d || !role) return false;
    const n = d.night;
    switch (role) {
      case 'Mafia':
      case 'Godfather':    return n.mafiaTarget !== null;
      case 'Doctor':       return n.doctorTarget !== null;
      case 'Detective':    return n.detectiveTarget !== null;
      case 'Bodyguard':    return n.bodyguardTarget !== null && n.bodyguardTarget !== undefined;
      case 'Sheriff':      return n.sheriffTarget !== null && n.sheriffTarget !== undefined;
      case 'Tracker':      return n.trackerTarget !== null && n.trackerTarget !== undefined;
      case 'Watcher':      return n.watcherTarget !== null && n.watcherTarget !== undefined;
      case 'Consigliere':  return n.consigliereTarget !== null && n.consigliereTarget !== undefined;
      case 'Roleblocker':  return n.roleblockerTarget !== null && n.roleblockerTarget !== undefined;
      case 'Poisoner':     return n.poisonerTarget !== null && n.poisonerTarget !== undefined;
      case 'Framer':       return n.framerTarget !== null && n.framerTarget !== undefined;
      case 'SerialKiller': return n.serialKillerTarget !== null && n.serialKillerTarget !== undefined;
      case 'Arsonist':     return (n.arsonistTarget !== null && n.arsonistTarget !== undefined) || !!n.arsonistIgnite;
      case 'Priest':       return n.priestTarget !== null && n.priestTarget !== undefined;
      default: return true;
    }
  }

  get myNightTarget(): number | null {
    const d = this.gameData;
    const role = this.myRole;
    if (!d || !role) return null;
    const n = d.night;
    switch (role) {
      case 'Mafia':
      case 'Godfather':    return n.mafiaTarget;
      case 'Doctor':       return n.doctorTarget;
      case 'Detective':    return n.detectiveTarget;
      case 'Bodyguard':    return n.bodyguardTarget ?? null;
      case 'Sheriff':      return n.sheriffTarget ?? null;
      case 'Tracker':      return n.trackerTarget ?? null;
      case 'Watcher':      return n.watcherTarget ?? null;
      case 'Consigliere':  return n.consigliereTarget ?? null;
      case 'Roleblocker':  return n.roleblockerTarget ?? null;
      case 'Poisoner':     return n.poisonerTarget ?? null;
      case 'Framer':       return n.framerTarget ?? null;
      case 'SerialKiller': return n.serialKillerTarget ?? null;
      case 'Arsonist':     return n.arsonistTarget ?? null;
      case 'Priest':       return n.priestTarget ?? null;
      default: return null;
    }
  }

  get roleNightActionLabel(): string {
    const map: Record<string, string> = {
      Mafia:       '🔪 Оберіть жертву',
      Godfather:   '🎭 Оберіть жертву (голова мафії)',
      Doctor:      '💊 Оберіть кого захистити',
      Detective:   '🔍 Оберіть кого перевірити',
      Bodyguard:   '🛡️ Оберіть кого охороняти',
      Sheriff:     '⭐ Оберіть кого перевірити',
      Tracker:     '👁️ Оберіть кого відстежити',
      Watcher:     '🔭 Оберіть за ким стежити',
      Consigliere: '📖 Оберіть чию роль дізнатись',
      Roleblocker: '🚫 Оберіть кого заблокувати',
      Poisoner:    '☠️ Оберіть кого отруїти',
      Framer:      '🖼️ Оберіть кого підставити',
      SerialKiller:'🗡️ Оберіть жертву',
      Priest:      '✝️ Оберіть кого освятити цієї ночі',
    };
    return map[this.myRole ?? ''] ?? '';
  }

  get nightTargets() {
    const d = this.gameData;
    const mafiaTeam = new Set(['Mafia', 'Godfather', 'Consigliere', 'Roleblocker', 'Poisoner', 'Framer']);
    const isMafiaRole = this.myRole ? mafiaTeam.has(this.myRole) : false;
    return this.alivePlayers.filter(p => {
      if (p.index === this.myIndexVal) return false;
      // Mafia members cannot target own team
      if (isMafiaRole && d && mafiaTeam.has(d.roles?.[String(p.index)] ?? '')) return false;
      return true;
    });
  }

  // Doctor and Priest can target themselves
  get currentNightTargets() {
    const canSelf = this.myRole === 'Doctor' || this.myRole === 'Priest';
    return canSelf ? this.alivePlayers : this.nightTargets;
  }

  get isCreator(): boolean {
    return this.gameService.isCreator(this.gameId);
  }

  // ── Log helpers ───────────────────────────────────────────────────────

  logEntryIcon(entry: { text: string; type: 'event' | 'action' }): string {
    if (entry.type === 'action') return '✍️';
    if (entry.text.includes('загинув від руки') || entry.text.includes('загинув')) return '💀';
    if (entry.text.includes('усунений голосуванням')) return '⚖️';
    if (entry.text.includes('врятував')) return '💚';
    if (entry.text.includes('Ніхто не загинув')) return '✨';
    if (entry.text.includes('Гра розпочалась')) return '⚔️';
    return '📋';
  }

  logEntryClass(entry: { text: string; type: 'event' | 'action' }): string {
    if (entry.type === 'action') return 'text-amber-400/90';
    if (entry.text.includes('загинув від руки') || entry.text.includes('загинув')) return 'text-red-400/80';
    if (entry.text.includes('усунений голосуванням')) return 'text-orange-400/80';
    if (entry.text.includes('врятував') || entry.text.includes('Ніхто не загинув')) return 'text-green-400/80';
    if (entry.text.includes('Гра розпочалась')) return 'text-amber-400/80';
    return 'text-amber-100/50';
  }

  private getNightActionLogText(target: number, role: string): string {
    const name = this.playerName(target);
    const map: Record<string, string> = {
      Mafia:        `Ви обрали жертву: ${name}`,
      Godfather:    `Ви обрали жертву: ${name}`,
      Doctor:       `Ви захистили: ${name}`,
      Detective:    `Ви перевіряєте: ${name}`,
      Bodyguard:    `Ви охороняєте: ${name}`,
      Sheriff:      `Ви перевіряєте: ${name}`,
      Tracker:      `Ви відстежуєте: ${name}`,
      Watcher:      `Ви стежите за: ${name}`,
      Consigliere:  `Ви розвідуєте роль: ${name}`,
      Roleblocker:  `Ви блокуєте: ${name}`,
      Poisoner:     `Ви отруюєте: ${name}`,
      Framer:       `Ви підставляєте: ${name}`,
      SerialKiller: `Ви обрали жертву: ${name}`,
      Priest:       `Ви освятили: ${name}`,
    };
    return map[role] ?? `Нічна дія → ${name}`;
  }

  // ── UI helpers ────────────────────────────────────────────────────────

  roleDef(role: string) {
    return this.extendedMafia.ROLE_DEFS[role] ?? this.classicMafia.ROLE_DEFS[role] ?? null;
  }

  roleTeamBadgeClass(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia') return 'bg-red-700';
    if (team === 'neutral') return 'bg-purple-700';
    return 'bg-amber-700';
  }

  roleTeamTextClass(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia') return 'text-red-400';
    if (team === 'neutral') return 'text-purple-400';
    return 'text-amber-400';
  }

  roleIcon(role: string): string {
    const map: Record<string, string> = {
      Villager: '🏘️', Detective: '🔍', Doctor: '💊', Bodyguard: '🛡️',
      Sheriff: '⭐', Tracker: '👁️', Watcher: '🔭', Priest: '✝️', Mayor: '🎖️',
      Mafia: '🔪', Godfather: '🎭', Consigliere: '📖', Roleblocker: '🚫',
      Poisoner: '☠️', Framer: '🖼️',
      Jester: '🤡', Executioner: '⚖️', Survivor: '🏕️', SerialKiller: '🗡️', Arsonist: '🔥',
    };
    return map[role] ?? '❓';
  }

  revealCardBg(role: string): string {
    const map: Record<string, string> = {
      Mafia:       'bg-gradient-to-br from-red-950 to-rose-950 border-red-600/40',
      Godfather:   'bg-gradient-to-br from-red-950 to-red-950 border-red-800/60',
      Consigliere: 'bg-gradient-to-br from-orange-950 to-red-950 border-orange-600/40',
      Roleblocker: 'bg-gradient-to-br from-orange-950 to-amber-950 border-orange-500/40',
      Poisoner:    'bg-gradient-to-br from-violet-950 to-purple-950 border-violet-600/40',
      Framer:      'bg-gradient-to-br from-rose-950 to-pink-950 border-rose-600/40',
      Detective:   'bg-gradient-to-br from-blue-950 to-indigo-950 border-blue-600/40',
      Doctor:      'bg-gradient-to-br from-green-950 to-emerald-950 border-green-600/40',
      Bodyguard:   'bg-gradient-to-br from-teal-950 to-cyan-950 border-teal-600/40',
      Sheriff:     'bg-gradient-to-br from-yellow-950 to-amber-950 border-yellow-600/40',
      Tracker:     'bg-gradient-to-br from-cyan-950 to-sky-950 border-cyan-600/40',
      Watcher:     'bg-gradient-to-br from-purple-950 to-violet-950 border-purple-600/40',
      Priest:      'bg-gradient-to-br from-slate-800 to-slate-900 border-white/20',
      Mayor:       'bg-gradient-to-br from-amber-950 to-yellow-950 border-amber-600/40',
      Villager:    'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40',
      Jester:      'bg-gradient-to-br from-pink-950 to-fuchsia-950 border-pink-600/40',
      Executioner: 'bg-gradient-to-br from-indigo-950 to-blue-950 border-indigo-600/40',
      Survivor:    'bg-gradient-to-br from-lime-950 to-green-950 border-lime-600/40',
      SerialKiller:'bg-gradient-to-br from-rose-950 to-red-950 border-rose-800/60',
      Arsonist:    'bg-gradient-to-br from-orange-950 to-red-950 border-orange-500/40',
    };
    return map[role] ?? 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40';
  }

  revealRoleIcon(role: string): string {
    return this.roleIcon(role);
  }

  revealGlowColor(role: string): string {
    const map: Record<string, string> = {
      Mafia: 'bg-red-500', Godfather: 'bg-red-700', Consigliere: 'bg-orange-500',
      Roleblocker: 'bg-orange-400', Poisoner: 'bg-violet-500', Framer: 'bg-rose-500',
      Detective: 'bg-blue-500', Doctor: 'bg-green-500', Bodyguard: 'bg-teal-500',
      Sheriff: 'bg-yellow-500', Tracker: 'bg-cyan-500', Watcher: 'bg-purple-500',
      Priest: 'bg-white', Mayor: 'bg-amber-500', Villager: 'bg-slate-400',
      Jester: 'bg-pink-500', Executioner: 'bg-indigo-500', Survivor: 'bg-lime-500',
      SerialKiller: 'bg-rose-700', Arsonist: 'bg-orange-500',
    };
    return map[role] ?? 'bg-white';
  }

  revealBadge(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia')   return 'bg-red-500/20 text-red-300 border-red-500/40';
    if (team === 'neutral') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  roleCardImage(role: string): string {
    const map: Record<string, string> = {
      Villager:    '/card-villager.jpg',
      Detective:   '/card-detective.jpg',
      Doctor:      '/card-doctor.jpg',
      Bodyguard:   '/card-bodyguard.jpg',
      Sheriff:     '/card-sheriff.jpg',
      Tracker:     '/card-tracker.jpg',
      Watcher:     '/card-watcher.jpg',
      Priest:      '/card-priest.jpg',
      Mayor:       '/card-mayor.jpg',
      Mafia:       '/card-mafia.jpg',
      Godfather:   '/card-godfather.jpg',
      Consigliere: '/card-consigliere.jpg',
      Roleblocker: '/card-roleblocker.jpg',
      Poisoner:    '/card-poisoner.jpg',
      Framer:      '/card-framer.jpg',
      Jester:      '/card-jester.jpg',
      Executioner: '/card-executioner.jpg',
      Survivor:    '/card-survivor.jpg',
      SerialKiller: '/card-serialkiller.jpg',
      Arsonist:    '/card-arsonist.jpg',
    };
    return map[role] ?? '/card-back.jpg';
  }

  // ── Role name localization ────────────────────────────────────────────

  private readonly ROLE_NAMES_UK: Record<string, string> = {
    Villager: 'Житель', Detective: 'Детектив', Doctor: 'Лікар',
    Bodyguard: 'Охоронець', Sheriff: 'Шериф', Tracker: 'Стежник',
    Watcher: 'Спостерігач', Priest: 'Священик', Mayor: 'Мер',
    Mafia: 'Мафія', Godfather: 'Хрещений батько', Consigliere: 'Консільєрі',
    Roleblocker: 'Блокувальник', Poisoner: 'Отруювач', Framer: 'Провокатор',
    Jester: 'Блазень', Executioner: 'Кат', Survivor: 'Вижилець',
    SerialKiller: 'Серійний вбивця', Arsonist: 'Підпалювач',
  };

  roleNameUk(role: string): string {
    return this.ROLE_NAMES_UK[role] ?? role;
  }

  // ── Winner helpers ────────────────────────────────────────────────────

  winnerBannerClass(): string {
    const w = this.gameData?.winner;
    switch (w) {
      case 'mafia':        return 'bg-red-950 border-red-800/50';
      case 'jester':       return 'bg-pink-950 border-pink-800/50';
      case 'executioner':  return 'bg-indigo-950 border-indigo-800/50';
      case 'serialkiller': return 'bg-rose-950 border-rose-800/50';
      case 'survivor':     return 'bg-lime-950 border-lime-800/50';
      default:             return 'bg-[#1a110a] border-amber-700/40';
    }
  }

  winnerIcon(): string {
    const map: Record<string, string> = {
      village: '🛡️', mafia: '🔪', jester: '🤡',
      executioner: '⚖️', serialkiller: '🗡️', survivor: '🏕️',
    };
    return map[this.gameData?.winner ?? ''] ?? '🏆';
  }

  winnerLabel(): string {
    const map: Record<string, string> = {
      village: 'Місто перемогло!', mafia: 'Мафія перемогла!',
      jester: 'Блазень переміг!', executioner: 'Кат переміг!',
      serialkiller: 'Серійний вбивця переміг!', survivor: 'Вижилець переміг!',
    };
    return map[this.gameData?.winner ?? ''] ?? 'Гра завершена';
  }

  winnerDescription(): string {
    const map: Record<string, string> = {
      village: 'Всіх мафіозів знешкоджено.',
      mafia: 'Мафія захопила місто.',
      jester: 'Блазень домігся свого і був виключений.',
      executioner: 'Ціль ката була усунена голосуванням.',
      serialkiller: 'Серійний вбивця залишився єдиним.',
      survivor: 'Вижилець дожив до кінця гри.',
    };
    return map[this.gameData?.winner ?? ''] ?? '';
  }

  formatLobbyTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  teamLabel(team: string): string {
    return team === 'mafia' ? 'Мафія' : 'Місто';
  }

  teamAccent(team: string): string {
    return team === 'mafia' ? 'text-red-400' : 'text-amber-400';
  }

  teamBadge(team: string): string {
    return team === 'mafia'
      ? 'bg-red-500/15 text-red-300 border-red-500/30'
      : 'bg-amber-700/15 text-amber-300 border-amber-600/30';
  }

  roleCardBg(team: string): string {
    return team === 'mafia'
      ? 'bg-[#1a0505] border border-red-900/50'
      : 'bg-[#1a110a] border border-[#2d1f10]';
  }
}
