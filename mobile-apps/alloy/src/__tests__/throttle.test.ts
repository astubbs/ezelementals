import { Throttle } from '../lib/throttle';

describe('Throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires the send after the interval elapses', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(42);
    expect(send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(99);
    expect(send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(42);
  });

  it('coalesces rapid pushes into one send with the latest value', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(10);
    t.push(20);
    t.push(30);
    t.push(40);

    jest.advanceTimersByTime(100);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(40);
  });

  it('flush() fires immediately with the pending value and cancels the timer', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(55);
    jest.advanceTimersByTime(50);
    t.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(55);

    // Advancing further must not fire a second send.
    jest.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('flush() with nothing pending is a no-op', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it('flush() after the window has fired does not double-send', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(7);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledTimes(1);

    t.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('dispose() after a pending push prevents the send', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(99);
    t.dispose();

    jest.advanceTimersByTime(200);
    expect(send).not.toHaveBeenCalled();
  });

  it('supports a new push after a previous window has fired', () => {
    const send = jest.fn();
    const t = new Throttle(send, 100);

    t.push(1);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledWith(1);

    t.push(2);
    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledWith(2);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
