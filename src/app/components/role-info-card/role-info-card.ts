import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-role-info-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="role-card-anim flip-card rounded-xl shadow-lg shadow-black/50 cursor-pointer relative"
      (click)="toggle()">
      <div class="flip-inner rounded-xl" [class.flipped]="!hidden()">
        <img src="/card-back.jpg" alt="Card back" class="flip-face w-full rounded-xl block" />
        <img [src]="roleImageSrc" [alt]="myRole ?? ''" class="flip-back-face w-full rounded-xl block" />
      </div>
      <div class="absolute bottom-1 right-1 text-[10px] leading-none pointer-events-none">
        {{ hidden() ? '🔓' : '🔒' }}
      </div>
    </div>
  `,
})
export class RoleInfoCardComponent {
  @Input() myRole: string | null = null;
  @Input() roleImageSrc = '';

  protected hidden = signal(false);

  toggle() {
    this.hidden.update(v => !v);
  }
}
