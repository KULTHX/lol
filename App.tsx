import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { Message, Language, Role } from './types';
import { UI_TEXT } from './constants';
import { createChatSession } from './services/geminiService';

import { LanguageIcon } from './components/icons/LanguageIcon';
import { SendIcon } from './components/icons/SendIcon';
import { BotIcon } from './components/icons/BotIcon';
import { UserIcon } from './components/icons/UserIcon';
import { LoadingIndicator } from './components/LoadingIndicator';


const ChatMessage: React.FC<{ message: Message, isStreaming?: boolean }> = React.memo(({ message, isStreaming = false }) => {
    const isUser = message.role === 'user';
    const textContent = message.parts.map(part => part.text).join('');

    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary' : 'bg-secondary'}`}>
                {isUser ? <UserIcon className="w-5 h-5 text-on-primary" /> : <BotIcon className="w-5 h-5 text-on-primary" />}
            </div>
            <div className={`p-4 rounded-2xl max-w-lg ${isUser ? 'bg-user-bubble text-white rounded-br-none' : 'bg-model-bubble text-on-surface rounded-bl-none'}`}>
                {isStreaming && !textContent ? <LoadingIndicator /> : <p className="whitespace-pre-wrap">{textContent}</p>}
            </div>
        </div>
    );
});

const App: React.FC = () => {
    const [language, setLanguage] = useState<Language>('ar');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatSession = useRef<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const text = UI_TEXT[language];

    useEffect(() => {
        setMessages([
            { role: 'model', parts: [{ text: text.initialMessage }] }
        ]);
    }, [text.initialMessage]);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);
    
    useEffect(() => {
        const history = messages.slice(0, messages.length -1);
        chatSession.current = createChatSession(history);
    }, []);


    const toggleLanguage = useCallback(() => {
        setLanguage(prev => (prev === 'ar' ? 'en' : 'ar'));
    }, []);

    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        const newUserMessage: Message = { role: 'user', parts: [{ text: messageText }] };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');

        // Add a placeholder for the streaming response
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

        try {
            if(!chatSession.current) {
                chatSession.current = createChatSession(
                    messages.filter(m => m.role !== 'model' || m.parts[0].text !== '') // Exclude empty model messages
                );
            }

            const stream = await chatSession.current.sendMessageStream({ message: messageText });
            
            let accumulatedText = "";
            for await (const chunk of stream) {
                accumulatedText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: accumulatedText }]};
                    return newMessages;
                });
            }
            
            // Re-create session with the latest history for next interaction
            // FIX: Explicitly typing fullHistory as Message[] to resolve TypeScript error.
            const fullHistory: Message[] = [...messages, newUserMessage, { role: 'model', parts: [{ text: accumulatedText }] }];
            chatSession.current = createChatSession(fullHistory);

        } catch (e) {
            console.error(e);
            setError(text.error);
            setMessages(prev => prev.slice(0, -1)); // Remove the empty model message
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, text.error, messages]);

    const handleSend = () => {
        sendMessage(input);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-bkg text-on-surface font-sans flex flex-col h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <header className="bg-surface shadow-md p-4 flex justify-between items-center flex-shrink-0 z-10">
                <h1 className="text-xl font-bold text-primary">{text.title}</h1>
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary hover:bg-primary-variant/30 transition-colors"
                    aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                >
                    <LanguageIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{text.language}</span>
                </button>
            </header>

            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg, index) => (
                        <ChatMessage 
                            key={index} 
                            message={msg} 
                            isStreaming={isLoading && index === messages.length - 1} 
                        />
                    ))}
                    {error && (
                         <div className="flex items-start gap-3 my-4 flex-row">
                             <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-error">
                                <BotIcon className="w-5 h-5 text-on-primary"/>
                            </div>
                            <div className="p-4 rounded-2xl max-w-lg bg-model-bubble text-error rounded-bl-none">
                                <p>{error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-surface p-4 flex-shrink-0 sticky bottom-0">
                <div className="max-w-4xl mx-auto flex items-center gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={text.placeholder}
                        className="flex-1 p-3 bg-model-bubble rounded-lg border border-transparent focus:ring-2 focus:ring-primary focus:outline-none resize-none text-on-surface placeholder-on-surface-variant transition-shadow"
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '150px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="w-11 h-11 flex items-center justify-center bg-primary text-on-primary rounded-full disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-primary-variant transition-colors flex-shrink-0"
                        aria-label={text.send}
                    >
                       <SendIcon language={language} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
