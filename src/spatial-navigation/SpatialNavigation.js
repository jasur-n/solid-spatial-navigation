import {
  filter,
  sortBy,
  findKey,
  forEach,
  forOwn,
  throttle,
  difference,
} from 'lodash';

const DIRECTION_LEFT = 'left';
const DIRECTION_RIGHT = 'right';
const DIRECTION_UP = 'up';
const DIRECTION_DOWN = 'down';
const KEY_ENTER = 'enter';

const DEFAULT_KEY_MAP = {
  [DIRECTION_LEFT]: 37,
  [DIRECTION_UP]: 38,
  [DIRECTION_RIGHT]: 39,
  [DIRECTION_DOWN]: 40,
  [KEY_ENTER]: 13,
};

export const ROOT_FOCUS_KEY = 'SN:ROOT';

const ADJACENT_SLICE_THRESHOLD = 0.2;

/**
 * Adjacent slice is 5 times more important than diagonal
 */
const ADJACENT_SLICE_WEIGHT = 5;
const DIAGONAL_SLICE_WEIGHT = 1;

/**
 * Main coordinate distance is 5 times more important
 */
const MAIN_COORDINATE_WEIGHT = 5;

const DEBUG_FN_COLORS = ['#0FF', '#FF0', '#F0F'];

const THROTTLE_OPTIONS = {
  leading: true,
  trailing: false,
};

const getRect = (node) => {
  const rect = node.getBoundingClientRect();

  return {
    top: Math.ceil(rect.top),
    left: Math.ceil(rect.left),
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  };
};

const measureLayout = (node) => {
  const relativeNode = node && node.parentElement;

  if (node && relativeNode) {
    const relativeRect = getRect(relativeNode);
    const { height, left, top, width } = getRect(node);
    const x = left - relativeRect.left;
    const y = top - relativeRect.top;

    return {
      x,
      y,
      top,
      left,
      width,
      height,
    };
  }

  return { x: 0, y: 0, top: 0, left: 0, width: 0, height: 0 };
};

const getChildClosestToOrigin = (children) => {
  const childrenClosestToOrigin = sortBy(
    children,
    ({ layout }) => Math.abs(layout.left) + Math.abs(layout.top)
  );

  return childrenClosestToOrigin[0];
};

class SpatialNavigationService {
  /**
   * Used to determine the coordinate that will be used to filter items that are over the "edge"
   */
  static getCutoffCoordinate(isVertical, isIncremental, isSibling, layout) {
    const itemX = layout.left;
    const itemY = layout.top;
    const itemWidth = layout.width;
    const itemHeight = layout.height;

    const coordinate = isVertical ? itemY : itemX;
    const itemSize = isVertical ? itemHeight : itemWidth;

    if (isIncremental) {
      return isSibling ? coordinate : coordinate + itemSize;
    }

    return isSibling ? coordinate + itemSize : coordinate;
  }

  /**
   * Returns two corners (a and b) coordinates that are used as a reference points
   * Where "a" is always leftmost and topmost corner, and "b" is rightmost bottommost corner
   */
  static getRefCorners(direction, isSibling, layout) {
    const itemX = layout.left;
    const itemY = layout.top;
    const itemWidth = layout.width;
    const itemHeight = layout.height;

    const result = {
      a: {
        x: 0,
        y: 0,
      },
      b: {
        x: 0,
        y: 0,
      },
    };

    switch (direction) {
      case DIRECTION_UP: {
        const y = isSibling ? itemY + itemHeight : itemY;

        result.a = {
          x: itemX,
          y,
        };

        result.b = {
          x: itemX + itemWidth,
          y,
        };

        break;
      }

      case DIRECTION_DOWN: {
        const y = isSibling ? itemY : itemY + itemHeight;

        result.a = {
          x: itemX,
          y,
        };

        result.b = {
          x: itemX + itemWidth,
          y,
        };

        break;
      }

      case DIRECTION_LEFT: {
        const x = isSibling ? itemX + itemWidth : itemX;

        result.a = {
          x,
          y: itemY,
        };

        result.b = {
          x,
          y: itemY + itemHeight,
        };

        break;
      }

      case DIRECTION_RIGHT: {
        const x = isSibling ? itemX : itemX + itemWidth;

        result.a = {
          x,
          y: itemY,
        };

        result.b = {
          x,
          y: itemY + itemHeight,
        };

        break;
      }

      default:
        break;
    }

    return result;
  }

