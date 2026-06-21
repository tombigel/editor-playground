# Component Roadmap Recommendations

This report reviews the current component roadmap against the project state and common website-builder practice. It focuses on forms, video/embed, iframe security, navigation/menu, and SVG/icon decisions.

## Executive Recommendation

Treat the next component expansion as three different workstreams, not one grab bag:

1. **Forms and inputs**: very high priority, but spec-first. This should become a product/platform feature, not a quick leaf component.
2. **Embeds and external media**: high authoring value, but split into safe provider presets before arbitrary iframe or arbitrary HTML.
3. **Navigation/menu and semantic wrappers**: high priority because multi-page support already exists; design the pages menu as a special behavior component rather than only a `nav` role.

Keep **gradients** out of the component list. They belong in background/style controls. Treat **icons** as image/SVG usage plus presets, not as a fundamentally separate model type.

## Current Project State

- The active roadmap already tracks `RI-11` for more media components, `RI-12A` for semantic components, and `RI-12B` for semantic wrappers/grouping in [PLAYGROUND_ROADMAP.md](./PLAYGROUND_ROADMAP.md).
- `RI-45` now tracks **Form and input authoring platform** as a `Next` / very-high-priority roadmap item.
- The model direction already exists: `MediaSubtype` includes `image`, `video`, `svg`, and `embed` in [src/model/types/index.ts](../src/model/types/index.ts).
- The API docs also describe `MediaNode` with `video` and `svg.renderMode`, but the stage/site rendering path currently treats every media node like image-like content in [src/render/nodePresentation.tsx](../src/render/nodePresentation.tsx).
- `createMediaNode()` already has default factories for `video`, `svg`, and `embed` in [src/model/defaultFactories.ts](../src/model/defaultFactories.ts), but the authoring/inspector/rendering surface is still effectively image-only.
- [NEXT_STAGE_BRIEF.md](./NEXT_STAGE_BRIEF.md) already contains the strongest local product direction:
  - gradients are a color/style value, not a media component
  - SVG-as-image and inline SVG are one SVG node with a `renderMode`
  - inline SVG requires sanitization and warning
  - pages menu should be a dedicated component, not just a `nav` wrapper
  - `nav`, `form`, and `dialog` are behavior-adding semantic wrappers and need explicit product design

## External Research Notes

