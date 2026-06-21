import React from "react";
import ReactDOM from "react-dom/client";
import "prismjs/themes/prism.css";
import "../../styles.css";
import { PreviewShell } from "./PreviewShell";
import { DesignTokensSection } from "../sections/DesignTokensSection";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<PreviewShell>
			<h2 className="editor-text-strong mb-6 text-xl font-bold">Design Tokens</h2>
			<DesignTokensSection themeKey="light-default-default-#1668ff" />
		</PreviewShell>
	</React.StrictMode>,
);