  /**
   * Calculates if the sibling node is intersecting enough with the ref node by the secondary coordinate
   */
  static isAdjacentSlice(refCorners, siblingCorners, isVerticalDirection) {
    const { a: refA, b: refB } = refCorners;
    const { a: siblingA, b: siblingB } = siblingCorners;
    const coordinate = isVerticalDirection ? 'x' : 'y';

    const refCoordinateA = refA[coordinate];
    const refCoordinateB = refB[coordinate];
    const siblingCoordinateA = siblingA[coordinate];
    const siblingCoordinateB = siblingB[coordinate];

    const thresholdDistance =
      (refCoordinateB - refCoordinateA) * ADJACENT_SLICE_THRESHOLD;

    const intersectionLength = Math.max(
      0,
      Math.min(refCoordinateB, siblingCoordinateB) -
        Math.max(refCoordinateA, siblingCoordinateA)
    );

    return intersectionLength >= thresholdDistance;
  }

  static getPrimaryAxisDistance(
    refCorners,
    siblingCorners,
    isVerticalDirection
  ) {
    const { a: refA } = refCorners;
    const { a: siblingA } = siblingCorners;
    const coordinate = isVerticalDirection ? 'y' : 'x';

    return Math.abs(siblingA[coordinate] - refA[coordinate]);
  }

  static getSecondaryAxisDistance(
    refCorners,
    siblingCorners,
    isVerticalDirection
  ) {
    const { a: refA, b: refB } = refCorners;
    const { a: siblingA, b: siblingB } = siblingCorners;
    const coordinate = isVerticalDirection ? 'x' : 'y';

    const refCoordinateA = refA[coordinate];
    const refCoordinateB = refB[coordinate];
    const siblingCoordinateA = siblingA[coordinate];
    const siblingCoordinateB = siblingB[coordinate];

    const distancesToCompare = [];

    distancesToCompare.push(Math.abs(siblingCoordinateA - refCoordinateA));
    distancesToCompare.push(Math.abs(siblingCoordinateA - refCoordinateB));
    distancesToCompare.push(Math.abs(siblingCoordinateB - refCoordinateA));
    distancesToCompare.push(Math.abs(siblingCoordinateB - refCoordinateB));

    return Math.min(...distancesToCompare);
  }

  /**
   * Inspired by: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV/TV_remote_control_navigation#Algorithm_design
   * Ref Corners are the 2 corners of the current component in the direction of navigation
   * They used as a base to measure adjacent slices
   */
  sortSiblingsByPriority(siblings, currentLayout, direction, focusKey) {
    const isVerticalDirection =
      direction === DIRECTION_DOWN || direction === DIRECTION_UP;

    const refCorners = SpatialNavigationService.getRefCorners(
      direction,
      false,
      currentLayout
    );

    return sortBy(siblings, (sibling) => {
      const siblingCorners = SpatialNavigationService.getRefCorners(
        direction,
        true,
        sibling.layout
      );

      const isAdjacentSlice = SpatialNavigationService.isAdjacentSlice(
        refCorners,
        siblingCorners,
        isVerticalDirection
      );

      const primaryAxisFunction = isAdjacentSlice
        ? SpatialNavigationService.getPrimaryAxisDistance
        : SpatialNavigationService.getSecondaryAxisDistance;

      const secondaryAxisFunction = isAdjacentSlice
        ? SpatialNavigationService.getSecondaryAxisDistance
        : SpatialNavigationService.getPrimaryAxisDistance;

      const primaryAxisDistance = primaryAxisFunction(
        refCorners,
        siblingCorners,
        isVerticalDirection
      );
      const secondaryAxisDistance = secondaryAxisFunction(
        refCorners,
        siblingCorners,
        isVerticalDirection
      );

      /**
       * The higher this value is, the less prioritised the candidate is
       */
      const totalDistancePoints =
        primaryAxisDistance * MAIN_COORDINATE_WEIGHT + secondaryAxisDistance;

      /**
       * + 1 here is in case of distance is zero, but we still want to apply Adjacent priority weight
       */
      const priority =
        (totalDistancePoints + 1) /
        (isAdjacentSlice ? ADJACENT_SLICE_WEIGHT : DIAGONAL_SLICE_WEIGHT);

      this.log(
        'smartNavigate',
        `distance (primary, secondary, total weighted) for ${sibling.focusKey} relative to ${focusKey} is`,
        primaryAxisDistance,
        secondaryAxisDistance,
        totalDistancePoints
      );

      this.log(
        'smartNavigate',
        `priority for ${sibling.focusKey} relative to ${focusKey} is`,
        priority
      );

      return priority;
    });
  }

