import { Editor } from "@monaco-editor/react";

type CodeEditorProps = {
  code: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
};

export default function CodeEditor({
  code,
  language = "python",
  onChange,
}: CodeEditorProps) {
  return (
    <div className="h-full w-full border-l border-gray-700">
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
