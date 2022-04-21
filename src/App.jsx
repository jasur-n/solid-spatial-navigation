import { createEffect, onMount } from 'solid-js';
import {
  init,
  useFocusable,
  FocusContext,
} from './packages/spatial-navigation';

init({ debug: false });

function Button() {
  const focusable = useFocusable();

  return (
    <button
      ref={(el) => focusable.setRef(el)}
      className={focusable.focused() ? 'button-focused' : 'button'}
    >
      Press me
    </button>
  );
}

function App() {
  const focusable = useFocusable({
    focusKey: 'SN:ROOT',
  });

  return (
    <FocusContext.Provider value={focusable.focusKey}>
      <>
        <div ref={(el) => focusable.setRef(el)}>Solid App</div>
        <Button />
      </>
    </FocusContext.Provider>
  );
}

export default App;
