import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private gameUpdate$ = new Subject<Game>();
  private reconnect$ = new Subject<void>();
  private _currentRoomId: string | null = null;

  connect(): void {
    if (this.socket) return;
    const token = (() => { try { return localStorage.getItem('token') ?? undefined; } catch { return undefined; } })();
    this.socket = io(environment.apiBase, { reconnection: true, reconnectionDelay: 2000, auth: { token } });
    this.socket.on('gamerole', (game: Game) => this.gameUpdate$.next(game));
    this.socket.on('disconnect', (reason: string) => {
      console.warn('[SocketService] disconnected:', reason);
    });
    this.socket.on('reconnect', (attempt: number) => {
      console.info('[SocketService] reconnected after', attempt, 'attempt(s)');
      if (this._currentRoomId) {
        this.socket?.emit('join-room', this._currentRoomId);
      }
      this.reconnect$.next();
    });
  }

  onGameUpdate(): Observable<Game> {
    return this.gameUpdate$.asObservable();
  }

  onReconnect(): Observable<void> {
    return this.reconnect$.asObservable();
  }

  joinRoom(gameId: string): void {
    this._currentRoomId = gameId;
    this.socket?.emit('join-room', gameId);
  }

  emit(game: Game): void {
    this.socket?.emit('gamerole', game);
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}
