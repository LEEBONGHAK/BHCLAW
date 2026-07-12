import { Agent, callable, routeAgentRequest } from "agents";

export type PingPongState = {
  pingPongCount: number;
};

export class ChattingRoomAgent extends Agent<Env, PingPongState> {
  initialState = {
    pingPongCount: 0,
  };

  @callable() // 프런트엔드에서 호출할 수 있게 만들어줌
  increment() {
    this.setState({
      pingPongCount: this.state.pingPongCount + 1,
    });
  }

  @callable()
  decrement() {
    this.setState({
      pingPongCount: this.state.pingPongCount - 1,
    });
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
