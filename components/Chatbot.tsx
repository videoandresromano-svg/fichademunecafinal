import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { ChatMessage } from '../types';
import { SparklesIcon } from './IconComponents';

interface ChatbotProps {
    onClose: () => void;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center gap-1">
        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
    </div>
);

const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = () => {
            try {
                if (!import.meta.env.VITE_GEMINI_API_KEY) {
                    throw new Error("API key not found.");
                }
                const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `Eres un asistente clínico experto en kinesiología y patologías de muñeca. Responde de forma concisa y profesional. Puedes ayudar con preguntas sobre terminología, posibles diagnósticos diferenciales, guías de tratamiento generales o cómo usar esta aplicación. Siempre aclara que no reemplazas el juicio clínico profesional.

Utiliza la siguiente información como base de conocimiento sobre medicamentos y sus efectos adversos:

---

### INFORMACIÓN DETALLADA SOBRE MEDICAMENTOS ###

#### 1. Fármacos que Afectan la Salud Ósea (Riesgo de Osteoporosis/Fracturas)
- **Corticosteroides:** Causa más común de osteoporosis inducida (ej. Prednisona).
- **Antiepilépticos:** Fenitoína, Fenobarbital.
- **IBP (uso prolongado):** Omeprazol.
- **Hormonales:** Exceso de Levotiroxina, Inhibidores de aromatasa (Anastrozol).
- **Inmunosupresores:** Metotrexato, Ciclosporina.

#### 2. Diabetes, Inflamación Sistémica y Fármacos Relacionados
La diabetes es un factor de riesgo para **Síndrome del Túnel Carpiano**, **mano rígida (Cheiroarthropatía)**, **Dupuytren** y **Tenosinovitis**. La inflamación sistémica asociada puede agravar tendinitis.

- **Metformina:** Su presencia confirma el diagnóstico de diabetes tipo 2, que es el factor de riesgo, más que el fármaco en sí.
- **Inhibidores de la DPP-4 (Sitagliptina, etc.):** Pueden causar **artralgia severa** (dolor articular).
- **Tiazolidinedionas (Pioglitazona):** Aumentan el **riesgo de fracturas** en extremidades, especialmente en mujeres.
- **Insulina:** Indica diabetes avanzada. Riesgo indirecto de **caídas por hipoglucemia**, que pueden causar fracturas de muñeca.

#### 3. Fármacos que pueden Inducir el Síndrome del Túnel Carpiano (STC)
- **Inhibidores de la aromatasa:** Anastrozol, Letrozol.
- **Bisfosfonatos.**
- **Anticoagulantes orales:** Apixabán (riesgo de compresión por hematoma).

#### 4. Fármacos que pueden Causar Tendinitis
- **Fluoroquinolonas (antibióticos):** Ciprofloxacino, Levofloxacino.
- **Estatinas (raro):** Atorvastatina.

#### 5. Fármacos que pueden Causar Dolor Articular (Artralgia)
- **Inhibidores de la aromatasa, Estatinas, Bisfosfonatos.**
- **FAMEs y Biológicos:** Metotrexato, Infliximab, Etanercept.
---

Al responder, integra esta información cuando sea relevante para la pregunta del usuario.
`,
                    },
                });
                setMessages([
                    { sender: 'bot', text: '¡Hola! Soy tu asistente clínico. ¿En qué puedo ayudarte hoy?' }
                ]);
            } catch (error) {
                 console.error("Failed to initialize chat:", error);
                 setMessages([{ sender: 'bot', text: 'Error al iniciar el asistente. Verifique la configuración de la API.' }]);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatRef.current || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: input });
            
            let botResponse = '';
            setMessages(prev => [...prev, { sender: 'bot', text: '' }]);

            for await (const chunk of stream) {
                botResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.sender === 'bot') {
                        lastMessage.text = botResponse;
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const newMessages = prev.filter(m => !(m.sender === 'bot' && m.text === ''));
                return [...newMessages, { sender: 'bot', text: 'Lo siento, ocurrió un error. Inténtalo de nuevo.' }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-[calc(100vw-3rem)] max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200/80 flex flex-col transition-all duration-300 animate-fadeIn" style={{ height: '65vh', maxHeight: '500px' }}>
            <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <img src="https://i.imgur.com/7nzSia0.png" alt="Asistente Icon" className="w-8 h-8 rounded-md"/>
                    <h2 className="text-lg font-semibold text-slate-800">Asistente Clínico</h2>
                </div>
            </header>
            <div 
                className="flex-1 p-4 overflow-y-auto space-y-4 bg-center bg-no-repeat"
                style={{
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url('https://i.imgur.com/7nzSia0.png')`,
                    backgroundSize: '60%',
                }}
            >
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-slate-100 text-slate-800 rounded-bl-lg'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-2xl bg-slate-100 rounded-bl-lg">
                            <TypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
