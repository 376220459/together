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
    show: false
  })

  mainWindow.maximize()
  
  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => { //关闭窗口时，退说出所在房间
  me.send('notice-close', {
    status: 'closeWindow'
  })
  setTimeout(() => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }, 1000);
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// 获取本机iP地址
const interfaces = require('os').networkInterfaces(); 
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
var me;//me代表自己（ipc），用于向主进程发送数据
let dgram,server,multicastAddr
let homes = []
let homeNames = []

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
          e: msg.e,
          currentLine: msg.currentLine
        })
      }else if(msg.status == 'getHomes'){
        if(rinfo.address !== IPAddress){
          if(homes.length){
            server.send(JSON.stringify({
              status: 'giveHomes',
              homes: homes
            }),'8066',rinfo.address);
          }
        }
      }else if(msg.status == 'giveHomes'){
        homes = msg.homes
        homeNames = homes.map(e=>e.homeName)
        me.send('notice-vice', {
          status: 'getHomes',
          homes: homes
        })
      }else if(msg.status == 'addHome'){
        if(rinfo.address !== IPAddress){
          homeNames.push(msg.home.homeName)
          homes.push(msg.home)
          me.send('notice-vice', {
            status: 'addHome',
            homeName: msg.home.homeName
          })
        }
      }else if(msg.status == 'sync-addMember'){
        if(rinfo.address !== IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
            return
          }
          if(homes[homeIndex].members.indexOf(msg.ip) === -1){
            homes[homeIndex].members.push(msg.ip)
            homes[homeIndex].members = [...new Set(homes[homeIndex].members)]
          }
        }
      }else if(msg.status == 'addMember'){
        me.send('notice-vice', {
          status: 'addMember',
          homeName: msg.homeName,
          ip: msg.ip
        })
      }else if(msg.status == 'sync-deleteMember'){
        if(rinfo.address !== IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
              return
          }
          let memberIndex = homes[homeIndex].members.indexOf(msg.ip)
          if(memberIndex === -1){
              return
          }
          homes[homeIndex].members.splice(memberIndex,1)// server端删除此人
        }
      }else if(msg.status == 'deleteMember'){
        me.send('notice-vice', {
          status: 'deleteMember',
          homeName: msg.homeName,
          ip: msg.ip
        })
      }else if(msg.status == 'deleteHome'){
        if(rinfo.address !== IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
              return
          }
          homes.splice(homeIndex,1)// server端删除此房
          homeNames = homes.map(e=>e.homeName)// server端删除此房
          me.send('notice-vice', {
            status: 'deleteHome',
            homeName: msg.homeName
          })
        }
      }else if(msg.status == 'sync-addLine'){
        if(rinfo.address !== IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
            return
          }
          homes[homeIndex].currentDraw.push(msg.currentLine)
        }
      }else if(msg.status == 'sync-deleteLines'){
        if(rinfo.address !== IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
          if(homeIndex === -1){
              return
          }
          msg.deleteLines.forEach(e=>{
              let lineIndex = homes[homeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(e))
              if(lineIndex !== -1){
                  homes[homeIndex].currentDraw.splice(lineIndex,1)
              }
          })
        }
      }else if(msg.status == 'deleteLines'){
        me.send('notice-vice', {
          status: 'deleteLines',
          homeName: msg.homeName,
          deleteLines: msg.deleteLines
        })
      }
  })

  server.bind('8066')
}

ipc.on('notice-main',(event, arg)=>{  //监听主进程信号
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

    server.send(JSON.stringify({
      status: 'sync-addLine',
      currentLine: arg.currentLine,
      homeName: arg.homeName
    }),'8066',multicastAddr)

    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'otherStop',
          e: arg.e,
          currentLine: arg.currentLine
        }),'8066',e)
      }
    })
  }else if(arg.status == 'getIP'){
    me = event.sender
    me.send('notice-ip', {
      status: 'getIP',
      ip: IPAddress
    })
  }else if(arg.status == 'openLocalnet'){
    openLocalnet()
  }else if(arg.status == 'getHomes'){
    server.send(JSON.stringify({
      status: 'getHomes'
    }),'8066',multicastAddr);
  }else if(arg.status == 'createHome'){
    if(homeNames.indexOf(arg.homeName) === -1){//可创建
      homeNames.push(arg.homeName)
      homes.push({
          homeName: arg.homeName,
          members: [arg.ip],
          currentDraw: []
      })
      me.send('notice-vice', {
        status: 'createHome',
        canCreate: true,
        home: {
            homeName: arg.homeName,
            members: [arg.ip],
            currentDraw: []
        }
      })
      server.send(JSON.stringify({
        status: 'addHome',
        home: {
          homeName: arg.homeName,
          members: [arg.ip],
          currentDraw: []
        }
      }),'8066',multicastAddr);
    }else{//不可创建
      me.send('notice-vice', {
        status: 'createHome',
        canCreate: false
      })
    }
  }else if(arg.status == 'enterHome'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
      return
    }

    homes[homeIndex].members.push(arg.ip)
    homes[homeIndex].members = [...new Set(homes[homeIndex].members)]
    server.send(JSON.stringify({
      status: 'sync-addMember',
      homeName: arg.homeName,
      ip: arg.ip
    }),'8066',multicastAddr)
    me.send('notice-vice', {
      status: 'enterHome',
      home: homes[homeIndex]
    })

    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'addMember',
          homeName: arg.homeName,
          ip: arg.ip
        }),'8066',e)
      }
    })
  }else if(arg.status == 'exitHome'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
        return
    }
    let memberIndex = homes[homeIndex].members.indexOf(arg.ip)
    if(memberIndex === -1){
        return
    }

    homes[homeIndex].members.splice(memberIndex,1)// server端删除此人

    if(homes[homeIndex].members.length){
      server.send(JSON.stringify({
        status: 'sync-deleteMember',
        homeName: arg.homeName,
        ip: arg.ip
      }),'8066',multicastAddr)

      homes[homeIndex].members.forEach(e=>{
        if(e !== IPAddress){
          server.send(JSON.stringify({
            status: 'deleteMember',
            homeName: arg.homeName,
            ip: arg.ip
          }),'8066',e)
        }
      })
    }else{
      homes.splice(homeIndex,1)// server端删除此房
      homeNames = homes.map(e=>e.homeName)// server端删除此房

      me.send('notice-vice', {
        status: 'deleteHome',
        homeName: arg.homeName
      })

      server.send(JSON.stringify({
        status: 'deleteHome',
        homeName: arg.homeName
      }),'8066',multicastAddr)
    }
  }else if(arg.status == 'deleteLines'){
    let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    if(homeIndex === -1){
        return
    }
    arg.deleteLines.forEach(e=>{
        let lineIndex = homes[homeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(e))
        if(lineIndex !== -1){
            homes[homeIndex].currentDraw.splice(lineIndex,1)
        }
    })

    server.send(JSON.stringify({
      status: 'sync-deleteLines',
      homeName: arg.homeName,
      deleteLines: arg.deleteLines
    }),'8066',multicastAddr)

    homes[homeIndex].members.forEach(e=>{
      if(e !== IPAddress){
        server.send(JSON.stringify({
          status: 'deleteLines',
          homeName: arg.homeName,
          deleteLines: arg.deleteLines
        }),'8066',e)
      }
    })
  }
})