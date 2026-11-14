// Metro: config por defecto de Expo, ignorando las copias de trabajo de Claude Code
// (.claude/worktrees/*, cada una con su propio node_modules). Si no, Metro intenta
// vigilarlas todas y agota el límite de file watchers del sistema (ENOSPC).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const ignored = /[/\\]\.claude[/\\].*/;
const prev = config.resolver.blockList;
config.resolver.blockList = prev ? [].concat(prev, ignored) : [ignored];

module.exports = config;
