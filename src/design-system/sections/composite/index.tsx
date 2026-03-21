import { ContentDemos } from "./ContentDemos";
import { ControlGroupDemos } from "./ControlGroupDemos";
import { InspectorDemos } from "./InspectorDemos";
import { LayoutDemos } from "./LayoutDemos";
import { MiscDemos } from "./MiscDemos";
import { SettingsDemos } from "./SettingsDemos";
import { TypographyDemos } from "./TypographyDemos";

export function CompositeSection() {
	return (
		<div>
			<InspectorDemos />
			<ControlGroupDemos />
			<TypographyDemos />
			<LayoutDemos />
			<ContentDemos />
			<SettingsDemos />
			<MiscDemos />
		</div>
	);
}
