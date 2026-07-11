import { DurableObject } from 'cloudflare:workers';

export class DurablePotato extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS pongs (
				id INTEGER PRIMARY KEY AUTOINCREMENET
				total INTEGER
			)
		`);

		ctx.storage.sql.exec(`
			INSERT OR IGNORE INTO pongs (id, total) VALUES (1, 0);
		`);
	}

	count = 0;
	increase() {
		this.count++;
		return `count is ${this.count}`;
	}

	ping() {
		return 'pong';
	}
}
