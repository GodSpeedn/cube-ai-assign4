import { useEffect, useState } from "react";
import MonacoEditor from "./MonacoEditor";

export default function CodeViewer() {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [key, setKey] = useState<number>(0); // Add key for forcing re-render

  useEffect(() => {
    const handler = (e: CustomEvent<{ file: string; code: string }>) => {
      console.log("File select event received:", e.detail);
      const { file, code } = e.detail;
      setActiveFile(file);
      setFileContent(code || "");
      setKey(prev => prev + 1); // Force re-render when file changes
    };

    window.addEventListener("ai:file-select", handler as EventListener);
    return () => window.removeEventListener("ai:file-select", handler as EventListener);
  }, []);

  // Debug log
  console.log("CodeViewer render:", { activeFile, fileContent, key });

  return (
    <div className="flex-1 flex flex-col bg-gray-950 border-l border-gray-700 overflow-hidden">
      <div className="p-2 text-sm text-gray-400 border-b border-gray-700">
        {activeFile ? `📄 ${activeFile}` : "Select a file to preview code"}
      </div>
      <div className="flex-1 overflow-auto">
        {fileContent ? (
          <MonacoEditor 
            key={key} // Add key prop to force re-render
            code={fileContent} 
            readOnly={true} 
            language="python"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No code to display
          </div>
        )}
      </div>
    </div>
  );
}
