import {
  Agent,
  callable,
  routeAgentRequest,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "agents";

export type ChattingRoomState = {
  currentlyOnline: number;
};

export class ChattingRoomAgent extends Agent<Env, ChattingRoomState> {
  initialState = {
    currentlyOnline: 0,
  };

  @callable() // 프런트엔드에서 호출할 수 있게 만들어줌
  increment() {
    this.setState({
      currentlyOnline: this.state.currentlyOnline + 1,
    });
  }

  @callable()
  decrement() {
    this.setState({
      currentlyOnline: this.state.currentlyOnline - 1,
    });
  }

  // state 변경 감지 내장 메서드
  onStateChanged(
    _state: ChattingRoomState | undefined,
    _source: Connection | "server",
  ): void {
    console.log("new state", _state);
    console.log("who did it", _source);
  }

  // 연결 감지 내장 메서드
  onConnect(
    connection: Connection,
    ctx: ConnectionContext,
  ): void | Promise<void> {
    this.setState({
      currentlyOnline: this.state.currentlyOnline + 1,
    });
  }

  // 연결 종료 감지 내장 메서드
  onClose(
    connection: Connection,
    code: number,
    reason: string,
    wasClean: boolean,
  ): void | Promise<void> {
    this.setState({
      currentlyOnline: this.state.currentlyOnline - 1,
    });
  }

  // 메시지 감지 내장 메서드
  onMessage(connection: Connection, message: WSMessage): void | Promise<void> {
    console.log(message);
    connection.send("love you back"); // 서버에서 연결된 상대에게 메시지 발송
  }
}

export default {
  async fetch(request, env) {
    console.log(request.url);
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
