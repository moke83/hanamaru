let last_res = 0;
let onSpeak = false;
let userAutoSearch = false;
let userList = {};
let addingUserList = {};

const onCommentViewer = () => {

    userList = JSON.parse(localStorage.getItem("ncv-user-list"));
    
    if( !userList ) {
        localStorage.setItem("ncv-user-list",JSON.stringify({}));
        userList = {};
    }

    new WebSocket((j = JSON.parse.bind())(document.scripts["embedded-data"].dataset.props).site.relive.webSocketUrl).onopen = e => {
        e.target.send(`{"type":"startWatching","data":{"stream":{"latency":"low"},"room":{"protocol":"webSocket"}}}`)
        e.target.onmessage = (e, k = j(e.data)) =>
            k.type == "room" ? new WebSocket((i = k.data).messageServer.uri).onopen = e => {
                e.target.send(`[{"thread":{"thread":"${i.threadId}","version":"20061206","res_from":-150}}]`)
                e.target.onmessage = onCommentReceived
                setInterval( ()=>e.target.send(""), 60000 )
            } : _
    }

}

const onCommentReceived = e => {
    let data = JSON.parse(e.data);
    if (data["chat"]) {
        let chat = data?.chat;
        let comment = chat?.content;
        let userId = chat?.user_id;
        let anonymity = (chat?.anonymity??0) != 1;
        let userName = null;
        if ( userList[userId] ) {
            userName = userList[userId];
        }
        else if( anonymity && userAutoSearch ){
            findUser( userId );
        }
        console.log( `${chat?.no??""}`,  comment, `[${userName ? userName : userId}]`);
        if (onSpeak && last_res <= chat.no) {
            let uttr = new SpeechSynthesisUtterance(comment);
            //高さ
            uttr.pitch = 1.2;
            //速度
            uttr.rate = 1.5;
            //音量
            uttr.volume = 0.5;
            speechSynthesis.speak(uttr);
        }
    }
    else if (data["thread"]) {
        last_res = data["thread"].last_res;
    }
}

window.addUserName = (id, name) => {
    userList[id] = name;
    localStorage.setItem("ncv-user-list", JSON.stringify(userList));
}

window.findUser = id => {
    if( !addingUserList[id] ) {
        addingUserList[id] = 1;
        fetch(`https://www.nicovideo.jp/user/${id}`).then(v=>v.text()).then(v=>{
            let name = v.match(/<meta property="profile:username" content="(.*?)">/)[1];
            delete addingUserList[id];
            console.log(`/info ${name}さんの名前を登録しました。`);
            addUserName( id, name );
        })
    }
}

onCommentViewer();
