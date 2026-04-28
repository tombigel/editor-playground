/* eslint-disable */
// GENERATED FILE: run `npm run audit:libraries` to refresh.

export const LIBRARY_TRUTH_META = {
  "generatedAt": "2026-04-28T12:54:02.346Z",
  "trustOrder": [
    "shipped code/runtime behavior",
    "@wix/motion-presets rules",
    "@wix/interact rules",
    "docs in either package"
  ],
  "packages": {
    "interact": "2.2.1",
    "motion": "2.1.4",
    "motionPresets": "1.0.1"
  },
  "motionPresetRuleFiles": [
    "https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/presets-main.md",
    "https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/entrance-presets.md",
    "https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/ongoing-presets.md",
    "https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/scroll-presets.md",
    "https://github.com/wix/interact/blob/master/packages/motion-presets/rules/presets/mouse-presets.md"
  ]
} as const;

export const LIBRARY_TRUTH_MOTION = {
  "scrubTransitionEasings": [
    "linear",
    "hardBackOut",
    "easeOut",
    "elastic",
    "bounce"
  ]
} as const;

export const LIBRARY_TRIGGER_TRUTH = {
  "click": {
    "supportedTypes": [
      "once",
      "repeat",
      "state",
      "alternate"
    ],
    "winningSource": "@wix/interact rules"
  },
  "hover": {
    "supportedTypes": [
      "once",
      "repeat",
      "state",
      "alternate"
    ],
    "winningSource": "@wix/interact rules"
  },
  "viewEnter": {
    "params": [
      "threshold",
      "inset",
      "useSafeViewEnter"
    ],
    "supportedTypes": [
      "once",
      "repeat",
      "alternate",
      "state"
    ],
    "foucGenerateRule": "generate(config) only for viewEnter + once + same source and target."
  },
  "viewProgress": {
    "params": [
      "threshold",
      "inset",
      "useSafeViewEnter"
    ],
    "ignoredParams": [
      "threshold",
      "inset"
    ],
    "winningSource": "shipped code/runtime behavior",
    "discrepancy": null
  },
  "pointerMove": {
    "params": [
      "hitArea",
      "axis"
    ],
    "note": "Use interact trigger semantics from installed rules; preset inventory is audited separately."
  },
  "animationEnd": {
    "params": [
      "effectId"
    ]
  }
} as const;

