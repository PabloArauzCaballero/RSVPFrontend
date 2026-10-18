# Creating a template

A template is **one row** in `template_db` (Template/Media Service). The public site and the host preview render it without any frontend change or deploy. You create it from the admin screen *Templates* (E3) or with `POST /media/templates` as ADMIN, then publish it.

```json
{
  "name": "Clásico marfil",
  "eventTypeTags": ["wedding", "anniversary"],
  "layout": "classic",
  "theme": {
    "palette": { "canvas": "#FFFBF4", "surface": "#FFFFFF", "text": "#302C28", "accent": "#865E36", "muted": "#6F665D" },
    "typography": { "heading": "'Cormorant Garamond', Georgia, serif", "body": "'Source Sans 3', Arial, sans-serif" },
    "sectionStyle": "bands"
  },
  "sectionOrder": ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "rsvp"]
}
```

| Field | Meaning |
|---|---|
| `eventTypeTags` | The template is offered to every event type whose `compatibleTemplateTags` shares one of these tags. |
| `layout` | One of the five base layouts (below). |
| `palette` | Five hex colours. `canvas` is the page, `surface` cards and alternate bands, `accent` headings, links and buttons, `muted` secondary text. Dark mode keeps `accent` and swaps the rest for neutral darks. Keep `text` on `canvas` and `surface` on `accent` at WCAG AA contrast. |
| `typography` | CSS font stacks. The first family is loaded from Google Fonts unless it is a system font. |
| `sectionStyle` | `plain`, `cards` (each section on a raised surface) or `bands` (full-width alternating bands). |
| `sectionOrder` | Which sections the template places, in order. A section the event type enables but the template does not list is **hidden, not deleted**: switching to a template that lists it shows the content again. |

## Layouts

| Layout | Hero | Alignment | Feel |
|---|---|---|---|
| `classic` | Centred, cover photo framed below the title | Centre | Serif, ornament under headings |
| `minimal` | Compact text header, no photo | Start | Lines between sections |
| `editorial` | Full-bleed cover photo with the title over it | Start | Uppercase headings, wide column |
| `festive` | Accent-coloured banner with the photo inside | Centre | Rounded cards |
| `corporate` | Split: copy beside the photo on tablet and up | Start | Wide column, lines |

Sections: `story`, `schedule`, `venues`, `gallery`, `dressCode`, `faq`, `recommendations`, `gifts`, `rsvp`. Empty sections are never rendered, so a template can list all of them safely.
