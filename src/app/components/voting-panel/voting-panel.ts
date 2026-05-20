import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VotingPlayer {
  index: number;
  label: string;
}

@Component({
  selector: 'app-voting-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voting-panel.html',
})
export class VotingPanelComponent {
  @Input() voteCount = 0;
  @Input() aliveCount = 0;
  @Input() secondsLeft = 0;
  @Input() isAlive = false;
  @Input() hasVoted = false;
  @Input() votingTargets: VotingPlayer[] = [];
  @Input() alivePlayers: VotingPlayer[] = [];
  @Input() myVoteTargetName = '';
  @Input() votedIndices: number[] = [];
  @Output() vote = new EventEmitter<number>();
  @Output() changeVote = new EventEmitter<void>();

  hasPlayerVoted(index: number): boolean {
    return this.votedIndices.includes(index);
  }
}
