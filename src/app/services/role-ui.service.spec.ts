import { describe, it, expect } from 'vitest';
import { RoleUiService } from './role-ui.service';
import { ClassicMafiaService } from './classic-mafia.service';
import { ExtendedMafiaService } from './extended-mafia.service';
import { RoleConstantsService } from './role-constants.service';

function makeService() {
  const classicMafia = new ClassicMafiaService();
  const extendedMafia = new ExtendedMafiaService();
  const roleConstants = new RoleConstantsService();
  return new RoleUiService(classicMafia, extendedMafia, roleConstants);
}

describe('RoleUiService.roleTeamBadgeClass', () => {
  const svc = makeService();

  it('returns red class for Mafia', () => expect(svc.roleTeamBadgeClass('Mafia')).toContain('red'));
  it('returns red class for Godfather', () => expect(svc.roleTeamBadgeClass('Godfather')).toContain('red'));
  it('returns amber class for Doctor', () => expect(svc.roleTeamBadgeClass('Doctor')).toContain('amber'));
  it('returns amber class for Villager', () => expect(svc.roleTeamBadgeClass('Villager')).toContain('amber'));
  it('returns purple class for SerialKiller', () => expect(svc.roleTeamBadgeClass('SerialKiller')).toContain('purple'));
});

describe('RoleUiService.roleTeamTextClass', () => {
  const svc = makeService();

  it('returns red text for Mafia', () => expect(svc.roleTeamTextClass('Mafia')).toContain('red'));
  it('returns amber text for Detective', () => expect(svc.roleTeamTextClass('Detective')).toContain('amber'));
  it('returns purple text for Jester', () => expect(svc.roleTeamTextClass('Jester')).toContain('purple'));
});

describe('RoleUiService.roleIcon', () => {
  const svc = makeService();

  it('returns icon for Doctor', () => expect(svc.roleIcon('Doctor')).toBe('💊'));
  it('returns icon for Mafia', () => expect(svc.roleIcon('Mafia')).toBe('🔪'));
  it('returns ❓ for unknown', () => expect(svc.roleIcon('NoRole')).toBe('❓'));
});

describe('RoleUiService.roleNameUk', () => {
  const svc = makeService();

  it('returns Ukrainian for Doctor', () => expect(svc.roleNameUk('Doctor')).toBe('Лікар'));
  it('returns Ukrainian for Mafia', () => expect(svc.roleNameUk('Mafia')).toBe('Мафія'));
  it('falls back to key for unknown', () => expect(svc.roleNameUk('X')).toBe('X'));
});

describe('RoleUiService.revealCardBg', () => {
  const svc = makeService();

  it('returns a bg class for Mafia', () => expect(svc.revealCardBg('Mafia')).toContain('bg-'));
  it('returns a bg class for Doctor', () => expect(svc.revealCardBg('Doctor')).toContain('bg-'));
  it('returns default bg for unknown role', () => expect(svc.revealCardBg('??')).toContain('slate'));
});

describe('RoleUiService.winnerBannerClass', () => {
  const svc = makeService();

  it('returns red class for mafia winner', () => expect(svc.winnerBannerClass('mafia')).toContain('red'));
  it('returns pink class for jester winner', () => expect(svc.winnerBannerClass('jester')).toContain('pink'));
  it('returns default class for null', () => expect(svc.winnerBannerClass(null)).toContain('amber'));
  it('returns default class for undefined', () => expect(svc.winnerBannerClass(undefined)).toContain('amber'));
});

describe('RoleUiService.winnerIcon', () => {
  const svc = makeService();

  it('returns shield for village', () => expect(svc.winnerIcon('village')).toBe('🛡️'));
  it('returns knife for mafia', () => expect(svc.winnerIcon('mafia')).toBe('🔪'));
  it('returns trophy for unknown', () => expect(svc.winnerIcon('unknown')).toBe('🏆'));
  it('returns trophy for null', () => expect(svc.winnerIcon(null)).toBe('🏆'));
});

describe('RoleUiService.winnerLabel', () => {
  const svc = makeService();

  it('returns Ukrainian label for village', () => expect(svc.winnerLabel('village')).toContain('Місто'));
  it('returns Ukrainian label for mafia', () => expect(svc.winnerLabel('mafia')).toContain('Мафія'));
  it('returns default label for unknown', () => expect(svc.winnerLabel('??')).toBe('Гра завершена'));
});

describe('RoleUiService.teamLabel', () => {
  const svc = makeService();

  it('returns "Мафія" for mafia team', () => expect(svc.teamLabel('mafia')).toBe('Мафія'));
  it('returns "Місто" for city team', () => expect(svc.teamLabel('city')).toBe('Місто'));
});
