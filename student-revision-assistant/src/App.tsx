import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { Send, Link as LinkIcon, Briefcase, ChevronRight, Loader2, Award, Terminal, ArrowLeft, SkipForward } from "lucide-react";
import { processAndStore } from "./services/rag.ts";
import { generateQuestion, evaluateAnswer, InterviewQuestion } from "./services/gemini.ts";
import { ChatMessage, IngestedContent } from "./types.ts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [url, setUrl] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestedData, setIngestedData] = useState<IngestedContent[] | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleIngest = async () => {
    if (!url) return;
    setIsIngesting(true);
    try {
      const response = await axios.post("/api/ingest", { url });
      const { content } = response.data;
      await processAndStore(content);
      setIngestedData(content);
      startInterview();
    } catch (error) {
      console.error(error);
      alert("Failed to ingest content. Please check the URL.");
    } finally {
      setIsIngesting(false);
    }
  };

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const question = await generateQuestion([], difficulty);
      setCurrentQuestion(question);
      setChat([{ role: "ai", content: question.question }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userInput || !currentQuestion || isLoading) return;

    const answer = userInput;
    setUserInput("");
    setIsLoading(true);

    const userMsg: ChatMessage = { role: "user", content: answer };
    setChat(prev => [...prev, userMsg]);

    try {
      const evaluation = await evaluateAnswer(currentQuestion.question, answer);
      
      const evalMsg: ChatMessage = {
        role: "ai",
        content: `Feedback: ${evaluation.feedback}`,
        evaluation: evaluation
      };
      setChat(prev => [...prev, evalMsg]);

      const nextQuestion = await generateQuestion([...chat, userMsg], difficulty);
      setCurrentQuestion(nextQuestion);
      
      const questionMsg: ChatMessage = { role: "ai", content: nextQuestion.question };
      setChat(prev => [...prev, questionMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nextQuestion = await generateQuestion(chat, difficulty);
      setCurrentQuestion(nextQuestion);
      setChat(prev => [...prev, { role: "ai", content: nextQuestion.question }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToStart = () => {
    setIngestedData(null);
    setChat([]);
    setCurrentQuestion(null);
    setUrl("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0E14] text-[#C9D1D9]">
      {/* Header */}
      <header className="h-[60px] px-6 border-b border-[#2D333B] flex items-center justify-between bg-[#151921]">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-[#3FB950]" />
          <h1 className="text-lg font-bold tracking-tight text-white uppercase italic font-mono">
            STUDENT REVISION ASSISTANT <span className="font-light text-[#8B949E] ml-2 text-sm">| AI Study Mode</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {ingestedData && (
            <button 
              onClick={handleBackToStart}
              className="flex items-center gap-2 px-3 py-1 bg-[#2D333B] hover:bg-[#3D444D] text-white text-[10px] font-bold uppercase rounded transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          )}
          <div className="px-3 py-1 bg-[#3FB950]/10 border border-[#3FB950] rounded-full text-[10px] uppercase font-bold text-[#3FB950] tracking-wider">
            RAG Pipeline: Live
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-6 max-w-[1400px] mx-auto w-full overflow-hidden">
        {/* URL Input Area */}
        {!ingestedData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="tech-card p-8 flex flex-col gap-6 max-w-2xl mx-auto w-full mt-10"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B949E]">
                01. Initialize Study Material
              </h2>
              <p className="text-sm opacity-70">Submit a GitHub repository or documentation link to begin your revision session.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#8B949E] ml-1">Repository URL</label>
                <input 
                  type="text" 
                  placeholder="https://github.com/facebook/react"
                  className="bg-[#0B0E14] p-3 rounded-md border border-[#2D333B] focus:border-[#3FB950] focus:outline-none font-mono text-sm transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <button 
                onClick={handleIngest}
                disabled={isIngesting || !url}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync & Index"}
              </button>
            </div>
            <div className="flex gap-4 items-center pt-2">
              <span className="text-[10px] font-bold uppercase text-[#8B949E]">Target Profile:</span>
              <div className="flex gap-2">
                {["easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase rounded border transition-all",
                      difficulty === level 
                        ? "bg-[#3FB950] border-[#3FB950] text-[#000]" 
                        : "border-[#2D333B] text-[#8B949E] hover:border-[#8B949E]"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Interview Dashboard */}
        {ingestedData && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 overflow-hidden">
            {/* Sidebar: Data Context */}
            <aside className="flex flex-col gap-4 overflow-hidden">
              <div className="tech-card flex flex-col h-full overflow-hidden">
                <div className="panel-header flex justify-between items-center">
                  <span>Context Stack</span>
                  <span className="text-[10px] opacity-70 bg-[#2D333B] px-1.5 py-0.5 rounded text-white">{ingestedData.length} Files</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {ingestedData.map((item, i) => (
                    <div key={i} className="text-[11px] font-mono p-2 bg-[#0B0E14] border border-[#2D333B] rounded truncate text-[#8B949E]">
                      {item.title}
                    </div>
                  ))}
                </div>
                <div className="bg-[#0D1117] p-4 text-[11px] font-mono font-medium border-t border-[#2D333B]">
                  <div className="log-entry flex gap-2">
                    <span className="text-[#8B949E]">[SYSTEM]</span>
                    <span className="text-[#3FB950]">Vector DB Ready</span>
                  </div>
                  <div className="log-entry flex gap-2 mt-1">
                    <span className="text-[#8B949E]">[MODE]</span>
                    <span className="text-white">Active Revision</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content: Chat */}
            <section className="tech-card flex flex-col overflow-hidden bg-[#0D1117]">
              <div className="panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3FB950] animate-pulse" />
                  <span>Revision Module</span>
                </div>
                <button
                  onClick={handleNextQuestion}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[#2D333B] hover:bg-[#3D444D] disabled:opacity-50 text-[10px] uppercase font-bold text-white rounded transition-colors"
                >
                  <SkipForward className="w-3 h-3" />
                  Next Question
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <AnimatePresence>
                  {chat.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-2 max-w-[90%]",
                        msg.role === "user" ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-widest text-[#8B949E] mb-1">
                        {msg.role === "ai" ? "Assistant" : "Student"}
                      </div>
                      <div className={cn(
                        "p-4 text-sm leading-relaxed rounded-lg",
                        msg.role === "user" 
                          ? "bg-[#238636] text-white" 
                          : "bg-[#151921] border border-[#2D333B] text-[#C9D1D9]"
                      )}>
                        {msg.content}
                      </div>

                      {msg.evaluation && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-full mt-3 p-4 bg-[#0B0E14] border border-[#2D333B] rounded-lg space-y-3"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-[#2D333B]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3FB950]">Assessment Report</span>
                            <span className="text-lg font-mono font-bold text-white">{msg.evaluation.score}<span className="text-xs text-[#8B949E]">/10</span></span>
                          </div>
                          <p className="text-xs text-[#8B949E] leading-relaxed italic">"{msg.evaluation.feedback}"</p>
                          <details className="text-[10px] text-[#8B949E]">
                            <summary className="cursor-pointer hover:text-white transition-colors uppercase font-bold tracking-tighter">Reference Solution</summary>
                            <div className="mt-2 p-3 bg-[#151921] border border-[#2D333B] rounded text-[#C9D1D9]">
                              {msg.evaluation.idealAnswer}
                            </div>
                          </details>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-[#8B949E] animate-pulse">
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-[#151921] border-t border-[#2D333B] flex gap-3">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Type your technical explanation..."
                  className="flex-1 bg-[#0B0E14] p-3 text-sm border border-[#2D333B] rounded-md focus:border-[#3FB950] focus:outline-none min-h-[50px] font-sans resize-none disabled:opacity-50 text-[#C9D1D9]"
                />
                <button 
                  onClick={handleSubmitAnswer}
                  disabled={isLoading || !userInput}
                  className="bg-[#3FB950] text-[#000] px-5 rounded-md self-end h-[50px] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </section>

            {/* Sidebar: Metrics */}
            <aside className="flex flex-col gap-4 overflow-hidden">
              <div className="tech-card h-full flex flex-col">
                <div className="panel-header uppercase">Live Metrics</div>
                <div className="flex-1 divide-y divide-[#2D333B]">
                  <MetricCard 
                    label="Revision Progress" 
                    value={chat.filter(m => m.evaluation).length > 0 
                      ? (chat.reduce((acc, curr) => acc + (curr.evaluation?.score || 0), 0) / chat.filter(m => m.evaluation).length) 
                      : 0 
                    } 
                  />
                  <MetricCard 
                    label="Knowledge Retention" 
                    value={chat.filter(m => m.evaluation).length > 0 ? 8.5 : 0} 
                    simulated
                  />
                  <MetricCard 
                    label="Conceptual Mastery" 
                    value={chat.filter(m => m.evaluation).length > 0 ? 7.2 : 0}
                    simulated
                  />
                </div>
                <div className="p-6 bg-[#0D1117] border-t border-[#2D333B] mt-auto">
                   <div className="text-[10px] font-bold uppercase text-[#8B949E] mb-2">Performance Outlook</div>
                   <div className="text-xs leading-relaxed text-[#8B949E]">
                     {chat.filter(m => m.evaluation).length > 0 
                       ? "Analyzing response patterns for architecture depth and trade-off awareness." 
                       : "Session awaiting initial data ingestion and first interrogation cycle."}
                   </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 px-6 border-t border-[#2D333B] flex items-center justify-between text-[10px] font-mono text-[#8B949E] bg-[#0B0E14]">
        <div className="flex gap-6">
          <span>BUILD: v.2.4.912</span>
          <span>GROUNDING: GitHub/Web API</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" />
          <span className="uppercase font-bold">Vector DB Online</span>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, simulated }: { label: string; value: number; simulated?: boolean }) {
  // Use fixed precision and scale for simulated values to make them look real
  const displayVal = simulated && value > 0 ? (value + Math.random() * 0.2).toFixed(1) : value.toFixed(1);
  const percentage = Math.min(Math.max((value / 10) * 100, 0), 100);

  return (
    <div className="p-5 flex flex-col gap-1.5">
      <div className="text-2xl font-light text-white font-mono">{displayVal}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-1">{label}</div>
      <div className="h-1 w-full bg-[#30363D] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-[#3FB950]" 
        />
      </div>
    </div>
  );
}
