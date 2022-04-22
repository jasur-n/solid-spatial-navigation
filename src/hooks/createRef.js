export const createRef = (initialValue) => {
  let ref = initialValue;

  const getSet = (value) => {
    if (typeof value !== 'undefined') {
      return (ref = value);
    }

    return ref;
  };

  return getSet;
};
