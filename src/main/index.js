import { app, BrowserWindow } from 'electron'

if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})


const interfaces = require('os').networkInterfaces(); // 在开发环境中获取局域网中的本机iP地址
let IPAddress = '';
for(var devName in interfaces){  
  var iface = interfaces[devName];  
  for(var i=0;i<iface.length;i++){  
        var alias = iface[i];  
        if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){  
          IPAddress = alias.address;  
        }  
  }  
}

const ipc = require('electron').ipcMain
let me;//me代表自己（ipc）
let connections = [];//存放连接用户
const dgram = require('dgram'),
      server = dgram.createSocket("udp4"),
      multicastAddr = '224.100.100.100';
      server.on("error",err=>{
        console.log('socket已关闭');
    })
    
server.on('error',(err)=>{
    console.log(err);
});

server.on("listening",()=>{
    console.log("socket正在监听中.....");
    server.addMembership(multicastAddr);
    server.setMulticastTTL(128);
})

server.on('message',(msg,rinfo)=>{
    // if(JSON.parse(msg).status == 'access'){
    if(JSON.parse(msg).status == 'access' && rinfo.address !== IPAddress){
      if(connections.indexOf(rinfo.address + ':' + rinfo.port) == -1){
        connections.push(rinfo.address + ':' + rinfo.port)
      }
      me.send('notice-vice', {
        status: 'returnConnections',//返回列表
        msg: '返回列表',
        connections: connections
      })
    // }else if(JSON.parse(msg).status == 'getConnections'){
    }else if(JSON.parse(msg).status == 'getConnections' && rinfo.address !== IPAddress){
      server.send(JSON.stringify({
        status: 'access'
      }),'8066',rinfo.address);
    }else if(JSON.parse(msg).status == 'requestUser'){
      me.send('notice-vice', {
        status: 'responseDraw',//响应请求
        msg: '响应请求',
        otherAddress: rinfo.address
      })
    }else if(JSON.parse(msg).status == 'responseUser'){
      if(JSON.parse(msg).agree == 'yes'){
        me.send('notice-vice', {
          status: 'responseUser',
          agree: 'yes',
          otherAddress: rinfo.address
        })
      }else{
        me.send('notice-vice', {
          status: 'responseUser',
          agree: 'no',
          otherAddress: rinfo.address
        })
      }
    }else if(JSON.parse(msg).status == 'otherStart'){
      me.send('notice-vice', {
        status: 'otherStart',
        e: JSON.parse(msg).e
      })
    }else if(JSON.parse(msg).status == 'otherDrawing'){
      me.send('notice-vice', {
        status: 'otherDrawing',
        e: JSON.parse(msg).e
      })
    }else if(JSON.parse(msg).status == 'otherStop'){
      me.send('notice-vice', {
        status: 'otherStop'
      })
    }
    // else if(JSON.parse(msg).status == 'start'){
    //   console.log('start')
      
    //   me.send('notice-vice', {
    //     status: 'start',
    //     msg: 'start',
    //     e: JSON.parse(msg).e
    //   })
    // }else if(JSON.parse(msg).status == 'stop'){
    //   console.log('stop')
      
    //   me.send('notice-vice', {
    //     status: 'stop',
    //     msg: 'stop'
    //   })
    // }else if(JSON.parse(msg).status == 'putPoint'){
    //   console.log('putPoint')
      
    //   me.send('notice-vice', {
    //     status: 'putPoint',
    //     msg: 'putPoint',
    //     e: JSON.parse(msg).e
    //   })
    // }
})

server.bind('8066')

ipc.on('notice-main',(event, arg)=>{
  if(arg.status == 'connect'){
    me = event.sender
    server.send(JSON.stringify({
      status: 'access'
    }),'8066',multicastAddr)
  }else if(arg.status == 'getConnections'){
    server.send(JSON.stringify({
      status: 'getConnections'
    }),'8066',multicastAddr)
    me.send('notice-vice', {
      status: 'getConnections',//正在获取列表...
      msg: '正在获取列表...'
    })
  }else if(arg.status == 'requestUser'){
    server.send(JSON.stringify({
      status: 'requestUser'
    }),'8066',arg.otherAddress)
  }else if(arg.status == 'agreeUser'){
    if(arg.agree == 'yes'){
      server.send(JSON.stringify({
        status: 'responseUser',
        agree: 'yes'
      }),'8066',arg.otherAddress)
      
    }else{
      server.send(JSON.stringify({
        status: 'responseUser',
        agree: 'no'
      }),'8066',arg.otherAddress)
    }
  }else if(arg.status == 'sendStart'){
    server.send(JSON.stringify({
      status: 'otherStart',
      e: arg.e
    }),'8066',arg.otherAddress)
  }else if(arg.status == 'sendDrawing'){
    server.send(JSON.stringify({
      status: 'otherDrawing',
      e: arg.e
    }),'8066',arg.otherAddress)
  }else if(arg.status == 'sendStop'){
    server.send(JSON.stringify({
      status: 'otherStop'
    }),'8066',arg.otherAddress)
  }
  // else if(arg.status == 'start'){
  //   server.send(JSON.stringify({
  //     status: 'start',
  //     msg: 'start',
  //     e: arg.e
  //   }),'8066',arg.otherAddress);
  // }else if(arg.status == 'stop'){
  //   server.send(JSON.stringify({
  //     status: 'stop',
  //     msg: 'stop'
  //   }),'8066',arg.otherAddress);
  // }else if(arg.status == 'putPoint'){
  //   server.send(JSON.stringify({
  //     status: 'putPoint',
  //     msg: 'putPoint',
  //     e: arg.e
  //   }),'8066',arg.otherAddress);
  // }
})