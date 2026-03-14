import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { SocketService } from '../../services/socket.service';
import { ClassicMafiaService, MafiaGameData } from '../../services/classic-mafia.service';
import { ExtendedMafiaService } from '../../services/extended-mafia.service';
import { RoleUiService } from '../../services/role-ui.service';
import { NightActionService } from '../../services/night-action.service';
import { Game } from '../../models/game.model';
import { Message } from '../../models/message.model';
import { GameLogComponent } from '../../components/game-log/game-log';
import { calcSecondsLeft, calcLobbySecondsLeft } from '../../utils/phase-timer';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [CommonModule, FormsModule, GameLogComponent],
  templateUrl: './gameplay.html',
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
  allMessages = signal<Message[]>([]);
  showRoleReveal = signal(false);
  roleRevealed = signal(false);
  cardFlipped = signal(false);
  splitLayoutVisible = signal(false);
  phaseAnimKey = signal(0);
  transitionVideo = signal<string | null>(null);
  roleCardHidden = signal(false);

  myLog = signal<{ text: string; type: 'event' | 'action' }[]>([]);
  private lastLogLength = 0;

  isOnline = signal(navigator.onLine);

  myIndexVal = signal(-1);
  dayChatText = '';
  nightChatText = '';

  private gameId = '';
  private roleRevealShown = false;
  private onlineBound = () => this.isOnline.set(true);
  private offlineBound = () => this.isOnline.set(false);
  private revealAfterTransition = false;
  private pollSub?: Subscription;
  private socketSub?: Subscription;
  private msgPollSub?: Subscription;
  private reconnectSub?: Subscription;
  private connErrorSub?: Subscription;
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
    readonly roleUi: RoleUiService,
    readonly nightAction: NightActionService,
  ) {}

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.myIndexVal.set(this.gameService.getPlayerIndex(this.gameId));

    if (this.gameId) {
      // Initial load
      this.gameService.getGame(this.gameId).pipe(catchError(() => of(null))).subscribe(game => {
        if (game) this.applyGameUpdate(game);
      });

      // WebSocket real-time updates
      this.socketService.connect();
      this.socketService.joinRoom(this.gameId);
      this.socketSub = this.socketService.onGameUpdate().subscribe(game => {
        if (game._id === this.gameId) this.applyGameUpdate(game);
      });

      // Reconnect — re-join room and sync state
      this.reconnectSub = this.socketService.onReconnect().subscribe(() => {
        this.gameService.getGame(this.gameId).pipe(catchError(() => of(null)))
          .subscribe(game => { if (game) this.applyGameUpdate(game); });
      });

      // Socket auth / connection errors
      this.connErrorSub = this.socketService.onConnectionError().subscribe(() => {
        this.errorMsg.set('З\'єднання з сервером втрачено. Оновіть сторінку.');
      });

      // Fallback polling every 30s
      this.pollSub = interval(30000).pipe(
        switchMap(() => this.gameService.getGame(this.gameId).pipe(catchError(() => of(null)))),
      ).subscribe(game => {
        if (game) this.applyGameUpdate(game);
      });

      this.msgPollSub = interval(3000).pipe(
        switchMap(() => this.gameService.getMessages(this.gameId).pipe(catchError(() => of(null)))),
      ).subscribe(msgs => {
        if (Array.isArray(msgs)) this.allMessages.set(msgs);
      });
    }

    window.addEventListener('online', this.onlineBound);
    window.addEventListener('offline', this.offlineBound);

    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const id = this.gameId;
      if (id && this.effectivePhase === 'lobby') {
        this.lobbySecondsLeft.set(calcLobbySecondsLeft(id, 1200, now));
      }

      const d = this.gameData;
      const revealActive = this.showRoleReveal() || this.revealAfterTransition || !!this.transitionVideo();

      if (d?.phase === 'day' && d.phaseStartedAt) {
        const left = calcSecondsLeft(d.phaseStartedAt, d.settings?.dayDuration ?? 60, revealActive, now);
        this.daySecondsLeft.set(left);
        if (left === 0 && !revealActive && !this.dayTransitionSent) {
          this.dayTransitionSent = true;
          this.triggerDayToVoting();
        }
      } else {
        this.daySecondsLeft.set(d?.settings?.dayDuration ?? 60);
        this.dayTransitionSent = false;
      }

      if (d?.phase === 'night' && d.phaseStartedAt) {
        const left = calcSecondsLeft(d.phaseStartedAt, d.settings?.nightDuration ?? 30, revealActive, now);
        this.nightSecondsLeft.set(left);
        if (left === 0 && !revealActive && !this.nightTransitionSent) {
          this.nightTransitionSent = true;
          this.triggerNightToDay();
        }
      } else {
        this.nightSecondsLeft.set(d?.settings?.nightDuration ?? 30);
        this.nightTransitionSent = false;
      }

      if (d?.phase === 'voting' && d.phaseStartedAt) {
        const left = calcSecondsLeft(d.phaseStartedAt, d.settings?.votingDuration ?? 30, revealActive, now);
        this.votingSecondsLeft.set(left);
        if (left === 0 && !revealActive && !this.votingTransitionSent) {
          this.votingTransitionSent = true;
          this.triggerVotingEnd();
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
      if (round === 1 && this.myIndexVal() >= 0 && !this.roleRevealShown) {
        this.roleRevealShown = true;
        this.revealAfterTransition = true;
        this.playTransitionVideo('/day-to-night.mp4');
      }
    }
    if (newPhase === 'finished' && prevPhase !== 'finished') {
      this.gameService.clearGame(this.gameId);
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
    this.reconnectSub?.unsubscribe();
    this.connErrorSub?.unsubscribe();
    if (this.timerInterval) clearInterval(this.timerInterval);
    clearTimeout(this.revealTimeout1);
    clearTimeout(this.revealTimeout2);
    clearTimeout(this.revealTimeout3);
    clearTimeout(this.videoFallbackTimeout);
    window.removeEventListener('online', this.onlineBound);
    window.removeEventListener('offline', this.offlineBound);
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
    if (!d || this.myIndexVal() < 0) return null;
    return d.roles?.[String(this.myIndexVal())] ?? null;
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
    return this.alivePlayers.filter(p => p.index !== this.myIndexVal());
  }

  get isMyPlayerAlive(): boolean {
    return this.alivePlayers.some(p => p.index === this.myIndexVal());
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

  back() {
    const activePhases = ['lobby', 'night', 'day', 'voting'];
    if (activePhases.includes(this.effectivePhase)) {
      if (!window.confirm('Покинути гру? Вас буде видалено з кімнати.')) return;
    }
    this.gameService.clearGame(this.gameId);
    this.router.navigate(['/home']);
  }

  startGame() {
    const g = this.currentGame();
    if (!g) return;
    let parsed: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('gameSettings_' + this.gameId);
      parsed = raw ? JSON.parse(raw) : {};
    } catch { /* Safari private mode or malformed JSON — use defaults */ }
    const settings = {
      dayDuration: parsed['dayDuration'] ?? 60,
      nightDuration: parsed['nightDuration'] ?? 30,
      votingDuration: parsed['votingDuration'] ?? 30,
    };
    const mode = g.mode;
    let data: MafiaGameData;
    if (mode === 'Classic') {
      data = this.classicMafia.initGameData(g.players.length, settings);
    } else {
      const customRoles = parsed['customRoles'] ?? undefined;
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
          if (newPhase === 'night' && round === 1 && this.myIndexVal() >= 0 && !this.roleRevealShown) {
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
    const field = this.nightAction.roleToField(role);
    if (!field) return;
    // Add personal log entry (optimistic)
    const actionText = this.nightAction.getNightActionLogText(target, role, this.playerName(target));
    this.myLog.update(l => [...l, { text: actionText, type: 'action' }]);
    const logLengthBeforeAction = this.myLog().length - 1;
    this.gameService.submitNightAction(this.gameId, field, target).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
      error: () => {
        this.myLog.update(l => l.filter((_, i) => i !== logLengthBeforeAction));
      },
    });
  }

  submitArsonistIgnite() {
    this.myLog.update(l => [...l, { text: 'Ви підпалили всіх облитих!', type: 'action' }]);
    const logEntryIndex = this.myLog().length - 1;
    this.gameService.submitNightAction(this.gameId, 'arsonistIgnite', 1).subscribe({
      next: game => {
        if (game && typeof game === 'object') {
          this.currentGame.set(game);
          this.gameService.emitUpdate(game);
        }
      },
      error: () => {
        this.myLog.update(l => l.filter((_, i) => i !== logEntryIndex));
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
    if (this.myIndexVal() < 0 || !this.isMyPlayerAlive) return;
    this.hasVoted.set(true);
    this.myVoteTarget.set(targetIndex);
    this.myLog.update(l => [...l, { text: `Ви проголосували за ${this.playerName(targetIndex)}`, type: 'action' }]);
    const logEntryIndex = this.myLog().length - 1;
    this.gameService.submitVote(this.gameId, this.myIndexVal(), targetIndex).subscribe({
      next: game => {
        if (!game || typeof game !== 'object') return;
        this.currentGame.set(game);
        this.gameService.emitUpdate(game);
      },
      error: () => {
        this.hasVoted.set(false);
        this.myVoteTarget.set(null);
        this.myLog.update(l => l.filter((_, i) => i !== logEntryIndex));
      },
    });
  }

  sendDayMessage() {
    const text = this.dayChatText.trim();
    if (!text) return;
    this.dayChatText = '';
    this.gameService.sendMessage(this.gameId, text, 'day').subscribe({
      next: msg => { if (msg) this.allMessages.update(msgs => [...msgs, msg]); },
      error: () => {
        this.dayChatText = text;
        this.errorMsg.set('Повідомлення не відправлено. Спробуйте знову.');
      },
    });
  }

  sendNightMessage() {
    const text = this.nightChatText.trim();
    if (!text) return;
    this.nightChatText = '';
    this.gameService.sendMessage(this.gameId, text, 'night').subscribe({
      next: msg => { if (msg) this.allMessages.update(msgs => [...msgs, msg]); },
      error: () => {
        this.nightChatText = text;
        this.errorMsg.set('Повідомлення не відправлено. Спробуйте знову.');
      },
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

  // ── Night action helpers (delegated to NightActionService) ───────────

  isSleepingRole(role: string | null): boolean {
    return this.nightAction.isSleepingRole(role);
  }

  hasNightAction(role: string | null): boolean {
    return this.nightAction.hasNightAction(role);
  }

  isMafiaTeamMember(role: string | null): boolean {
    return this.nightAction.isMafiaTeamMember(role);
  }

  get hasSubmittedNightAction(): boolean {
    const d = this.gameData;
    if (!d) return false;
    return this.nightAction.hasSubmittedNightAction(this.myRole, d.night);
  }

  get myNightTarget(): number | null {
    const d = this.gameData;
    if (!d) return null;
    return this.nightAction.myNightTarget(this.myRole, d.night);
  }

  get roleNightActionLabel(): string {
    return this.nightAction.roleNightActionLabel(this.myRole);
  }

  get nightTargets() {
    const d = this.gameData;
    const mafiaTeam = new Set(['Mafia', 'Godfather', 'Consigliere', 'Roleblocker', 'Poisoner', 'Framer']);
    const isMafiaRole = this.myRole ? mafiaTeam.has(this.myRole) : false;
    return this.alivePlayers.filter(p => {
      if (p.index === this.myIndexVal()) return false;
      if (isMafiaRole && d && mafiaTeam.has(d.roles?.[String(p.index)] ?? '')) return false;
      return true;
    });
  }

  get currentNightTargets() {
    const canSelf = this.myRole === 'Doctor' || this.myRole === 'Priest';
    return canSelf ? this.alivePlayers : this.nightTargets;
  }

  get isCreator(): boolean {
    return this.gameService.isCreator(this.gameId);
  }

  // ── UI helpers (delegated to RoleUiService) ───────────────────────────

  roleDef(role: string) { return this.roleUi.roleDef(role); }
  roleTeamBadgeClass(role: string): string { return this.roleUi.roleTeamBadgeClass(role); }
  roleTeamTextClass(role: string): string { return this.roleUi.roleTeamTextClass(role); }
  roleIcon(role: string): string { return this.roleUi.roleIcon(role); }
  roleNameUk(role: string): string { return this.roleUi.roleNameUk(role); }
  revealCardBg(role: string): string { return this.roleUi.revealCardBg(role); }
  revealRoleIcon(role: string): string { return this.roleUi.roleIcon(role); }
  revealGlowColor(role: string): string { return this.roleUi.revealGlowColor(role); }
  revealBadge(role: string): string { return this.roleUi.revealBadge(role); }
  roleCardImage(role: string): string { return this.roleUi.roleCardImage(role); }
  teamLabel(team: string): string { return this.roleUi.teamLabel(team); }
  teamAccent(team: string): string { return this.roleUi.teamAccent(team); }
  teamBadge(team: string): string { return this.roleUi.teamBadge(team); }
  roleCardBg(team: string): string { return this.roleUi.roleCardBg(team); }

  winnerBannerClass(): string { return this.roleUi.winnerBannerClass(this.gameData?.winner); }
  winnerIcon(): string { return this.roleUi.winnerIcon(this.gameData?.winner); }
  winnerLabel(): string { return this.roleUi.winnerLabel(this.gameData?.winner); }
  winnerDescription(): string { return this.roleUi.winnerDescription(this.gameData?.winner); }

  formatLobbyTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
