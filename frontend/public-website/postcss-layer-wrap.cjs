/**
 * PostCSS plugin: postcss-layer-wrap
 *
 * Wraps CSS files into appropriate native CSS @layer blocks based on
 * their role in the cascade architecture:
 *
 * - index.css (Tailwind output) → @layer utilities
 * - themes/*.css → @layer themes
 *
 * This ensures the cascade layer precedence declared in layers.css
 * is enforced by the browser:
 *   reset < tokens < base < components < utilities < themes < user
 */
const PLUGIN_NAME = 'postcss-layer-wrap';

/** @type {import('postcss').PluginCreator} */
const plugin = () => {
  return {
    postcssPlugin: PLUGIN_NAME,
    OnceExit(root, { AtRule }) {
      const from = root.source && root.source.input && root.source.input.from;
      if (!from) return;

      let layerName = null;

      if (from.includes('src/index.css')) {
        layerName = 'utilities';
      } else if (from.includes('src/themes/') && from.endsWith('.css')) {
        layerName = 'themes';
      }

      if (!layerName) return;

      const nodes = [];
      root.each((node) => nodes.push(node));
      if (nodes.length === 0) return;

      root.removeAll();

      const wrapper = new AtRule({ name: 'layer', params: layerName });
      for (const node of nodes) {
        wrapper.append(node);
      }

      root.append(wrapper);
    },
  };
};

plugin.postcss = true;
module.exports = plugin;
