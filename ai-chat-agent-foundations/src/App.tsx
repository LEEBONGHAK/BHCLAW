import { useAgentChat } from "agents/chat/react";
import { useAgent } from "agents/react";
import type React from "react";

function App() {
  const agent = useAgent({ agent: "PotatoChatAgent" });
  const { messages, sendMessage, clearHistory } = useAgentChat({ agent });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get("input") as string;
    sendMessage({ text: message });
    e.currentTarget.reset();
  };

  return (
    <div>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <strong>{message.role}:</strong>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : null,
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input name="input" placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
      <button onClick={clearHistory}>clear convo</button>
    </div>
  );
}

export default App;
