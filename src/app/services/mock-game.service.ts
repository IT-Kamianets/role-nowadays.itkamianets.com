import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Game, Player } from '../models/game.model';

const GAME_ID = 'mock-game-1';

const MOCK_PLAYERS: Player[] = [
  { _id: 'p0', name: 'Ви' },
  { _id: 'p1', name: 'Аліса' },
  { _id: 'p2', name: 'Боб' },
  { _id: 'p3', name: 'Чарлі' },
];

const INITIAL_GAME: Game = {
  _id: GAME_ID,
  mode: 'Classic',
  status: 'lobby',
  creator: MOCK_PLAYERS[0],
  players: [...MOCK_PLAYERS],
  maxPlayers: 8,
  pass: 0,
  data: {},
};

@Injectable({ providedIn: 'root' })
export class MockGameService {
  private state: Game = JSON.parse(JSON.stringify(INITIAL_GAME));

  constructor() {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem(`isCreator_${GAME_ID}`, 'true');
    localStorage.setItem(`playerIndex_${GAME_ID}`, '0');
    if (!localStorage.getItem('nickname')) {
      localStorage.setItem('nickname', 'Ви');
    }
  }

  private patch(fields: Partial<Game>): Game {
    this.state = { ...this.state, ...fields };
    return this.state;
  }

  initToken(name: string): Observable<void> {
    localStorage.setItem('token', 'mock-token');
    this.setNickname(name);
    return of(void 0).pipe(delay(300));
  }

  isAuthenticated(): boolean { return true; }

  getGames(): Observable<Game[]> {
    return of([this.state]).pipe(delay(100));
  }

  getGame(_id: string): Observable<Game> {
    return of(this.state).pipe(delay(100));
  }

  getNickname(): string { return localStorage.getItem('nickname') || 'Ви'; }
  setNickname(name: string): void { localStorage.setItem('nickname', name.trim()); }

  createGame(mode: string, maxPlayers: number): Observable<Game> {
    const game = this.patch({ mode, maxPlayers, status: 'lobby' });
    this.setCreator(game._id, 0);
    return of(game).pipe(delay(300));
  }

  joinGame(_id: string): Observable<Game | false> {
    const nickname = this.getNickname();
    const newPlayer: Player = { _id: `p${this.state.players.length}`, name: nickname };
    const game = this.patch({ players: [...this.state.players, newPlayer] });
    this.setPlayerIndex(_id, game.players.length - 1);
    return of(game).pipe(delay(300));
  }

  updateGame(_id: string, fields: Record<string, any>): Observable<Game> {
    const game = this.patch(fields as Partial<Game>);
    return of(game).pipe(delay(200));
  }

  submitVote(gameId: string, voterIndex: number, targetIndex: number): Observable<Game> {
    const votes = { ...(this.state.data['votes'] || {}), [String(voterIndex)]: targetIndex };
    const game = this.patch({ data: { ...this.state.data, votes } });
    return of(game).pipe(delay(200));
  }

  sendDayMessage(gameId: string, text: string): Observable<Game> {
    const msg = { sender: this.getPlayerIndex(gameId), text };
    const dayMessages = [...(this.state.data['dayMessages'] || []), msg];
    const game = this.patch({ data: { ...this.state.data, dayMessages } });
    return of(game).pipe(delay(100));
  }

  sendNightMessage(gameId: string, text: string): Observable<Game> {
    const msg = { sender: this.getPlayerIndex(gameId), text };
    const nightMessages = [...(this.state.data['nightMessages'] || []), msg];
    const game = this.patch({ data: { ...this.state.data, nightMessages } });
    return of(game).pipe(delay(100));
  }

  setCreator(gameId: string, playerIndex: number): void {
    localStorage.setItem(`isCreator_${gameId}`, 'true');
    localStorage.setItem(`playerIndex_${gameId}`, String(playerIndex));
  }

  isCreator(gameId: string): boolean {
    return localStorage.getItem(`isCreator_${gameId}`) === 'true';
  }

  setPlayerIndex(gameId: string, index: number): void {
    localStorage.setItem(`playerIndex_${gameId}`, String(index));
  }

  getPlayerIndex(gameId: string): number {
    const val = localStorage.getItem(`playerIndex_${gameId}`);
    return val !== null ? parseInt(val, 10) : 0;
  }
}
