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
    height: 600,
    useContentSize: true,
    width: 1100
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  me.send('notice-close', {
    status: 'closeWindow'
  })
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
var me;//me代表自己（ipc）
let dgram,server,multicastAddr
let homes = []
function openLocalnet(){
  dgram = require('dgram'),
  server = dgram.createSocket("udp4"),
  multicastAddr = '224.100.100.100';

  server.on("close",()=>{
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
      msg = JSON.parse(msg)
      if(msg.status == 'otherStart'){
        me.send('notice-vice', {
          status: 'otherStart',
          e: msg.e
        })
      }else if(msg.status == 'otherDrawing'){
        me.send('notice-vice', {
          status: 'otherDrawing',
          e: msg.e
        })
      }else if(msg.status == 'otherStop'){
        me.send('notice-vice', {
          status: 'otherStop',
          e: msg.e
        })
      }else if(msg.status == 'getHomes'){
        server.send(JSON.stringify({
          status: 'giveHomes',
          homes: homes
        }),'8066',rinfo.address);
      }else if(msg.status == 'giveHomes'){
        if(msg.homes){
          homes = msg.homes
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes
          })
        }
      }else if(msg.status == 'createHome'){
        if(rinfo.address == IPAddress){
          currentHome = msg.home
          homes.push(msg.home)
          me.send('notice-vice', {
            status: 'createHome',
            homes: homes,
            newHomeName: msg.home.homeName,
            changedHome: msg.home
          })
        }else{
          homes.push(msg.home)
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes,
            changedHome: msg.home
          })
        }
      }else if(msg.status == 'enterHome'){
        if(rinfo.address === IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
            return
          }
          homes[homeIndex].members.push(msg.ip)
          currentHome = homes[homeIndex]
          me.send('notice-vice', {
            status: 'enterHome',
            homes: homes,
            enterHomeName: msg.homeName,
            changedHome: homes[homeIndex]
          })
        }else{
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
            return
          }
          homes[homeIndex].members.push(msg.ip)
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes,
            changedHome: homes[homeIndex]
          })
        }
      }else if(msg.status == 'updateHomes'){
        if(JSON.stringify(homes) != JSON.stringify(msg.homes)){
          homes = msg.homes
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes
          })
        }
      }
  })

  server.bind('8066')
}


ipc.on('notice-main',(event, arg)=>{
  if(arg.status == 'sendStart'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }
    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'otherStart',
          e: arg.e
        }),'8066',e)
      }
    })
  }else if(arg.status == 'sendDrawing'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }
    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'otherDrawing',
          e: arg.e
        }),'8066',e)
      }
    })
  }else if(arg.status == 'sendStop'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }
    homes[homeIndex].currentDraw.push(arg.currentLine)
    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'otherStop',
          e: arg.e
        }),'8066',e)
      }
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)
  }else if(arg.status == 'getIP'){
    me = event.sender
    me.send('notice-ip', {
      status: 'getIP',//正在获取列表...
      ip: IPAddress
    })
  }else if(arg.status == 'openLocalnet'){
    openLocalnet()
  }else if(arg.status == 'getHomes'){
    server.send(JSON.stringify({
      status: 'getHomes'
    }),'8066',multicastAddr)
  }else if(arg.status == 'createHome'){
    homes.push({
      homeName: arg.homeName,
      members: [IPAddress],
      currentDraw: []
    })
    me.send('notice-vice', {
      status: 'createHome',
      homes: homes
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)
  }else if(arg.status == 'enterHome'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }
    homes[homeIndex].members.push(IPAddress)
    homes[homeIndex].members = [...new Set(homes[homeIndex].members)]
    // homes[homeIndex].
    me.send('notice-vice', {
      status: 'enterHome',
      homes: homes
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)
  }else if(arg.status == 'exitHome'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }
    let memberIndex = homes[homeIndex].members.indexOf(arg.ip)
    if(memberIndex === -1){
      return
    }
    homes[homeIndex].members.splice(memberIndex,1)
    if(homes[homeIndex].members.length === 0){
      homes.splice(homeIndex,1)
    }
    me.send('notice-vice', {
      status: 'updateHomes',
      homes: homes
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)
  }else if(arg.status == 'deleteLine'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
        return
    }
    let lineIndex = homes[homeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(arg.line))
    if(lineIndex === -1){
        return
    }
    homes[homeIndex].currentDraw.splice(lineIndex,1)
    homes[homeIndex].members.forEach(e=>{
      server.send(JSON.stringify({
        status: 'updateCurrentDraw',
        currentDraw: homes[homeIndex].currentDraw
      }),'8066',multicastAddr)
        // users[e].sendText(JSON.stringify({
        //     status: 'updateCurrentDraw',
        //     currentDraw: homes[homeIndex].currentDraw,
        //     deleteLine: true
        // }));
    })
  }
})