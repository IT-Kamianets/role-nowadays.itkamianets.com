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
    <!-- Phase Transition Video Overlay -->
    @if (transitionVideo()) {
      <div class="fixed inset-0 z-50 bg-black">
        <video [src]="transitionVideo()!" autoplay muted playsinline
          class="w-full h-full object-cover"
          (ended)="onTransitionEnd()">
        </video>
      </div>
    }

    <!-- Role Reveal Overlay -->
    @if (showRoleReveal() && myRoleDef && myRole) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black px-8"
        [class]="roleRevealed() ? 'pointer-events-none' : ''">
        <div class="w-full transition-all duration-[600ms] ease-in-out"
          [class]="roleRevealed()
            ? 'max-w-[280px] scale-[0.55] opacity-0'
            : 'max-w-sm scale-100 opacity-100'">
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
                <!-- Right: role card (static, entry animation once) -->
                <div class="role-card-anim rounded-xl overflow-hidden shadow-lg shadow-black/50">
                  <img [src]="roleCardImage(myRole!)" [alt]="myRole!" class="w-full block" />
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

            <!-- Villager: sleeping -->
            @if (myRole === 'Villager') {
              <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-6 text-center">
                <div class="text-4xl mb-3">😴</div>
                <h3 class="text-base font-black text-amber-100 mb-1.5">Ви заснули...</h3>
                <p class="text-sm text-amber-100/50">Містяни сплять. Чекайте ранку.</p>
              </div>
            }

            <!-- Role player: pick target -->
            @if (myRole === 'Mafia' || myRole === 'Doctor' || myRole === 'Detective') {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">{{ roleNightActionLabel }}</p>
                <div class="space-y-2">
                  @for (p of nightTargets; track p.index) {
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

            <!-- Night mafia chat -->
            @if (myRole === 'Mafia') {
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
                <p class="text-sm text-amber-100/50">{{ gameData?.roles?.[(gameData?.eliminated ?? 0).toString()] }}</p>
              } @else {
                <div class="text-3xl mb-3">✨</div>
                <h3 class="text-base font-black text-amber-100 mb-1">Ніхто не загинув!</h3>
                <p class="text-sm text-amber-100/50">Лікар захистив або мафія не діяла.</p>
              }
            </div>

            <!-- Detective result (visible to detective player) -->
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
            @if (gameData?.log?.length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал подій</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-4 space-y-2">
                  @for (entry of gameData?.log ?? []; track $index) {
                    <p class="text-xs text-amber-100/50 leading-relaxed">{{ entry }}</p>
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
          }

          <!-- ═══════════════════════════════════════════════════ FINISHED -->
          @if (effectivePhase === 'finished') {

            <!-- Winner banner -->
            <div class="relative overflow-hidden rounded-2xl p-8 border text-center"
              [class]="gameData?.winner === 'mafia'
                ? 'bg-red-950 border-red-800/50'
                : 'bg-[#1a110a] border-amber-700/40'">
              <div class="text-5xl mb-4">{{ gameData?.winner === 'mafia' ? '🔪' : '🛡️' }}</div>
              <h2 class="text-2xl font-black text-amber-100 mb-2 uppercase tracking-wide">
                {{ gameData?.winner === 'mafia' ? 'Мафія перемогла!' : 'Місто перемогло!' }}
              </h2>
              <p class="text-sm text-amber-100/50">
                {{ gameData?.winner === 'mafia' ? 'Мафія захопила місто.' : 'Всіх мафіозів знешкоджено.' }}
              </p>
            </div>

            <!-- All roles reveal -->
            <div>
              <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Всі ролі</p>
              <div class="space-y-2">
                @for (p of allPlayers; track p.index) {
                  <div class="bg-[#1a110a] border border-[#2d1f10] rounded-xl flex items-center gap-3 px-4 py-3" [class]="!p.isAlive ? 'opacity-40' : ''">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      [class]="roleDef(p.role).team === 'mafia' ? 'bg-red-700' : 'bg-amber-700'">
                      {{ p.index + 1 }}
                    </div>
                    <span class="text-sm text-amber-100/80 flex-1">{{ p.label }}</span>
                    <span class="text-xs font-semibold"
                      [class]="roleDef(p.role).team === 'mafia' ? 'text-red-400' : 'text-amber-400'">
                      {{ p.role }}
                    </span>
                    @if (!p.isAlive) {
                      <span class="text-[10px] text-amber-100/25 ml-1">✝</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Game log -->
            @if (gameData?.log?.length) {
              <div>
                <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал гри</p>
                <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl p-4 space-y-2">
                  @for (entry of gameData?.log ?? []; track $index) {
                    <p class="text-xs text-amber-100/50 leading-relaxed">{{ entry }}</p>
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

  myIndexVal = -1;
  dayChatText = '';
  nightChatText = '';

  private gameId = '';
  private roleRevealShown = false;
  private pollSub?: Subscription;
  private msgPollSub?: Subscription;
  private timerInterval?: ReturnType<typeof setInterval>;
  private revealTimeout1?: ReturnType<typeof setTimeout>;
  private revealTimeout2?: ReturnType<typeof setTimeout>;
  private revealTimeout3?: ReturnType<typeof setTimeout>;
  private dayTransitionSent = false;
  private nightTransitionSent = false;
  private votingTransitionSent = false;

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
        if (newPhase === 'night') {
          const round = (game.data as Partial<MafiaGameData>)?.round;
          if (round === 1 && this.myIndexVal >= 0 && !this.roleRevealShown) {
            this.roleRevealShown = true;
            this.showRoleReveal.set(true);
            this.roleRevealed.set(false);
            this.cardFlipped.set(false);
            this.startAutoReveal();
          }
        }
        // Split layout: activate for mid-game joins (no role reveal)
        const isActivePhase = ['night', 'day', 'voting'].includes(newPhase ?? '');
        if (isActivePhase && !this.splitLayoutVisible() && !this.showRoleReveal()) {
          this.splitLayoutVisible.set(true);
        }
        // Phase transition animation
        if (prevPhase && prevPhase !== newPhase && isActivePhase && this.splitLayoutVisible()) {
          if (prevPhase === 'night' && newPhase === 'day') {
            this.transitionVideo.set('/night-to-day.mp4');
          } else if (prevPhase === 'day' && newPhase === 'night') {
            this.transitionVideo.set('/day-to-night.mp4');
          } else {
            this.phaseAnimKey.update(k => k + 1);
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

    // 1-second interval: update countdowns + trigger phase transitions
    this.timerInterval = setInterval(() => {
      // Lobby expiry countdown (20 min from game creation via ObjectId timestamp)
      const id = this.gameId;
      if (id && this.effectivePhase === 'lobby') {
        const created = parseInt(id.substring(0, 8), 16) * 1000;
        const left = Math.max(0, 1200 - Math.floor((Date.now() - created) / 1000));
        this.lobbySecondsLeft.set(left);
      }

      const d = this.gameData;

      // Day timer
      if (d?.phase === 'day' && d.phaseStartedAt) {
        const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
        const dayDur = d.settings?.dayDuration ?? 60;
        const left = Math.max(0, dayDur - elapsed);
        this.daySecondsLeft.set(left);
        if (left === 0 && !this.dayTransitionSent) {
          this.dayTransitionSent = true;
          this.triggerDayToVoting();
        }
      } else {
        this.daySecondsLeft.set(d?.settings?.dayDuration ?? 60);
        this.dayTransitionSent = false;
      }

      // Night timer
      if (d?.phase === 'night' && d.phaseStartedAt) {
        const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
        const nightDur = d.settings?.nightDuration ?? 30;
        const left = Math.max(0, nightDur - elapsed);
        this.nightSecondsLeft.set(left);
        if (left === 0 && !this.nightTransitionSent) {
          this.nightTransitionSent = true;
          this.triggerNightToDay();
        }
      } else {
        this.nightSecondsLeft.set(d?.settings?.nightDuration ?? 30);
        this.nightTransitionSent = false;
      }

      // Voting timer
      if (d?.phase === 'voting' && d.phaseStartedAt) {
        const elapsed = Math.floor((Date.now() - d.phaseStartedAt) / 1000);
        const voteDur = d.settings?.votingDuration ?? 30;
        const left = Math.max(0, voteDur - elapsed);
        this.votingSecondsLeft.set(left);
        if (left === 0 && !this.votingTransitionSent) {
          this.votingTransitionSent = true;
          this.triggerVotingEnd();
        }
      } else {
        this.votingSecondsLeft.set(d?.settings?.votingDuration ?? 30);
        this.votingTransitionSent = false;
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.msgPollSub?.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
    clearTimeout(this.revealTimeout1);
    clearTimeout(this.revealTimeout2);
    clearTimeout(this.revealTimeout3);
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
    const raw = localStorage.getItem('gameSettings_' + this.gameId);
    const settings = raw ? JSON.parse(raw) : { dayDuration: 60, nightDuration: 30, votingDuration: 30 };
    const data = this.classicMafia.initGameData(g.players.length, settings);
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
            this.showRoleReveal.set(true);
            this.roleRevealed.set(false);
            this.cardFlipped.set(false);
            this.startAutoReveal();
          }
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
    this.gameService.updateGame(this.gameId, { data: { ...d, phase: 'voting', votes: {}, phaseStartedAt: Date.now() } }).subscribe({
      next: game => { if (game && typeof game === 'object') this.currentGame.set(game); },
      error: () => { this.dayTransitionSent = false; },
    });
  }

  triggerNightToDay() {
    if (!this.isCreator) { this.nightTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'night') { this.nightTransitionSent = false; return; }
    const { data: resolved } = this.classicMafia.resolveNight(d);
    const winner = this.classicMafia.checkWin(resolved);
    const finalData: MafiaGameData = winner
      ? { ...resolved, phase: 'finished', winner }
      : { ...resolved, phaseStartedAt: Date.now() };
    this.gameService.updateGame(this.gameId, { data: finalData }).subscribe({
      next: game => { if (game) this.currentGame.set(game); },
      error: () => { this.nightTransitionSent = false; },
    });
  }

  triggerVotingEnd() {
    if (!this.isCreator) { this.votingTransitionSent = false; return; }
    const d = this.gameData;
    if (!d || d.phase !== 'voting') { this.votingTransitionSent = false; return; }
    const tally: Record<number, number> = {};
    for (const target of Object.values(d.votes ?? {})) {
      tally[target] = (tally[target] ?? 0) + 1;
    }
    const aliveSet = new Set(d.alive);
    let maxVotes = 0, eliminated = d.alive[0];
    for (const [idx, cnt] of Object.entries(tally)) {
      if (aliveSet.has(+idx) && cnt > maxVotes) { maxVotes = cnt; eliminated = +idx; }
    }
    const resolved = this.classicMafia.resolveVoting(d, eliminated);
    const winner = this.classicMafia.checkWin(resolved);
    const finalData: MafiaGameData = winner
      ? { ...resolved, phase: 'finished', winner }
      : { ...resolved, phaseStartedAt: Date.now() };
    this.gameService.updateGame(this.gameId, { data: finalData }).subscribe({
      next: game => { if (game) this.currentGame.set(game); },
      error: () => { this.votingTransitionSent = false; },
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

  onTransitionEnd() {
    this.transitionVideo.set(null);
    this.phaseAnimKey.update(k => k + 1);
  }

  private startAutoReveal() {
    this.revealTimeout1 = setTimeout(() => {
      this.cardFlipped.set(true);
      this.revealTimeout2 = setTimeout(() => {
        this.roleRevealed.set(true);
        this.revealTimeout3 = setTimeout(() => {
          this.showRoleReveal.set(false);
          this.cardFlipped.set(false);
          this.splitLayoutVisible.set(true);
        }, 600);
      }, 650 + 2000);
    }, 600);
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

  formatLobbyTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  roleCardImage(role: string): string {
    const map: Record<string, string> = {
      Mafia: '/card-mafia.jpg',
      Doctor: '/card-doctor.jpg',
      Detective: '/card-detective.jpg',
      Villager: '/card-villager.jpg',
    };
    return map[role] ?? '';
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
