import type { LucideIcon } from "lucide-react";
import {
	AlignCenter,
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalDistributeCenter,
	AlignHorizontalDistributeEnd,
	AlignHorizontalDistributeStart,
	AlignLeft,
	AlignRight,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalDistributeCenter,
	AlignVerticalDistributeEnd,
	AlignVerticalDistributeStart,
	AppWindow,
	ArrowBigDown,
	ArrowBigDownDash,
	ArrowBigUp,
	ArrowBigUpDash,
	ArrowDown,
	ArrowDownToLine,
	ArrowLeft,
	ArrowLeftRight,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	ArrowUpFromLine,
	Ban,
	Baseline,
	BetweenHorizontalStart,
	Blocks,
	BookOpen,
	BookOpenText,
	Box,
	BoxSelect,
	Bug,
	Check,
	CheckCircle,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	CircleAlert,
	CircleQuestionMark,
	Clapperboard,
	Clipboard,
	ClipboardCopy,
	ClipboardPaste,
	Code2,
	CodeXml,
	Copy,
	CopyPlus,
	Cuboid,
	ExternalLink,
	Eye,
	EyeOff,
	File,
	FileCheck,
	FileDown,
	FileJson,
	FilePlus2,
	Files,
	FileText,
	FileUp,
	Ghost,
	Grid3X3,
	GripVertical,
	Hash,
	HatGlasses,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Highlighter,
	ImageIcon,
	Info,
	Keyboard,
	Layers2,
	Layers3,
	Link2,
	Link2Off,
	List,
	ListEnd,
	ListFilter,
	ListOrdered,
	ListStart,
	ListTree,
	Loader2,
	LoaderCircle,
	Magnet,
	Maximize2,
	MessageSquareQuote,
	Minimize2,
	Monitor,
	Moon,
	MoreHorizontal,
	MoveVertical,
	Palette,
	PanelBottom,
	PanelLeftClose,
	PanelLeftOpen,
	PanelRightClose,
	PanelRightOpen,
	PanelTop,
	Pencil,
	PencilLine,
	Pickaxe,
	PilcrowLeft,
	PilcrowRight,
	Pin,
	PinOff,
	Play,
	Plus,
	Presentation,
	Proportions,
	RectangleEllipsis,
	Redo2,
	RefreshCcw,
	Rocket,
	RotateCcw,
	Rows3,
	ScanEye,
	Scissors,
	Settings,
	Settings2,
	ShieldAlert,
	SlidersHorizontal,
	Shapes,
	Sparkles,
	SquareArrowOutUpRight,
	SquareArrowRightEnter,
	SquareStack,
	Star,
	Sun,
	SwatchBook,
	Tag,
	TextAlignStart,
	TextCursorInput,
	TextInitial,
	TextWrap,
	ToggleRight,
	Trash2,
	TriangleAlert,
	Type,
	Undo2,
	UnfoldVertical,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { TokenSwatch } from "../previews/TokenSwatch";

const COLOR_TOKEN_GROUPS: Array<{ title: string; tokens: string[] }> = [
	{
		title: "Surfaces",
		tokens: [
			"--editor-surface-background",
			"--editor-surface-border",
			"--editor-shell-background",
			"--editor-workspace-background",
			"--editor-stage-frame-background",
			"--editor-stage-frame-border",
			"--editor-stage-canvas-background",
			"--editor-content-background",
			"--editor-empty-slot-background",
			"--editor-empty-slot-border",
			"--editor-image-placeholder-background",
		],
	},
	{
		title: "Accent",
		tokens: [
			"--editor-accent",
			"--editor-accent-foreground",
			"--editor-accent-foreground-muted",
			"--editor-accent-shadow",
			"--editor-ai-border-gradient",
			"--editor-ai-surface-background",
			"--editor-ai-surface-hover-background",
			"--editor-ai-icon-color",
			"--editor-ai-shine-gradient",
			"--editor-ai-glow",
		],
	},
	{
		title: "Text",
		tokens: [
			"--editor-text",
			"--editor-utility-text-strong",
			"--editor-utility-text-muted",
			"--editor-empty-slot-text",
			"--editor-image-placeholder-text",
		],
	},
	{
		title: "Buttons",
		tokens: [
			"--editor-button-surface",
			"--editor-button-surface-hover",
			"--editor-button-border",
			"--editor-button-border-hover",
			"--editor-button-ghost-text",
			"--editor-button-ghost-hover-background",
			"--editor-button-ghost-hover-text",
		],
	},
	{
		title: "Inputs",
		tokens: [
			"--editor-input-background",
			"--editor-input-border",
			"--editor-input-text",
			"--editor-input-placeholder",
			"--editor-select-content-background",
			"--editor-select-highlight-background",
		],
	},
	{
		title: "Controls",
		tokens: [
			"--editor-switch-background",
			"--editor-switch-background-checked",
			"--editor-switch-mixed-indicator",
			"--editor-slider-track-background",
			"--editor-slider-range-background",
			"--editor-slider-thumb-background",
			"--editor-slider-thumb-border",
		],
	},
	{
		title: "Topbar",
		tokens: [
			"--editor-topbar-background",
			"--editor-topbar-border",
			"--editor-topbar-text",
			"--editor-topbar-muted-text",
			"--editor-topbar-button-text",
			"--editor-topbar-button-hover-text",
			"--editor-topbar-button-active-text",
			"--editor-topbar-button-background",
			"--editor-topbar-button-hover-background",
			"--editor-topbar-button-active-background",
		],
	},
	{
		title: "Tooltips",
		tokens: [
			"--editor-tooltip-background",
			"--editor-tooltip-border",
			"--editor-tooltip-text",
			"--editor-tooltip-muted-text",
		],
	},
	{
		title: "Settings Navigation",
		tokens: [
			"--editor-settings-nav-text",
			"--editor-settings-nav-hover-background",
			"--editor-settings-nav-hover-text",
			"--editor-settings-nav-active-background",
			"--editor-settings-nav-active-text",
			"--editor-settings-nav-active-muted",
		],
	},
	{
		title: "Focus & Selection",
		tokens: [
			"--editor-focus-ring",
			"--editor-focus-ring-strong",
			"--editor-focus-ring-offset",
			"--editor-group-selection-border",
			"--editor-resize-handle-background",
			"--editor-resize-handle-border",
		],
	},
	{
		title: "Snap Guides",
		tokens: [
			"--editor-snap-guide-component",
			"--editor-snap-guide-page",
			"--editor-snap-guide-section",
			"--editor-snap-guide-header",
			"--editor-snap-guide-footer",
			"--editor-snap-guide-container",
		],
	},
	{
		title: "Scrollbar",
		tokens: [
			"--editor-scrollbar-track",
			"--editor-scrollbar-thumb",
			"--editor-scrollbar-thumb-hover",
		],
	},
	{
		title: "Utility",
		tokens: [
			"--editor-utility-bg-subtle",
			"--editor-utility-border",
			"--editor-warning-background",
			"--editor-warning-border",
			"--editor-warning-text",
			"--editor-template-tag-background",
			"--editor-template-tag-text",
		],
	},
];

const TYPE_SCALE = [
	{
		label: "Micro",
		size: "10px",
		weight: "500",
		sampleWeight: 500,
		usage: "Eyebrow labels, compact badges",
	},
	{
		label: "Label",
		size: "11px",
		weight: "500 / 600",
		sampleWeight: 500,
		usage: "Inspector labels, tab items",
	},
	{
		label: "Small",
		size: "12px",
		weight: "400 / 500",
		sampleWeight: 400,
		usage: "Secondary text, table cells",
	},
	{
		label: "Body",
		size: "14px",
		weight: "400",
		sampleWeight: 400,
		usage: "Default body text, descriptions",
	},
	{
		label: "Section Title",
		size: "15px",
		weight: "600",
		sampleWeight: 600,
		usage: "Panel section headings",
	},
	{
		label: "Dialog Title",
		size: "18px",
		weight: "600",
		sampleWeight: 600,
		usage: "Modal and dialog headings",
	},
];

const FONT_WEIGHTS = [
	{ weight: 400, label: "Regular" },
	{ weight: 500, label: "Medium" },
	{ weight: 600, label: "Semibold" },
	{ weight: 700, label: "Bold" },
];

const RADIUS_TIERS = [
	{ name: "none", value: "0", usage: "Stage selection" },
	{
		name: "sm",
		value: "4px (rounded-sm)",
		usage: "Inspector compact controls, inputs, selects, dropdown popups",
	},
	{
		name: "md",
		value: "6px (rounded-md)",
		usage: "Buttons and small utility surfaces",
	},
	{ name: "lg", value: "8px (rounded-lg)", usage: "Cards, nav items, icons" },
	{ name: "xl", value: "12px (rounded-xl)", usage: "Panels, surfaces" },
	{
		name: "2xl",
		value: "16px (rounded-2xl)",
		usage: "Dialogs, large surfaces",
	},
];

const SHADOW_ROLES = [
	{ name: "Surface", token: "--editor-surface-shadow", usage: "Panels, cards" },
	{
		name: "Stage frame",
		token: "--editor-stage-frame-shadow",
		usage: "Stage container",
	},
	{ name: "Tooltip", token: "--editor-tooltip-shadow", usage: "Tooltips" },
	{
		name: "Accent micro",
		token: "--editor-accent-shadow",
		usage: "Accent elements",
	},
	{
		name: "AI glow",
		token: "--editor-ai-glow",
		usage: "AI entry points",
	},
	{ name: "Topbar", token: "--editor-topbar-shadow", usage: "Header bar" },
	{
		name: "Drag preview",
		token: "--editor-drag-preview-shadow",
		usage: "Dragged elements",
	},
];

const ICON_ENTRIES: Array<{ name: string; icon: LucideIcon }> = [
	{ name: "AlignCenter", icon: AlignCenter },
	{ name: "AlignCenterHorizontal", icon: AlignCenterHorizontal },
	{ name: "AlignCenterVertical", icon: AlignCenterVertical },
	{ name: "AlignEndHorizontal", icon: AlignEndHorizontal },
	{ name: "AlignEndVertical", icon: AlignEndVertical },
	{ name: "AlignHorizDistCenter", icon: AlignHorizontalDistributeCenter },
	{ name: "AlignHorizDistEnd", icon: AlignHorizontalDistributeEnd },
	{ name: "AlignHorizDistStart", icon: AlignHorizontalDistributeStart },
	{ name: "AlignLeft", icon: AlignLeft },
	{ name: "AlignRight", icon: AlignRight },
	{ name: "AlignStartHorizontal", icon: AlignStartHorizontal },
	{ name: "AlignStartVertical", icon: AlignStartVertical },
	{ name: "AlignVertDistCenter", icon: AlignVerticalDistributeCenter },
	{ name: "AlignVertDistEnd", icon: AlignVerticalDistributeEnd },
	{ name: "AlignVertDistStart", icon: AlignVerticalDistributeStart },
	{ name: "AppWindow", icon: AppWindow },
	{ name: "ArrowBigDown", icon: ArrowBigDown },
	{ name: "ArrowBigDownDash", icon: ArrowBigDownDash },
	{ name: "ArrowBigUp", icon: ArrowBigUp },
	{ name: "ArrowBigUpDash", icon: ArrowBigUpDash },
	{ name: "ArrowDown", icon: ArrowDown },
	{ name: "ArrowDownToLine", icon: ArrowDownToLine },
	{ name: "ArrowLeft", icon: ArrowLeft },
	{ name: "ArrowLeftRight", icon: ArrowLeftRight },
	{ name: "ArrowRight", icon: ArrowRight },
	{ name: "ArrowUp", icon: ArrowUp },
	{ name: "ArrowUpDown", icon: ArrowUpDown },
	{ name: "ArrowUpFromLine", icon: ArrowUpFromLine },
	{ name: "Ban", icon: Ban },
	{ name: "Baseline", icon: Baseline },
	{ name: "BetweenHorizontalStart", icon: BetweenHorizontalStart },
	{ name: "Blocks", icon: Blocks },
	{ name: "BookOpen", icon: BookOpen },
	{ name: "BookOpenText", icon: BookOpenText },
	{ name: "Box", icon: Box },
	{ name: "BoxSelect", icon: BoxSelect },
	{ name: "Bug", icon: Bug },
	{ name: "Check", icon: Check },
	{ name: "CheckCircle", icon: CheckCircle },
	{ name: "CheckCircle2", icon: CheckCircle2 },
	{ name: "ChevronDown", icon: ChevronDown },
	{ name: "ChevronLeft", icon: ChevronLeft },
	{ name: "ChevronRight", icon: ChevronRight },
	{ name: "ChevronUp", icon: ChevronUp },
	{ name: "CircleAlert", icon: CircleAlert },
	{ name: "CircleQuestionMark", icon: CircleQuestionMark },
	{ name: "Clapperboard", icon: Clapperboard },
	{ name: "Clipboard", icon: Clipboard },
	{ name: "ClipboardCopy", icon: ClipboardCopy },
	{ name: "ClipboardPaste", icon: ClipboardPaste },
	{ name: "Code2", icon: Code2 },
	{ name: "CodeXml", icon: CodeXml },
	{ name: "Copy", icon: Copy },
	{ name: "CopyPlus", icon: CopyPlus },
	{ name: "Cuboid", icon: Cuboid },
	{ name: "ExternalLink", icon: ExternalLink },
	{ name: "Eye", icon: Eye },
	{ name: "EyeOff", icon: EyeOff },
	{ name: "File", icon: File },
	{ name: "FileCheck", icon: FileCheck },
	{ name: "FileDown", icon: FileDown },
	{ name: "FileJson", icon: FileJson },
	{ name: "FilePlus2", icon: FilePlus2 },
	{ name: "Files", icon: Files },
	{ name: "FileText", icon: FileText },
	{ name: "FileUp", icon: FileUp },
	{ name: "Ghost", icon: Ghost },
	{ name: "Grid3X3", icon: Grid3X3 },
	{ name: "GripVertical", icon: GripVertical },
	{ name: "Hash", icon: Hash },
	{ name: "HatGlasses", icon: HatGlasses },
	{ name: "Heading1", icon: Heading1 },
	{ name: "Heading2", icon: Heading2 },
	{ name: "Heading3", icon: Heading3 },
	{ name: "Heading4", icon: Heading4 },
	{ name: "Heading5", icon: Heading5 },
	{ name: "Heading6", icon: Heading6 },
	{ name: "Highlighter", icon: Highlighter },
	{ name: "ImageIcon", icon: ImageIcon },
	{ name: "Info", icon: Info },
	{ name: "Keyboard", icon: Keyboard },
	{ name: "Layers2", icon: Layers2 },
	{ name: "Layers3", icon: Layers3 },
	{ name: "Link2", icon: Link2 },
	{ name: "Link2Off", icon: Link2Off },
	{ name: "List", icon: List },
	{ name: "ListEnd", icon: ListEnd },
	{ name: "ListFilter", icon: ListFilter },
	{ name: "ListOrdered", icon: ListOrdered },
	{ name: "ListStart", icon: ListStart },
	{ name: "ListTree", icon: ListTree },
	{ name: "Loader2", icon: Loader2 },
	{ name: "LoaderCircle", icon: LoaderCircle },
	{ name: "Magnet", icon: Magnet },
	{ name: "Maximize2", icon: Maximize2 },
	{ name: "MessageSquareQuote", icon: MessageSquareQuote },
	{ name: "Minimize2", icon: Minimize2 },
	{ name: "Monitor", icon: Monitor },
	{ name: "Moon", icon: Moon },
	{ name: "MoreHorizontal", icon: MoreHorizontal },
	{ name: "MoveVertical", icon: MoveVertical },
	{ name: "Palette", icon: Palette },
	{ name: "PanelBottom", icon: PanelBottom },
	{ name: "PanelLeftClose", icon: PanelLeftClose },
	{ name: "PanelLeftOpen", icon: PanelLeftOpen },
	{ name: "PanelRightClose", icon: PanelRightClose },
	{ name: "PanelRightOpen", icon: PanelRightOpen },
	{ name: "PanelTop", icon: PanelTop },
	{ name: "Pencil", icon: Pencil },
	{ name: "PencilLine", icon: PencilLine },
	{ name: "Pickaxe", icon: Pickaxe },
	{ name: "PilcrowLeft", icon: PilcrowLeft },
	{ name: "PilcrowRight", icon: PilcrowRight },
	{ name: "Pin", icon: Pin },
	{ name: "PinOff", icon: PinOff },
	{ name: "Play", icon: Play },
	{ name: "Plus", icon: Plus },
	{ name: "Presentation", icon: Presentation },
	{ name: "Proportions", icon: Proportions },
	{ name: "RectangleEllipsis", icon: RectangleEllipsis },
	{ name: "Redo2", icon: Redo2 },
	{ name: "RefreshCcw", icon: RefreshCcw },
	{ name: "Rocket", icon: Rocket },
	{ name: "RotateCcw", icon: RotateCcw },
	{ name: "Rows3", icon: Rows3 },
	{ name: "ScanEye", icon: ScanEye },
	{ name: "Scissors", icon: Scissors },
	{ name: "Settings", icon: Settings },
	{ name: "Settings2", icon: Settings2 },
	{ name: "ShieldAlert", icon: ShieldAlert },
	{ name: "SlidersHorizontal", icon: SlidersHorizontal },
	{ name: "Shapes", icon: Shapes },
	{ name: "Sparkles", icon: Sparkles },
	{ name: "SquareArrowOutUpRight", icon: SquareArrowOutUpRight },
	{ name: "SquareArrowRightEnter", icon: SquareArrowRightEnter },
	{ name: "SquareStack", icon: SquareStack },
	{ name: "Star", icon: Star },
	{ name: "Sun", icon: Sun },
	{ name: "SwatchBook", icon: SwatchBook },
	{ name: "Tag", icon: Tag },
	{ name: "TextAlignStart", icon: TextAlignStart },
	{ name: "TextCursorInput", icon: TextCursorInput },
	{ name: "TextInitial", icon: TextInitial },
	{ name: "TextWrap", icon: TextWrap },
	{ name: "ToggleRight", icon: ToggleRight },
	{ name: "Trash2", icon: Trash2 },
	{ name: "TriangleAlert", icon: TriangleAlert },
	{ name: "Type", icon: Type },
	{ name: "Undo2", icon: Undo2 },
	{ name: "UnfoldVertical", icon: UnfoldVertical },
	{ name: "X", icon: X },
	{ name: "XCircle", icon: XCircle },
	{ name: "Zap", icon: Zap },
];

export function DesignTokensSection({ themeKey }: { themeKey: string }) {
	return (
		<div>
			{/* Colors */}
			<section id="tokens-colors" className="mb-10 scroll-mt-8">
				<h2 className="editor-text-strong mb-1 text-lg font-semibold">
					Colors
				</h2>
				<p className="editor-text-muted mb-4 text-sm">
					CSS custom properties. Values reflect the current theme.
				</p>
				<div className="space-y-3">
					{COLOR_TOKEN_GROUPS.map((group) => (
						<div key={group.title}>
							<h3 className="editor-text-strong mb-2 text-[12px] font-medium">
								{group.title}
							</h3>
							<div className="editor-border-subtle editor-bg-surface rounded-xl border p-3">
								<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
									{group.tokens.map((token) => (
										<TokenSwatch
											key={token}
											token={token}
											themeKey={themeKey}
										/>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Typography */}
			<section id="tokens-typography" className="mb-10 scroll-mt-8">
				<h2 className="editor-text-strong mb-1 text-lg font-semibold">
					Typography
				</h2>
				<p className="editor-text-muted mb-4 text-sm">
					Inter, &quot;Helvetica Neue&quot;, Arial, sans-serif
				</p>

				<h3 className="editor-text-strong mb-2 text-[12px] font-medium">
					Type Scale
				</h3>
				<div className="editor-border-subtle editor-bg-surface mb-6 overflow-hidden rounded-xl border">
					<table className="w-full text-sm">
						<thead>
							<tr className="editor-border-subtle border-b">
								<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
									Role
								</th>
								<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
									Size
								</th>
								<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
									Weight
								</th>
								<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
									Sample
								</th>
							</tr>
						</thead>
						<tbody>
							{TYPE_SCALE.map((row) => (
								<tr
									key={row.label}
									className="editor-border-subtle border-b last:border-b-0"
								>
									<td className="editor-text-strong px-3 py-2 font-medium">
										{row.label}
									</td>
									<td className="editor-text-muted px-3 py-2 font-mono text-xs">
										{row.size}
									</td>
									<td className="editor-text-muted px-3 py-2 font-mono text-xs">
										{row.weight}
									</td>
									<td
										className="px-3 py-2"
										style={{
											fontSize: row.size,
											fontWeight: row.sampleWeight,
										}}
									>
										The quick brown fox
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<h3 className="editor-text-strong mb-2 text-[12px] font-medium">
					Font Weights
				</h3>
				<div className="grid grid-cols-4 gap-2">
					{FONT_WEIGHTS.map((fw) => (
						<div
							key={fw.weight}
							className="editor-border-subtle editor-bg-surface rounded-lg border px-3 py-2"
						>
							<div className="editor-text-muted font-mono text-[11px]">
								{fw.weight}
							</div>
							<div style={{ fontWeight: fw.weight }} className="text-base">
								{fw.label}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Borders & Radii — compact horizontal layout */}
			<section id="tokens-borders" className="mb-10 scroll-mt-8">
				<h2 className="editor-text-strong mb-1 text-lg font-semibold">
					Borders &amp; Radii
				</h2>
				<p className="editor-text-muted mb-4 text-sm">
					Border radius tiers used across the editor chrome.
				</p>
				<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
					{RADIUS_TIERS.map((tier) => (
						<div
							key={tier.name}
							className="editor-bg-surface flex flex-col items-center gap-1.5 rounded-lg p-3"
							title={`${tier.value} — ${tier.usage}`}
						>
							<div
								className="h-10 w-10"
								style={{
									borderRadius: tier.value.split(" ")[0],
									border: "2px solid var(--editor-surface-border)",
									background:
										"color-mix(in srgb, var(--editor-accent) 8%, transparent)",
								}}
							/>
							<div className="editor-text-strong text-[12px] font-medium">
								{tier.name}
							</div>
							<div className="editor-text-muted font-mono text-[10px]">
								{tier.value.split(" ")[0]}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Shadows — compact grid */}
			<section id="tokens-shadows" className="mb-10 scroll-mt-8">
				<h2 className="editor-text-strong mb-1 text-lg font-semibold">
					Shadows
				</h2>
				<p className="editor-text-muted mb-4 text-sm">
					Shadow roles applied to different surface types.
				</p>
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
					{SHADOW_ROLES.map((role) => (
						<div
							key={role.name}
							className="flex flex-col items-center gap-2 p-2"
							title={role.token}
						>
							<div
								className="h-10 w-16 rounded-md"
								style={{
									background: "var(--editor-surface-background)",
									boxShadow: `var(${role.token})`,
								}}
							/>
							<div className="editor-text-strong text-[11px] font-medium">
								{role.name}
							</div>
							<div className="editor-text-muted text-center text-[10px]">
								{role.usage}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Icons */}
			<section id="tokens-icons" className="mb-10 scroll-mt-8">
				<h2 className="editor-text-strong mb-1 text-lg font-semibold">Icons</h2>
				<p className="editor-text-muted mb-4 text-sm">
					lucide-react, 16px default, stroke only. {ICON_ENTRIES.length} icons
					in use.
				</p>
				<div className="editor-border-subtle editor-bg-surface rounded-xl border p-3">
					<div className="grid grid-cols-8 gap-2 lg:grid-cols-10">
						{ICON_ENTRIES.map((entry) => (
							<IconCell key={entry.name} name={entry.name} icon={entry.icon} />
						))}
					</div>
				</div>
			</section>
		</div>
	);
}

function IconCell({ name, icon: Icon }: { name: string; icon: LucideIcon }) {
	return (
		<div className="flex flex-col items-center gap-1 py-1" title={name}>
			<div className="editor-icon-surface flex h-7 w-7 items-center justify-center rounded-md border">
				<Icon className="h-4 w-4" />
			</div>
			<span className="editor-text-muted max-w-full truncate text-[9px]">
				{name}
			</span>
		</div>
	);
}
