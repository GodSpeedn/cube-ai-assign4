import { useState, useRef, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

type Message = {
  role: "user" | "coordinator" | "coder" | "tester" | "runner";
  content: string;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track last code, tests, and run output for refinement
  const [lastCode, setLastCode] = useState<string>("");
  const [lastTestCode, setLastTestCode] = useState<string>("");
  const [lastRunOutput, setLastRunOutput] = useState<string>("");
  const [showRefine, setShowRefine] = useState<boolean>(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const prompt = input;
    setInput("");
    setIsLoading(true);

    // 1️⃣ User message
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);

    try {
      // 2️⃣ Generate code
      const codeRes = await fetch("http://localhost:8000/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const codeData = await codeRes.json();
      const code = codeData.code || "⚠️ Failed to generate code.";
      setMessages((prev) => [...prev, { role: "coder", content: code }]);
      setMessages((prev) => [...prev, { role: "coordinator", content: codeData.message }]);
      window.dispatchEvent(new CustomEvent("ai:file-select", { detail: { file: codeData.file, code } }));
      window.dispatchEvent(new CustomEvent("ai:file-generate", { detail: { file: codeData.file, code } }));
      setLastCode(code);

      // 3️⃣ Generate tests
      const testRes = await fetch("http://localhost:8000/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: code }),
      });
      const testData = await testRes.json();
      const tests = testData.code || "⚠️ Failed to generate tests.";
      setMessages((prev) => [
        ...prev,
        { role: "tester", content: `${testData.status}\n\n${testData.result}` },
      ]);
      window.dispatchEvent(new CustomEvent("ai:file-generate", { detail: { file: testData.file, code: tests } }));
      setLastTestCode(tests);

      // 4️⃣ Run tests
      const runRes = await fetch("http://localhost:8000/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, test_code: tests }),
      });
      const runData = await runRes.json();
      const output = runData.output || "⚠️ No output from run-test.";
      setMessages((prev) => [...prev, { role: "runner", content: output }]);
      setLastRunOutput(output);

      // Show refine button if there are failures
      setShowRefine(output.includes("FAIL"));
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "coordinator", content: "❌ Backend error occurred." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    setShowRefine(false);
    setMessages((prev) => [...prev, { role: "coordinator", content: "🔄 Refining code based on test failures..." }]);
    setIsLoading(true);

    try {
      // 1️⃣ Refine the code
      const refineRes = await fetch("http://localhost:8000/refine-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lastCode, test_code: lastTestCode, test_output: lastRunOutput }),
      });
      const refineData = await refineRes.json();
      const newCode = refineData.code || "⚠️ Failed to refine code.";
      setMessages((prev) => [...prev, { role: "coder", content: newCode }]);
      window.dispatchEvent(new CustomEvent("ai:file-select", { detail: { file: refineData.file, code: newCode } }));
      window.dispatchEvent(new CustomEvent("ai:file-generate", { detail: { file: refineData.file, code: newCode } }));
      setLastCode(newCode);

      // 2️⃣ Run tests on the refined code
      const runRes = await fetch("http://localhost:8000/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, test_code: lastTestCode }),
      });
      const runData = await runRes.json();
      const output = runData.output || "⚠️ No output from run-test.";
      setMessages((prev) => [...prev, { role: "runner", content: output }]);
      setLastRunOutput(output);
      setShowRefine(output.includes("FAIL"));
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "coordinator", content: "❌ Refinement error occurred." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    user: isDark ? "bg-blue-700" : "bg-blue-500",
    coordinator: isDark ? "bg-purple-700" : "bg-purple-500",
    coder: isDark ? "bg-green-700" : "bg-green-500",
    tester: isDark ? "bg-yellow-600" : "bg-yellow-500",
    runner: isDark ? "bg-indigo-600" : "bg-indigo-500",
  };

  return (
    <div className={`flex flex-col p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} h-full`}>
      {/* 🗨️ Message list */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`p-3 max-w-[75%] text-sm rounded-lg ${roleColors[msg.role]} text-white whitespace-pre-wrap shadow-md`}
              >
                <div className="font-bold mb-1">{msg.role.toUpperCase()}</div>
                <div>{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 💬 Input & controls */}
      <div className="flex gap-2">
        <input
          className={`flex-1 p-2 ${isDark ? 'bg-gray-700' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} rounded border ${isDark ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI to build something..."
          disabled={isLoading}
        />
        <button 
          className={`${isLoading ? 'bg-gray-500' : 'bg-blue-600'} px-4 py-2 rounded text-white hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2`}
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            'Send'
          )}
        </button>
        {showRefine && (
          <button className="bg-orange-600 px-4 py-2 rounded hover:bg-orange-500" onClick={handleRefine}>
            Refine Code
          </button>
        )}
      </div>
    </div>
  );
}
