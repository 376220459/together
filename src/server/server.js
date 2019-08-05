const ws = require('nodejs-websocket')

let homes = []
let users = {}
let homeNames = []

let server = ws.createServer(conn=>{
    conn
    .on('text',obj=>{
        obj = JSON.parse(obj)
        if(obj.status == 'createHome'){
            if(homeNames.indexOf(obj.homeName) === -1){//可创建
                homeNames.push(obj.homeName)
                homes.push({
                    homeName: obj.homeName,
                    members: [obj.ip],
                    currentDraw: []
                })
                conn.sendText(JSON.stringify({
                    status: 'createHome',
                    canCreate: true,
                    home: {
                        homeName: obj.homeName,
                        members: [obj.ip],
                        currentDraw: []
                    }
                }))
                for(let key in users){
                    if(key !== obj.ip){
                        users[key].sendText(JSON.stringify({
                            status: 'addHome',
                            homeName: obj.homeName
                        }));
                    }
                }
            }else{//不可创建
                conn.sendText(JSON.stringify({
                    status: 'createHome',
                    canCreate: false
                }))
            }
        }else if(obj.status == 'getHomes'){
            conn.sendText(JSON.stringify({
                status: 'getHomes',
                homeNames: homeNames
            }));
        }else if(obj.status == 'connect'){
            users[obj.ip] = conn
        }else if(obj.status == 'enterHome'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            
            homes[homeIndex].members.push(obj.ip)
            homes[homeIndex].members = [...new Set(homes[homeIndex].members)]
            conn.sendText(JSON.stringify({
                status: 'enterHome',
                home: homes[homeIndex]
            }));
            for(let key in users){
                if(key !== obj.ip){
                    users[key].sendText(JSON.stringify({
                        status: 'addMember',
                        homeName: obj.homeName,
                        ip: obj.ip
                    }));
                }
            }
        }else if(obj.status == 'exitHome'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            let memberIndex = homes[homeIndex].members.indexOf(obj.ip)
            if(memberIndex === -1){
                return
            }
            homes[homeIndex].members.splice(memberIndex,1)// server端删除此人

            if(homes[homeIndex].members.length){
                homes[homeIndex].members.forEach(e=>{
                    users[e].sendText(JSON.stringify({
                        status: 'deleteMember',
                        homeName: obj.homeName,
                        ip: obj.ip
                    }));
                })
            }else{
                homes.splice(homeIndex,1)// server端删除此房
                homeNames = homes.map(e=>e.homeName)// server端删除此房
                for(let key in users){
                    users[key].sendText(JSON.stringify({
                        status: 'deleteHome',
                        homeName: obj.homeName
                    }));
                }
            }
        }else if(obj.status == 'sendStart'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherStart',
                        e: obj.e
                    }));
                }
            })
        }else if(obj.status == 'sendDrawing'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherDrawing',
                        e: obj.e
                    }));
                }
            })
        }else if(obj.status == 'sendStop'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            homes[homeIndex].currentDraw.push(obj.currentLine)
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherStop',
                        e: obj.e,
                        currentLine: obj.currentLine
                    }));
                }
            })
        }else if(obj.status == 'deleteLines'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            obj.deleteLines.forEach(e=>{
                let lineIndex = homes[homeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(e))
                if(lineIndex !== -1){
                    homes[homeIndex].currentDraw.splice(lineIndex,1)
                }
            })
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'deleteLines',
                        deleteLines: obj.deleteLines,
                        homeName: obj.homeName
                    }));
                }
            })
        }
    })
    .on('close',()=>{
        console.log('连接已关闭')
    })
    .on('error',err=>{
        console.log('连接出错')
    })
}).listen(8888)
