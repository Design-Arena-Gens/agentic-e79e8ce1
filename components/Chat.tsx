"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatCompletionChunk, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

// Minimal types for WebLLM, tolerant to version changes
type MLEngine = Awaited<ReturnType<typeof CreateMLCEngine>>;

const SYSTEM_PROMPT = `Tu es un assistant agentique fran?ais, sp?cialis? pour aider avec l'interface d'administration Safe Guardian (base44). 
R?gles:
- R?ponds clairement, ?tape par ?tape si besoin.
- Si on demande d'inspecter une URL, tu peux sugg?rer d'utiliser la commande /fetch {url} pour r?cup?rer le contenu via le proxy.
- Si l'action n?cessite un acc?s authentifi? ? l'admin panel, explique ce qu'il faut faire et propose des solutions.
- Sois concis, mais complet et pragmatique.`;

const MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC"; // Small, fast, good default

export default function Chat() {
  const [engine, setEngine] = useState<MLEngine | null>(null);
  const [loadingModel, setLoadingModel] = useState<string>('Initialisation du mod?le?');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: 'Bonjour, je suis votre assistant IA. Comment puis-je aider ?' },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize WebLLM engine in main thread (simpler bundling)
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoadingModel('Chargement du moteur IA?');
      const engine = await CreateMLCEngine(
        MODEL,
        {
          initProgressCallback: (info) => {
            if (!info) return;
            const { progress, text } = info as any;
            setLoadingModel(progress != null ? `${text} ${(progress * 100).toFixed(0)}%` : text ?? '');
          },
        }
      );
      if (!cancelled) {
        setEngine(engine);
        setLoadingModel('Pr?t.');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || !engine) return;

    // Special command: /fetch URL -> retrieve content via serverless proxy
    if (content.startsWith('/fetch ')) {
      const url = content.slice(7).trim();
      if (!/^https?:\/\//i.test(url)) {
        setMessages((prev) => ([...prev, { role: 'assistant', content: "URL invalide. Utilisez un lien http(s)." }]));
        setInput('');
        return;
      }
      setIsSending(true);
      try {
        const res = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        const data = await res.json();
        if (data.error) {
          setMessages((prev) => ([...prev, { role: 'assistant', content: `Erreur fetch: ${data.error}` }]));
        } else {
          setMessages((prev) => ([
            ...prev,
            { role: 'user', content },
            { role: 'system', content: `Contenu r?cup?r? depuis ${url} (tronqu?):\n\n${data.text}` },
          ]));
        }
      } catch (e: any) {
        setMessages((prev) => ([...prev, { role: 'assistant', content: `?chec de r?cup?ration: ${e?.message ?? e}` }]));
      } finally {
        setIsSending(false);
        setInput('');
      }
      return;
    }

    const nextMessages: ChatCompletionMessageParam[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setIsSending(true);
    setInput('');

    try {
      const stream = await engine.chat.completions.create({
        messages: nextMessages,
        stream: true,
        // temperature kept modest for deterministic guidance
        temperature: 0.6,
      });

      let assistant = '';
      for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
        const delta = chunk?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          assistant += delta;
          setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { role: 'assistant', content: (last.content as string) + delta };
            } else {
              copy.push({ role: 'assistant', content: delta });
            }
            return copy;
          });
        }
      }
    } catch (e: any) {
      setMessages((prev) => ([...prev, { role: 'assistant', content: `Erreur g?n?ration: ${e?.message ?? e}` }]));
    } finally {
      setIsSending(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [engine, input, messages]);

  const disabled = !engine || isSending;

  return (
    <div style={{ display: 'contents' }}>
      <div className="messages">
        {messages.filter(m => m.role !== 'system').map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content as string}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="inputbar">
        <textarea
          placeholder={engine ? '?crire un message? (/fetch https://? pour r?cup?rer une page)' : loadingModel}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!engine || isSending}
        />
        <button onClick={send} disabled={disabled}>Envoyer</button>
      </div>
    </div>
  );
}
