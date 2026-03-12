import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Game, GameMode } from '../models/game.model';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

const BASE = environment.apiBase + '/api/rnd';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient, private socketService: SocketService) {}

  initToken(name: string): Observable<void> {
    return this.http.post<string>(`${BASE}/token`, { name }).pipe(
      tap((token) => {
        localStorage.setItem('token', token);
      }),
      map(() => void 0),
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${BASE}/games`);
  }

  getGame(id: string): Observable<Game> {
    return this.http.get<Game>(`${BASE}/game/${id}`);
  }

  getNickname(): string {
    return localStorage.getItem('nickname') || '';
  }

  setNickname(name: string): void {
    localStorage.setItem('nickname', name.trim());
  }

  createGame(mode: GameMode, maxPlayers: number): Observable<Game> {
    return this.http
      .post<Game>(`${BASE}/create`, { mode, maxPlayers })
      .pipe(tap((game) => this.setCreator(game._id, 0)));
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
      );
  }

  updateGame(id: string, fields: Record<string, any>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/update`, { _id: id, ...fields });
  }

  submitKnightAction(gameId: string, playerIndex: number, action: { type: string; target: number }): Observable<Game> {
    return this.http.post<Game>(`${BASE}/knight-action`, { _id: gameId, playerIndex, action });
  }

  submitTrueFaceAction(gameId: string, playerIndex: number, guess: Record<string, string>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/true-face-action`, { _id: gameId, playerIndex, guess });
  }

  submitNightAction(gameId: string, field: string, target: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/night-action`, { _id: gameId, field, target });
  }

  submitVote(gameId: string, voterIndex: number, targetIndex: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/vote`, { _id: gameId, voterIndex, targetIndex });
  }

  sendMessage(gameId: string, text: string, type: 'day' | 'night'): Observable<any> {
    return this.http.post<any>(`${BASE}/message/create`, { _id: gameId, text, data: { type } });
  }

  getMessages(gameId: string): Observable<any[]> {
    return this.http.post<any[]>(`${BASE}/message/get`, { _id: gameId });
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
    return val !== null ? parseInt(val, 10) : -1;
  }

  emitUpdate(game: Game): void {
    this.socketService.emit(game);
  }
}
