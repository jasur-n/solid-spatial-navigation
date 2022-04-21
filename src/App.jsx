import { createEffect, onMount } from 'solid-js';
import {
  init,
  useFocusable,
  FocusContext,
} from './packages/spatial-navigation';

init({ debug: false });

function Button() {
  const { ref, setRef, focused, focusKey, focusSelf, setFocus } =
    useFocusable();

  createEffect(() => console.log(focused()));

  return (
    <button
      onClick={() => setFocus(focusKey)}
      ref={(el) => setRef(el)}
      className={focused() ? 'button-focused' : 'button'}
    >
      Press me
    </button>
  );
}

function App() {
  const { setRef, focusKey } = useFocusable({
    focusKey: 'app',
  });
  return (
    <FocusContext.Provider value={focusKey}>
      <>
        <div ref={(el) => setRef(el)}>Solid App</div>
        <Button />
      </>
    </FocusContext.Provider>
  );
}

export default App;
