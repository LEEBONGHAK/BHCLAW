import { DurableObject } from 'cloudflare:workers';

export class DurablePotato extends DurableObject<Env> {
	sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS pongs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				total INTEGER
			)
		`);

		this.sql.exec(`
			INSERT OR IGNORE INTO pongs (id, total) VALUES (1, 0);
		`);
	}

	fetch(request: Request): Response | Promise<Response> {
		const url = new URL(request.url);
		const nickname = url.searchParams.get('nickname') ?? 'anon';
		const webSocketPair = new WebSocketPair(); // 양방향 연결 제공(client-server). 전화처럼

		const [client, server] = Object.values(webSocketPair);
		this.ctx.acceptWebSocket(server); // context에 websocket 적용, websocket server의 데이터를 durable objects에 저장

		server.serializeAttachment({ nickname }); // 웹소켓 연결 안에 아주 작은 데이터를 넣을 수 있음, json처럼 직렬화 가능한 데이터만 가능함.

		return new Response(null, { status: 101, webSocket: client }); // 101: 웹 소켄 정상 연결, client를 전달해줌
	}

	// 웹소켓과 연결된 모든 사용자에게 메시지를 전달하는 boardcast 메서드.
	boardcast(message: string, exclude?: WebSocket) {
		for (const socket of this.ctx.getWebSockets()) {
			if (socket !== exclude) {
				socket.send(message);
			}
		}
	}

	// 웹소켓 메시지가 올 때 알림을 받을 수 있는 메서드(durable objects 내장 메서드). 메시지가 오면 해당 함수가 실행됨.
	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
		const { nickname } = ws.deserializeAttachment() as { nickname: string };
		this.boardcast(`${nickname} said : ${message}`, ws);

		ws.send(`hello ${nickname}`); // 웹소켓 응답 메시지
	}

	// 웹소켓을 누가 끊었는지 알 수 있는 메서드.(durable objects 내장 메서드)
	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		const { nickname } = ws.deserializeAttachment();
		this.boardcast(`${nickname} has left the building`);
	}

	async increase() {
		const { total } = this.sql.exec(`UPDATE pongs SET total = total + 1 WHERE id = 1 RETURNING total;`).one() as { total: number };
		if (total >= 30) {
			const currentAlarm = await this.ctx.storage.getAlarm();
			console.log('alarm', currentAlarm);
			if (currentAlarm === null) {
				this.ctx.storage.setAlarm(Date.now() + 10_000);
			}
		}
		return `count is ${total}`;
	}

	alarm() {
		console.log('alarm triggered');
		this.sql.exec(`UPDATE pongs SET total = 0 WHERE id = 1`);
		// search in your 'alarms' table and find the next alarm
		// schedule the next alarm
	}

	ping() {
		return 'pong';
	}
}
