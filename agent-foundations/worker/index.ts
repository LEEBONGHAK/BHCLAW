import {
  Agent,
  callable,
  getCurrentAgent,
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

  // 서버가 처음으로 시작될 때 호출되는 내장 메서드
  onStart(props?: Record<string, unknown> | undefined): void | Promise<void> {
    void this.sql`
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nickname TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)
	`;
  }

  //   // state 변경 감지 내장 메서드
  //   onStateChanged(
  //     _state: ChattingRoomState | undefined,
  //     _source: Connection | "server",
  //   ): void {
  //     console.log("new state", _state);
  //     console.log("who did it", _source);
  //   }

  //   // onStateChanged() 메서드와 마찬가지로 state 변경 감지를 하지만 에러를 throw하면 state 변경이 일어나지 않음
  //   validateStateChange(
  //     _nextState: ChattingRoomState,
  //     _source: Connection | "server",
  //   ): void {
  //     if (_source !== "server") throw new Error("cant do this");
  //   }

  // 특정 조건이 들어갈 경우, Readonly로 설정할 수 있는 내장 메서드
  shouldConnectionBeReadonly(
    _connection: Connection,
    _ctx: ConnectionContext,
  ): boolean {
    const url = new URL(_ctx.request.url);
    const nickname = url.searchParams.get("nickname") ?? "anon";
    return nickname.includes("read");
  }

  // 연결 감지 내장 메서드
  onConnect(
    connection: Connection,
    ctx: ConnectionContext,
  ): void | Promise<void> {
    const url = new URL(ctx.request.url);
    const nickname = url.searchParams.get("nickname") ?? "anon";

    connection.setState({
      nickname,
    });

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
  onMessage(
    connection: Connection<{ nickname: string }>,
    message: WSMessage,
  ): void | Promise<void> {
    // console.log(message);
    // connection.send("love you back"); // 서버에서 연결된 상대에게 메시지 발송
    const messageObj = {
      nickname: connection.state?.nickname,
      message: message.toString(),
      created_at: Date.now(),
    };

    if (message.toString().includes("delete")) {
      this.schedule(30, "deleteMessages");
      const allSchedules = this.listSchedules(); // 등록된 모든 스케쥴 리스트 확인
      console.log(allSchedules);
    }

    void this.sql`
		INSERT INTO messages (nickname, message, created_at) VALUES (${messageObj.nickname}, ${messageObj.message}, ${messageObj.created_at})
	`;

    // broadcast를 위한 내장 메서드. 연결된 모든 클라이언트에게 보내며, 특정 string 값을 제외하고(빼고) 보낼 수 있음.
    // this.broadcast(JSON.stringify(messageObj), [connection.id]);
    this.broadcast(JSON.stringify(messageObj));
  }

  deleteMessages() {
    console.log("messages are deleted");
    void this.sql`DELETE FROM messages`;
  }

  @callable()
  loadHistory() {
    const { connection } = getCurrentAgent<ChattingRoomAgent>(); // getCurrentAgent : 현재 들어와 있는 agent에 접근할 수 있게 해줌
    // this.setConnectionReadonly(connection, true);	// Read Only Connections 설정 (true: readonly) / readonly connection은 state를 수정 못함. state 수정과 관련된 callable 메서드를 포함해서
    console.log(connection?.state, "loaded history");
    return this.sql`SELECT * FROM messages ORDER BY created_at ASC LIMIT 100`;
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
