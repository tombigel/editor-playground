import React from "react";
import ReactDOM from "react-dom/client";
import "prismjs/themes/prism.css";
import "../../styles.css";
import { PreviewShell } from "./PreviewShell";
import { LogoAssetsSection } from "../sections/LogoAssetsSection";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<PreviewShell>
			<h2 className="editor-text-strong mb-6 text-xl font-bold">Logo Assets</h2>
			<LogoAssetsSection />
		</PreviewShell>
	</React.StrictMode>,
);
