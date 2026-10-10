/** Require visible UI text to come from i18n. Configure `allow` for technical labels. */
export default {
  meta: { type: "problem", docs: { description: "Disallow visible literal strings outside translation catalogs" }, schema: [{ type: "object", properties: { allow: { type: "array", items: { type: "string" } } }, additionalProperties: false }], messages: { literal: "Visible text must use i18n instead of a string literal." } },
  create(context) {
    const allow = new Set(context.options[0]?.allow ?? []);
    const isLocaleFile = /[\\/]locales[\\/]/.test(context.filename);
    const report = (node, value) => { if (!isLocaleFile && value.trim() && !allow.has(value)) context.report({ node, messageId: "literal" }); };
    return {
      JSXText(node) { report(node, node.value); },
      JSXAttribute(node) {
        if (["accessibilityLabel", "aria-label", "placeholder", "title"].includes(node.name.name) && node.value?.type === "Literal" && typeof node.value.value === "string") report(node, node.value.value);
      }
    };
  }
};
