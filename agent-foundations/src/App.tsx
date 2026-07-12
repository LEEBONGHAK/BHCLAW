import { useAgent } from "agents/react";
import type { ChattingRoomAgent, ChattingRoomState } from "../worker/index";
import { useState } from "react";

type Messages = {
  id: number;
  nickname: string;
  message: string;
  created_at: number;
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  //   const [pingPongs, setPingPongs] = useState(0);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [nickname, setNickname] = useState("");
  const [ready, setReady] = useState(false);

  const agent = useAgent<ChattingRoomAgent, ChattingRoomState>({
    agent: "ChattingRoomAgent",
    query: {
      name: nickname,
    },
    enabled: ready,
    onOpen: async () => {
      setIsConnected(true);
      const history = (await agent.stub.loadHistory()) as Messages[];
      setMessages(history);
    },
    // onStateUpdate: (state) => setPingPongs(state.pingPongCount),
    onMessage: (event) =>
      setMessages((prev) => [...prev, JSON.parse(event.data)]), // agent에서 보내온 메시지 감지
  });

  const sendMessage = () => {
    agent.send(message); // agnet를 직접 사용해 메시지를 웹소켓으로 보냄.
    setMessage("");
  };

  const onConfirm = () => {
    setReady(true);
  };

  if (!isConnected)
    return (
      <div>
        <h1>Who are you?</h1>{" "}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Type a nickname"
          autoFocus
        />
        <button onClick={onConfirm}>confirm</button>
      </div>
    );

  return (
    <div>
      <h1>Chatting Room Agent</h1>
      <h3>Online people: {agent?.state?.currentlyOnline}</h3>
      <hr />
      {/* <button onClick={() => agent.stub.decrement()}>decrement</button>
      <button onClick={() => agent.stub.increment()}>increment</button>
      <button onClick={() => agent.setState({ currentlyOnline: 100000 })}>
        override
      </button> */}

      <ul>
        {messages.map((message) => (
          <li>
            <strong>{message.nickname}</strong>: {message.message}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
