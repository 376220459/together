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
let dgram,server,multicastAddr
let homes = []
let currentHome = null
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
      // if(msg.status == 'access'){
      if(msg.status == 'access' && rinfo.address !== IPAddress){
        if(connections.indexOf(rinfo.address + ':' + rinfo.port) == -1){
          connections.push(rinfo.address + ':' + rinfo.port)
          
          // server.send(JSON.stringify({
          //   status: 'access'
          // }),'8066',rinfo.address);
        }
        me.send('notice-vice', {
          status: 'returnConnections',//返回列表
          msg: '返回列表',
          connections: connections
        })
      // }else if(msg.status == 'getConnections'){
      }else if(msg.status == 'getConnections' && rinfo.address !== IPAddress){
        server.send(JSON.stringify({
          status: 'access'
        }),'8066',rinfo.address);
      }else if(msg.status == 'requestUser'){
        me.send('notice-vice', {
          status: 'responseDraw',//响应请求
          msg: '响应请求',
          otherAddress: rinfo.address
        })
      }else if(msg.status == 'responseUser'){
        if(msg.agree == 'yes'){
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
      }else if(msg.status == 'otherStart'){
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
          status: 'otherStop'
        })
      }else if(msg.status == 'exitDraw'){
        me.send('notice-vice', {
          status: 'exitDraw'
        })
      }else if(msg.status == 'getHomes'){
        server.send(JSON.stringify({
          status: 'giveHomes',
          homes: homes
        }),'8066',rinfo.address);


        // if(currentHome){
        //   server.send(JSON.stringify({
        //     status: 'putHome',
        //     home: currentHome
        //   }),'8066',rinfo.address);
        // }
      }else if(msg.status == 'giveHomes'){
        if(msg.homes){
          homes = msg.homes
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes
          })
        }
      }else if(msg.status == 'putHome'){
        if(homes.map(e=>e.homeName).indexOf(msg.home.homeName) === -1){
          homes.push(msg.home)
          me.send('notice-vice', {
            status: 'getHomes',
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

        // homes.push(msg.home)
        // me.send('notice-vice', {
        //   status: 'addNewHome',
        //   homes: homes
        // })
      }else if(msg.status == 'homeChanged'){
        // homes = msg.homes
        let homeIndex = homes.map(e=>e.homeName).indexOf(msg.home.homeName)
        if(homeIndex !== -1){
          homes[homeIndex] = msg.home
        }
        me.send('notice-vice', {
          status: 'getHomes',
          homes: homes
        })
      }else if(msg.status == 'deleteHome'){
        let homeIndex = homes.map(e=>e.homeName).indexOf(msg.home.homeName)
        if(homeIndex !== -1){
          homes.splice(homeIndex,1)
        }
        me.send('notice-vice', {
          status: 'getHomes',
          homes: homes
        })
      }else if(msg.status == 'enterHome'){
        if(rinfo.address === IPAddress){
          let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
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
          homes[homeIndex].members.push(msg.ip)
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes,
            changedHome: homes[homeIndex]
          })
        }
      }else if(msg.status == 'exitHome'){
        if(rinfo.address === IPAddress){
          currentHome = null
        }
        let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
        let memberIndex = homes[homeIndex].members.indexOf(msg.ip)
        homes[homeIndex].members.splice(memberIndex,1)
        if(homes[homeIndex].members.length === 0){
          me.send('notice-vice', {
            status: 'deleteHome',
            homes: homes,
            deleteHomeName: homes[homeIndex].homeName
          })
          homes.splice(homeIndex,1)
        }else{
          me.send('notice-vice', {
            status: 'updateHomes',
            homes: homes,
            changedHome: homes[homeIndex]
          })
        }



        // let homeIndex = homes.map(e=>e.homeName).indexOf(msg.homeName)
        // if(homeIndex !== -1){
        //   let memberIndex = homes[homeIndex].members.indexOf(msg.ip)
        //   if(memberIndex !== -1){
        //     homes[homeIndex].members.splice(memberIndex,1)//注意：splice方法返回的是被删除的元素组成的数组，而不是删除后的数组
        //     if(!homes[homeIndex].members.length){
        //       homes.splice(homeIndex,1)
        //     }
        //   }
        // }
        
        // if(rinfo.address === IPAddress){
        //   currentHome = null
        // }
        // me.send('notice-vice', {
        //   status: 'updateHomes',
        //   homes: homes
        // })

        // if(homeIndex !== -1){
        //   let memberIndex = homes[homeIndex].members.indexOf(msg.ip)
        //   if(memberIndex !== -1){
        //     homes[homeIndex].members.splice(memberIndex,1)//注意：splice方法返回的是被删除的元素组成的数组，而不是删除后的数组
        //     if(!homes[homeIndex].members.length){
        //       homes.splice(homeIndex,1)
        //     }
        //   }
        // }
        // me.send('notice-vice', {
        //   status: 'updateHomes',
        //   homes: homes
        // })
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
  if(arg.status == 'connect'){
    me = event.sender
    server.send(JSON.stringify({
      status: 'access'
    }),'8066',multicastAddr)
  }else if(arg.status == 'getConnections'){
    connections = [];
    server.send(JSON.stringify({
      status: 'getConnections'
    }),'8066',multicastAddr)
    // me = event.sender
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
  }else if(arg.status == 'exitDraw'){
    server.send(JSON.stringify({
      status: 'exitDraw'
    }),'8066',arg.otherAddress)
  }else if(arg.status == 'getIP'){
    me = event.sender
    me.send('notice-ip', {
      status: 'getIP',//正在获取列表...
      ip: IPAddress
    })
  }else if(arg.status == 'openLocalnet'){
    openLocalnet()
  }else if(arg.status == 'getHomes'){
    // server.send(JSON.stringify({
    //   status: 'getHomes'
    // }),'8066',multicastAddr)


    
    server.send(JSON.stringify({
      status: 'getHomes'
    }),'8066',multicastAddr)
  }else if(arg.status == 'createHome'){
    homes.push({
      homeName: arg.homeName,
      members: [IPAddress]
    })
    me.send('notice-vice', {
      status: 'createHome',
      homes: homes
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)

    


    // server.send(JSON.stringify({
    //   status: 'createHome',
    //   home: {
    //     homeName: arg.homeName,
    //     members: [IPAddress]
    //   }
    // }),'8066',multicastAddr)



    // if(homes.map(e=>e.homeName).indexOf(arg.homeName) === -1){
    //     homes.push({
    //         homeName: arg.homeName,
    //         members: [IPAddress]
    //     })
        
    //     server.send(JSON.stringify({
    //       status: 'homeChanged',
    //       // homes: homes
    //       home: {
    //           homeName: arg.homeName,
    //           members: [IPAddress]
    //       }
    //     }),'8066',multicastAddr)

    //     me.send('notice-vice', {
    //       status: 'addNewHome',
    //       homes: homes
    //     })
    // }


    // currentHome = {
    //   homeName: arg.homeName,
    //   members: [IPAddress]
    // }
    // homes.push(currentHome)
    // server.send(JSON.stringify({
    //   status: 'addNewHome',
    //   home: currentHome
    // }),'8066',multicastAddr)
  }else if(arg.status == 'enterHome'){
    homes[homes.map(e=>e.homeName).indexOf(arg.homeName)].members.push(IPAddress)
    
    me.send('notice-vice', {
      status: 'enterHome',
      homes: homes
    })
    server.send(JSON.stringify({
      status: 'updateHomes',
      homes: homes
    }),'8066',multicastAddr)



    // server.send(JSON.stringify({
    //   status: 'enterHome',
    //   homeName: arg.homeName,
    //   ip: IPAddress
    // }),'8066',multicastAddr)


    // if(homes[homeIndex].members.indexOf(IPAddress) === -1){
    //   homes[homeIndex].members.push(IPAddress)
    //   currentHome = homes[homeIndex]
    // }else{
    //   currentHome = {
    //     homeName: arg.homeName,
    //     members: [IPAddress]
    //   }
    // }
    
    // server.send(JSON.stringify({
    //   status: 'homeChanged',
    //   // homes: homes
    //   home: currentHome
    // }),'8066',multicastAddr)
  }else if(arg.status == 'exitHome'){
    server.send(JSON.stringify({
      status: 'exitHome',
      homeName: arg.homeName,
      ip: arg.ip
    }),'8066',multicastAddr)

    // let homeIndex = homes.map(e=>e.homeName).indexOf(arg.homeName)
    // let memberIndex = -1
    // if(homeIndex !== -1){
    //   memberIndex = homes[homeIndex].members.indexOf(IPAddress)
    // }
    // if(memberIndex !== -1){
    //     homes[homeIndex].members.splice(memberIndex,1)
    //     let home2 = homes[homeIndex]
        
    //     if(!homes[homeIndex].members.length){
    //         homes.splice(homeIndex,1)
    //         server.send(JSON.stringify({
    //           status: 'deleteHome',
    //           home: home2
    //         }),'8066',multicastAddr)
    //     }else{
    //       server.send(JSON.stringify({
    //         status: 'homeChanged',
    //         // homes: homes
    //         home: home2
    //       }),'8066',multicastAddr)
    //     }
    // }
    
    // currentHome = null
    
    // server.send(JSON.stringify({
    //   status: 'getHomes'
    // }),'8066',multicastAddr)
  }
})