- Wix treats forms as a business workflow, not only UI: templates, field management, required indicators, confirmation/redirect behavior, spam filters, rules, multipage forms, mobile layout, dashboard management, and notification automation all live around the form surface. See [Wix Forms: Adding and Setting Up a Form](https://support.wix.com/en/article/wix-forms-adding-and-setting-up-a-form-on-your-site).
- W3C WAI emphasizes that accessible forms require labels, field grouping, instructions, validation, user notifications, and multi-step progress patterns. See [W3C WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/).
- OWASP recommends server-side validation for security, allowlist validation where possible, and context-aware output encoding for submitted data. See [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) and [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
- Webflow splits video into provider-oriented authoring: a general video element for third-party hosted sources, a YouTube element for advanced YouTube parameters, and custom embeds for HTML video. See [Webflow Video](https://help.webflow.com/hc/en-us/articles/33961304305427-Video) and [Webflow YouTube video](https://help.webflow.com/hc/en-us/articles/33961367617299-YouTube-video).
- Wix embeds support both code snippets and external URLs, require HTTPS, warn that third-party sites can block embedding, and note that iframe-based embeds may not be responsive automatically. See [Wix Editor: Embedding a Site or Widget](https://support.wix.com/en/article/wix-editor-embedding-a-site-or-a-widget).
- MDN’s iframe reference frames the core risks and controls: each iframe is a full nested browsing context with performance cost, `allow` controls permissions policy, `referrerpolicy` controls referrer leakage, and `sandbox` starts restrictive then selectively allows capabilities. See [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).
- Webflow’s navbar is a self-contained container with brand link, nav menu, nav links, and a responsive menu button. This maps closely to the project’s existing direction for a special pages menu. See [Webflow Navbar](https://help.webflow.com/hc/en-us/articles/33961304628627-Navbar).
- W3C WAI treats menus as critical page/application operability and calls out structure, labels, keyboard behavior, current-page state, and flyout usability. See [W3C WAI Menus Tutorial](https://www.w3.org/WAI/tutorials/menus/).
- MDN’s video reference reinforces that native video has its own real surface: `controls`, `poster`, `preload`, `muted`, `loop`, lazy loading behavior, dimensions to avoid layout shift, and tracks/captions. See [MDN video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

## Recommendations

### 1. Forms: Spec First, Very High Priority

Forms are important enough to track as very high priority, but they should not be implemented as “just add input nodes.” A form feature touches model structure, generated runtime, validation, submission, storage/notification, accessibility, docs/help, and probably future integrations.

Recommended first decision: **serverless form strategy**.

The first slice should likely be one of:

- **External action/connector form**: generate semantic HTML forms that submit to configured external services or action URLs. This fits the serverless constraint and avoids pretending the editor has a backoffice.
- **Integration-backed form**: define a connector interface for services such as Wix services, Formspree-like endpoints, Airtable-like endpoints, or future MCP/backoffice handlers.
- **Static-only form mock**: useful for design, but too easy to mistake for a functional form. Only acceptable if clearly labeled as non-submitting.

Recommended v1 scope:

- Form container node or behavior-adding wrapper
- Text input, email input, textarea, select, checkbox, radio group, hidden field, submit button
- Field label, help text, placeholder, required state, validation message, autocomplete hints
- Form-level success/error state and redirect/message behavior
- Submission connector abstraction, even if only action URL is implemented first
- Accessibility rules: labels, grouping via fieldset/legend for radios/checkboxes, error association, focus after failed submit, keyboard order
- Documentation/help entry explaining runtime behavior and limits

Defer:

- Native database/backoffice UI
- Payment forms
- Conditional logic
- Multi-page forms
- File uploads
- CAPTCHA/spam system beyond a documented connector boundary

### 2. Video vs Embed: Provider Presets First

For a serverless editor, standalone native video is less urgent than social/provider video embeds. If users cannot upload and host video files, a native `<video src>` component only helps when they already have a direct `.mp4`/`.webm` URL, which is less common than YouTube/Vimeo/Twitch-style URLs.

Recommendation:

- Make **provider video embed** the first video-adjacent milestone.
- Support URL detection for YouTube/Vimeo first, with provider-specific controls where safe.
- Keep a lower-priority native external video node for direct file URLs, with `controls`, `poster`, `muted`, `loop`, `autoplay`, `playsInline`, `preload`, and captions/tracks as the eventual scope.

Answer to the open question: **social video embeds are enough for the first important milestone**. Native external video is useful, but not the highest-value first slice.

### 3. General Iframe: Valuable, But Needs a Security Contract

A general iframe/embed component is probably more valuable than native external video because it unlocks maps, calendars, forms, booking widgets, dashboards, Figma, Airtable, Typeform, videos, social posts, and other third-party surfaces.

Do not start with arbitrary HTML/script embed as the default. Start with:

- URL iframe embed
- HTTPS-only by default
- Required title/accessible name
- Fixed aspect ratio and responsive sizing controls
- `loading="lazy"` option
- `referrerpolicy` option with safe default
- `sandbox` preset levels rather than raw token soup
- `allow` permissions preset levels
- Provider presets for common services

Suggested sandbox presets:

- **Strict preview**: sandbox present with minimal allowances, no scripts unless the provider needs them.
- **Trusted provider**: selected permissions for known providers.
- **Custom advanced**: raw sandbox/allow editing behind an explicit warning.

Arbitrary pasted HTML should be a separate advanced item tied to `RI-23` arbitrary code support, not quietly folded into embed v1.

### 4. Navigation/Menu: Pages Menu as a Special Component

The project already has multi-page data, page switching, page linking, shared header/footer regions, and current-page link behavior. That makes navigation/menu one of the most logical next features.

Recommendation:

- Build a **Pages Menu** behavior component before generic nav wrappers.
- Model it as a special container/composite that renders semantic `nav > ul > li > a`.
- Let it auto-populate from pages but allow manual links and anchors.
- Support current-page state, nesting, ordering, visibility, and shared header placement.
- Include mobile behavior from the start: collapse trigger, menu open state, breakpoint behavior, keyboard/focus handling.

Keep `nav` as a semantic wrapper role later, but do not expect a raw `nav` wrapper to solve the real site-menu workflow.

### 5. Icon/SVG: Icon Is a Preset, SVG Has Two Modes

Icon is not a separate fundamental content family. It is best treated as a preset over image/SVG/link behavior:

- Raster image icon: existing image path
- SVG as image: safe default via `img src`
- Inline SVG: advanced render mode that enables styling parts of the SVG but requires sanitization
- Icon library: future convenience picker that outputs either controlled inline SVG or managed SVG asset references

Recommendation:

- Do not add a separate `icon` node type now.
- Expose SVG-as-image first through the media model.
- Add inline SVG only after a sanitizer/warning/export policy is specified.
- Treat “linked icon” as SVG/image plus link capability.

### 6. Gradients: Style Capability, Not Component

The existing brief is right. Gradients belong in background/fill controls on wrappers and leaves. A gradient component would mostly create decorative rectangles that compete with real layout/style controls.

Recommendation:

- Move gradients out of `RI-11` wording when the roadmap is next cleaned up.
- Track gradient support under design/style controls, probably as part of background value authoring.

## Suggested Priority Order

1. **Form and input authoring platform spec** (`RI-45`)  
   Spec first; implementation later.

2. **Pages menu / navigation behavior component** (`RI-12B` / likely split item)  
   Multi-page support makes this immediately useful.

3. **Embed v1: safe URL iframe plus provider presets** (`RI-11` / possible split)  
   High leverage for serverless third-party functionality.

4. **Provider video presets** (`RI-11`)  
   YouTube/Vimeo-style video before native direct-file video.

5. **SVG-as-image and inline-SVG policy** (`RI-11`)  
   SVG-as-image can be straightforward; inline SVG waits for sanitizer policy.

6. **Native external video URL** (`RI-11`)  
   Useful but secondary unless direct video URLs become common in target sites.

7. **Dialog/modal** (`RI-12A`)  
   Valuable, but it has out-of-flow model, focus, keyboard, and runtime complexity.

## Roadmap Follow-Ups

- Split `RI-11` into focused child items when work begins:
  - safe embed/provider embeds
  - provider video
  - SVG render modes
  - gradient background values
- Split a dedicated pages-menu item out of `RI-12B` if it becomes the next implementation target.
- Keep `RI-45` as a separate feature, not a subtask of `RI-12A`, because forms require submission/runtime/platform decisions.
- Before any implementation, update [PLAYGROUND_SPEC.md](./PLAYGROUND_SPEC.md) and [API.md](./API.md) for the selected model boundaries.
