import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Los archivos de contexto exportan el Provider (componente) y su hook (useX).
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth', 'useCart', 'useConnection', 'useTema', 'usePermiso'] },
      ],
      // Regla demasiado agresiva: dispara con patrones legítimos (reset de estado
      // al cambiar de ruta, inicialización de filtros). Se mantiene como aviso.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
])
