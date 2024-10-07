const typescript = require('@rollup/plugin-typescript');
const shebang = require('rollup-plugin-add-shebang');

module.exports = {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'cjs'
    },
    plugins: [
        typescript(),
        shebang({include: 'dist/index.js'})
    ],
    external: [/node_modules/]
};