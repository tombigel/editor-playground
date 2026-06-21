import React from "react";
import ReactDOM from "react-dom/client";
import "prismjs/themes/prism.css";
import "../../styles.css";
import { PreviewShell } from "./PreviewShell";
import { BaseComponentsSection } from "../sections/base";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<PreviewShell>
			<h2 className="editor-text-strong mb-6 text-xl font-bold">Base Components</h2>
			<BaseComponentsSection />
		</PreviewShell>
	</React.StrictMode>,
);
