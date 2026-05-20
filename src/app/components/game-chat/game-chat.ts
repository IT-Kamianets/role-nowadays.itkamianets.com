import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-game-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-chat.html',
})
export class GameChatComponent {
  @Input() variant: 'day' | 'night' = 'day';
  @Input() messages: Message[] = [];
  @Input() text = '';
  @Output() textChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();

  onTextChange(v: string) {
    this.textChange.emit(v);
  }

  onSend() {
    this.send.emit();
  }
}
