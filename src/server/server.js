const ws = require('nodejs-websocket')

let homes = []
let users = {}

let server = ws.createServer(conn=>{
    conn
    .on('text',obj=>{
        obj = JSON.parse(obj)
        if(obj.status == 'addNewHome'){
            if(homes.map(e=>e.homeName).indexOf(obj.homeName) === -1){
                homes.push({
                    homeName: obj.homeName,
                    members: [obj.ip],
                    // open: false
                })
                conn.sendText(JSON.stringify({
                    status: 'addNewHome',
                    homes: homes
                }));
                server.connections.forEach(conn=>{
                    // console.log(conn.path.slice(5))
                    if(obj.ip !== conn.path.slice(5)){
                        conn.sendText(JSON.stringify({
                            status: 'getHomes',
                            homes: homes
                        }));
                    }
                });
            }
        }else if(obj.status == 'getHomes'){
            conn.sendText(JSON.stringify({
                status: 'getHomes',
                homes: homes
            }));
        }else if(obj.status == 'connect'){
            users[obj.ip] = conn
        }else if(obj.status == 'requestDraw'){
            users[obj.otherAddress].sendText(JSON.stringify({
                status: 'requestDraw',
                otherAddress: obj.ip
            }));
        }else if(obj.status == 'responseDraw'){
            users[obj.otherAddress].sendText(JSON.stringify({
                status: 'responseDraw',
                agree: obj.agree,
                otherAddress: obj.ip
            }));
        }else if(obj.status == 'enterHome'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homes[homeIndex].members.indexOf(obj.ip) === -1){
                homes[homeIndex].members.push(obj.ip)
                server.connections.forEach(conn=>{
                    conn.sendText(JSON.stringify({
                        status: 'getHomes',
                        homes: homes
                    }));
                })
            }
        }else if(obj.status == 'exitHome'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            let memberIndex = homes[homeIndex].members.indexOf(obj.ip)
            if(memberIndex !== -1){
                homes[homeIndex].members.splice(memberIndex,1)
                if(!homes[homeIndex].members.length){
                    homes.splice(homeIndex,1)
                }
                server.connections.forEach(conn=>{
                    conn.sendText(JSON.stringify({
                        status: 'getHomes',
                        homes: homes
                    }));
                })
            }
        }else if(obj.status == 'sendStart'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherStart',
                        e: obj.e
                    }));
                }
            })
            // users[obj.otherAddress].sendText(JSON.stringify({
            //     status: 'otherStart',
            //     e: obj.e
            // }));
        }else if(obj.status == 'sendDrawing'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherDrawing',
                        e: obj.e
                    }));
                }
            })
            // users[obj.otherAddress].sendText(JSON.stringify({
            //     status: 'otherDrawing',
            //     e: obj.e
            // }));
        }else if(obj.status == 'sendStop'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            homes[homeIndex].members.forEach(e=>{
                if(e !== obj.ip){
                    users[e].sendText(JSON.stringify({
                        status: 'otherStop',
                        e: obj.e
                    }));
                }
            })
            // users[obj.otherAddress].sendText(JSON.stringify({
            //     status: 'otherStop'
            // }));
        }else if(obj.status == 'exitDraw'){
            users[obj.otherAddress].sendText(JSON.stringify({
                status: 'exitDraw'
            }));
        }
    })
    .on('close',()=>{
        console.log('连接已关闭')
    })
    .on('error',err=>{
        console.log('连接出错')
    })
}).listen(8888)