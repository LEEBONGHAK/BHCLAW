import { useAgent } from "agents/react";
import type { ChattingRoomAgent, PingPongState } from "../worker/index";
import { useState } from "react";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  //   const [pingPongs, setPingPongs] = useState(0);
  const agent = useAgent<ChattingRoomAgent, PingPongState>({
    agent: "ChattingRoomAgent",
    onOpen: () => setIsConnected(true),
    // onStateUpdate: (state) => setPingPongs(state.pingPongCount),
  });

  if (!isConnected) return <h1>connecting...</h1>;
  return (
    <div>
      <h1>Ping Pong Agent</h1>
      <h3>Ping Pong Count: {agent.state?.pingPongCount}</h3>
      <hr />
      <button onClick={() => agent.stub.decrement()}>decrement</button>
      <button onClick={() => agent.stub.increment()}>increment</button>
    </div>
  );
}

export default App;