  constructor() {
    /**
     * Storage for all focusable components
     */
    this.focusableComponents = {};

    /**
     * Storing current focused key
     */
    this.focusKey = null;

    /**
     * This collection contains focus keys of the elements that are having a child focused
     * Might be handy for styling of certain parent components if their child is focused.
     */
    this.parentsHavingFocusedChild = [];

    this.enabled = false;
    this.nativeMode = false;
    this.throttle = 0;
    this.throttleKeypresses = false;

    this.pressedKeys = {};

    /**
     * Flag used to block key events from this service
     * @type {boolean}
     */
    this.paused = false;

    this.keyDownEventListener = null;
    this.keyUpEventListener = null;
    this.keyMap = DEFAULT_KEY_MAP;

    this.onKeyEvent = this.onKeyEvent.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.setFocus = this.setFocus.bind(this);
    this.updateAllLayouts = this.updateAllLayouts.bind(this);
    this.navigateByDirection = this.navigateByDirection.bind(this);
    this.init = this.init.bind(this);
    this.setKeyMap = this.setKeyMap.bind(this);

    this.debug = false;

    this.logIndex = 0;
  }

  init({
    debug = false,
    throttle: throttleParam = 0,
    throttleKeypresses = false,
  } = {}) {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.throttleKeypresses = throttleKeypresses;

    this.debug = debug;

    if (Number.isInteger(throttleParam) && throttleParam > 0) {
      this.throttle = throttleParam;
    }
    this.bindEventHandlers();
  }

  destroy() {
    if (this.enabled) {
      this.enabled = false;
      this.throttle = 0;
      this.throttleKeypresses = false;
      this.focusKey = null;
      this.parentsHavingFocusedChild = [];
      this.focusableComponents = {};
      this.paused = false;
      this.keyMap = DEFAULT_KEY_MAP;

      this.unbindEventHandlers();
    }
  }

  getEventType(keyCode) {
    return findKey(this.getKeyMap(), (code) => keyCode === code);
  }

  bindEventHandlers() {
    if (typeof window === 'undefined') {
      return;
    }

    this.keyDownEventListener = (event) => {
      if (this.paused === true) {
        return;
      }

      if (this.debug) {
        this.logIndex += 1;
      }

      const eventType = this.getEventType(event.keyCode);

      if (!eventType) {
        return;
      }

      this.pressedKeys[eventType] = this.pressedKeys[eventType]
        ? this.pressedKeys[eventType] + 1
        : 1;

      event.preventDefault();
      event.stopPropagation();

      const keysDetails = {
        pressedKeys: this.pressedKeys,
      };

      if (eventType === KEY_ENTER && this.focusKey) {
        this.onEnterPress(keysDetails);

        return;
      }

      const preventDefaultNavigation =
        this.onArrowPress(eventType, keysDetails) === false;

      if (preventDefaultNavigation) {
        this.log('keyDownEventListener', 'default navigation prevented');

        if (this.visualDebugger) {
          this.visualDebugger.clear();
        }
      } else {
        this.onKeyEvent(event);
      }
    };

    // Apply throttle only if the option we got is > 0 to avoid limiting the listener to every animation frame
    if (this.throttle) {
      this.keyDownEventListenerThrottled = throttle(
        this.keyDownEventListener.bind(this),
        this.throttle,
        THROTTLE_OPTIONS
      );
    }

    // When throttling then make sure to only throttle key down and cancel any queued functions in case of key up
    this.keyUpEventListener = (event) => {
      const eventType = this.getEventType(event.keyCode);

      Reflect.deleteProperty(this.pressedKeys, eventType);

      if (this.throttle && !this.throttleKeypresses) {
        this.keyDownEventListenerThrottled.cancel();
      }

      if (eventType === KEY_ENTER && this.focusKey) {
        this.onEnterRelease();
      }
    };

    window.addEventListener('keyup', this.keyUpEventListener);
    window.addEventListener(
      'keydown',
      this.throttle
        ? this.keyDownEventListenerThrottled
        : this.keyDownEventListener
    );
  }

