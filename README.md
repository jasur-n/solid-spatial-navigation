# Solid Spatial Navigation
This is a SolidJS implementation of [Norigin Spatial Navigation](https://github.com/NoriginMedia/Norigin-Spatial-Navigation) library.

# Table of Contents
* [Usage](#usage)
* [API](#api)
* [Technical details and concepts](#technical-details-and-concepts)


# Usage
## Initialization
[Init options](#init-options)
```jsx
// Called once somewhere in the root of the app

import { init } from '@noriginmedia/norigin-spatial-navigation';

init({
  // options
});
```

## Making your component focusable
Most commonly you will have Leaf Focusable components. (See [Tree Hierarchy](#tree-hierarchy-of-focusable-components))
Leaf component is the one that doesn't have focusable children.
`ref` is required to link the DOM element with the hook. (to measure its coordinates, size etc.)

```jsx
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

function Button() {
  const { ref, focused } = useFocusable();

  return (<div ref={ref} className={focused ? 'button-focused' : 'button'}>
    Press me
  </div>);
}
```

## Wrapping Leaf components with a Focusable Container
Focusable Container is the one that has other focusable children. (i.e. a scrollable list) (See [Tree Hierarchy](#tree-hierarchy-of-focusable-components))
`ref` is required to link the DOM element with the hook. (to measure its coordinates, size etc.)
`FocusContext.Provider` is required in order to provide all children components with the `focusKey` of the Container,
which serves as a Parent Focus Key for them. This way your focusable children components can be deep in the DOM tree
while still being able to know who is their Focusable Parent.
Focusable Container cannot have `focused` state, but instead propagates focus down to appropriate Child component.
You can nest multiple Focusable Containers. When focusing the top level Container, it will propagate focus down until it encounters the first Leaf component.
I.e. if you set focus to the `Page`, the focus could propagate as following: `Page` -> `ContentWrapper` -> `ContentList` -> `ListItem`.

```jsx
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import ListItem from './ListItem';

function ContentList() {
  const { ref, focusKey } = useFocusable();

  return (<FocusContext.Provider value={focusKey}>
    <div ref={ref}>
      <ListItem />
      <ListItem />
      <ListItem />
    </div>
  </FocusContext.Provider>);
}
```

## Manually setting the focus
You can manually set the focus either to the current component (`focusSelf`), or to any other component providing its `focusKey` to `setFocus`.
It is useful when you first open the page, or i.e. when your modal Popup gets mounted.

```jsx
import React, { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

function Popup() {
  const { ref, focusKey, focusSelf, setFocus } = useFocusable();

  // Focusing self will focus the Popup, which will pass the focus down to the first Child (ButtonPrimary)
  // Alternatively you can manually focus any other component by its 'focusKey'
  useEffect(() => {
    focusSelf();

    // alternatively
    // setFocus('BUTTON_PRIMARY');
  }, [focusSelf]);

  return (<FocusContext.Provider value={focusKey}>
    <div ref={ref}>
      <ButtonPrimary focusKey={'BUTTON_PRIMARY'} />
      <ButtonSecondary />
    </div>
  </FocusContext.Provider>);
}
```

## Tracking children components
Any Focusable Container can track whether it has any Child focused or not. This feature is disabled by default,
but it can be controlled by the `trackChildren` flag passed to the `useFocusable` hook. When enabled, the hook will return
a `hasFocusedChild` flag indicating when a Container component is having focused Child down in the focusable Tree.
It is useful for example when you want to style a container differently based on whether it has focused Child or not.

```jsx
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import MenuItem from './MenuItem';

function Menu() {
  const { ref, focusKey, hasFocusedChild } = useFocusable({trackChildren: true});

  return (<FocusContext.Provider value={focusKey}>
    <div ref={ref} className={hasFocusedChild ? 'menu-expanded' : 'menu-collapsed'}>
      <MenuItem />
      <MenuItem />
      <MenuItem />
    </div>
  </FocusContext.Provider>);
}
```

## Restricting focus to a certain component boundaries
Sometimes you don't want the focus to leave your component, for example when displaying a Popup, you don't want the focus to go to
a component underneath the Popup. This can be enabled with `isFocusBoundary` flag passed to the `useFocusable` hook.

```jsx
import React, { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

function Popup() {
  const { ref, focusKey, focusSelf } = useFocusable({isFocusBoundary: true});

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  return (<FocusContext.Provider value={focusKey}>
    <div ref={ref}>
      <ButtonPrimary />
      <ButtonSecondary />
    </div>
  </FocusContext.Provider>);
}
```

## Using the library in React Native environment
In React Native environment the navigation between focusable (Touchable) components is happening under the hood by the
native focusable engine. This library is NOT doing any coordinates measurements or navigation decisions in the native environment.
But it can still be used to keep the currently focused element node reference and its focused state, which can be used to
highlight components based on the `focused` or `hasFocusedChild` flags.
IMPORTANT: in order to "sync" the focus events coming from the native focus engine to the hook, you have to link
`onFocus` callback with the `focusSelf` method. This way, the hook will know that the component became focused, and will
set the `focused` flag accordingly.

```jsx
import { TouchableOpacity, Text } from 'react-native';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

function Button() {
  const { ref, focused, focusSelf } = useFocusable();

  return (<TouchableOpacity
    ref={ref}
    onFocus={focusSelf}
    style={focused ? styles.buttonFocused : styles.button}
  >
    <Text>Press me</Text>
  </TouchableOpacity>);
}
```

# API
## Top Level exports
### `init`
#### Init options
##### `debug`: boolean (default: false)
Enables console debugging.

##### `visualDebug`: boolean (default: false)
Enables visual debugging (all layouts, reference points and siblings reference points are printed on canvases).

##### `nativeMode`: boolean (default: false)
Enables Native mode. It will **disable** certain web-only functionality:
- adding window key listeners
- measuring DOM layout
- `onFocus` and `onBlur` callbacks don't return coordinates, but still return node ref which can be used to measure layout if needed
- coordinates calculations when navigating (`smartNavigate` in `SpatialNavigation.ts`)
- `navigateByDirection`
- focus propagation down the Tree
- last focused child feature
- preferred focus key feature

In other words, in the Native mode this library **DOES NOT** set the native focus anywhere via the native focus engine.
Native mode should be only used to keep the Tree of focusable components and to set the `focused` and `hasFocusedChild` flags to enable styling for focused components and containers.
In Native mode you can only call `focusSelf` in the component that gets **native** focus (via `onFocus` callback of the `Touchable` components) to flag it as `focused`.
Manual `setFocus` method is blocked because it will not propagate to the native focus engine and won't do anything.

##### `throttle`: integer (default: 0)
Enables throttling of the key event listener.

##### `throttleKeypresses`: boolean (default: false)
Works only in combination with `throttle` > 0. By default, `throttle` only throttles key down events (i.e. when you press and hold the button).
When this feature is enabled, it will also throttle rapidly fired key presses (rapid "key down + key up" events).

### `setKeyMap`
Method to set custom key codes. I.e. when the device key codes differ from a standard browser arrow key codes.
```jsx
setKeyMap({
  'left': 9001,
  'up': 9002,
  'right': 9003,
  'down': 9004,
  'enter': 9005
});
```

### `destroy`
Resets all the settings and the storage of focusable components. Disables the navigation service.

### `useFocusable` hook
This hook is the main link between the React component (its DOM element) and the navigation service.
It is used to register the component in the service, get its `focusKey`, `focused` state etc.

```jsx
const {/* hook output */ } = useFocusable({/* hook params */ });
```

#### Hook params

##### `focusable` (default: true)
This flag indicates that the component can be focused via directional navigation.
Even if the component is not `focusable`, it still can be focused with the manual `setFocus`.
This flag is useful when i.e. you have a Disabled Button that should not be focusable in the disabled state.

##### `saveLastFocusedChild` (default: true)
By default, when the focus leaves a Focusable Container, the last focused child of that container is saved.
So the next time when you go back to that Container, the last focused child will get the focus.
If this feature is disabled, the focus will be always on the first available child of the Container.

##### `trackChildren` (default: false)
This flag controls the feature of updating the `hasFocusedChild` flag returned to the hook output.
Since you don't always need `hasFocusedChild` value, this feature is disabled by default for optimization purposes.

##### `autoRestoreFocus` (default: true)
By default, when the currently focused component is unmounted (deleted), navigation service will try to restore the focus
on the nearest available sibling of that component. If this behavior is undesirable, you can disable it by setting this
flag to `false`.

##### `isFocusBoundary` (default: false)
This flag makes the Focusable Container keep the focus inside its boundaries. It will only block the focus from leaving
the Container via directional navigation. You can still set the focus manually anywhere via `setFocus`.
Useful when i.e. you have a modal Popup and you don't want the focus to leave it.

##### `focusKey` (optional)
If you want your component to have a persistent focus key, it can be set via this property. Otherwise, it will be auto generated.
Useful when you want to manually set the focus to this component via `setFocus`.

##### `preferredChildFocusKey` (optional)
Useful when you have a Focusable Container and you want it to propagate the focus to a **specific** child component.
I.e. when you have a Popup and you want some specific button to be focused instead of the first available.

##### `onEnterPress` (function)
Callback that is called when the component is focused and Enter key is pressed.
Receives `extraProps` (see below) and `KeyPressDetails` as arguments.

##### `onEnterRelease` (function)
Callback that is called when the component is focused and Enter key is released.
Receives `extraProps` (see below) as argument.

##### `onArrowPress` (function)
Callback that is called when component is focused and any Arrow key is pressed.
Receives `direction` (`left`, `right`, `up`, `down`), `extraProps` (see below) and `KeyPressDetails` as arguments.

##### `onFocus` (function)
Callback that is called when component gets focus.
Receives `FocusableComponentLayout`, `extraProps` and `FocusDetails` as arguments.

##### `onBlur` (function)
Callback that is called when component loses focus.
Receives `FocusableComponentLayout`, `extraProps` and `FocusDetails` as arguments.

##### `extraProps` (optional)
An object that can be passed to the hook in order to be passed back to certain callbacks (see above).
I.e. you can pass all the `props` of the component here, and get them all back in those callbacks.

#### Hook output

##### `ref` (**required**)
Reference object created by the `useRef` inside the hook. Should be assigned to the DOM element representing a focused
area for this component. Usually it's a root DOM element of the component.

```jsx
function Button() {
  const { ref } = useFocusable();

  return (<div ref={ref}>
    Press me
  </div>);
}
```

##### `focusSelf` (function)
Method to set the focus on the current component. I.e. to set the focus to the Page (Container) when it is mounted, or
the Popup component when it is displayed.

##### `setFocus` (function) `(focusKey: string) => void`
Method to manually set the focus to a component providing its `focusKey`.

##### `focused` (boolean)
Flag that indicates that the current component is focused.

##### `hasFocusedChild` (boolean)
Flag that indicates that the current component has a focused child somewhere down the Focusable Tree.
Only works when `trackChildren` is enabled!

##### `focusKey` (string)
String that contains the focus key for the component. It is either the same as `focusKey` passed to the hook params,
or an automatically generated one.

##### `navigateByDirection` (function) `(direction: string, focusDetails: FocusDetails) => void`
Method to manually navigation to a certain direction. I.e. you can assign a mouse-wheel to navigate Up and Down.
Also useful when you have some "Arrow-like" UI in the app that is meant to navigate in certain direction when pressed
with the mouse or a "magic remote" on some TVs.

##### `pause` (function)
Pauses all the key event handlers.

##### `resume` (function)
Resumes all the key event handlers.

##### `updateAllLayouts` (function)
Manually recalculate all the layouts. Rarely used.

### `FocusContext` (required for Focusable Containers)
Used to provide the `focusKey` of the current Focusable Container down the Tree to the next child level. [See Example](#wrapping-leaf-components-with-a-focusable-container)

## Types exported for development
### `FocusableComponentLayout`
```ts
interface FocusableComponentLayout {
  left: number; // absolute coordinate on the screen
  top: number; // absolute coordinate on the screen
  width: number;
  height: number;
  x: number; // relative to the parent DOM element
  y: number; // relative to the parent DOM element
  node: HTMLElement; // or the reference to the native component in React Native
}
```

### `KeyPressDetails`
```ts
interface KeyPressDetails {
  pressedKeys: PressedKeys;
}
```

### `PressedKeys`
```ts
type PressedKeys = { [index: string]: number };
```

### `FocusDetails`
```ts
interface FocusDetails {
  event?: KeyboardEvent;
}
```

## Other Types exported
These types are exported, but not necessarily needed for development.

### `KeyMap`
Interface for the `keyMap` sent to the `setKeyMap` method.

### `UseFocusableConfig`
Interface for the `useFocusable` params object.

### `UseFocusableResult`
Interface for the `useFocusable` result object.

# Technical details and concepts
## Tree Hierarchy of focusable components
As mentioned in the [Usage](#usage) section, all focusable components are organized in a Tree structure. Much like a DOM
tree, the Focusable Tree represents a focusable components' organization in your application. Tree Structure helps to
organize all the focusable areas in the application, measure them and determine the best paths of navigation between
these focusable areas. Without the Tree Structure (assuming all components would be simple Leaf focusable components) it
would be extremely hard to measure relative and absolute coordinates of the elements inside the scrolling lists, as well
as to restrict the focus from jumping outside certain areas. Technically the Focusable Tree structure is achieved by
passing a focus key of the parent component down via the `FocusContext`. Since React Context can be nested, you can have
multiple layers of focusable Containers, each passing their own `focusKey` down the Tree via `FocusContext.Provider` as
shown in [this example](#wrapping-leaf-components-with-a-focusable-container).

## Navigation Service
[Navigation Service](https://github.com/NoriginMedia/Norigin-Spatial-Navigation/blob/master/src/SpatialNavigation.ts) is a
"brain" of the library. It is responsible for registering each focusable component in its internal database, storing
the node references to measure their coordinates and sizes, and listening to the key press events in order to perform
the navigation between these components. The calculation is performed according to the proprietary algorithm, which
measures the coordinate of the current component and all components in the direction of the navigation, and determines the
best path to pass the focus to the next component.




