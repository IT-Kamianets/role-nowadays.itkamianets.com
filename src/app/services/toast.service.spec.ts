import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastService } from './toast.service';

function makeService() {
  return new ToastService();
}

describe('ToastService.show', () => {
  it('adds a toast to the signal', () => {
    const svc = makeService();
    svc.show('Hello');
    expect(svc.toasts().length).toBe(1);
    expect(svc.toasts()[0].message).toBe('Hello');
  });

  it('defaults type to "info"', () => {
    const svc = makeService();
    svc.show('msg');
    expect(svc.toasts()[0].type).toBe('info');
  });

  it('respects explicit type "success"', () => {
    const svc = makeService();
    svc.show('ok', 'success');
    expect(svc.toasts()[0].type).toBe('success');
  });

  it('respects explicit type "error"', () => {
    const svc = makeService();
    svc.show('err', 'error');
    expect(svc.toasts()[0].type).toBe('error');
  });

  it('accumulates multiple toasts', () => {
    const svc = makeService();
    svc.show('first');
    svc.show('second');
    expect(svc.toasts().length).toBe(2);
  });

  it('each toast has a unique numeric id', () => {
    vi.useFakeTimers();
    const svc = makeService();
    svc.show('a');
    vi.advanceTimersByTime(1);
    svc.show('b');
    const [t1, t2] = svc.toasts();
    expect(t1.id).not.toBe(t2.id);
    expect(typeof t1.id).toBe('number');
    vi.useRealTimers();
  });

  it('removes toast after 3500ms via setTimeout', () => {
    vi.useFakeTimers();
    const svc = makeService();
    svc.show('bye');
    expect(svc.toasts().length).toBe(1);
    vi.advanceTimersByTime(3500);
    expect(svc.toasts().length).toBe(0);
    vi.useRealTimers();
  });

  it('removes only the correct toast after timeout', () => {
    vi.useFakeTimers();
    const svc = makeService();
    svc.show('first');
    vi.advanceTimersByTime(100);
    svc.show('second');
    vi.advanceTimersByTime(3400); // first toast should be gone
    expect(svc.toasts().length).toBe(1);
    expect(svc.toasts()[0].message).toBe('second');
    vi.useRealTimers();
  });
});