  unbindEventHandlers() {
    if (typeof window !== 'undefined') {
      return;
    }

    window.removeEventListener('keydown', this.keyDownEventListener);
    this.keyDownEventListener = null;

    if (this.throttle) {
      window.removeEventListener('keyup', this.keyUpEventListener);
      this.keyUpEventListener = null;
    }
  }

  onEnterPress(keysDetails) {
    const component = this.focusableComponents[this.focusKey];

    /* Guard against last-focused component being unmounted at time of onEnterPress (e.g due to UI fading out) */
    if (!component) {
      this.log('onEnterPress', 'noComponent');

      return;
    }

    /* Suppress onEnterPress if the last-focused item happens to lose its 'focused' status. */
    if (!component.focusable) {
      this.log('onEnterPress', 'componentNotFocusable');

      return;
    }

    if (component.onEnterPress) {
      component.onEnterPress(keysDetails);
    }
  }

  onEnterRelease() {
    const component = this.focusableComponents[this.focusKey];

    /* Guard against last-focused component being unmounted at time of onEnterRelease (e.g due to UI fading out) */
    if (!component) {
      this.log('onEnterRelease', 'noComponent');

      return;
    }

    /* Suppress onEnterRelease if the last-focused item happens to lose its 'focused' status. */
    if (!component.focusable) {
      this.log('onEnterRelease', 'componentNotFocusable');

      return;
    }

    if (component.onEnterRelease) {
      component.onEnterRelease();
    }
  }

  onArrowPress(direction, keysDetails) {
    const component = this.focusableComponents[this.focusKey];

    /* Guard against last-focused component being unmounted at time of onArrowPress (e.g due to UI fading out) */
    if (!component) {
      this.log('onArrowPress', 'noComponent');

      return undefined;
    }

    /* It's okay to navigate AWAY from an item that has lost its 'focused' status, so we don't inspect
     * component.focusable. */

    return (
      component &&
      component.onArrowPress &&
      component.onArrowPress(direction, keysDetails)
    );
  }

  /**
   * Move focus by direction, if you can't use buttons or focusing by key.
   *
   * @example
   * navigateByDirection('right') // The focus is moved to right
   */
  navigateByDirection(direction, focusDetails) {
    if (this.paused === true) {
      return;
    }

    const validDirections = [
      DIRECTION_DOWN,
      DIRECTION_UP,
      DIRECTION_LEFT,
      DIRECTION_RIGHT,
    ];

    if (validDirections.includes(direction)) {
      this.log('navigateByDirection', 'direction', direction);
      this.smartNavigate(direction, null, focusDetails);
    } else {
      this.log(
        'navigateByDirection',
        `Invalid direction. You passed: \`${direction}\`, but you can use only these: `,
        validDirections
      );
    }
  }

  onKeyEvent(event) {
    const direction = findKey(
      this.getKeyMap(),
      (code) => event.keyCode === code
    );

    this.smartNavigate(direction, null, { event });
  }

