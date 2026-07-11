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

	increase() {
		const { total } = this.sql.exec(`SELECT total FROM pongs`).one() as { total: number };
		this.sql.exec(`UPDATE pongs SET total = ? WHERE id = ?`, total + 1, 1);
		return `count is ${total + 1}`;
	}

	ping() {
		return 'pong';
	}
}
