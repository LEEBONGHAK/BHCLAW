import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentEmail, routeAgentRequest } from "agents";
import { createAddressBasedEmailResolver, type AgentEmail } from "agents/email";
import PostalMime from "postal-mime";

export class EmailAgent extends AIChatAgent<Env> {
  // onStart(props?: Record<string, unknown> | undefined): void | Promise<void> {
  //   // 실제로 agent에 email을 보내고 싶다면 agent를 배포해야하며, 도메인도 사야함..
  //   this.env.EMAIL.send({});
  // }

  async onEmail(email: AgentEmail) {
    const raw = await email.getRaw();
    // console.log(raw);
    // console.log();
    const parsed = await PostalMime.parse(raw);
    // console.log(parsed);
    // console.log();
    console.log(parsed.to, parsed.from, parsed.text);
  }
}

export default {
  // http request를 받을 때 호출됨.
  fetch(request, env) {
    console.log(request.url);
    return (
      routeAgentRequest(request, env) ?? new Response(null, { status: 404 })
    );
  },
  // email을 받을 때 호출됨.
  async email(message, env, ctx) {
    console.log(message.raw);
    console.log(message.headers);
    await routeAgentEmail(message, env, {
      // resolver : 3개의 종류가 있음. 어떤 에이전트 클래스를 어떤 이름으로 쓸지 결정하는 함수
      // - createAddressBasedEmailResolver : 이메일을 보내면 에이전트는 EmailAgent가 되어 라우팅됨. (Agent ID: 이메일 @ 앞 아이디 (e.g: support@example.com -> support))
      // - createSecureReplyEmailResolver : 인증이나 보안 같은게 필요한 이메일을 위한 것
      // - createCatchAllEmailResolver : 다시 듣는 resolver. 모든 걸 같은 에이전트로 보내고 싶을 때 사용됨.
      resolver: createAddressBasedEmailResolver("EmailAgent"),
    });
  },
} satisfies ExportedHandler<Env>;
