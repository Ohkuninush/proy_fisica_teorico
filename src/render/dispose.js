const materialsOf = (node) => {
  if (Array.isArray(node.material)) return node.material;
  return node.material ? [node.material] : [];
};

export function disposeObject(object, { geometry = true, maps = true } = {}) {
  object.traverse((node) => {
    if (geometry) node.geometry?.dispose?.();
    materialsOf(node).forEach((material) => {
      if (maps) material.map?.dispose?.();
      material.dispose();
    });
  });
}
