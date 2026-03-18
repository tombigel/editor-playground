# Sticky \- Principles, Guidelines and Model

Based on recent discussions about "sticky" in Studio 2.0, this document details our thoughts about  the evolving principles, guidelines, and proposed implementation (data model and HTML structure) for sticky data in a rendered site output.

 It does not address editor-only preview, diagnostics, or interaction behavior.

## **Core Principles**

1. Sticky should be modeled as both **pinning** and **scroll range**.  
2. Sticky should always **imply a duration**, even when that duration is not authored explicitly.  
3. **"auto"** duration should cover simple cases, while **custom** duration should support controlled authoring and future products.  
4. Sticky duration should be resolved **structurally in the DOM**, not by asking authors to manually increase parent height.

## **Model Sticky As Pinning \+ Duration**

Direction and offsets are not enough to describe sticky behavior.

They answer which edge is sticky and where the sticky element pins, but they do not answer: for how long the element stays sticky.

Without a duration model, sticky lasts only for whatever free space already exists in the parent. That makes the result dependent on incidental layout and often forces authors to manually increase section height when they need a longer sticky range.

The proposal is to treat sticky as the combination of **pinning** and **duration**

## **Auto Duration And Custom Duration**

### **Auto duration**

`auto` should mean:

- use the natural free space already available inside the parent  
- do not generate extra structural distance

This keeps simple sticky authoring lightweight.

### **Custom duration**

Custom duration should mean:

- the author defines an explicit sticky distance  
- the renderer generates that distance structurally

This gives the system real control and leaves room for more directed sticky authoring in future products.

## **Proposed Sticky Data**

Sticky behavior should be authored on an element with these fields:

```ts
type StickyDefinition = {
  enabled: boolean;
  edges: {
    top?: boolean;
    bottom?: boolean;
  };
  durationMode?: 'auto' | 'custom';
  duration: CSSUnitValue;
  durationTop?: CSSUnitValue;
  durationBottom?: CSSUnitValue;
  offsetTop?: CSSUnitValue;
  offsetBottom?: CSSUnitValue;
};
```

### **Meaning**

- `edges`  
  - top, bottom or both  
- `offsetTop` / `offsetBottom`  
  - the sticky inset from the viewport edge  
- `durationMode`  
  - `Auto` or `custom`  
- `duration`  
  - the shared sticky distance for single-edge sticky  
- `durationTop` / `durationBottom`  
  - split distances for `edges: both`  

## **Sticky Lane Model**

Custom sticky duration should be implemented with structural space.

When an element needs extra sticky distance, the renderer should wrap it in a sticky lane and add spacer elements in that lane. Those spacers create the required scroll range and make the parent tall enough automatically.

This would remove the need for authors to manually increase section height just to make sticky last longer.

## **Proposed Rendered HTML Structure**

### **Sticky element, auto**

When sticky duration is `auto`, the element can stay structurally minimal:

```javascript
<div class="sticky-element">...</div>
```

The element gets sticky positioning directly. No synthetic spacer is added.

### **Sticky element, custom, top**

```javascript
<div class="sticky-lane">
  <div class="sticky-element">...</div>
  <div class="sticky-spacer sticky-spacer-top"></div>
</div>
```

The spacer after the element represents the sticky distance.

### **Sticky element, custom, bottom**

```javascript
<div class="sticky-lane">
  <div class="sticky-spacer sticky-spacer-bottom"></div>
  <div class="sticky-element">...</div>
</div>
```

Bottom-edge sticky should use reversed ordering. The spacer comes before the element.

### **Sticky element, custom, both**

```javascript
<div class="sticky-lane">
  <div class="sticky-spacer sticky-spacer-bottom"></div>
  <div class="sticky-element">...</div>
  <div class="sticky-spacer sticky-spacer-top"></div>
</div>
```

For `both`, the model should support split distances:

- bottom distance before the element  
- top distance after the element

### **Sticky content wrapper**

For content-wrapper sticky, the wrapper remains the layout owner and the inner content wrapper becomes sticky:

```javascript
<section class="wrapper">
  <div class="content-wrapper sticky-element">...</div>
  <div class="content-flow-spacer"></div>
</section>
```

The flow spacer extends the wrapper only where additional sticky range is needed.

## **Parent Height**

Sticky duration should be reflected in layout automatically.

- If a sticky element has custom duration, the sticky lane consumes real height in flow.  
- If a content wrapper has custom sticky duration, the wrapper gets a flow spacer after the sticky content wrapper.

In both cases, the parent grows structurally as a result of the rendered DOM.

## **Multiple Sticky Elements In One Parent**

When multiple sticky elements exist in the same parent, their duration should remain predictable because it is resolved structurally.

The effective scroll range should be determined by the spacer that ends furthest down the content. That spacer should define the parent’s final height.

## **Summary**

In this proposal, sticky is not defined only by edge and offset. It is defined by edge, offset, duration mode, explicit duration when needed, and structural spacer output in the DOM. That is what makes sticky predictable, controllable, and extensible.
