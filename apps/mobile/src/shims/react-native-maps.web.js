/** Web stub — native MapView webda ishlamaydi (codegenNativeComponent yo‘q). */
const React = require("react");
const { View } = require("react-native");

function MapView({ children, style, ...rest }) {
  return React.createElement(View, { style, ...rest }, children);
}

function Marker() {
  return null;
}

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.PROVIDER_GOOGLE = "google";
module.exports.PROVIDER_DEFAULT = null;
