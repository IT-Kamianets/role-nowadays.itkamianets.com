import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-cyan-600 to-sky-700',
  'from-fuchsia-600 to-purple-700',
  'from-lime-600 to-green-700',
];

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @for (player of players; track player.id; let i = $index) {
        <div class="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all"
          [class]="player.isAlive
            ? 'bg-white/[0.04] border-white/[0.06]'
            : 'bg-transparent border-transparent opacity-40'">

          <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 bg-gradient-to-br"
            [class]="player.isAlive ? avatarGradient(i) : 'from-gray-600 to-gray-700'">
            {{ player.name[0] }}
          </div>

          <span class="flex-1 text-sm font-medium"
            [class]="player.isAlive ? 'text-white' : 'text-white/30 line-through'">
            {{ player.name }}
          </span>

          @if (player.isAlive) {
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60"></span>
          } @else {
            <span class="text-[10px] text-white/20 font-medium">Вибув</span>
          }
        </div>
      }
    </div>
  `,
})
export class PlayerListComponent {
  @Input({ required: true }) players!: Player[];

  avatarGradient(index: number): string {
    return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  }
}
