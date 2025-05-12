import { useEffect, useState } from "react";

export default function FileTree() {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    // Load saved files when component mounts
    fetch("http://localhost:8000/list-files")
      .then(res => res.json())
      .then(data => setFiles(data.files || []));

    // Reload files when a new one is generated
    const refresh = () => {
      fetch("http://localhost:8000/list-files")
        .then(res => res.json())
        .then(data => setFiles(data.files || []));
    };

    window.addEventListener("ai:file-generate", refresh);
    return () => window.removeEventListener("ai:file-generate", refresh);
  }, []);

  const handleClick = (file: string) => {
    fetch(`http://localhost:8000/generated/${file}`)
      .then(res => res.text())
      .then(code => {
        window.dispatchEvent(new CustomEvent("ai:file-select", {
          detail: {
            file: file,
            code: code
          }
        }));
      });
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