  /**
   * This function navigates between siblings OR goes up by the Tree
   * Based on the Direction
   */
  smartNavigate(direction, fromParentFocusKey, focusDetails) {
    this.log('smartNavigate', 'direction', direction);
    this.log('smartNavigate', 'fromParentFocusKey', fromParentFocusKey);
    this.log('smartNavigate', 'this.focusKey', this.focusKey);

    if (!fromParentFocusKey) {
      forOwn(this.focusableComponents, (component) => {
        component.layoutUpdated = false;
      });
    }

    const currentComponent =
      this.focusableComponents[fromParentFocusKey || this.focusKey];

    this.log(
      'smartNavigate',
      'currentComponent',
      currentComponent ? currentComponent.focusKey : undefined,
      currentComponent ? currentComponent.node : undefined
    );

    if (currentComponent) {
      this.updateLayout(currentComponent.focusKey);
      const { parentFocusKey, focusKey, layout } = currentComponent;

      const isVerticalDirection =
        direction === DIRECTION_DOWN || direction === DIRECTION_UP;
      const isIncrementalDirection =
        direction === DIRECTION_DOWN || direction === DIRECTION_RIGHT;

      const currentCutoffCoordinate =
        SpatialNavigationService.getCutoffCoordinate(
          isVerticalDirection,
          isIncrementalDirection,
          false,
          layout
        );

      /**
       * Get only the siblings with the coords on the way of our moving direction
       */
      const siblings = filter(this.focusableComponents, (component) => {
        if (
          component.parentFocusKey === parentFocusKey &&
          component.focusable
        ) {
          this.updateLayout(component.focusKey);
          const siblingCutoffCoordinate =
            SpatialNavigationService.getCutoffCoordinate(
              isVerticalDirection,
              isIncrementalDirection,
              true,
              component.layout
            );

          return isIncrementalDirection
            ? siblingCutoffCoordinate >= currentCutoffCoordinate
            : siblingCutoffCoordinate <= currentCutoffCoordinate;
        }

        return false;
      });

      if (this.debug) {
        this.log(
          'smartNavigate',
          'currentCutoffCoordinate',
          currentCutoffCoordinate
        );
        this.log(
          'smartNavigate',
          'siblings',
          `${siblings.length} elements:`,
          siblings.map((sibling) => sibling.focusKey).join(', '),
          siblings.map((sibling) => sibling.node)
        );
      }

      const sortedSiblings = this.sortSiblingsByPriority(
        siblings,
        layout,
        direction,
        focusKey
      );

      const nextComponent = sortedSiblings[0];

      this.log(
        'smartNavigate',
        'nextComponent',
        nextComponent ? nextComponent.focusKey : undefined,
        nextComponent ? nextComponent.node : undefined
      );

      if (nextComponent) {
        this.setFocus(nextComponent.focusKey, focusDetails);
      } else {
        const parentComponent = this.focusableComponents[parentFocusKey];

        this.saveLastFocusedChildKey(parentComponent, focusKey);

        if (!parentComponent || !parentComponent.isFocusBoundary) {
          this.smartNavigate(direction, parentFocusKey, focusDetails);
        }
      }
    }
  }

  saveLastFocusedChildKey(component, focusKey) {
    if (component) {
      this.log(
        'saveLastFocusedChildKey',
        `${component.focusKey} lastFocusedChildKey set`,
        focusKey
      );

      component.lastFocusedChildKey = focusKey;
    }
  }

  log(functionName, debugString, ...rest) {
    if (this.debug) {
      console.log(
        `%c${functionName}%c${debugString}`,
        `background: ${
          DEBUG_FN_COLORS[this.logIndex % DEBUG_FN_COLORS.length]
        }; color: black; padding: 1px 5px;`,
        'background: #333; color: #BADA55; padding: 1px 5px;',
        ...rest
      );
    }
  }

  /**
   * This function tries to determine the next component to Focus
   * It's either the target node OR the one down by the Tree if node has children components
   * Based on "targetFocusKey" which means the "intended component to focus"
   */
  getNextFocusKey(targetFocusKey) {
    const targetComponent = this.focusableComponents[targetFocusKey];

    /**
     * Security check, if component doesn't exist, stay on the same focusKey
     */
    if (!targetComponent) {
      return targetFocusKey;
    }

    const children = filter(
      this.focusableComponents,
      (component) =>
        component.parentFocusKey === targetFocusKey && component.focusable
    );

    if (children.length > 0) {
      const { lastFocusedChildKey, preferredChildFocusKey } = targetComponent;

      this.log(
        'getNextFocusKey',
        'lastFocusedChildKey is',
        lastFocusedChildKey
      );
      this.log(
        'getNextFocusKey',
        'preferredChildFocusKey is',
        preferredChildFocusKey
      );

      /**
       * First of all trying to focus last focused child
       */
      if (
        lastFocusedChildKey &&
        targetComponent.saveLastFocusedChild &&
        this.isParticipatingFocusableComponent(lastFocusedChildKey)
      ) {
        this.log(
          'getNextFocusKey',
          'lastFocusedChildKey will be focused',
          lastFocusedChildKey
        );

        return this.getNextFocusKey(lastFocusedChildKey);
      }

      /**
       * If there is no lastFocusedChild, trying to focus the preferred focused key
       */
      if (
        preferredChildFocusKey &&
        this.isParticipatingFocusableComponent(preferredChildFocusKey)
      ) {
        this.log(
          'getNextFocusKey',
          'preferredChildFocusKey will be focused',
          preferredChildFocusKey
        );

        return this.getNextFocusKey(preferredChildFocusKey);
      }

      /**
       * Otherwise, trying to focus something by coordinates
       */
      children.forEach((component) => this.updateLayout(component.focusKey));
      const { focusKey: childKey } = getChildClosestToOrigin(children);

      this.log('getNextFocusKey', 'childKey will be focused', childKey);

      return this.getNextFocusKey(childKey);
    }

    /**
     * If no children, just return targetFocusKey back
     */
    this.log('getNextFocusKey', 'targetFocusKey', targetFocusKey);

    return targetFocusKey;
  }

