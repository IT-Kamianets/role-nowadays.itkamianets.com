import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Phase = 'night' | 'day' | 'voting' | 'results';

const PHASE_CONFIG: Record<Phase, {
  label: string; icon: string; bg: string; iconBg: string; accent: string;
}> = {
  night:   { label: 'Ніч',         icon: '🌙', bg: 'bg-indigo-900/50 border-indigo-700/40',  iconBg: 'bg-indigo-700/60',  accent: 'text-indigo-300' },
  day:     { label: 'День',        icon: '☀️', bg: 'bg-amber-900/40 border-amber-600/30',     iconBg: 'bg-amber-700/50',   accent: 'text-amber-300' },
  voting:  { label: 'Голосування', icon: '🗳️', bg: 'bg-red-900/40 border-red-700/30',         iconBg: 'bg-red-700/50',     accent: 'text-red-300' },
  results: { label: 'Результати',  icon: '📋', bg: 'bg-[#12121e] border-[#1e1e30]',           iconBg: 'bg-white/10',       accent: 'text-white/50' },
};

@Component({
  selector: 'app-phase-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border p-5 flex items-center gap-4 {{ config.bg }}">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 {{ config.iconBg }}">
        {{ config.icon }}
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-[0.25em] font-bold mb-0.5 {{ config.accent }}">Поточна фаза</p>
        <p class="text-2xl font-black uppercase text-white">{{ config.label }}</p>
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
