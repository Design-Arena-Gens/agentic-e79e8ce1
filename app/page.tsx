import Chat from '@/components/Chat';

export default function Page() {
  return (
    <div className="container">
      <header className="header">
        <span className="badge">WebLLM</span>
        <h1 className="brand">Assistant IA ? Agentic</h1>
      </header>
      <div className="card chat">
        <Chat />
      </div>
      <div className="footer">
        <small className="kicker">100% gratuit, tourne dans votre navigateur avec WebGPU (si disponible).</small>
      </div>
    </div>
  );
}
