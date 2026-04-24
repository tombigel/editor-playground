import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

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
				if (event.key === "Enter") {
					event.preventDefault();
					skipBlurCommitRef.current = true;
					commit();
					return;
				}

				if (event.key === "Escape") {
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