export const LIBRARY_PRESET_TRUTH = {
  "FadeIn": {
    "preset": "FadeIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md",
      "integration.md",
      "viewenter.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [],
    "codeParams": [],
    "motionRuleParamNames": [],
    "label": "Fade In",
    "description": null,
    "behaviorNotes": []
  },
  "ArcIn": {
    "preset": "ArcIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "depth",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200,
        "min": 0,
        "max": 2000
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "label": "Arc In",
    "description": null,
    "behaviorNotes": []
  },
  "CurveIn": {
    "preset": "CurveIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right",
          "pseudoLeft",
          "pseudoRight"
        ]
      },
      {
        "name": "depth",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 300
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200,
        "min": 100,
        "max": 1000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "label": "Curve In",
    "description": null,
    "behaviorNotes": []
  },
  "DropIn": {
    "preset": "DropIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "initialScale"
    ],
    "codeParams": [
      {
        "name": "initialScale",
        "type": "number",
        "required": false,
        "default": 1.6,
        "min": 1,
        "max": 3,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "initialScale"
    ],
    "label": "Drop In",
    "description": null,
    "behaviorNotes": []
  },
  "FlipIn": {
    "preset": "FlipIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "initialRotate",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "initialRotate",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 90,
        "min": 0,
        "max": 360
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "initialRotate",
      "perspective"
    ],
    "label": "Flip In",
    "description": null,
    "behaviorNotes": []
  },
  "FloatIn": {
    "preset": "FloatIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction"
    ],
    "label": "Float In",
    "description": null,
    "behaviorNotes": []
  },
  "FoldIn": {
    "preset": "FoldIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "initialRotate",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "initialRotate",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 90,
        "min": 0,
        "max": 360
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "initialRotate",
      "perspective"
    ],
    "label": "Fold In",
    "description": null,
    "behaviorNotes": []
  },
  "SlideIn": {
    "preset": "SlideIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "initialTranslate"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "initialTranslate",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 0,
        "max": 1,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "initialTranslate"
    ],
    "label": "Slide In",
    "description": null,
    "behaviorNotes": []
  },
  "SpinIn": {
    "preset": "SpinIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "spins",
      "direction",
      "initialScale"
    ],
    "codeParams": [
      {
        "name": "spins",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 5,
        "step": 0.1
      },
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "clockwise",
          "counter-clockwise"
        ]
      },
      {
        "name": "initialScale",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 2,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "spins",
      "direction",
      "initialScale"
    ],
    "label": "Spin In",
    "description": null,
    "behaviorNotes": []
  },
  "BounceIn": {
    "preset": "BounceIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "distanceFactor",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left",
          "center"
        ]
      },
      {
        "name": "distanceFactor",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 3,
        "step": 0.1
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "distanceFactor",
      "perspective"
    ],
    "label": "Bounce In",
    "description": null,
    "behaviorNotes": []
  },
  "GlideIn": {
    "preset": "GlideIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "distance"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 180,
        "min": 0,
        "max": 360
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px"
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "distance"
    ],
    "label": "Glide In",
    "description": null,
    "behaviorNotes": []
  },
  "TurnIn": {
    "preset": "TurnIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top-right",
          "top-left",
          "bottom-right",
          "bottom-left"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction"
    ],
    "label": "Turn In",
    "description": null,
    "behaviorNotes": []
  },
  "WinkIn": {
    "preset": "WinkIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "vertical",
          "horizontal"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction"
    ],
    "label": "Wink In",
    "description": null,
    "behaviorNotes": []
  },
  "TiltIn": {
    "preset": "TiltIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "depth",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "depth",
      "perspective"
    ],
    "label": "Tilt In",
    "description": null,
    "behaviorNotes": []
  },
  "ShapeIn": {
    "preset": "ShapeIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "shape"
    ],
    "codeParams": [
      {
        "name": "shape",
        "type": "string",
        "required": false,
        "enum": [
          "circle",
          "ellipse",
          "rectangle",
          "diamond",
          "window"
        ]
      }
    ],
    "motionRuleParamNames": [
      "shape"
    ],
    "label": "Shape In",
    "description": null,
    "behaviorNotes": []
  },
  "ShuttersIn": {
    "preset": "ShuttersIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "shutters",
      "staggered"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "shutters",
        "type": "number",
        "required": false,
        "default": 12,
        "min": 2,
        "max": 30
      },
      {
        "name": "staggered",
        "type": "boolean",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "shutters",
      "staggered"
    ],
    "label": "Shutters In",
    "description": null,
    "behaviorNotes": []
  },
  "RevealIn": {
    "preset": "RevealIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction"
    ],
    "label": "Reveal In",
    "description": null,
    "behaviorNotes": []
  },
  "BlurIn": {
    "preset": "BlurIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "blur"
    ],
    "codeParams": [
      {
        "name": "blur",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 6,
        "min": 0,
        "max": 50
      }
    ],
    "motionRuleParamNames": [
      "blur"
    ],
    "label": "Blur In",
    "description": null,
    "behaviorNotes": []
  },
  "ExpandIn": {
    "preset": "ExpandIn",
    "category": "entrance",
    "uiCategory": "entrance",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "distance",
      "initialScale"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 90,
        "min": 0,
        "max": 360
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px"
      },
      {
        "name": "initialScale",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 1,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "initialScale",
      "direction",
      "distance"
    ],
    "label": "Expand In",
    "description": null,
    "behaviorNotes": []
  },
  "Breathe": {
    "preset": "Breathe",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "distance",
      "perspective",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "vertical",
          "horizontal",
          "center"
        ]
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 25
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "distance",
      "perspective",
      "iterationDelay"
    ],
    "label": "Breathe",
    "description": null,
    "behaviorNotes": []
  },
  "Pulse": {
    "preset": "Pulse",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 1,
        "step": 0.1
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "label": "Pulse",
    "description": null,
    "behaviorNotes": []
  },
  "Spin": {
    "preset": "Spin",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "clockwise",
          "counter-clockwise"
        ]
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "iterationDelay"
    ],
    "label": "Spin",
    "description": null,
    "behaviorNotes": []
  },
  "Poke": {
    "preset": "Poke",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.1
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "intensity",
      "iterationDelay"
    ],
    "label": "Poke",
    "description": null,
    "behaviorNotes": []
  },
  "Flash": {
    "preset": "Flash",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md",
      "viewenter.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "iterationDelay"
    ],
    "label": "Flash",
    "description": null,
    "behaviorNotes": []
  },
  "Swing": {
    "preset": "Swing",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "swing",
      "direction",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "swing",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 20,
        "min": 0,
        "max": 90
      },
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "swing",
      "iterationDelay"
    ],
    "label": "Swing",
    "description": null,
    "behaviorNotes": []
  },
  "Flip": {
    "preset": "Flip",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "perspective",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "vertical",
          "horizontal"
        ]
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "perspective",
      "iterationDelay"
    ],
    "label": "Flip",
    "description": null,
    "behaviorNotes": []
  },
  "Rubber": {
    "preset": "Rubber",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.1
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "label": "Rubber",
    "description": null,
    "behaviorNotes": []
  },
  "Fold": {
    "preset": "Fold",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "angle",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 15,
        "min": 0,
        "max": 90
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "angle",
      "iterationDelay"
    ],
    "label": "Fold",
    "description": null,
    "behaviorNotes": []
  },
  "Jello": {
    "preset": "Jello",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0.25,
        "min": 0,
        "max": 1,
        "step": 0.05
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "label": "Jello",
    "description": null,
    "behaviorNotes": []
  },
  "Wiggle": {
    "preset": "Wiggle",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.1
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "label": "Wiggle",
    "description": null,
    "behaviorNotes": []
  },
  "Bounce": {
    "preset": "Bounce",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 1,
        "step": 0.1
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "intensity",
      "iterationDelay"
    ],
    "label": "Bounce",
    "description": null,
    "behaviorNotes": []
  },
  "Cross": {
    "preset": "Cross",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "iterationDelay"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left",
          "top-right",
          "top-left",
          "bottom-right",
          "bottom-left"
        ]
      },
      {
        "name": "iterationDelay",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "iterationDelay"
    ],
    "label": "Cross",
    "description": null,
    "behaviorNotes": []
  },
  "DVD": {
    "preset": "DVD",
    "category": "ongoing",
    "uiCategory": "ongoing",
    "exported": false,
    "typed": true,
    "sourcePresent": false,
    "motionRulesPresent": true,
    "interactRuleRefs": [],
    "supportStatus": "typed-but-not-exported",
    "uiExposed": false,
    "codeParamNames": [],
    "codeParams": [],
    "motionRuleParamNames": [],
    "label": "DVD",
    "description": null,
    "behaviorNotes": []
  },
  "ArcScroll": {
    "preset": "ArcScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "vertical",
          "horizontal"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 500,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "range",
      "perspective"
    ],
    "label": "Arc Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "BlurScroll": {
    "preset": "BlurScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "range",
      "blur"
    ],
    "codeParams": [
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out"
        ]
      },
      {
        "name": "blur",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 6,
        "min": 0,
        "max": 50
      }
    ],
    "motionRuleParamNames": [
      "blur",
      "range"
    ],
    "label": "Blur Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "FadeScroll": {
    "preset": "FadeScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "range",
      "opacity"
    ],
    "codeParams": [
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out"
        ]
      },
      {
        "name": "opacity",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 1,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "opacity",
      "range"
    ],
    "label": "Fade Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "FlipScroll": {
    "preset": "FlipScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "rotate",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "vertical",
          "horizontal"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "rotate",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 240,
        "min": 0,
        "max": 720
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "rotate",
      "range",
      "perspective"
    ],
    "label": "Flip Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "GrowScroll": {
    "preset": "GrowScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "scale",
      "speed"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "right",
          "top-right",
          "top",
          "top-left",
          "left",
          "bottom-left",
          "bottom",
          "bottom-right",
          "center"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 5,
        "step": 0.1
      },
      {
        "name": "speed",
        "type": "number",
        "required": false,
        "default": 0
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "range",
      "scale",
      "speed"
    ],
    "label": "Grow Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "MoveScroll": {
    "preset": "MoveScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "angle",
      "range",
      "distance"
    ],
    "codeParams": [
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 120,
        "min": 0,
        "max": 360
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 400
      }
    ],
    "motionRuleParamNames": [
      "angle",
      "range",
      "distance"
    ],
    "label": "Move Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "PanScroll": {
    "preset": "PanScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "distance",
      "startFromOffScreen",
      "range"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 400
      },
      {
        "name": "startFromOffScreen",
        "type": "boolean",
        "required": false
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "distance",
      "startFromOffScreen",
      "range"
    ],
    "label": "Pan Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "ParallaxScroll": {
    "preset": "ParallaxScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md",
      "integration.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "parallaxFactor",
      "range"
    ],
    "codeParams": [
      {
        "name": "parallaxFactor",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 2,
        "step": 0.1
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out"
        ]
      }
    ],
    "motionRuleParamNames": [
      "parallaxFactor",
      "range"
    ],
    "label": "Parallax Scroll",
    "description": null,
    "behaviorNotes": [
      "Does not read the range preset parameter in shipped code."
    ]
  },
  "RevealScroll": {
    "preset": "RevealScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "range"
    ],
    "label": "Reveal Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "ShapeScroll": {
    "preset": "ShapeScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "shape",
      "range",
      "intensity"
    ],
    "codeParams": [
      {
        "name": "shape",
        "type": "string",
        "required": false,
        "enum": [
          "circle",
          "ellipse",
          "rectangle",
          "diamond",
          "window"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "shape",
      "range",
      "intensity"
    ],
    "label": "Shape Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "ShuttersScroll": {
    "preset": "ShuttersScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "shutters",
      "staggered",
      "range"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "shutters",
        "type": "number",
        "required": false,
        "default": 12,
        "min": 2,
        "max": 30
      },
      {
        "name": "staggered",
        "type": "boolean",
        "required": false
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "shutters",
      "staggered",
      "range"
    ],
    "label": "Shutters Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "ShrinkScroll": {
    "preset": "ShrinkScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "scale",
      "speed"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "right",
          "top-right",
          "top",
          "top-left",
          "left",
          "bottom-left",
          "bottom",
          "bottom-right",
          "center"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 1.2,
        "min": 0,
        "max": 5,
        "step": 0.1
      },
      {
        "name": "speed",
        "type": "number",
        "required": false,
        "default": 0
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "range",
      "scale",
      "speed"
    ],
    "label": "Shrink Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "SkewPanScroll": {
    "preset": "SkewPanScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "skew"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "skew",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 10,
        "min": 0,
        "max": 45
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "skew",
      "range"
    ],
    "label": "Skew Pan Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "SlideScroll": {
    "preset": "SlideScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "right",
          "bottom",
          "left"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "range"
    ],
    "label": "Slide Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "Spin3dScroll": {
    "preset": "Spin3dScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "range",
      "rotate",
      "speed",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "rotate",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": -100,
        "min": -360,
        "max": 360
      },
      {
        "name": "speed",
        "type": "number",
        "required": false,
        "default": 0
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 1000,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "rotate",
      "speed",
      "range",
      "perspective"
    ],
    "label": "Spin 3D",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "SpinScroll": {
    "preset": "SpinScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "spins",
      "range",
      "scale"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "clockwise",
          "counter-clockwise"
        ]
      },
      {
        "name": "spins",
        "type": "number",
        "required": false,
        "default": 0.15,
        "min": 0,
        "max": 5,
        "step": 0.1
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 0,
        "max": 3,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "spins",
      "range",
      "scale"
    ],
    "label": "Spin Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "StretchScroll": {
    "preset": "StretchScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "range",
      "stretch"
    ],
    "codeParams": [
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "stretch",
        "type": "number",
        "required": false,
        "default": 0.6,
        "min": 0,
        "max": 3,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "stretch",
      "range"
    ],
    "label": "Stretch Scroll",
    "description": null,
    "behaviorNotes": [
      "Contains explicit continuous-mode logic in shipped source."
    ]
  },
  "TiltScroll": {
    "preset": "TiltScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "range",
      "parallaxFactor",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "parallaxFactor",
        "type": "number",
        "required": false,
        "default": 0,
        "min": 0,
        "max": 2,
        "step": 0.1
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 400,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "parallaxFactor",
      "perspective",
      "range"
    ],
    "label": "Tilt Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "TurnScroll": {
    "preset": "TurnScroll",
    "category": "scroll",
    "uiCategory": "scroll",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "direction",
      "spin",
      "range",
      "scale",
      "rotation"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "spin",
        "type": "string",
        "required": false,
        "enum": [
          "clockwise",
          "counter-clockwise"
        ]
      },
      {
        "name": "range",
        "type": "string",
        "required": false,
        "enum": [
          "in",
          "out",
          "continuous"
        ]
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 0,
        "max": 3,
        "step": 0.1
      },
      {
        "name": "rotation",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 0,
        "min": -360,
        "max": 360
      }
    ],
    "motionRuleParamNames": [
      "direction",
      "spin",
      "scale",
      "range"
    ],
    "label": "Turn Scroll",
    "description": null,
    "behaviorNotes": [
      "No explicit continuous branch found in shipped source."
    ]
  },
  "AiryMouse": {
    "preset": "AiryMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "axis",
      "angle"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 30,
        "min": 0,
        "max": 90
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "angle",
      "axis"
    ],
    "label": "Airy Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "BlobMouse": {
    "preset": "BlobMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "scale"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 1.4,
        "min": 0,
        "max": 3,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "scale"
    ],
    "label": "Blob Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "BlurMouse": {
    "preset": "BlurMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "angle",
      "scale",
      "blur",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 80
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 5,
        "min": 0,
        "max": 90
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 0.3,
        "min": 0,
        "max": 2,
        "step": 0.1
      },
      {
        "name": "blur",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 20,
        "min": 0,
        "max": 50
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 600,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "angle",
      "scale",
      "blur",
      "perspective"
    ],
    "label": "Blur Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "BounceMouse": {
    "preset": "BounceMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "axis"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 80
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bounce Mouse",
    "description": "Element follows the pointer with elastic overshoot motion.",
    "behaviorNotes": []
  },
  "CustomMouse": {
    "preset": "CustomMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "implementation-hook",
    "uiExposed": false,
    "codeParamNames": [],
    "codeParams": [],
    "motionRuleParamNames": [],
    "label": "Custom Mouse",
    "description": "Implementation helper exported by the package; useful only when paired with a customEffect.",
    "behaviorNotes": []
  },
  "ScaleMouse": {
    "preset": "ScaleMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "axis",
      "scale"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 80
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      },
      {
        "name": "scale",
        "type": "number",
        "required": false,
        "default": 1.4,
        "min": 0,
        "max": 3,
        "step": 0.1
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "scale",
      "axis"
    ],
    "label": "Scale Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "SkewMouse": {
    "preset": "SkewMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "angle",
      "axis"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 25,
        "min": 0,
        "max": 45
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "angle",
      "axis"
    ],
    "label": "Skew Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "SpinMouse": {
    "preset": "SpinMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "axis"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      }
    ],
    "motionRuleParamNames": [],
    "label": "Spin Mouse",
    "description": "Element rotates in response to pointer position.",
    "behaviorNotes": []
  },
  "SwivelMouse": {
    "preset": "SwivelMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "angle",
      "perspective",
      "pivotAxis"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 5,
        "min": 0,
        "max": 90
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      },
      {
        "name": "pivotAxis",
        "type": "string",
        "required": false,
        "enum": [
          "top",
          "bottom",
          "right",
          "left",
          "center-horizontal",
          "center-vertical"
        ]
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "angle",
      "perspective",
      "pivotAxis"
    ],
    "label": "Swivel Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "Tilt3DMouse": {
    "preset": "Tilt3DMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "angle",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 5,
        "min": 0,
        "max": 90
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "angle",
      "perspective"
    ],
    "label": "Tilt 3D",
    "description": null,
    "behaviorNotes": []
  },
  "Track3DMouse": {
    "preset": "Track3DMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "angle",
      "axis",
      "perspective"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "angle",
        "type": "number",
        "required": false,
        "unit": "°",
        "default": 5,
        "min": 0,
        "max": 90
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      },
      {
        "name": "perspective",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 800,
        "min": 200,
        "max": 2000
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "angle",
      "axis",
      "perspective"
    ],
    "label": "Track 3D",
    "description": null,
    "behaviorNotes": []
  },
  "TrackMouse": {
    "preset": "TrackMouse",
    "category": "mouse",
    "uiCategory": "mouse",
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": true,
    "interactRuleRefs": [
      "full-lean.md"
    ],
    "supportStatus": "supported",
    "uiExposed": true,
    "codeParamNames": [
      "inverted",
      "distance",
      "axis"
    ],
    "codeParams": [
      {
        "name": "inverted",
        "type": "boolean",
        "required": false
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "unit": "px",
        "default": 200
      },
      {
        "name": "axis",
        "type": "string",
        "required": false,
        "enum": [
          "both",
          "horizontal",
          "vertical"
        ]
      }
    ],
    "motionRuleParamNames": [
      "inverted",
      "distance",
      "axis"
    ],
    "label": "Track Mouse",
    "description": null,
    "behaviorNotes": []
  },
  "BgCloseUp": {
    "preset": "BgCloseUp",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "scale"
    ],
    "codeParams": [
      {
        "name": "scale",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Close Up",
    "description": null,
    "behaviorNotes": []
  },
  "BgFade": {
    "preset": "BgFade",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "range"
    ],
    "codeParams": [
      {
        "name": "range",
        "type": "string",
        "required": true,
        "enum": [
          "in",
          "out"
        ]
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Fade",
    "description": null,
    "behaviorNotes": []
  },
  "BgFadeBack": {
    "preset": "BgFadeBack",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "scale"
    ],
    "codeParams": [
      {
        "name": "scale",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Fade Back",
    "description": null,
    "behaviorNotes": []
  },
  "BgFake3D": {
    "preset": "BgFake3D",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "stretch",
      "zoom"
    ],
    "codeParams": [
      {
        "name": "stretch",
        "type": "number",
        "required": false
      },
      {
        "name": "zoom",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Fake 3 D",
    "description": null,
    "behaviorNotes": []
  },
  "BgPan": {
    "preset": "BgPan",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "direction",
      "speed"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": true,
        "enum": [
          "left",
          "right"
        ]
      },
      {
        "name": "speed",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Pan",
    "description": null,
    "behaviorNotes": []
  },
  "BgParallax": {
    "preset": "BgParallax",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "speed"
    ],
    "codeParams": [
      {
        "name": "speed",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Parallax",
    "description": null,
    "behaviorNotes": []
  },
  "BgPullBack": {
    "preset": "BgPullBack",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "scale"
    ],
    "codeParams": [
      {
        "name": "scale",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Pull Back",
    "description": null,
    "behaviorNotes": []
  },
  "BgReveal": {
    "preset": "BgReveal",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [],
    "codeParams": [],
    "motionRuleParamNames": [],
    "label": "Bg Reveal",
    "description": null,
    "behaviorNotes": []
  },
  "BgRotate": {
    "preset": "BgRotate",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "direction",
      "angle"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "counter-clockwise",
          "clockwise"
        ]
      },
      {
        "name": "angle",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Rotate",
    "description": null,
    "behaviorNotes": []
  },
  "BgSkew": {
    "preset": "BgSkew",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "direction",
      "angle"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "enum": [
          "counter-clockwise",
          "clockwise"
        ]
      },
      {
        "name": "angle",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Skew",
    "description": null,
    "behaviorNotes": []
  },
  "BgZoom": {
    "preset": "BgZoom",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "direction",
      "zoom"
    ],
    "codeParams": [
      {
        "name": "direction",
        "type": "string",
        "required": true,
        "enum": [
          "in",
          "out"
        ]
      },
      {
        "name": "zoom",
        "type": "number",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Bg Zoom",
    "description": null,
    "behaviorNotes": []
  },
  "ImageParallax": {
    "preset": "ImageParallax",
    "category": "backgroundScroll",
    "uiCategory": null,
    "exported": true,
    "typed": true,
    "sourcePresent": true,
    "motionRulesPresent": false,
    "interactRuleRefs": [],
    "supportStatus": "audited-not-ui-exposed",
    "uiExposed": false,
    "codeParamNames": [
      "reverse",
      "speed",
      "isPage"
    ],
    "codeParams": [
      {
        "name": "reverse",
        "type": "boolean",
        "required": false
      },
      {
        "name": "speed",
        "type": "number",
        "required": false
      },
      {
        "name": "isPage",
        "type": "boolean",
        "required": false
      }
    ],
    "motionRuleParamNames": [],
    "label": "Image Parallax",
    "description": null,
    "behaviorNotes": []
  }
} as const;

export const LIBRARY_EXPORTED_PRESET_NAMES = [
  "AiryMouse",
  "ArcIn",
  "ArcScroll",
  "BgCloseUp",
  "BgFade",
  "BgFadeBack",
  "BgFake3D",
  "BgPan",
  "BgParallax",
  "BgPullBack",
  "BgReveal",
  "BgRotate",
  "BgSkew",
  "BgZoom",
  "BlobMouse",
  "BlurIn",
  "BlurMouse",
  "BlurScroll",
  "Bounce",
  "BounceIn",
  "BounceMouse",
  "Breathe",
  "Cross",
  "CurveIn",
  "CustomMouse",
  "DropIn",
  "ExpandIn",
  "FadeIn",
  "FadeScroll",
  "Flash",
  "Flip",
  "FlipIn",
  "FlipScroll",
  "FloatIn",
  "Fold",
  "FoldIn",
  "GlideIn",
  "GrowScroll",
  "ImageParallax",
  "Jello",
  "MoveScroll",
  "PanScroll",
  "ParallaxScroll",
  "Poke",
  "Pulse",
  "RevealIn",
  "RevealScroll",
  "Rubber",
  "ScaleMouse",
  "ShapeIn",
  "ShapeScroll",
  "ShrinkScroll",
  "ShuttersIn",
  "ShuttersScroll",
  "SkewMouse",
  "SkewPanScroll",
  "SlideIn",
  "SlideScroll",
  "Spin",
  "Spin3dScroll",
  "SpinIn",
  "SpinMouse",
  "SpinScroll",
  "StretchScroll",
  "Swing",
  "SwivelMouse",
  "Tilt3DMouse",
  "TiltIn",
  "TiltScroll",
  "Track3DMouse",
  "TrackMouse",
  "TurnIn",
  "TurnScroll",
  "Wiggle",
  "WinkIn"
] as const;

export const LIBRARY_DISCREPANCIES = [
  {
    "id": "BounceMouse-missing-in-motion-rules",
    "classification": "code-missing-in-motion-rules",
    "title": "BounceMouse exists in shipped code but is omitted from motion preset rules",
    "winner": "shipped code/runtime behavior",
    "losingSources": [
      "@wix/motion-presets rules"
    ],
    "preset": "BounceMouse"
  },
  {
    "id": "CustomMouse-missing-in-motion-rules",
    "classification": "code-missing-in-motion-rules",
    "title": "CustomMouse exists in shipped code but is omitted from motion preset rules",
    "winner": "shipped code/runtime behavior",
    "losingSources": [
      "@wix/motion-presets rules"
    ],
    "preset": "CustomMouse"
  },
  {
    "id": "DVD-typed-or-ruled-not-exported",
    "classification": "typed-but-not-exported",
    "title": "DVD appears in lower-priority sources but is not exported by shipped code",
    "winner": "shipped code/runtime behavior",
    "losingSources": [
      "@wix/motion-presets rules",
      "public @wix/motion-presets types"
    ],
    "preset": "DVD"
  },
  {
    "id": "SpinMouse-missing-in-motion-rules",
    "classification": "code-missing-in-motion-rules",
    "title": "SpinMouse exists in shipped code but is omitted from motion preset rules",
    "winner": "shipped code/runtime behavior",
    "losingSources": [
      "@wix/motion-presets rules"
    ],
    "preset": "SpinMouse"
  },
  {
    "id": "turn-scroll-rotation-missing-in-rules",
    "classification": "code-missing-in-motion-rules",
    "title": "TurnScroll.rotation exists in shipped code but is omitted from motion preset rules",
    "winner": "shipped code/runtime behavior",
    "losingSources": [
      "@wix/motion-presets rules",
      "@wix/interact rules"
    ],
    "preset": "TurnScroll"
  }
] as const;

export const LIBRARY_STALE_INTERACT_RULE_REFS = [] as const;

export const SUPPORTED_TRIGGER_CATEGORIES = {
  "entrance": [
    "entrance"
  ],
  "ongoing": [
    "ongoing"
  ],
  "scroll": [
    "scroll"
  ],
  "mouse": [
    "mouse"
  ],
  "click": [
    "entrance",
    "ongoing"
  ],
  "activate": [
    "entrance",
    "ongoing"
  ],
  "hover": [
    "entrance",
    "ongoing"
  ],
  "interest": [
    "entrance",
    "ongoing"
  ]
} as const;
