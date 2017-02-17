// room.js
// var util = require('../../utils/util.js')
var WxParse = require('../../wxParse/wxParse.js');
var roomConfig = {
  wsurl: 'wss://yourdomain.com/ws',
  nickname: Math.random().toString(36).substr(2, 4),
  channel: 'wx',
}
var mynickname = roomConfig.nickname;
var online = [];
var initMsg = '<i class="msg info">☼ Welcome ~ </i>\n';
var extraMsgs = [];
var socketOpen = false;
var socketMsgQueue = [{cmd: 'join', channel: roomConfig.channel, nick: roomConfig.nickname }];
var parseHtml = function (text) {
  //html = html.replace(/<a.+?href="(.+?)".*?>(.+?)<\/a>/ig,'[url=$1]$2[/url]');
  text = text.replace(/(https?:\/\/[^\s]+)/g, function (link) {
    return '<a href="' + link + '">网址</a> \n';
  });
  return text;
};

Page({
  data: {
    scrollTop: 1000000000000,
    boxHeihgt: 400,
    inputValue: '',
    messages: ''
  },
  bindKeyInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },
  sendBtn: function () {
    this.sendMsg(this.data.inputValue)
    this.setData({
      inputValue: ''
    });
  },
  sendMsg: function (msg) {
    wx.sendSocketMessage({
      data: JSON.stringify({cmd: 'chat', text: msg})
    });
  },
  getMsg: function(data) {

    var args = JSON.parse(data);
    //Chat
    if (args.cmd === 'chat') {
      if (args.trip == undefined) {
        args.trip = "(No trip)";
      }
      var isMe = '';
      if (args.nick == mynickname.split("#")[0]) {
        isMe = ' me';
      }
      // extraMsgs.push("\n" + "\033[F" + args.trip + " " + args.nick + ": " + args.text);
      extraMsgs.push('<div class="msg chat'+isMe+'">◦<em class="nick">'  + args.nick + ":</em> " + args.text +'</div>');
      console.log(args);
    }

    //Messages Process
    switch (args.cmd) {
      case 'warn':
        if (args.text === "Nickname taken") {
          extraMsgs.push('<div class="msg info">'+ args.text + '</div>');
          return false;
        }
        console.log("Your IP is being rate-limited or blocked.");
        break;
      case 'onlineSet':
        for (var i = 0; i < args.nicks.length; i++) {
            online.push(args.nicks[i]);
        }
        extraMsgs.push("\n" + '<div class="msg info">当前在线（'+online.length+'）: ' + online + '</div>');
        break;
      case 'onlineAdd':
        online.push(args.nick);
        extraMsgs.push('<div class="msg info"><em class="nick">'+ args.nick +  '</em> 进入了大厅</div>');
        break;
      case 'onlineRemove':
        var x = online.indexOf(args.nick);
        if (x != -1) {
            online.splice(x, 1);
            extraMsgs.push('<div class="msg info"><em class="nick">'+ args.nick + '</em> 离开了大厅</div>');
        }
        break
      default:
    }

    this.setData({
      messages: initMsg + extraMsgs.join('\n')
    });

    this.setData({scrollTop:this.data.scrollTop+100});

    WxParse.wxParse('messages', 'html', parseHtml(this.data.messages), this, 5);

  },
  onLoad: function () {
    var that = this;

    wx.getSystemInfo({
      success: function(res) {
        that.setData({
          boxHeihgt: res.windowHeight-90
        })
      }
    });
    wx.connectSocket({
      url: roomConfig.wsurl
    });

    wx.onSocketOpen(function(res) {
      console.log('WebSocket连接已打开！')
      socketOpen = true
      for (var i = 0; i < socketMsgQueue.length; i++){
         sendSocketMessage(socketMsgQueue[i])
      }
      socketMsgQueue = []
    });

    function sendSocketMessage(msg) {
      if (socketOpen) {
        wx.sendSocketMessage({
          data: JSON.stringify(msg)
        })
      } else {
         socketMsgQueue.push(msg)
      }
    };

    wx.onSocketMessage(function(res) {
      // console.log('收到服务器内容：' + res.data)
      that.getMsg(res.data)
    });

    setTimeout(function() {
      wx.sendSocketMessage({
        data: JSON.stringify({cmd: 'ping'})
      });
      console.log(101);
    }, 50000);

  }
})
