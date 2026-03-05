import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Game } from '../models/game.model';

const BASE = 'https://api.webart.work/api/rnd';
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

  createGame(mode: string, maxPlayers: number): Observable<Game> {
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

  submitVote(gameId: string, voterIndex: number, targetIndex: number): Observable<Game> {
    return this.http.post<Game>(`${BASE}/vote`, { _id: gameId, voterIndex, targetIndex }, OPTIONS);
  }

  sendDayMessage(gameId: string, text: string): Observable<Game> {
    return this.http.post<Game>(`${BASE}/chat/day`, { _id: gameId, text }, OPTIONS);
  }

  sendNightMessage(gameId: string, text: string): Observable<Game> {
    return this.http.post<Game>(`${BASE}/chat/night`, { _id: gameId, text }, OPTIONS);
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
