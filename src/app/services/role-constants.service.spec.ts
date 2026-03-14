import { describe, it, expect } from 'vitest';
import { RoleConstantsService } from './role-constants.service';

function makeService() {
  return new RoleConstantsService();
}

describe('RoleConstantsService.nameUk', () => {
  const svc = makeService();

  it('returns Ukrainian name for Villager', () => expect(svc.nameUk('Villager')).toBe('Житель'));
  it('returns Ukrainian name for Mafia',   () => expect(svc.nameUk('Mafia')).toBe('Мафія'));
  it('returns Ukrainian name for Doctor',  () => expect(svc.nameUk('Doctor')).toBe('Лікар'));
  it('returns Ukrainian name for Detective', () => expect(svc.nameUk('Detective')).toBe('Детектив'));
  it('returns Ukrainian name for Godfather', () => expect(svc.nameUk('Godfather')).toBe('Хрещений батько'));
  it('returns Ukrainian name for SerialKiller', () => expect(svc.nameUk('SerialKiller')).toBe('Серійний вбивця'));
  it('falls back to role key for unknown role', () => expect(svc.nameUk('UnknownRole')).toBe('UnknownRole'));
});

describe('RoleConstantsService.icon', () => {
  const svc = makeService();

  it('returns icon for Villager', () => expect(svc.icon('Villager')).toBe('🏘️'));
  it('returns icon for Mafia',   () => expect(svc.icon('Mafia')).toBe('🔪'));
  it('returns icon for Doctor',  () => expect(svc.icon('Doctor')).toBe('💊'));
  it('returns icon for Jester',  () => expect(svc.icon('Jester')).toBe('🤡'));
  it('returns icon for Arsonist',() => expect(svc.icon('Arsonist')).toBe('🔥'));
  it('returns ❓ for unknown role', () => expect(svc.icon('NoSuchRole')).toBe('❓'));
});

describe('RoleConstantsService constants coverage', () => {
  const svc = makeService();
  const allRoles = [
    'Villager', 'Detective', 'Doctor', 'Bodyguard', 'Sheriff', 'Tracker',
    'Watcher', 'Priest', 'Mayor', 'Mafia', 'Godfather', 'Consigliere',
    'Roleblocker', 'Poisoner', 'Framer', 'Jester', 'Executioner', 'Survivor',
    'SerialKiller', 'Arsonist',
  ];

  it('ROLE_NAMES_UK covers all 20 roles', () => {
    allRoles.forEach(r => {
      expect(svc.nameUk(r), `${r} should have a Ukrainian name`).not.toBe(r);
    });
  });

  it('ROLE_ICONS covers all 20 roles', () => {
    allRoles.forEach(r => {
      expect(svc.icon(r), `${r} should have an icon`).not.toBe('❓');
    });
  });
});
