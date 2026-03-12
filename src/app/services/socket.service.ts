import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private gameUpdate$ = new Subject<Game>();

  connect(): void {
    if (this.socket) return;
    this.socket = io(environment.apiBase);
    this.socket.on('gamerole', (game: Game) => this.gameUpdate$.next(game));
  }

  onGameUpdate(): Observable<Game> {
    return this.gameUpdate$.asObservable();
  }

  emit(game: Game): void {
    this.socket?.emit('gamerole', game);
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}
