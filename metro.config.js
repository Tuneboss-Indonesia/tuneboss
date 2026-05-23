const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("woff", "woff2");
config.resolver.blockList = exclusionList([
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]\.omx[/\\].*/,
  /.*[/\\]\.sixth[/\\].*/,
]);

module.exports = config;
