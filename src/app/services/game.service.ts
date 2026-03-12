import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Game, GameMode } from '../models/game.model';
import { environment } from '../../environments/environment';

const BASE = environment.apiBase;
const OPTIONS = { headers: { token: '' } };

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    if (token) OPTIONS.headers.token = token;
  }

  initToken(name: string): Observable<void> {
    return this.http.post<string>(`${BASE}/token`, { name }).pipe(
      tap((token) => {
        localStorage.setItem('token', token);
        OPTIONS.headers.token = token;
      }),
      map(() => void 0),
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${BASE}/games`, OPTIONS);
  }

  getGame(id: string): Observable<Game> {
    return this.http.get<Game>(`${BASE}/game/${id}`, OPTIONS);
  }

  getNickname(): string {
    return localStorage.getItem('nickname') || '';
  }

  setNickname(name: string): void {
    localStorage.setItem('nickname', name.trim());
  }

  createGame(mode: GameMode, maxPlayers: number): Observable<Game> {
    return this.http
      .post<Game>(`${BASE}/create`, { mode, maxPlayers }, OPTIONS)
      .pipe(tap((game) => this.setCreator(game._id, 0)));
  }

  joinGame(id: string): Observable<Game | false> {
    return this.http
      .post<Game | false>(`${BASE}/join`, { _id: id }, OPTIONS)
      .pipe(
        tap((result) => {
          if (result && typeof result === 'object' && '_id' in result) {
            const game = result as Game;
            this.setPlayerIndex(game._id, game.players.length - 1);
          }
        }),
      );
  }

  updateGame(id: string, fields: Record<string, any>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/update`, { _id: id, ...fields }, OPTIONS);
  }

  submitKnightAction(gameId: string, playerIndex: number, action: { type: string; target: number }): Observable<Game> {
    return this.http.post<Game>(`${BASE}/knight-action`, { _id: gameId, playerIndex, action }, OPTIONS);
  }

  submitTrueFaceAction(gameId: string, playerIndex: number, guess: Record<string, string>): Observable<Game> {
    return this.http.post<Game>(`${BASE}/true-face-action`, { _id: gameId, playerIndex, guess }, OPTIONS);
  }

  submitNightAction(gameId: string, field: string, target: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/night-action`, { _id: gameId, field, target }, OPTIONS);
  }

  submitVote(gameId: string, voterIndex: number, targetIndex: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/vote`, { _id: gameId, voterIndex, targetIndex }, OPTIONS);
  }

  sendMessage(gameId: string, text: string, type: 'day' | 'night'): Observable<any> {
    return this.http.post<any>(`${BASE}/message/create`, { _id: gameId, text, data: { type } }, OPTIONS);
  }

  getMessages(gameId: string): Observable<any[]> {
    return this.http.post<any[]>(`${BASE}/message/get`, { _id: gameId }, OPTIONS);
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
}
