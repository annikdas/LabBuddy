/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Stethoscope, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface AnalysisResult {
  explanation: string;
  questions: string[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const model = "gemini-3-flash-preview";
      const prompt = `
        You are "LabBuddy," a friendly medical assistant. 
        Analyze this medical report image and provide:
        1. A clear, empathetic explanation of the results in plain English (no complex jargon).
        2. A list of 3-5 specific, helpful questions the user should ask their doctor based on these results.
        
        Format your response as a JSON object with the following structure:
        {
          "explanation": "Markdown formatted explanation...",
          "questions": ["Question 1", "Question 2", ...]
        }
        
        Important: 
        - Be supportive and calming.
        - Remind the user that you are an AI and they must consult their doctor for a professional diagnosis.
        - If the image is not a medical report, politely inform the user.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data.split(',')[1]
              }
            }
          ]
        }],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text) as AnalysisResult;
        setResult(parsed);
      } else {
        throw new Error("No response from AI");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("I couldn't analyze this image. Please make sure it's a clear photo of a medical report.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const Modal = ({ title, isOpen, onClose, children }: { title: string, isOpen: boolean, onClose: () => void, children: React.ReactNode }) => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <AlertCircle className="w-6 h-6 text-slate-400 rotate-45" />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Modals */}
      <Modal title="How LabBuddy Works" isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)}>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">1</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Upload Your Report</h4>
              <p className="text-slate-600">Take a clear photo of your lab results or upload a digital copy. We support most common image formats.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">2</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">AI Analysis</h4>
              <p className="text-slate-600">Our advanced AI scans the report, identifying medical markers, ranges, and terminology.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">3</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Plain English Summary</h4>
              <p className="text-slate-600">We translate the "doctor-speak" into simple, everyday language so you can understand what's happening in your body.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600">4</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Doctor Discussion Guide</h4>
              <p className="text-slate-600">We provide a list of tailored questions to help you have a more productive conversation with your healthcare provider.</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal title="Privacy & Security" isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
            <CheckCircle2 className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 font-medium">Your privacy is our top priority. We treat your medical data with the same care we'd want for our own families.</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800">Data Processing</h4>
            <p className="text-slate-600 text-sm leading-relaxed">Images are processed in real-time to generate your summary. We do not store your medical reports on our servers permanently. Once the analysis is complete and your session ends, the data is cleared.</p>
            
            <h4 className="font-bold text-slate-800">No Third-Party Sharing</h4>
            <p className="text-slate-600 text-sm leading-relaxed">We never sell or share your personal medical information with insurance companies, advertisers, or any other third parties.</p>
            
            <h4 className="font-bold text-slate-800">AI Limitations</h4>
            <p className="text-slate-600 text-sm leading-relaxed italic">Important: LabBuddy is an educational tool. While we use advanced AI, it is not a substitute for professional medical advice. Your data is used solely to help you understand your reports better.</p>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">LabBuddy</h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span onClick={() => setShowHowItWorks(true)} className="hover:text-blue-600 cursor-pointer transition-colors">How it works</span>
            <span onClick={() => setShowPrivacy(true)} className="hover:text-blue-600 cursor-pointer transition-colors">Privacy</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        {!image && (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Understand your lab results <br />
                <span className="text-blue-600">in plain English.</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload a photo of your medical report and let LabBuddy explain what it means for you. Friendly, simple, and supportive.
              </p>
            </motion.div>

            {/* Upload Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-center mb-16"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-blue-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Drop your report here</h3>
              <p className="text-slate-500 mb-6">or click to browse from your device</p>
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Secure</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Private</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fast</span>
              </div>
            </motion.div>

            {/* Common Questions Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Stethoscope className="text-white w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">General Questions for Your Doctor</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "What do these results mean for my overall health?",
                  "Are any of these values cause for immediate concern?",
                  "How do these results compare to my previous tests?",
                  "What lifestyle changes could help improve these numbers?",
                  "Do I need any follow-up tests or specialist referrals?",
                  "Are there any medications I should start or stop?"
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                      <ChevronRight className="w-3 h-3 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">{q}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Analysis State */}
        {image && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <button 
                onClick={reset}
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
              >
                ← Upload another report
              </button>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing your report...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Image Preview */}
              <div className="lg:col-span-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <img 
                    src={image} 
                    alt="Medical Report" 
                    className="w-full rounded-lg object-cover max-h-[400px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="w-3 h-3" />
                    <span>Report uploaded successfully</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                  {isAnalyzing ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center text-center"
                    >
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <h3 className="text-xl font-bold mb-2">Reading your results...</h3>
                      <p className="text-slate-500">Our AI is translating medical terms into plain English. This usually takes a few seconds.</p>
                    </motion.div>
                  ) : error ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center"
                    >
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-red-900 mb-2">Oops! Something went wrong</h3>
                      <p className="text-red-700 mb-6">{error}</p>
                      <button 
                        onClick={reset}
                        className="bg-red-600 text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  ) : result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      {/* Explanation Card */}
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Info className="text-blue-600 w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800">Your Report Summary</h3>
                        </div>
                        <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-800 prose-strong:text-blue-700">
                          <ReactMarkdown>{result.explanation}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Questions Card */}
                      <div className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="bg-white/20 p-2 rounded-lg">
                            <Stethoscope className="text-white w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold">Questions to ask your doctor</h3>
                        </div>
                        <ul className="space-y-4">
                          {result.questions.map((q, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3 bg-white/10 p-4 rounded-xl border border-white/10 hover:bg-white/20 transition-colors cursor-default"
                            >
                              <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-200" />
                              <span className="font-medium">{q}</span>
                            </motion.li>
                          ))}
                        </ul>
                        <p className="mt-8 text-xs text-blue-100 italic opacity-80">
                          Note: These questions are generated by AI to help you start a conversation with your healthcare provider.
                        </p>
                      </div>

                      {/* Disclaimer */}
                      <div className="bg-slate-100 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 leading-normal">
                          <strong>Medical Disclaimer:</strong> LabBuddy is an AI-powered educational tool and does not provide medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            <span className="font-semibold text-slate-600">LabBuddy</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
