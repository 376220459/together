const ws = require('nodejs-websocket')

let homes = [{
    homeName: 'home1',
    members: ['192.168.1.196'],
    currentDraw: []
}]
// let homes = []
let users = {}
let homeNames = ['home1']

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
                    if(key !== 'obj.ip'){
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
            if(homes.map(e=>e.homeName).indexOf(obj.homeName) === -1){
                homes.push({
                    homeName: obj.homeName,
                    members: [obj.ip],
                    currentDraw: []
                })
                conn.sendText(JSON.stringify({
                    status: 'createHome',
                    homes: homes
                }));
                server.connections.forEach(conn=>{
                    if(obj.ip !== conn.path.slice(5)){
                        conn.sendText(JSON.stringify({
                            status: 'getHomes',
                            homes: homes
                        }));
                    }
                });
            }
            // if(homes.map(e=>e.homeName).indexOf(obj.homeName) === -1){
            //     homes.push({
            //         homeName: obj.homeName,
            //         members: [obj.ip],
            //         currentDraw: []
            //     })
            //     conn.sendText(JSON.stringify({
            //         status: 'createHome',
            //         homes: homes
            //     }));
            //     server.connections.forEach(conn=>{
            //         if(obj.ip !== conn.path.slice(5)){
            //             conn.sendText(JSON.stringify({
            //                 status: 'getHomes',
            //                 homes: homes
            //             }));
            //         }
            //     });
            // }
        }else if(obj.status == 'getHomes'){
            conn.sendText(JSON.stringify({
                status: 'getHomes',
                homeNames: homeNames
            }));

            // conn.sendText(JSON.stringify({
            //     status: 'getHomes',
            //     homes: homes
            // }));
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
                if(key !== 'obj.ip'){
                    users[key].sendText(JSON.stringify({
                        status: 'addMember',
                        homeName: obj.homeName,
                        ip: obj.ip
                    }));
                }
            }


            // let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            // if(homeIndex === -1){
            //     return
            // }
            // if(homes[homeIndex].members.indexOf(obj.ip) === -1){
            //     homes[homeIndex].members.push(obj.ip)
            //     homes[homeIndex].members = [...new Set(homes[homeIndex].members)]
            //     server.connections.forEach(conn=>{
            //         conn.sendText(JSON.stringify({
            //             status: 'getHomes',
            //             homes: homes
            //         }));
            //     })
                
            //     users[obj.ip].sendText(JSON.stringify({
            //         status: 'enterHome',
            //         homes: homes
            //     }));
            // }
        }else if(obj.status == 'exitHome'){
            let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            if(homeIndex === -1){
                return
            }
            let memberIndex = homes[homeIndex].members.indexOf(obj.ip)
            if(memberIndex === -1){
                return
            }
            homes[homeIndex].members.splice(memberIndex,1)//删除此人

            if(homes[homeIndex].members.length){
                homes[homeIndex].members.forEach(e=>{
                    users[e].sendText(JSON.stringify({
                        status: 'deleteMember',
                        homeName: obj.homeName,
                        ip: obj.ip
                    }));
                })
            }else{
                homes.splice(homeIndex,1)
                let homeNameIndex = homeNames.indexOf(obj.homeName)
                if(homeNameIndex !== -1){
                    homeNames.splice(homeNameIndex,1)
                }
                for(let key in users){
                    users[key].sendText(JSON.stringify({
                        status: 'deleteHome',
                        homeName: obj.homeName
                    }));
                }
            }



            // let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            // if(homeIndex === -1){
            //     return
            // }
            // let memberIndex = homes[homeIndex].members.indexOf(obj.ip)
            // if(memberIndex !== -1){
            //     homes[homeIndex].members.splice(memberIndex,1)
            //     if(!homes[homeIndex].members.length){
            //         homes.splice(homeIndex,1)
            //     }
            //     server.connections.forEach(conn=>{
            //         conn.sendText(JSON.stringify({
            //             status: 'getHomes',
            //             homes: homes
            //         }));
            //     })
            // }
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
            // let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
            // if(homeIndex === -1){
            //     return
            // }
            // homes[homeIndex].currentDraw.push(obj.currentLine)
            // homes[homeIndex].members.forEach(e=>{
            //     users[e].sendText(JSON.stringify({
            //         status: 'updateCurrentDraw',
            //         currentDraw: homes[homeIndex].currentDraw
            //     }));
            // })
            // homes[homeIndex].members.forEach(e=>{
            //     if(e !== obj.ip){
            //         users[e].sendText(JSON.stringify({
            //             status: 'otherStop',
            //             e: obj.e
            //         }));
            //     }
            // })
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
        // }else if(obj.status == 'deleteLine'){
        //     let homeIndex = homes.map(e=>e.homeName).indexOf(obj.homeName)
        //     if(homeIndex === -1){
        //         return
        //     }
        //     let lineIndex = homes[homeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(obj.line))
        //     if(lineIndex === -1){
        //         return
        //     }
        //     homes[homeIndex].currentDraw.splice(lineIndex,1)
        //     homes[homeIndex].members.forEach(e=>{
        //         users[e].sendText(JSON.stringify({
        //             status: 'updateCurrentDraw',
        //             currentDraw: homes[homeIndex].currentDraw,
        //             deleteLine: true
        //         }));
        //     })
        // }
    })
    .on('close',()=>{
        console.log('连接已关闭')
    })
    .on('error',err=>{
        console.log('连接出错')
    })
}).listen(8888)
