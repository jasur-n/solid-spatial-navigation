import { createEffect, onCleanup, onMount, createUniqueId } from 'solid-js';

import { SpatialNavigation } from './SpatialNavigation';

const noop = () => {};

export const useFocusableHook = ({
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

  let nodeRef;

  const [focused, setFocused] = createSignal(false);
  const [hasFocusedChild, setHasFocusedChild] = createSignal(false);

  const parentFocusKey = useFocusContext();

  /**
   * Either using the propFocusKey passed in, or generating a random one
   */
  const focusKey = useMemo(
    () => propFocusKey || `sn:focusable-item-${createUniqueId()}`,
    [propFocusKey]
  );

  const focusSelf = useCallback(() => {
    SpatialNavigation.setFocus(focusKey);
  }, [focusKey]);

  onMount(() => {
    SpatialNavigation.addFocusable({
      focusKey,
      node: nodeRef,
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
      focusKey,
    });
  });

  createEffect(() => {
    SpatialNavigation.updateFocusable(focusKey, {
      node: nodeRef,
      preferredChildFocusKey,
      focusable,
      isFocusBoundary,
    });
  });

  return {
    nodeRef,
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
