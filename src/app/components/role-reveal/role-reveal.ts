import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TransitionRequest {
  video: string;
  reveal: boolean;
}

@Component({
  selector: 'app-role-reveal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-reveal.html',
})
export class RoleRevealComponent implements OnChanges, OnDestroy {
  @Input() pendingTransition: TransitionRequest | null = null;
  @Input() myRole: string | null = null;
  @Input() roleImageSrc = '';
  @Output() transitionComplete = new EventEmitter<{ wasReveal: boolean }>();
  @Output() activeChange = new EventEmitter<boolean>();

  protected currentVideo = signal<string | null>(null);
  protected showReveal = signal(false);
  protected cardFlipped = signal(false);
  protected roleRevealed = signal(false);

  private pendingReveal = false;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pendingTransition'] && this.pendingTransition) {
      this.start(this.pendingTransition.video, this.pendingTransition.reveal);
    }
  }

  ngOnDestroy() {
    this.clearTimeouts();
  }

  private start(videoSrc: string, reveal: boolean) {
    this.clearTimeouts();
    this.pendingReveal = reveal;
    this.currentVideo.set(videoSrc);
    this.activeChange.emit(true);
    // Fallback: video is 8s, force-continue at 12s if events fail
    this.timeouts.push(setTimeout(() => this.onVideoEnded(), 12_000));
  }

  onVideoEnded() {
    if (!this.currentVideo()) return;
    this.clearTimeouts();
    this.currentVideo.set(null);
    if (this.pendingReveal) {
      this.pendingReveal = false;
      this.showReveal.set(true);
      this.roleRevealed.set(false);
      this.cardFlipped.set(false);
      this.startAutoReveal();
    } else {
      this.activeChange.emit(false);
      this.transitionComplete.emit({ wasReveal: false });
    }
  }

  onVideoStalled() {
    this.clearTimeouts();
    this.timeouts.push(setTimeout(() => this.onVideoEnded(), 2_000));
  }

  private startAutoReveal() {
    this.timeouts.push(setTimeout(() => {
      this.cardFlipped.set(true);
      this.timeouts.push(setTimeout(() => {
        this.roleRevealed.set(true);
        this.transitionComplete.emit({ wasReveal: true });
        this.timeouts.push(setTimeout(() => {
          this.showReveal.set(false);
          this.cardFlipped.set(false);
          this.activeChange.emit(false);
        }, 600));
      }, 650 + 2000));
    }, 600));
  }

  private clearTimeouts() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  }
}
