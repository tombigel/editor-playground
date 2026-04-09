import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/panels/InspectorControls";
import { NavigationFields } from "@/panels/inspector/contentSections/shared";
import type { LinkInspectorNode } from "@/panels/inspector/types";
import { getTextContent } from "@/model/richContent";
import {
	mockDocument,
	mockImageLeaf,
	mockLinkLeaf,
	mockTextLeaf,
} from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const CONTENT_CONTROLS_PROPS: PropDefinition[] = [
	{ name: "document", type: "DocumentModel", description: "Document context used for link/page resolution." },
	{ name: "node", type: "InspectorNode", description: "Selected node whose content fields are being edited." },
	{ name: "onTextChange", type: "(field, value) => void", description: "Mutation handler for text and link fields." },
];

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function ContentDemos() {
	return (
		<>
			{/* Content Controls */}
			<ComponentPreview
				id="composite-content-controls"
				name="Content Controls"
				description="Content editing panels for different node types: text (textarea), link (label + navigation), and image (src + alt)."
				sourceFile="src/panels/inspector/contentSections/"
				props={CONTENT_CONTROLS_PROPS}
			>
				<div className="space-y-6">
					<div className="flex flex-wrap gap-6">
						<div className="w-[300px] space-y-2.5">
							<div className="editor-text-muted text-[11px] font-medium">
								Text
							</div>
							<FormField label="Text">
								<Textarea value={getTextContent(mockTextLeaf.content.blocks)} onChange={() => {}} />
							</FormField>
						</div>
						<div className="w-[300px] space-y-2.5">
							<div className="editor-text-muted text-[11px] font-medium">
								Link
							</div>
							<FormField label="Label">
								<Input value={getTextContent(mockLinkLeaf.content.blocks)} onChange={() => {}} />
							</FormField>
							<NavigationFields
								document={mockDocument}
								node={mockLinkLeaf as LinkInspectorNode}
								onTextChange={() => {}}
							/>
						</div>
						<div className="w-[300px] space-y-2.5">
							<div className="editor-text-muted text-[11px] font-medium">
								Image
							</div>
							<FormField label="Src">
								<Input value={(mockImageLeaf as { src?: string }).src ?? ""} onChange={() => {}} />
							</FormField>
							<FormField label="Alt">
								<Input value={(mockImageLeaf as { alt?: string }).alt ?? ""} onChange={() => {}} />
							</FormField>
						</div>
					</div>
					{/* Multi-select note */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Multi-select
						</div>
						<p className="editor-text-muted text-[10px] leading-relaxed">
							When multiple nodes of the same type are selected, content fields
							show a "-" placeholder for differing values. Editing a field in
							multi-select overwrites that property on all selected nodes.
						</p>
					</div>
				</div>
			</ComponentPreview>
		</>
	);
}
