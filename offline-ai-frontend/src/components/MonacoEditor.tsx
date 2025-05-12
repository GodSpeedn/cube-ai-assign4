import Editor from '@monaco-editor/react';
import { useTheme } from '../hooks/useTheme';

interface MonacoEditorProps {
  code: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function MonacoEditor({ 
  code, 
  language = 'python',
  onChange,
  readOnly = false 
}: MonacoEditorProps) {
  const { isDark } = useTheme();

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={code}
        theme={isDark ? 'vs-dark' : 'vs-light'}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          renderWhitespace: 'selection',
          tabSize: 2,
        }}
        onChange={onChange}
      />
    </div>
  );
} 