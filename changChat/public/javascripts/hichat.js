
window.onload = function() {
    var chat = new Chat();
    chat.init();
};
var Chat = function() {
    this.socket = null;
};
Chat.prototype = {
    init: function() {
        var that = this;
        this.socket = io.connect();
        this.socket.on('connect', function() {
            document.getElementById('info').textContent = '请输入一个昵称';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });
        this.socket.on('nickExisted', function() {
            document.getElementById('info').textContent = '该昵称已经被采用，请选择其他昵称';
        });
        //登陆成功
        this.socket.on('loginSuccess', function() {
            document.title =  document.getElementById('nicknameInput').value + " | 畅聊室";
            document.getElementById('loginWrapper').style.display = 'none';
            document.getElementById('messageInput').focus();
        });
        //链接错误
        this.socket.on('error', function(err) {
            if (document.getElementById('loginWrapper').style.display == 'none') {
                document.getElementById('status').textContent = '无法连接';
            } else {
                document.getElementById('info').textContent = '无法连接';
            }
        });
        //系统消息
        this.socket.on('system', function(nickName, userCount, type) {
            var msg = nickName + (type == 'login' ? ' 进入聊天室' : ' 离开了聊天室');
            that._displayNewMsg('系统消息', msg, '#ababab');
            document.getElementById('status').textContent = userCount + (userCount > 1 ? '个用户' : '个用户') + ' 在线';
        });
        //新的消息
        this.socket.on('newMsg', function(user, msg, color) {
            that._displayNewMsg(user, msg, color);
        });
        this.socket.on('newImg', function(user, img, color) {
            that._displayImage(user, img, color);
        });
        document.getElementById('loginBtn').addEventListener('click', function() {
            var nickName = document.getElementById('nicknameInput').value;
            if (nickName.trim().length != 0) {
                that.socket.emit('login', nickName);
            } else {
                document.getElementById('nicknameInput').focus();
            };
        }, false);
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                };
            };
        }, false);
        document.getElementById('sendBtn').addEventListener('click', function() {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            messageInput.value = '';
            messageInput.focus();
            if (msg.trim().length != 0) {
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('我', msg, color);
                return;
            };
        }, false);
        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('我', msg, color);
            };
        }, false);
        document.getElementById('clearBtn').addEventListener('click', function() {
            document.getElementById('historyMsg').innerHTML = '';
        }, false);
        document.getElementById('sendImage').addEventListener('change', function() {
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader(),
                    color = document.getElementById('colorStyle').value;
                if (!reader) {
                    that._displayNewMsg('系统消息', '你的浏览器并不支持fileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function(e) {
                    this.value = '';
                    that.socket.emit('img', e.target.result, color);
                    that._displayImage('我', e.target.result, color);
                };
                reader.readAsDataURL(file);
            };
        }, false);
        this._initialEmoji();
        document.getElementById('emoji').addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
        }, false);
        document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if (e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            };
        });
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            };
        }, false);
    },
    _initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../images/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    },
    _displayNewMsg: function(user, msg, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8),
            msg = this._showEmoji(msg);

        var urlReg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;

        if(/^1(3|4|5|7|8)\d{9}$/.test(msg) || /^((0\d{2,3})-)(\d{7,8})(-(\d{3,}))?$/.test(msg)){//电话号码
            msg = '<a href="tel:'+msg+'">'+ msg +'</a>';
        }

        if(urlReg.test(msg)){//网站链接
            msg = '<a href="'+msg+'" target="_blank">'+ msg+'</a>';
        }

        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = '<span class="username">'+user+'</span>' + '<b class="msg-content"><span class="timespan">(' + date + '): </span>' + msg+'</b>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
        if(user=='我'){
            msgToDisplay.setAttribute("class","my-msg");
        }else if(user=='系统消息'){
            msgToDisplay.setAttribute("class","system-msg");
        }else{
            msgToDisplay.setAttribute("class","other-msg");
        }
    },
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = '<span class="username">'+user+'</span>' + '<b class="msg-content"><span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></b>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
        if(user=='我'){
            msgToDisplay.setAttribute("class","my-msg");
        } else{
            msgToDisplay.setAttribute("class","other-msg");
        }
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../images/emoji/' + emojiIndex + '.gif" />');//todo:fix this in chrome it will cause a new request for the image
            };
        };
        return result;
    }
};
