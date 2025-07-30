import { useEffect, useState } from "react";
import { getGeneratedFiles, getFileContent } from "../services/api";

export default function FileTree() {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    // Load saved files when component mounts
    const loadFiles = async () => {
      try {
        const data = await getGeneratedFiles();
        setFiles(data.files || []);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };

    loadFiles();

    // Reload files when a new one is generated
    const refresh = async () => {
      try {
        const data = await getGeneratedFiles();
        setFiles(data.files || []);
      } catch (error) {
        console.error('Failed to refresh files:', error);
      }
    };

    window.addEventListener("ai:file-generate", refresh);
    return () => window.removeEventListener("ai:file-generate", refresh);
  }, []);

  const handleClick = async (file: string) => {
    try {
      const code = await getFileContent(file);
      window.dispatchEvent(new CustomEvent("ai:file-select", {
        detail: {
          file: file,
          code: code
        }
      }));
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  };

  return (
    <div className="w-64 p-4 bg-gray-900 text-white border-r border-gray-700 overflow-y-auto">
      <h2 className="text-lg font-bold mb-2">📁 Generated Files</h2>
      <ul className="space-y-1 text-sm">
        {files.map(file => (
          <li
            key={file}
            className="cursor-pointer hover:underline"
            onClick={() => handleClick(file)}
          >
            {file}
          </li>
        ))}
      </ul>
    </div>
  );
}
