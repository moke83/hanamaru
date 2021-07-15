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
monoLength = str => {
	
	const rx = /^[\x00-\xFF]*$/;
	let i,l,l0;
	
	i = -1, l = str.length, l0 = 0;
	while (++i < l) l0 += rx.test(str[i]) ? 1 : 2;
	
	return l0;
	
},

PRG_PROP = JSON.parse(document.scripts["embedded-data"].dataset.props),
STREAMER = PRG_PROP.user.id,

COMMENT_WS_HEARTBEAT = 60000,

USER_URL = 'https://www.nicovideo.jp/user/',
LOCALE_OPTION = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },

xError = error => console.error(error),
toText = v => v.text(),
findUserNameRx = /<meta property="profile:username" content="(.*?)">/,

stat = {},

onCommentViewer = () => {
	
	const d = new Date();
	
	d.setTime(+PRG_PROP.program.beginTime*1000),
	console.log(`%c[篤志提供] "${PRG_PROP.program.title}" @${d.toLocaleDateString(undefined, LOCALE_OPTION)} ${d.toLocaleTimeString()}`, 'background-color:rgb(144,144,144);color:rgb(255,255,255);'),
	
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
		
		try{
			
			userList[chat.user_id] ? output(userList[chat.user_id], chat) :
				findUser(chat.user_id, chat.anonymity != 1 && userAutoSearch).then(user => output(user, chat, true)).catch(xError);
			
		} catch(error) {
			
			console.error(error);
			
		}
		
	} else if (data["thread"]) {
		
		last_res = data["thread"].last_res;
		
	}
	
},
output = (user, chat, isFirst) => {
	
	const	us = stat[user.id] ||= { logs: [] },
			name = `${user.id.padEnd(27 - (user.name === user.id ? 0 : monoLength(user.name) + 1), ' ')}${user.name === user.id ? '' : ` ${user.name}`}`;
	let	l;
	
	if (us.logs[l = us.logs.length] = chat, ++l === 1) {
		
		const lastBrowse = Array.isArray(user.browse) && user.browse[user.browse.length - 1], d = new Date();
		
		d.setTime(user.registered),
		console.info(`${user.name}さん${user.name === user.id ? '' : ` ${USER_URL}${user.id}`}`, `前回: ${lastBrowse?.date ? (Date.now() - lastBrowse.date) / 1000 / 60 / 60 / 24 | 0 : '-'}日前`, `初見: ${(Date.now() - user.registered) / 1000 / 60 / 60 / 24 | 0}日前 (${d.toLocaleDateString(undefined, LOCALE_OPTION)} ${d.toLocaleTimeString()})`);
		
	}
	
	console.log(
			`[${(''+ (chat.no ||= '')).padStart(3,'0')}:${(''+l).padStart(2,'0')}]`,
			name.length > 27 ? '...' + name.substring(name.length - 24) : name,
			chat.content
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
		(addingUsers.set(id, x = searches ? new Promise(fetched) : Promise.resolve(userList[id] || setUser(id, id))), x);
	
},
setUser = (id, name, date = Date.now()) => {
	
	const lastData = userList[id],
			user = name && { ...(lastData || { id, browse: [], registered: date }), modified: date, name };
	let i;
	
	if (user) {
		
		userList[id] = user,
		
		i = -1;
		while (
			user.browse[++i] &&
			(
				user.browse[i].programId !== PRG_PROP.program.nicoliveProgramId ||
				user.browse[i].reliveProgramId !== PRG_PROP.program.reliveProgramId
			)
		);
		user.browse[i] ||	(user.browse[i] = {
									programId: PRG_PROP.program.nicoliveProgramId,
									reliveId: PRG_PROP.program.reliveProgramId,
									date: date
								});
		
	} else {
		
		delete userList[id];
		
	}
	
	localStorage.setItem("ncv-user-list", JSON.stringify(storage)),
	
	addingUsers.delete(id),
	
	console.info(`${id === name ? '匿名' : ''}ユーザー "${name}" ${id === name ? '' : `(ID: ${id}) `}の情報を${name ? lastData ? ' 変更' : '登録' : '削除'}しました。`);
	
	return user;
	
},

regName = event => {
	
	setUser(event.detail.id, event.detail?.name);
	
},
clearStorage = event => {
	
	localStorage.removeItem('ncv-user-list'),
	
	console.log('The data in a local storage was removed successfly.');
	
},
getStorageData = event => {
	
	const data = event.detail < 2 ? JSON.parse(localStorage.getItem("ncv-user-list")) : stat;
	
	console.log(event.detail % 2 ? data : JSON.stringify(data));
	
},

name = function (id, name) {
	
	dispatchEvent(new CustomEvent('name', { detail: { id, name } }));
	
},
init = function () {
	
	dispatchEvent(new CustomEvent('init'));
	
},
getdata = function (asObject = false) {
	
	dispatchEvent(new CustomEvent('getdata', { detail: asObject ? 1 : 0 }));
	
},
getstat = function (asObject = false) {
	
	dispatchEvent(new CustomEvent('getdata', { detail: asObject ? 3 : 2 }));
	
};

addEventListener('name', regName, false, true),
addEventListener('init', clearStorage, false, true),
addEventListener('getdata', getStorageData, false, true),
addEventListener('getstat', getStorageData, false, true),

onCommentViewer(),

// コンソールで udata() を実行するとローカルストレージに蓄えられているすべてのユーザーデータ情報を、
// ustat() を実行すると実行中に一時的に蓄えられている現在の配信のチャット情報を返す。
// それぞれ引数に true, false 相当の値を指定すると、true の場合はツリー形式に表示される Object として、false の場合は JSON として表示する。
// unreg() の場合、ローカルストレージをすべて削除。reg() の場合、第一引数に id を、第二引数に名前を入力すると手動によるユーザー登録、更新を行う。
// 第二引数が未指定の場合、該当する id のユーザー情報を削除する。
// work only on Firefox; the "window." in the following line is required.
window.eval('window.reg='+name.toString()+',window.unreg='+init.toString()+',window.udata='+getdata.toString()+',window.ustat='+getstat.toString()+';');

//never TODO: /nicoad

};

addEventListener('load', hana, { once: true });
