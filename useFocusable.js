import { createEffect, onCleanup, onMount } from "solid-js";
import { SpatialNavigation } from "./SpatialNavigation";

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
  const onEnterPressHandler = useCallback(
    (details) => {
      onEnterPress(extraProps, details);
    },
    [onEnterPress, extraProps]
  );

  const onEnterReleaseHandler = useCallback(() => {
    onEnterRelease(extraProps);
  }, [onEnterRelease, extraProps]);

  const onArrowPressHandler = useCallback(
    (direction, details) => onArrowPress(direction, extraProps, details),
    [extraProps, onArrowPress]
  );

  const onFocusHandler = useCallback(
    (layout, details) => {
      onFocus(layout, extraProps, details);
    },
    [extraProps, onFocus]
  );

  const onBlurHandler = useCallback(
    (layout, details) => {
      onBlur(layout, extraProps, details);
    },
    [extraProps, onBlur]
  );

  let ref;

  const [focused, setFocused] = createSignal(false);
  const [hasFocusedChild, setHasFocusedChild] = createSignal(false);

  const parentFocusKey = useFocusContext();

  /**
   * Either using the propFocusKey passed in, or generating a random one
   */
  const focusKey = useMemo(
    () => propFocusKey || uniqueId("sn:focusable-item-"),
    [propFocusKey]
  );

  const focusSelf = useCallback(() => {
    SpatialNavigation.setFocus(focusKey);
  }, [focusKey]);

  onMount(() => {
    SpatialNavigation.addFocusable({
      focusKey,
      node: ref,
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
      node: ref,
      preferredChildFocusKey,
      focusable,
      isFocusBoundary,
    });
  });

  return {
    ref,
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
