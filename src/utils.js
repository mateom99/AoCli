export const printGrid = (grid) => {
  for (let i = 0; i < grid.length; i++) {
    let line = "";
    for (let j = 0; j < grid[i].length; j++) {
      line += grid[i][j];
    }
    console.log(line);
  }
  console.log();
};

export const memoize = (fn) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};
