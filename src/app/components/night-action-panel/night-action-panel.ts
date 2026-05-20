import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NightTarget {
  index: number;
  label: string;
}

@Component({
  selector: 'app-night-action-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './night-action-panel.html',
})
export class NightActionPanelComponent {
  @Input() myRole: string | null = null;
  @Input() isSleeping = false;
  @Input() hasAction = false;
  @Input() actionLabel = '';
  @Input() standardTargets: NightTarget[] = [];
  @Input() arsonistTargets: NightTarget[] = [];
  @Input() myNightTarget: number | null = null;
  @Input() hasSubmitted = false;
  @Input() dousedPlayers: number[] = [];
  @Output() action = new EventEmitter<number>();
  @Output() ignite = new EventEmitter<void>();

  get isArsonist(): boolean {
    return this.myRole === 'Arsonist';
  }
}
