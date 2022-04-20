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

export default measureLayout;
