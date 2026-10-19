import sanitizeHtml from "sanitize-html";
export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "sub", "sup"],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, "*": ["class"], img: ["src", "alt", "width", "height"], a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https"], allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}
