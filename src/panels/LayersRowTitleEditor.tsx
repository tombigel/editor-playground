import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export type TitleEditorKeyAction = "commit" | "cancel" | null;

export function resolveTitleEditorKeyAction(key: string): TitleEditorKeyAction {
	if (key === "Enter") {
		return "commit";
	}
	if (key === "Escape") {
		return "cancel";
	}
	return null;
}

export function LayersRowTitleEditor({
	name,
	onCommit,
	onCancel,
}: {
	name: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState(name);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const skipBlurCommitRef = useRef(false);

	useEffect(() => {
		setDraft(name);
	}, [name]);

	useEffect(() => {
		if (!inputRef.current) {
			return;
		}

		inputRef.current.focus();
		inputRef.current.select();
	}, []);

	function commit() {
		onCommit(draft);
	}

	return (
		<Input
			ref={inputRef}
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={() => {
				if (skipBlurCommitRef.current) {
					skipBlurCommitRef.current = false;
					return;
				}
				commit();
			}}
			onKeyDown={(event) => {
				const action = resolveTitleEditorKeyAction(event.key);
				if (action === "commit") {
					event.preventDefault();
					skipBlurCommitRef.current = true;
					commit();
					return;
				}

				if (action === "cancel") {
					event.preventDefault();
					skipBlurCommitRef.current = true;
					onCancel();
				}
			}}
			aria-label="Edit title"
			className="editor-layers-row-title-input h-6 w-full min-w-[7ch] rounded-sm px-1 py-0 text-sm leading-tight font-medium [field-sizing:content]"
		/>
	);
}
