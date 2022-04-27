export const useRef = (initialValue) => {
  let ref = initialValue;

  const getSet = (value) => {
    if (typeof value !== 'undefined') {
      return (ref = value);
    }

    return ref;
  };

  return getSet;
};