  addFocusable({
    focusKey,
    node,
    parentFocusKey,
    onEnterPress,
    onEnterRelease,
    onArrowPress,
    onFocus,
    onBlur,
    saveLastFocusedChild,
    trackChildren,
    onUpdateFocus,
    onUpdateHasFocusedChild,
    preferredChildFocusKey,
    autoRestoreFocus,
    focusable,
    isFocusBoundary,
  }) {
    this.focusableComponents[focusKey] = {
      focusKey,
      node,
      parentFocusKey,
      onEnterPress,
      onEnterRelease,
      onArrowPress,
      onFocus,
      onBlur,
      onUpdateFocus,
      onUpdateHasFocusedChild,
      saveLastFocusedChild,
      trackChildren,
      preferredChildFocusKey,
      focusable,
      isFocusBoundary,
      autoRestoreFocus,
      lastFocusedChildKey: null,
      layout: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        left: 0,
        top: 0,

        /**
         * Node ref is also duplicated in layout to be reported in onFocus callback
         */
        node,
      },
      layoutUpdated: false,
    };

    this.updateLayout(focusKey);

    /**
     * If for some reason this component was already focused before it was added, call the update
     */
    if (focusKey === this.focusKey) {
      this.setFocus(focusKey);
    }
  }

  removeFocusable({ focusKey }) {
    const componentToRemove = this.focusableComponents[focusKey];

    if (componentToRemove) {
      const { parentFocusKey } = componentToRemove;

      Reflect.deleteProperty(this.focusableComponents, focusKey);

      const parentComponent = this.focusableComponents[parentFocusKey];
      const isFocused = focusKey === this.focusKey;

      /**
       * If the component was stored as lastFocusedChild, clear lastFocusedChildKey from parent
       */
      if (parentComponent && parentComponent.lastFocusedChildKey === focusKey) {
        parentComponent.lastFocusedChildKey = null;
      }

      /**
       * If the component was also focused at this time, focus another one
       */
      if (isFocused && parentComponent && parentComponent.autoRestoreFocus) {
        this.setFocus(parentFocusKey);
      }
    }
  }

  getNodeLayoutByFocusKey(focusKey) {
    const component = this.focusableComponents[focusKey];

    if (component) {
      this.updateLayout(component.focusKey);

      return component.layout;
    }

    return null;
  }

  setCurrentFocusedKey(newFocusKey, focusDetails) {
    if (
      this.isFocusableComponent(this.focusKey) &&
      newFocusKey !== this.focusKey
    ) {
      const oldComponent = this.focusableComponents[this.focusKey];
      const parentComponent =
        this.focusableComponents[oldComponent.parentFocusKey];

      this.saveLastFocusedChildKey(parentComponent, this.focusKey);

      oldComponent.onUpdateFocus(false);
      oldComponent.onBlur(
        this.getNodeLayoutByFocusKey(this.focusKey),
        focusDetails
      );
    }

    this.focusKey = newFocusKey;

    if (this.isFocusableComponent(this.focusKey)) {
      const newComponent = this.focusableComponents[this.focusKey];

      newComponent.onUpdateFocus(true);
      newComponent.onFocus(
        this.getNodeLayoutByFocusKey(this.focusKey),
        focusDetails
      );
    }
  }

  updateParentsHasFocusedChild(focusKey, focusDetails) {
    const parents = [];

    let currentComponent = this.focusableComponents[focusKey];

    /**
     * Recursively iterate the tree up and find all the parents' focus keys
     */
    while (currentComponent) {
      const { parentFocusKey } = currentComponent;

      const parentComponent = this.focusableComponents[parentFocusKey];

      if (parentComponent) {
        const { focusKey: currentParentFocusKey } = parentComponent;

        parents.push(currentParentFocusKey);
      }

      currentComponent = parentComponent;
    }

    const parentsToRemoveFlag = difference(
      this.parentsHavingFocusedChild,
      parents
    );
    const parentsToAddFlag = difference(
      parents,
      this.parentsHavingFocusedChild
    );

    forEach(parentsToRemoveFlag, (parentFocusKey) => {
      const parentComponent = this.focusableComponents[parentFocusKey];

      if (parentComponent && parentComponent.trackChildren) {
        parentComponent.onUpdateHasFocusedChild(false);
      }
      this.onIntermediateNodeBecameBlurred(parentFocusKey, focusDetails);
    });

    forEach(parentsToAddFlag, (parentFocusKey) => {
      const parentComponent = this.focusableComponents[parentFocusKey];

      if (parentComponent && parentComponent.trackChildren) {
        parentComponent.onUpdateHasFocusedChild(true);
      }
      this.onIntermediateNodeBecameFocused(parentFocusKey, focusDetails);
    });

    this.parentsHavingFocusedChild = parents;
  }

  updateParentsLastFocusedChild(focusKey) {
    let currentComponent = this.focusableComponents[focusKey];

    /**
     * Recursively iterate the tree up and update all the parent's lastFocusedChild
     */
    while (currentComponent) {
      const { parentFocusKey } = currentComponent;

      const parentComponent = this.focusableComponents[parentFocusKey];

      if (parentComponent) {
        this.saveLastFocusedChildKey(
          parentComponent,
          currentComponent.focusKey
        );
      }

      currentComponent = parentComponent;
    }
  }

  getKeyMap() {
    return this.keyMap;
  }

  setKeyMap(keyMap) {
    this.keyMap = {
      ...this.getKeyMap(),
      ...keyMap,
    };
  }

  isFocusableComponent(focusKey) {
    return !!this.focusableComponents[focusKey];
  }

  /**
   * Checks whether the focusableComponent is actually participating in spatial navigation (in other words, is a
   * 'focusable' focusableComponent). Seems less confusing than calling it isFocusableFocusableComponent()
   */
  isParticipatingFocusableComponent(focusKey) {
    return (
      this.isFocusableComponent(focusKey) &&
      this.focusableComponents[focusKey].focusable
    );
  }

  onIntermediateNodeBecameFocused(focusKey, focusDetails) {
    if (this.isParticipatingFocusableComponent(focusKey)) {
      this.focusableComponents[focusKey].onFocus(
        this.getNodeLayoutByFocusKey(focusKey),
        focusDetails
      );
    }
  }

  onIntermediateNodeBecameBlurred(focusKey, focusDetails) {
    if (this.isParticipatingFocusableComponent(focusKey)) {
      this.focusableComponents[focusKey].onBlur(
        this.getNodeLayoutByFocusKey(focusKey),
        focusDetails
      );
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setFocus(focusKey, focusDetails = {}) {
    if (!this.enabled) {
      return;
    }

    this.log('setFocus', 'focusKey', focusKey);

    const lastFocusedKey = this.focusKey;
    const newFocusKey = this.getNextFocusKey(focusKey);

    this.log('setFocus', 'newFocusKey', newFocusKey);

    this.setCurrentFocusedKey(newFocusKey, focusDetails);
    this.updateParentsHasFocusedChild(newFocusKey, focusDetails);
    this.updateParentsLastFocusedChild(lastFocusedKey);
  }

  updateAllLayouts() {
    forOwn(this.focusableComponents, (component, focusKey) => {
      this.updateLayout(focusKey);
    });
  }

  updateLayout(focusKey) {
    const component = this.focusableComponents[focusKey];

    if (!component || component.layoutUpdated) {
      return;
    }

    const { node } = component;

    component.layout = {
      ...measureLayout(node),
      node,
    };
  }

  updateFocusable(
    focusKey,
    { node, preferredChildFocusKey, focusable, isFocusBoundary }
  ) {
    const component = this.focusableComponents[focusKey];

    if (component) {
      component.preferredChildFocusKey = preferredChildFocusKey;
      component.focusable = focusable;
      component.isFocusBoundary = isFocusBoundary;

      if (node) {
        component.node = node;
      }
    }
  }
}

/**
 * Export singleton
 */
/** @internal */
export const SpatialNavigation = new SpatialNavigationService();

export const { init, destroy, setKeyMap } = SpatialNavigation;
