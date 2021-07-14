const hana = event => {

let last_res = 0;
let onSpeak = false;
let userAutoSearch = true;
let storage;
let userList = {};
let addingUsers = new Map();
let threadData;

const

hi = console.log.bind(console, 'hi'),

PRG_PROP = JSON.parse(document.scripts["embedded-data"].dataset.props),
STREAMER = PRG_PROP.user.id,

COMMENT_WS_HEARTBEAT = 60000,

USER_URL = 'https://www.nicovideo.jp/user/',
LOCALE_OPTION = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },

toText = v => v.text(),
findUserNameRx = /<meta property="profile:username" content="(.*?)">/,

stat = {},

onCommentViewer = () => {
	
	const d = new Date();
	
	d.setTime(+PRG_PROP.program.beginTime*1000),
	console.log(`[篤志提供] "${PRG_PROP.program.title}" @${d.toLocaleDateString(undefined, LOCALE_OPTION)} ${d.toLocaleTimeString()}`),
	
	(storage = JSON.parse(localStorage.getItem("ncv-user-list"))) ||
		localStorage.setItem("ncv-user-list", JSON.stringify(storage = {})),
	
	userList = storage[STREAMER] ||= {},
	
	new WebSocket(PRG_PROP.site.relive.webSocketUrl).addEventListener('open', opendWebSocket, { once: true });
	
},
opendWebSocket = event => {
	
	event.target.send(`{"type":"startWatching","data":{"stream":{"latency":"low"},"room":{"protocol":"webSocket"}}}`),
	
	event.target.addEventListener('message', openCommentWS);
	
},
openCommentWS = event => {
	
	const data = JSON.parse(event.data);
	
	data.type === "room" && (
			event.target.removeEventListener('message', openCommentWS),
			new WebSocket((threadData = data.data).messageServer.uri).addEventListener('open', opendCommentWS, { once: true })
		);
	
},
opendCommentWS = event => {
	
	event.target.onmessage = onCommentReceived,
	
	event.target.send(`[{"thread":{"thread":"${threadData.threadId}","version":"20061206","res_from":-150}}]`),
	
	setInterval( ()=>event.target.send(""), COMMENT_WS_HEARTBEAT );
	
},
onCommentReceived = event => {
	
	const data = JSON.parse(event.data), chat = data["chat"];
	
	if (chat) {
		
		userList[chat.user_id] ? output(userList[chat.user_id], chat) :
			findUser(chat.user_id, chat.anonymity != 1 && userAutoSearch).then(user => output(user, chat));
		
	} else if (data["thread"]) {
		
		last_res = data["thread"].last_res;
		
	}
	
},
output = (user, chat) => {
	
	const us = stat[user.id] ||= { logs: [] };
	let l;
	
	if ((us.logs[l = us.logs.length] = chat).length, ++l === 1) {
		
		const d = new Date();
		
		d.setTime(user.created),
		console.info(`${user.name}さんの初見`, d.toLocaleDateString(undefined, LOCALE_OPTION), d.toLocaleTimeString());
		
	}
	
	console.log(
			`[${(''+ (chat.no ||= '')).padStart(3,'0')}:${(''+l).padStart(2,'0')}]`,
			chat.content,
			user.name === user.id ? '184' : `@${user.name}`,
			user.id
		);
	
	if (onSpeak && typeof chat.no === 'number' && last_res <= chat.no) {
		
		let uttr = new SpeechSynthesisUtterance(comment);
		
		//高さ
		uttr.pitch = 1;
		//速度
		uttr.rate = 1;
		//音量
		uttr.volume = 0.5;
		//言語
		uttr.lang = 'ja-JP';
		
		speechSynthesis.speak(uttr);
		
	}
	
},

findUser = (id, searches) => {
	
	const	fetched = rs => fetch(`${USER_URL}${id}`).then(toText).then(v => rs(setUser(id, (v = findUserNameRx.exec(v)) ? v[1] : id))).catch(error => (console.error(error, id), rs(userList[id] || setUser(id, id))));
	let x;
	
	return addingUsers.get(id) ||
		(addingUsers.set(id, searches ? (x = new Promise(fetched)) : Promise.resolve(userList[id] || setUser(id, id))), x);
	
},
setUser = (id, name, date = Date.now()) => {
	
	const lastData = userList[id],
			user = name && { ...(lastData || { id, created: date }), modified: date, name };
	
	user ? (userList[id] = user) : delete userList[id],
	
	localStorage.setItem("ncv-user-list", JSON.stringify(storage)),
	
	addingUsers.delete(id),
	
	console.info(`ユーザー "${name}" (ID: ${id}) の情報を${name ? lastData ? ' 変更' : '登録' : '削除'}しました。`);
	
	return user;
	
},

regName = event => {
	
	setUser(event.detail.id, event.detail?.name);
	
},
clearStorage = event => {
	
	localStorage.removeItem('ncv-user-list'),
	
	console.log('The data in a local storage was removed successfly.');
	
},

name = function (id, name) {
	
	dispatchEvent(new CustomEvent('name', { detail: { id, name } }));
	
},
init = function () {
	
	dispatchEvent(new CustomEvent('init'));
	
};

addEventListener('name', regName, false, true),
addEventListener('init', clearStorage, false, true),

onCommentViewer(),

// work only on Firefox; to specify "window." must be required at this expression.
window.eval('window.reg='+name.toString()+',window.unreg='+init.toString()+';');

//TODO: /nicoad

};

addEventListener('load', hana, { once: true });
