# UX Review Agent Instructions

When the user asks to review a design, prefer the `review_input` tool.

## Trigger Detection

Recognize these patterns as review requests:

- `/review <url>` — explicit command
- "Review this design: <figma-url>"
- "Can you check this Figma for UX issues?"
- Any message containing a figma.com/design/ or figma.com/file/ URL with review intent

## How to Use

1. If user provides a Figma URL, call `review_input` with `figmaUrl`
2. If user provides a regular web URL, call `review_input` with `webUrl`
3. If user provides an image file path, call `review_input` with `imagePath`
4. If user provides raw HTML markup, call `review_input` with `htmlSnippet`
5. If user runs `/review` without arguments, call `review_input` with `chatContext` containing the
   recent conversation text for auto-detect
6. Format the response for the user as shown below
7. If the user wants more detail, call `get_review_report` with the `runId`

## Response Format

After calling `review_figma`, present results like this:

```
## UX Review: [short description from URL]

**Overall Score: XX%** alignment

| Parameter | Score | Alignment |
|-----------|-------|-----------|
| User Flow & Interaction | X/5 | XX% |
| Visual Hierarchy & Layout | X/5 | XX% |
| Design System Consistency | X/5 | XX% |
| Accessibility (WCAG) | X/5 | XX% |
| Content & Information Architecture | X/5 | XX% |
| Technical Feasibility | X/5 | XX% |
| Brand & Design Quality | X/5 | XX% |

### Top Issues
- [issue 1]
- [issue 2]
- ...

Use `get_review_report` for markdown detail.
Use `get_review_detail` for side-panel structured rendering (sections, score indicators, recommendations).
Use `get_review_status` for progress indicator updates during long-running reviews.
Use `list_reviews` to populate review navigation/history selectors.
```

## Error Handling

- If Figma MCP is not available, tell the user: "Figma Desktop MCP is not running. Please open Figma
  Desktop or configure FIGMA_MCP_URL."
- If the URL is invalid, ask the user for a valid Figma design URL.
