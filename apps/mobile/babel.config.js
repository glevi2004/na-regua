/**
 * Configuracao do Babel.
 *
 * Sem este arquivo o Metro compila o JSX, mas nao aplica o preset do Expo —
 * e e ele que injeta o plugin do react-native-worklets, do qual o Reanimated
 * depende. Sem isso o `expo-router/drawer` quebra no import, porque a gaveta
 * do @react-navigation carrega Reanimated em tempo de modulo.
 */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
