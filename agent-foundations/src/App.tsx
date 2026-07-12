import { useAgent } from "agents/react";
import type { ChattingRoomAgent, ChattingRoomState } from "../worker/index";
import { useState } from "react";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  //   const [pingPongs, setPingPongs] = useState(0);
  const [message, setMessage] = useState("");
  const agent = useAgent<ChattingRoomAgent, ChattingRoomState>({
    agent: "ChattingRoomAgent",
    onOpen: () => setIsConnected(true),
    // onStateUpdate: (state) => setPingPongs(state.pingPongCount),
    onMessage: (event) => console.log(event), // agent에서 보내온 메시지 감지
  });

  const sendMessage = () => {
    agent.send(message); // agnet를 직접 사용해 메시지를 웹소켓으로 보냄.
    setMessage("");
  };

  if (!isConnected) return <h1>connecting...</h1>;

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
