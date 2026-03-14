import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Game, GameMode } from '../models/game.model';
import { Message } from '../models/message.model';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

const BASE = environment.apiBase + '/api/rnd';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient, private socketService: SocketService) {}

  private lsSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* Safari private mode */ }
  }

  private lsGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private lsRemove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* Safari private mode */ }
  }

  initToken(name: string): Observable<void> {
    return this.http.post<string>(`${BASE}/token`, { name }).pipe(
      tap((token) => {
        this.lsSet('token', token);
      }),
      map(() => void 0),
    );
  }

  isAuthenticated(): boolean {
    return !!this.lsGet('token');
  }

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${BASE}/games`).pipe(catchError(() => of([])));
  }

  getGame(id: string): Observable<Game> {
    return this.http.get<Game>(`${BASE}/game/${id}`).pipe(catchError(() => of(null as unknown as Game)));
  }

  getNickname(): string {
    return this.lsGet('nickname') || '';
  }

  setNickname(name: string): void {
    this.lsSet('nickname', name.trim());
  }

  createGame(mode: GameMode, maxPlayers: number): Observable<Game> {
    return this.http
      .post<Game>(`${BASE}/create`, { mode, maxPlayers })
      .pipe(
        tap((game) => this.setCreator(game._id, 0)),
        catchError(() => of(null as unknown as Game)),
      );
  }

  joinGame(id: string): Observable<Game | false> {
    return this.http
      .post<Game | false>(`${BASE}/join`, { _id: id })
      .pipe(
        tap((result) => {
          if (result && typeof result === 'object' && '_id' in result) {
            const game = result as Game;
            const nickname = this.getNickname();
            const idx = game.players.findIndex(p => p.name === nickname);
            this.setPlayerIndex(game._id, idx !== -1 ? idx : game.players.length - 1);
          }
        }),
        catchError(() => of(false as false)),
      );
  }

  updateGame(id: string, fields: Record<string, any>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/update`, { _id: id, ...fields }).pipe(catchError(() => of(null as unknown as Game)));
  }

  submitKnightAction(gameId: string, playerIndex: number, action: { type: string; target: number }): Observable<Game> {
    return this.http.post<Game>(`${BASE}/knight-action`, { _id: gameId, playerIndex, action }).pipe(catchError(() => of(null as unknown as Game)));
  }

  submitTrueFaceAction(gameId: string, playerIndex: number, guess: Record<string, string>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/true-face-action`, { _id: gameId, playerIndex, guess }).pipe(catchError(() => of(null as unknown as Game)));
  }

  submitNightAction(gameId: string, field: string, target: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/night-action`, { _id: gameId, field, target }).pipe(catchError(() => of(null as unknown as Game)));
  }

  submitVote(gameId: string, voterIndex: number, targetIndex: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/vote`, { _id: gameId, voterIndex, targetIndex }).pipe(catchError(() => of(null as unknown as Game)));
  }

  sendMessage(gameId: string, text: string, type: 'day' | 'night'): Observable<Message> {
    return this.http
      .post<Message>(`${BASE}/message/create`, { _id: gameId, text, data: { type } })
      .pipe(catchError(() => of(null as unknown as Message)));
  }

  getMessages(gameId: string): Observable<Message[]> {
    return this.http
      .post<Message[]>(`${BASE}/message/get`, { _id: gameId })
      .pipe(catchError(() => of([])));
  }

  setCreator(gameId: string, playerIndex: number): void {
    this.lsSet(`isCreator_${gameId}`, 'true');
    this.lsSet(`playerIndex_${gameId}`, String(playerIndex));
  }

  isCreator(gameId: string): boolean {
    return this.lsGet(`isCreator_${gameId}`) === 'true';
  }

  setPlayerIndex(gameId: string, index: number): void {
    this.lsSet(`playerIndex_${gameId}`, String(index));
  }

  getPlayerIndex(gameId: string): number {
    const val = this.lsGet(`playerIndex_${gameId}`);
    return val !== null ? parseInt(val, 10) : -1;
  }

  clearGame(gameId: string): void {
    this.lsRemove(`playerIndex_${gameId}`);
    this.lsRemove(`isCreator_${gameId}`);
    this.lsRemove(`gameSettings_${gameId}`);
  }

  emitUpdate(game: Game): void {
    this.socketService.emit(game);
  }
}
