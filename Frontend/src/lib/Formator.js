import prettier from 'prettier/standalone';
import babelParser from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';
import htmlParser from 'prettier/plugins/html';
import cssParser from 'prettier/plugins/postcss';
import initRuff, { format as ruffFormat } from '@wasm-fmt/ruff_fmt/web';
import initClangFormat, { format as clangFormat } from '@wasm-fmt/clang-format/web';

export const universalFormatter = async (code, language) => {
  const normalizedLang = language.toLowerCase().trim();

  try {
    switch (normalizedLang) {
      // 1. Web Stack (JavaScript, React JSX, Node, Mongoose)
      case 'javascript':
      case 'js':
      case 'jsx':
      case 'react':
      case 'node':
      case 'mongoose':
      case 'json':
        return await prettier.format(code, {
          parser: 'babel',
          plugins: [babelParser, estreePlugin],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
        });

      // 2. HTML & Tailwind
      case 'html':
      case 'tailwind':
        return await prettier.format(code, {
          parser: 'html',
          plugins: [htmlParser, cssParser],
          tabWidth: 2,
        });

      // 3. CSS
      case 'css':
        return await prettier.format(code, {
          parser: 'postcss',
          plugins: [cssParser],
          tabWidth: 2,
        });

      // 4. Python (Using corrected Ruff WASM Engine)
      case 'python':
      case 'py':
        await initRuff();
        return ruffFormat(code, 'main.py'); // Requires a mock filename string

      // 5. C and C++ (Using Clang WASM Engine)
      case 'c':
      case 'cpp':
      case 'c++':
        await initClangFormat();
        return clangFormat(code);

      default:
        console.warn(`No formatter configured for language: ${language}`);
        return code;
    }
  } catch (error) {
    console.error(`Formatting failed for ${language}:`, error);
    return code; // Fallback: return raw code if there's a syntax error
  }
};
export default universalFormatter
