import { ColorAndEffectDemos } from "./ColorAndEffectDemos";
import { FontControlDemos } from "./FontControlDemos";
import { FormLayoutDemos } from "./FormLayoutDemos";
import { InteractionDemos } from "./InteractionDemos";
import { MiscDemos } from "./MiscDemos";
import { NumberFieldDemos } from "./NumberFieldDemos";
import { SizeFieldDemos } from "./SizeFieldDemos";

export function BaseComponentsSection() {
	return (
		<div>
			<FormLayoutDemos />
			<InteractionDemos />
			<NumberFieldDemos />
			<MiscDemos />
			<FontControlDemos />
			<ColorAndEffectDemos />
			<SizeFieldDemos />
		</div>
	);
}
