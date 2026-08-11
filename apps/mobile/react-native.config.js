const path = require("path");

const safeAreaRoot = process.env.COMERCIA_SAFE_AREA_ROOT;

module.exports = {
  dependencies: safeAreaRoot
    ? {
        "react-native-safe-area-context": {
          root: path.resolve(safeAreaRoot),
        },
      }
    : {},
};
