import type React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useSwipe } from '../useSwipe';

const createPointerEvent = (
  pointerId: number,
  clientX: number,
  clientY: number
) =>
  ({
    pointerId,
    clientX,
    clientY,
  }) as unknown as React.PointerEvent<Element>;

describe('useSwipe', () => {
  it('calls onSwipeLeft for leftward movement exceeding threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const downEvent = createPointerEvent(1, 200, 100);
    const upEvent = createPointerEvent(1, 100, 100);

    act(() => {
      result.current.onPointerDown(downEvent);
      result.current.onPointerUp(upEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('calls onSwipeRight for rightward movement exceeding threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const downEvent = createPointerEvent(1, 100, 100);
    const upEvent = createPointerEvent(1, 200, 100);

    act(() => {
      result.current.onPointerDown(downEvent);
      result.current.onPointerUp(upEvent);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('does not call callbacks when movement is below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const downEvent = createPointerEvent(1, 100, 100);
    const upEvent = createPointerEvent(1, 130, 100);

    act(() => {
      result.current.onPointerDown(downEvent);
      result.current.onPointerUp(upEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not call callbacks for vertical-dominant gestures', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const downEvent = createPointerEvent(1, 100, 100);
    const upEvent = createPointerEvent(1, 130, 200);

    act(() => {
      result.current.onPointerDown(downEvent);
      result.current.onPointerUp(upEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('resets state after pointerup and pointercancel', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const firstDownEvent = createPointerEvent(1, 200, 100);
    const firstUpEvent = createPointerEvent(1, 100, 100);
    const extraUpEvent = createPointerEvent(1, 0, 100);

    const secondDownEvent = createPointerEvent(2, 200, 100);
    const secondUpEvent = createPointerEvent(2, 100, 100);

    act(() => {
      // First swipe — should fire onSwipeLeft
      result.current.onPointerDown(firstDownEvent);
      result.current.onPointerUp(firstUpEvent);

      // Extra pointerup with no active pointer — should do nothing
      result.current.onPointerUp(extraUpEvent);

      // Second pointer — cancel it, then try pointerup — should do nothing
      result.current.onPointerDown(secondDownEvent);
      result.current.onPointerCancel(secondDownEvent);
      result.current.onPointerUp(secondUpEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not trigger when movement is exactly the threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 })
    );

    const downEvent = createPointerEvent(1, 100, 100);
    const upEvent = createPointerEvent(1, 150, 100);

    act(() => {
      result.current.onPointerDown(downEvent);
      result.current.onPointerUp(upEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
