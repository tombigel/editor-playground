import { useState } from "react";
import { CodeXml, List, PencilLine, TextInitial } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { OptionsSelector } from "@/components/ui/options-selector";
import { Pager } from "@/components/ui/pager";
import { Switch } from "@/components/ui/switch";
import { VariationsGrid } from "../../previews/VariationsGrid";

export function SwitchDemo() {
	const [checked, setChecked] = useState(false);
	const [largeChecked, setLargeChecked] = useState(false);
	return (
		<div className="space-y-6">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Compact default
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Unchecked",
							render: () => <Switch checked={false} onCheckedChange={() => {}} />,
						},
						{
							label: "Checked",
							render: () => <Switch checked onCheckedChange={() => {}} />,
						},
						{
							label: "Disabled",
							render: () => (
								<Switch checked={false} disabled onCheckedChange={() => {}} />
							),
						},
						{
							label: "Mixed / Intermediate",
							render: () => (
								<Switch
									checked={false}
									onCheckedChange={() => {}}
									mixed
								/>
							),
						},
						{
							label: "Interactive (click)",
							render: () => (
								<Switch checked={checked} onCheckedChange={setChecked} />
							),
						},
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Large opt-in
				</div>
				<VariationsGrid
					variations={[
						{
							label: "Unchecked",
							render: () => (
								<Switch size="large" checked={false} onCheckedChange={() => {}} />
							),
						},
						{
							label: "Checked",
							render: () => <Switch size="large" checked onCheckedChange={() => {}} />,
						},
						{
							label: "Disabled",
							render: () => (
								<Switch
									size="large"
									checked={false}
									disabled
									onCheckedChange={() => {}}
								/>
							),
						},
						{
							label: "Mixed / Intermediate",
							render: () => (
								<Switch
									size="large"
									checked={false}
									onCheckedChange={() => {}}
									mixed
								/>
							),
						},
						{
							label: "Interactive (click)",
							render: () => (
								<Switch
									size="large"
									checked={largeChecked}
									onCheckedChange={setLargeChecked}
								/>
							),
						},
					]}
				/>
			</div>
		</div>
	);
}

export function OptionsSelectorDemo() {
	const [twoOption, setTwoOption] = useState("left");
	const [threeOption, setThreeOption] = useState("center");
	const [textSubtype, setTextSubtype] = useState("block");
	return (
		<div className="space-y-4">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					2-option selector
				</div>
				<OptionsSelector
					ariaLabel="Alignment"
					value={twoOption}
					onValueChange={setTwoOption}
					options={[
						{ value: "left", label: "Left" },
						{ value: "right", label: "Right" },
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					3-option selector
				</div>
				<OptionsSelector
					ariaLabel="Alignment"
					value={threeOption}
					onValueChange={setThreeOption}
					options={[
						{ value: "left", label: "Left" },
						{ value: "center", label: "Center" },
						{ value: "right", label: "Right" },
					]}
				/>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					Icon-only selector
				</div>
				<OptionsSelector
					ariaLabel="Text subtype"
					display="icon"
					size="compact"
					value={textSubtype}
					onValueChange={setTextSubtype}
					options={[
						{
							value: "rich",
							label: "Rich text",
							icon: <PencilLine className="h-3.5 w-3.5" />,
							tooltip: <div className="leading-3.5 font-medium">Rich text</div>,
						},
						{
							value: "block",
							label: "Text",
							icon: <TextInitial className="h-3.5 w-3.5" />,
							tooltip: <div className="leading-3.5 font-medium">Text</div>,
						},
						{
							value: "list",
							label: "List",
							icon: <List className="h-3.5 w-3.5" />,
							tooltip: <div className="leading-3.5 font-medium">List</div>,
						},
						{
							value: "code",
							label: "Code",
							icon: <CodeXml className="h-3.5 w-3.5" />,
							tooltip: <div className="leading-3.5 font-medium">Code</div>,
						},
					]}
				/>
			</div>
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
					Multi-select
				</div>
				<OptionsSelector
					ariaLabel="Mixed alignment"
					mixed
					value="left"
					onValueChange={() => {}}
					options={[
						{ value: "left", label: "Left" },
						{ value: "center", label: "Center" },
						{ value: "right", label: "Right" },
					]}
				/>
			</div>
		</div>
	);
}

export function PagerDemo() {
	const [page, setPage] = useState(1);
	const totalPages = 5;
	return (
		<Pager
			currentPage={page}
			totalPages={totalPages}
			onPrevious={() => setPage((p) => Math.max(1, p - 1))}
			onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
			hideWhenSinglePage={false}
		/>
	);
}

export function ListCardDemo() {
	return (
		<ListCard
			title="Inter"
			description="Hamburgefonstiv 123"
			meta="sans-serif · Western · 12 used"
			tone="subtle"
			actions={
				<>
					<Button variant="outline" size="icon">
						F
					</Button>
					<Button variant="outline" size="icon">
						+
					</Button>
				</>
			}
		/>
	);
}
