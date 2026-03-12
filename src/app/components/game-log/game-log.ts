import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LogEntry {
  text: string;
  type: 'event' | 'action';
}

@Component({
  selector: 'app-game-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (entries.length) {
      <div>
        <p class="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-100/30 mb-3">Журнал дій</p>
        <div class="bg-[#1a110a] border border-[#2d1f10] rounded-2xl overflow-hidden divide-y divide-[#2d1f10]">
          @for (entry of entries; track $index) {
            <div class="px-4 py-2.5 flex items-start gap-2.5">
              <span class="text-sm shrink-0 mt-0.5">{{ icon(entry) }}</span>
              <p class="text-xs leading-relaxed" [class]="cls(entry)">{{ entry.text }}</p>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class GameLogComponent {
  @Input() entries: LogEntry[] = [];

  icon(entry: LogEntry): string {
    if (entry.type === 'action') return '✍️';
    if (entry.text.includes('загинув від руки') || entry.text.includes('загинув')) return '💀';
    if (entry.text.includes('усунений голосуванням')) return '⚖️';
    if (entry.text.includes('врятував')) return '💚';
    if (entry.text.includes('Ніхто не загинув')) return '✨';
    if (entry.text.includes('Гра розпочалась')) return '⚔️';
    return '📋';
  }

  cls(entry: LogEntry): string {
    if (entry.type === 'action') return 'text-amber-400/90';
    if (entry.text.includes('загинув від руки') || entry.text.includes('загинув')) return 'text-red-400/80';
    if (entry.text.includes('усунений голосуванням')) return 'text-orange-400/80';
    if (entry.text.includes('врятував') || entry.text.includes('Ніхто не загинув')) return 'text-green-400/80';
    if (entry.text.includes('Гра розпочалась')) return 'text-amber-400/80';
    return 'text-amber-100/50';
  }
}
