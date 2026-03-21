import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/panels/InspectorControls";
import { NavigationFields } from "@/panels/inspector/contentSections/shared";
import type { LinkInspectorNode } from "@/panels/inspector/types";
import {
	mockDocument,
	mockImageLeaf,
	mockLinkLeaf,
	mockTextLeaf,
} from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";

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
				props={[]}
			>
				<div className="flex flex-wrap gap-6">
					<div className="w-[300px] space-y-2.5">
						<div className="editor-text-muted text-[11px] font-medium">
							Text
						</div>
						<FormField label="Text">
							<Textarea value={mockTextLeaf.content} onChange={() => {}} />
						</FormField>
					</div>
					<div className="w-[300px] space-y-2.5">
						<div className="editor-text-muted text-[11px] font-medium">
							Link
						</div>
						<FormField label="Label">
							<Input value={mockLinkLeaf.label} onChange={() => {}} />
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
							<Input value={mockImageLeaf.src ?? ""} onChange={() => {}} />
						</FormField>
						<FormField label="Alt">
							<Input value={mockImageLeaf.alt ?? ""} onChange={() => {}} />
						</FormField>
					</div>
				</div>
			</ComponentPreview>
		</>
	);
}
