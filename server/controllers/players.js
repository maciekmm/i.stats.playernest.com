import Player from "../../shared/player";
import "co";

const NodeCache = require("node-cache");

export default class PlayersController {
	constructor(collection) {
		this.collection = collection;

		this._userCache = new NodeCache({
			stdTTL: 180,
			checkPeriod: 200,
			useClones: false
		});

		this._userCache.on("del", (k, v) => {
			co(this.save(v));
		});
	}

	* find(steamid) {
		let player = this._userCache.get(steamid);
		if (!player) {
			player = Player.fromDocument(yield this.collection.find({
				_id: steamid
			},{matches: {$slice: -1}}).next());
			if (player) {
				this._userCache.set(steamid, player);
			}
		}
		this._userCache.ttl(steamid, 180);
		return player;
	}

	* save(player) {
		let copy = {};
		Object.assign(copy, player);
		yield this.collection.update({
			_id: copy._id
		}, {
			match: copy.match,
			auth: copy.auth,
		});
	}

	* saveMatch(player) {
		let copy = {};
		Object.assign(copy, player);
		yield this.collection.update({
			_id: copy._id
		}, {
			'$push': {'matches': player.match}
		});
		player.match = null;
	}

	* stop() {
		let keys = this._userCache.keys();
		for(let key of keys) {
			let user = this._userCache.get(key);
			yield this.save(user);
		}
	}
}