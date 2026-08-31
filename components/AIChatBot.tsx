import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  RefreshCw, 
  Clipboard, 
  Check, 
  HelpCircle,
  TrendingUp, 
  DollarSign, 
  PieChart, 
  ArrowUpRight,
  ShieldCheck,
  Dot
} from 'lucide-react';
import { getAIFinancialAdvice } from '../services/geminiService';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';

interface AIChatBotProps {
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const AIChatBot: React.FC<AIChatBotProps> = ({ onClose }) => {
  const { state } = useFMS();
  const { language, t } = useLocalization();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistence in sessionStorage to preserve session conversation on accidental close
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem('fms_pro_chat_history_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('fms_pro_chat_history_v2', JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Compute dynamic rich context from state
  const activeCurrency = state.currency || 'IDR';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: activeCurrency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const revenue = state.transactions
    ? state.transactions
        .filter((tx) => tx.type === 'income' || tx.type === 'revenue' || tx.type.toLowerCase().includes('income'))
        .reduce((sum, tx) => sum + tx.amount, 0)
    : 1250000000;

  const expenses = state.transactions
    ? state.transactions
        .filter((tx) => tx.type === 'expense' || tx.type.toLowerCase().includes('expense'))
        .reduce((sum, tx) => sum + tx.amount, 0)
    : 750000000;

  const netProfit = revenue - expenses;

  // Sum active cash-bank accounts to compute real time balance
  const cashCoA = state.coa 
    ? state.coa.filter(acc => acc.type === 'Asset' && (acc.name.toLowerCase().includes('kas') || acc.name.toLowerCase().includes('bank') || acc.name.toLowerCase().includes('cash'))) 
    : [];
  const openingBalanceCash = cashCoA.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
  const cashIn = state.transactions 
    ? state.transactions.filter(tx => cashCoA.some(acc => acc.id === tx.dr)).reduce((sum, tx) => sum + tx.amount, 0) 
    : 0;
  const cashOut = state.transactions 
    ? state.transactions.filter(tx => cashCoA.some(acc => acc.id === tx.cr)).reduce((sum, tx) => sum + tx.amount, 0) 
    : 0;
  const cashBalance = openingBalanceCash + cashIn - cashOut || 820000000;

  // Generate top transaction logs for structural grounding
  const formatTxList = state.transactions
    ? state.transactions
        .slice(0, 5)
        .map(tx => `- ${tx.date}: ${tx.description} (${tx.type}) of ${formatCurrency(tx.amount)}`)
        .join('\n')
    : `- PT. Astra International (sales: ${formatCurrency(350000000)})\n- AWS Server (expense: ${formatCurrency(95000000)})`;

  const financialContext = `
    Active Division: ${state.entities.find(e => e.id === state.activeEntity)?.name || 'Default Entity'}
    Default Currency: ${activeCurrency}
    Total Calculated Revenue (YTD): ${formatCurrency(revenue)}
    Total Calculated Expenses (YTD): ${formatCurrency(expenses)}
    Calculated Net Operational Profit: ${formatCurrency(netProfit)}
    Aggregated Real-time Cash Balance: ${formatCurrency(cashBalance)}
    Recent structural accounting ledger context:
    ${formatTxList}
    FINAGROW Registered Products: ${state.inventory?.length || 0} items
    FINAGROW Managed Corporate Projects: ${state.projects?.length || 0} active
    FINAGROW Managed Registered Vendors: ${state.vendors?.length || 0} corporations
  `;

  // Dynamic Prompt starter chips
  const promptStarters = language === 'id' ? [
    {
      title: "Kondisi Keuangan",
      prompt: "Bagaimana ringkasan kondisi dan kesehatan keuangan perusahaan kami saat ini?",
      icon: TrendingUp,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "Analisis Pengeluaran",
      prompt: "Bisa analisis pengeluaran terbesar kami dan beri persentase rinciannya?",
      icon: PieChart,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
      title: "Saran Kurangi Biaya",
      prompt: "Berikan 3 rekomendasi taktis untuk mengurangi pengeluaran operasional bulan ini.",
      icon: HelpCircle,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20"
    },
    {
      title: "Analisis Saldo Kas",
      prompt: "Bagaimana kondisi saldo kas dan bank utama perusahaan? Apakah aman?",
      icon: DollarSign,
      color: "text-pink-500 bg-pink-50 dark:bg-pink-950/20"
    }
  ] : [
    {
      title: "Financial Health",
      prompt: "What is the summary of our corporate financial health and current performance indicators?",
      icon: TrendingUp,
      color: "text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
    },
    {
      title: "Expense Breakdown",
      prompt: "Analyze our major business spending and explain where we can optimize our costs.",
      icon: PieChart,
      color: "text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
    },
    {
      title: "Cost Reduction Tips",
      prompt: "Suggest 3 specific actionable measures we can adopt to slash operational expenses.",
      icon: HelpCircle,
      color: "text-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
    },
    {
      title: "Cash Flow Review",
      prompt: "Review our general cash balance levels. Do we have enough liquidity for growth?",
      icon: DollarSign,
      color: "text-pink-500 bg-pink-50/50 dark:bg-pink-950/20"
    }
  ];

  const handleSend = async (textToSend: string = input) => {
    const trimmedInput = textToSend.trim();
    if (trimmedInput === '' || isLoading) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = { 
      sender: 'user', 
      text: trimmedInput, 
      timestamp: timeString 
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Clear typing input only if sending from text input
    if (textToSend === input) {
      setInput('');
    }
    
    setIsLoading(true);

    try {
      const aiResponse = await getAIFinancialAdvice(trimmedInput, financialContext);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMessage: Message = { 
        sender: 'ai', 
        text: aiResponse, 
        timestamp: aiTime 
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMsg = language === 'id' 
        ? "Maaf, terjadi kesalahan koneksi. Silakan periksa kunci API Anda dan klik kirim ulang."
        : "Sorry, I couldn't reach the intelligence engine. Please double check your API configuration and try again.";
      
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMessage: Message = { 
        sender: 'ai', 
        text: errorMsg, 
        timestamp: aiTime 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const clearChatHistory = () => {
    if (window.confirm(language === 'id' ? 'Apakah Anda yakin ingin menghapus semua riwayat obrolan ini?' : 'Are you sure you want to clear your entire chat history?')) {
      setMessages([]);
      try {
        sessionStorage.removeItem('fms_pro_chat_history_v2');
      } catch (_) {}
    }
  };

  const handleCopyToClipboard = (text: string, index: number) => {
    // Strip markdown formatting simple style for copy-paste comfort
    const cleanText = text.replace(/\*\*|#|\*|`/g, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    });
  };

  const formatMessageText = (text: string) => {
    let html = text;

    // Escape basic HTML markers
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown Bold (**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900 dark:text-white">$1</strong>');
    
    // Markdown Italics (*)
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-slate-200">$1</em>');

    // Inline Code (`)
    html = html.replace(/`(.*?)`/g, '<code class="bg-indigo-50/80 dark:bg-slate-900 font-mono px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800/80">$1</code>');

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h4 class="text-[11px] sm:text-xs font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest mt-4 mb-2">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 class="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-white mt-5 mb-2 border-b border-slate-100 dark:border-slate-800/70 pb-1">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 class="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-6 mb-3">$1</h2>');

    // Bullet points
    html = html.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li class="list-disc ml-4 pl-1 my-1 text-xs text-slate-705 dark:text-slate-300 font-medium leading-relaxed">$1</li>');

    // Number lists
    html = html.replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<li class="list-decimal ml-4 pl-1 my-1 text-xs text-slate-705 dark:text-slate-300 font-medium leading-relaxed">$2</li>');

    // Newlines
    html = html.replace(/\n/g, '<br />');
    
    // Clean list double spacing
    html = html.replace(/(<\/li>)<br \/>/g, '$1');
    html = html.replace(/<br \/>(<li)/g, '$1');

    return html;
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex justify-center items-center z-50 p-0 sm:p-4 md:p-6"
      id="ai-chatbot-backdrop"
    >
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.99 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white dark:bg-slate-900 shadow-[0_24px_50px_rgba(0,0,0,0.18)] border border-slate-100 dark:border-slate-800 w-full max-w-xl h-full sm:h-[640px] md:h-[700px] flex flex-col sm:rounded-3xl overflow-hidden relative"
      >
        
        {/* 1. HEADER WITH RICH GRADIENT ACCENT */}
        <header className="relative flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-indigo-50/50 via-slate-50/20 to-transparent dark:from-indigo-950/20 dark:via-slate-900/10">
          <div className="flex items-center gap-3">
            {/* Glowing Bot avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none">
                <Bot className="w-5.5 h-5.5 animate-pulse" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75"></span>
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-850 dark:text-white uppercase tracking-tight">
                  {t('aiFinancialAssistant')}
                </h2>
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md">
                  PRO AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-505 font-semibold flex items-center gap-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {language === 'id' ? 'Kecerdasan Korporat Aktif' : 'Enterprise Intelligence Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Clear History */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChatHistory}
                title={language === 'id' ? 'Mulai ulang obrolan' : 'Reset conversation'}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Close button */}
            <button 
              onClick={onClose} 
              title={language === 'id' ? 'Tutup' : 'Close'}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 2. CHAT FEED BLOCK */}
        <main className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
          
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              /* Welcome Greeting Hero Board */
              <motion.div 
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                key="welcome-screen"
                className="space-y-6 pt-2"
              >
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white">
                      {language === 'id' ? 'Asisten Keuangan Instan Anda' : 'Your Professional Ledger Companion'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t('aiChatbotGreeting')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-2.5 text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-md">
                      <Dot className="w-4 h-4 text-indigo-500 -ml-1.5" />
                      Revenue: {formatCurrency(revenue)}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-md">
                      <Dot className="w-4 h-4 text-emerald-500 -ml-1.5" />
                      Profit: {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>

                {/* Prompt Starter Chips Grid */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 tracking-wider uppercase pl-1">
                    {language === 'id' ? 'Saran Pertanyaan Cepat' : 'Tap Suggested Questions'}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {promptStarters.map((starter, id) => {
                      const StarterIcon = starter.icon;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSend(starter.prompt)}
                          className="flex items-start text-left p-3.5 bg-white dark:bg-slate-800 hover:bg-indigo-50/40 dark:hover:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-150 dark:hover:border-indigo-900 transition-all cursor-pointer shadow-sm group active:scale-[0.98]"
                        >
                          <div className={`p-2 rounded-lg ${starter.color} shrink-0 mr-3`}>
                            <StarterIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider group-hover:text-indigo-750 transition-colors">
                              {starter.title}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-405 font-medium leading-snug line-clamp-1">
                              {starter.prompt}
                            </span>
                          </div>
                          <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 ml-auto self-center opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Chat bubbles area */
              messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar Icon left */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-600 dark:from-slate-800 dark:to-slate-700/80 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/40 dark:border-slate-700 shadow-sm">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    )}

                    <div className="space-y-1 max-w-[84%] sm:max-w-[78%]">
                      {/* Name label */}
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-505 block px-1">
                        {isUser ? (language === 'id' ? 'Anda' : 'You') : 'FINAGROW AI'} • {msg.timestamp}
                      </span>

                      {/* Msg bubble card */}
                      <div className={`p-3.5 rounded-2xl relative group ${
                        isUser 
                          ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-100 dark:shadow-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-100 dark:border-slate-800 shadow-sm'
                      }`}>
                        
                        {/* Copy details to clipboard */}
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(msg.text, index)}
                            className="absolute top-2 right-2 p-1 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-120 dark:border-slate-800 text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                            title={language === 'id' ? 'Salin teks' : 'Copy response'}
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3 h-3 text-emerald-500 font-bold" />
                            ) : (
                              <Clipboard className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        {isUser ? (
                          <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          // Render formatted rich HTML safely
                          <div 
                            className="text-xs leading-relaxed space-y-1.5 font-medium select-text break-words pr-3" 
                            dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} 
                          />
                        )}
                      </div>
                    </div>

                    {/* User Avatar right */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/40 dark:border-slate-800 shadow-sm">
                        <User className="w-4.5 h-4.5" />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Waiting loader indicator */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
                key="loading-indicator"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4.5 h-4.5 animate-bounce" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block px-1">
                    FINAGROW AI • {language === 'id' ? 'Menganalisis...' : 'Analyzing...'}
                  </span>
                  
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-sm flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 italic">
                      {language === 'id' ? 'Menganalisis data laporan...' : 'Analyzing ledger metrics...'}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </main>

        {/* 3. FOOTER INPUT SECTION */}
        <footer className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-850 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('askFinancialQuestion')}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none placeholder-slate-400 dark:placeholder-slate-505"
              disabled={isLoading}
            />
            
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || input.trim() === ''}
              className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-900 text-white disabled:text-slate-400 dark:disabled:text-slate-700 rounded-xl transition duration-150 relative cursor-pointer shadow-sm disabled:shadow-none shrink-0"
              title={language === 'id' ? 'Kirim pesan' : 'Send suggestion'}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <p className="text-[8.5px] leading-relaxed text-slate-400 dark:text-slate-505 font-mono text-center mt-3 tracking-snug">
            {language === 'id' 
              ? 'FINAGROW AI menganalisis pembukuan untuk memberikan saran. Konfirmasi data keuangan manual Anda secara berkala.' 
              : 'FINAGROW AI synthesizes raw general journals to advise. Confirm critical balances manually for reporting.'}
          </p>
        </footer>

      </motion.div>
    </div>
  );
};

export default AIChatBot;
