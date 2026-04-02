# Interact A11y  

[Tom Bigelajzen](mailto:tombigel@wix.com) Jan 15, 2026

## Introduction

**The Interact library has built in support for keyboard interactions and for media queries that can be used to add a11y features enabled out of the box or exposed in various ways to users.**

Many accessibility requirements are related to content and layout more than to animations and triggers, but since in generated content they are interlaced into each other we will state here all the related accessibility concerns we can think of, even if handling them automatically is not trivial or even irrelevant.

## Interact Accessibility Features

## Keyboard triggers

Interact does not support keyboard-only triggers at the moment, but it does support two a11y aware triggers for behind the scenes keyboard support:.

1. "**Activate**" and" **Interest**" are triggers that encapsulate pointer and keyboard user interaction into one trigger \- for example "Activate" is a wrapper for click and  keydown.

2. Enabling `allowA11yTriggers: true` in the config or calling `Interact.setup({allowA11yTriggers: true})` will replace **Click** and  **Hover** to  **Activate** and **Interest** under the hood, forcing keyboard functionality.

## Media Queries

There are some media queries that relate to user interaction and to accessibility \- **prefers-reduced-motion, hover/any-hover, pointer/any-pointer**

The user can force reduced-motion support using `Interact.setup({ forceReducedMotion: true })`

## "Accessibility Best Practice" section in the guides

From here: [https://wix-incubator.github.io/interact/docs/guides/understanding-triggers](https://wix-incubator.github.io/interact/docs/guides/understanding-triggers)

1. Respect `prefers-reduced-motion` media query  
2. **Use `activate` instead of `click`** for keyboard accessibility  
3. **Use `interest` instead of `hover`** for keyboard accessibility  
4. **Ensure click targets are accessible** via keyboard  
5. **Don't rely solely on motion** for important information  
6. **Enable accessibility triggers globally** using `Interact.setup({ allowA11yTriggers: true })` to make `click` and `hover` triggers keyboard-accessible

## Accessibility Requirements

The most basic accessibility requirements that are related to interaction and motion are:

1. [https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
   For any **moving, scrolling, blinking** content **longer than 5 seconds** there should be a way to **pause or hide** unless the movement, blinking, or scrolling is part of an activity where it is essential
   For  **auto updating content** there should be a way to **pause and play hide or control the frequency** of the change.  
2. [https://www.w3.org/TR/WCAG21/\#seizures-and-physical-reactions](https://www.w3.org/TR/WCAG21/#seizures-and-physical-reactions)
   A page **should not contain** content that is blinking more than **three times a second**  
3. [https://www.w3.org/WAI/WCAG22/Understanding/keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard)
   All functionality of the content is **operable through a keyboard** interface

## Recommendation: Reasonable Defaults

Through the keyboard support and media queries conditions users can build their animations and triggers  accessible if they wish to.

**We strive to give them the best defaults to be as accessible as possible out of the box**.

## Disable autoplay

Animations that are starting automatically without user intent \- **'viewEnter' | 'viewProgress' | ‘pointerMove’** triggers \- should be disabled automatically under a **prefers-reduced-motion condition**.

A more granular control over what should and shouldn't be disabled should be given.

A clear option for "**Nuke all animations when in prefers-reduced-motion**" should be in the config.

### Content Aware Extras for Autoplay (In AI Generation for example)

- Replace **"automatically playing" triggers** with  an **Activate trigger** (for example Click) if it is relevant for the content.  
- In a case where these animations are connected to **content scrolling** that have no other way to interact we should be able to enable **manual scrolling** somehow, or change layout (for example horizontal scrolled gallery connected only to page scroll).  
- **Sticky** should be handled if possible per content layout.

## Keyboard alternatives

**Focus and keydown** should be **activated by default** (with an opt out option) .

### Content Aware Extras  for Keyboard(In AI Generation for example)

For content with navigation that is **triggered by an animation** \- galleries with scroll or mouse parallax for example, an **alternative layout \+ controls** should be given.

Animation alone **should not** **be the only indication** for **interactive content** (on hover or focus)

## Flashing Content

For generated animations \- **A threshold** for "what is accessible" **should be set in the rules** unless the user stated specific animations and speeds.
