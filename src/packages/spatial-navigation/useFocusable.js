import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  onMount,
  createUniqueId,
} from 'solid-js';

import { uniqueId } from 'lodash';

import { SpatialNavigation } from './SpatialNavigation';
import { useFocusContext } from './useFocusedContext';

const noop = () => {};

export const useFocusable = ({
  focusable = true,
  saveLastFocusedChild = true,
  trackChildren = false,
  autoRestoreFocus = true,
  isFocusBoundary = false,
  focusKey: propFocusKey,
  preferredChildFocusKey,
  onEnterPress = noop,
  onEnterRelease = noop,
  onArrowPress = () => true,
  onFocus = noop,
  onBlur = noop,
  extraProps,
} = {}) => {
  const onEnterPressHandler = (details) => {
    onEnterPress(extraProps, details);
  };

  const onEnterReleaseHandler = () => {
    onEnterRelease(extraProps);
  };

  const onArrowPressHandler = (direction, details) =>
    onArrowPress(direction, extraProps, details);

  const onFocusHandler = (layout, details) => {
    onFocus(layout, extraProps, details);
  };

  const onBlurHandler = (layout, details) => {
    onBlur(layout, extraProps, details);
  };

  const [ref, setRef] = createSignal();

  const [focused, setFocused] = createSignal(false);
  const [hasFocusedChild, setHasFocusedChild] = createSignal(false);

  const parentFocusKey = useFocusContext();

  /**
   * Either using the propFocusKey passed in, or generating a random one
   */
  const focusKey = createMemo(
    () => propFocusKey || uniqueId('sn:focusable-item')
  );

  const focusSelf = () => {
    SpatialNavigation.setFocus(focusKey);
  };

  onMount(() => {
    SpatialNavigation.addFocusable({
      focusKey: focusKey(),
      node: ref(),
      parentFocusKey,
      preferredChildFocusKey,
      onEnterPress: onEnterPressHandler,
      onEnterRelease: onEnterReleaseHandler,
      onArrowPress: onArrowPressHandler,
      onFocus: onFocusHandler,
      onBlur: onBlurHandler,
      onUpdateFocus: (isFocused = false) => setFocused(isFocused),
      onUpdateHasFocusedChild: (isFocused = false) =>
        setHasFocusedChild(isFocused),
      saveLastFocusedChild,
      trackChildren,
      isFocusBoundary,
      autoRestoreFocus,
      focusable,
    });
  });

  onCleanup(() => {
    SpatialNavigation.removeFocusable({
      focusKey: focusKey(),
    });
  });

  createEffect(() => {
    SpatialNavigation.updateFocusable(focusKey(), {
      node: ref(),
      preferredChildFocusKey,
      focusable,
      isFocusBoundary,
    });
  });

  return {
    ref,
    setRef,
    focusSelf,
    focused,
    hasFocusedChild,
    focusKey, // returns either the same focusKey as passed in, or generated one
    setFocus: SpatialNavigation.setFocus,
    navigateByDirection: SpatialNavigation.navigateByDirection,
    pause: SpatialNavigation.pause,
    resume: SpatialNavigation.resume,
    updateAllLayouts: SpatialNavigation.updateAllLayouts,
  };
};
