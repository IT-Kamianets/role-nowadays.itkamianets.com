import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Phase = 'night' | 'day' | 'voting' | 'results';

const PHASE_CONFIG: Record<Phase, {
  label: string; icon: string; bg: string; iconBg: string; accent: string;
}> = {
  night:   { label: 'Ніч',         icon: '🌙', bg: 'bg-gradient-to-r from-indigo-950 to-violet-950 border-indigo-800/40',  iconBg: 'bg-indigo-500/20',  accent: 'text-indigo-300' },
  day:     { label: 'День',        icon: '☀️', bg: 'bg-gradient-to-r from-amber-950 to-orange-950 border-amber-800/40',    iconBg: 'bg-amber-500/20',   accent: 'text-amber-300' },
  voting:  { label: 'Голосування', icon: '🗳️', bg: 'bg-gradient-to-r from-red-950 to-rose-950 border-red-800/40',          iconBg: 'bg-red-500/20',     accent: 'text-red-300' },
  results: { label: 'Результати',  icon: '📋', bg: 'bg-gradient-to-r from-gray-900 to-slate-900 border-gray-700/40',        iconBg: 'bg-gray-500/20',    accent: 'text-gray-300' },
};

@Component({
  selector: 'app-phase-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border p-4 flex items-center gap-4 {{ config.bg }}">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 {{ config.iconBg }}">
        {{ config.icon }}
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-[0.2em] mb-0.5 {{ config.accent }}">Поточна фаза</p>
        <p class="text-xl font-black text-white">{{ config.label }}</p>
      </div>
    </div>
  `,
})
export class PhaseBannerComponent {
  @Input({ required: true }) phase!: Phase;

  get config() {
    return PHASE_CONFIG[this.phase];
  }
}
