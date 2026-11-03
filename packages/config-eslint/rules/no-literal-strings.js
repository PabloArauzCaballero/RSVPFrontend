/**
 * Require visible UI text to come from i18n (REQ-F06-06). Reports:
 *  - JSX text nodes with letters and string literals used as JSX children (`{"Hola"}`),
 *  - literal strings in attributes that people read or hear (label, title, placeholder, alt,
 *    aria-label, accessibilityLabel/Hint, description, message, error).
 * Strings without letters (punctuation, digits, symbols) and entries of the `allow` option
 * (brand names, technical labels) are ignored. Catalog files under `locales/` are exempt.
 */
const READ_BY_PEOPLE = new Set(["accessibilityLabel", "accessibilityHint", "aria-label", "aria-description", "placeholder", "title", "alt", "label", "description", "message", "error", "helpText", "emptyMessage"]);
const HAS_LETTER = /\p{L}/u;

export default {
  meta: {
    type: "problem",
    docs: { description: "Disallow visible literal strings outside translation catalogs" },
    schema: [{ type: "object", properties: { allow: { type: "array", items: { type: "string" } } }, additionalProperties: false }],
    messages: { literal: "Visible text must use i18n instead of a string literal: {{text}}" }
  },
  create(context) {
    const allow = new Set(context.options[0]?.allow ?? []);
    const isCatalog = /[\\/]locales[\\/]/.test(context.filename);
    const report = (node, value) => {
      const text = value.trim();
      if (isCatalog || !text || !HAS_LETTER.test(text) || allow.has(text)) return;
      context.report({ node, messageId: "literal", data: { text: text.length > 40 ? `${text.slice(0, 37)}...` : text } });
    };
    const stringOf = (node) => {
      if (node?.type === "Literal" && typeof node.value === "string") return node.value;
      if (node?.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
      return null;
    };
    return {
      JSXText(node) { report(node, node.value); },
      JSXExpressionContainer(node) {
        if (node.parent.type === "JSXAttribute") return;
        const value = stringOf(node.expression);
        if (value !== null) report(node, value);
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !READ_BY_PEOPLE.has(node.name.name)) return;
        const value = node.value?.type === "JSXExpressionContainer" ? stringOf(node.value.expression) : stringOf(node.value);
        if (value !== null) report(node, value);
      }
    };
  }
};
