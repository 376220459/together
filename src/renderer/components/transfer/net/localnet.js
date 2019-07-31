let that
class Localnet{
    init(context){
        that = context
    }
    openLocalnet(){
        if(!that.localnetOpened){
            that.localnetOpened = true
            that.ipc.send('notice-main', {
                status: 'openLocalnet'
            })
        }
        this.getHomes()
        that.ipc.on('notice-vice', (event, arg)=>{
            if(arg.status == 'otherStart'){
                that.otherStart(arg.e)
            }else if(arg.status == 'otherDrawing'){
                that.otherDrawing(arg.e)
            }else if(arg.status == 'otherStop'){
                that.otherStop(arg.e)
            }else if(arg.status == 'createHome'){
                that.homes = arg.homes
                that.currentHome = that.homes[that.homes.length - 1].homeName
                that.openDraw()
            }else if(arg.status == 'updateHomes'){
                that.homes = arg.homes
                console.log('房间列表更新')
                that.initPen()
            }else if(arg.status == 'enterHome'){
                that.homes = arg.homes
                that.currentHome = that.homes[that.homes.length - 1].homeName
                that.openDraw()
            }else if(arg.status == 'updateCurrentDraw'){
                let canvas = document.getElementById('canvas')
                let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
                that.homes[homeIndex].currentDraw = obj.currentDraw
                that.ctx.clearRect(0,0,canvas.width,canvas.height)
                that.homes[homeIndex].currentDraw.forEach(e=>{
                    let ctx = canvas.getContext("2d")
                    let path = new Path2D()
                    ctx.strokeStyle = e.color
                    if(e.color === 'white'){
                        ctx.lineWidth = 15
                    }else{
                        ctx.lineWidth = 1
                    }
                    e.points.forEach((item,index)=>{
                        if(index == 0){
                            path.moveTo(item[0],item[1])
                        }else{
                            
                            path.lineTo(item[0],item[1])
                            ctx.stroke(path)
                        }
                    })
                })
            }
        })
    }
    getHomes(){
        that.ipc.send('notice-main', {
            status: 'getHomes'
        })
        that.$message({
            type: 'success',
            message: '房间列表已刷新',
            duration: 1000
        })
    }
    createHome(){
        that.$message({
            type: 'success',
            message: '创建成功',
            duration: 1000
        })
        that.ipc.send('notice-main', {
            status: 'createHome',
            homeName: that.newHomeName
        })
        that.closeCreateHome()
    }
    enterHome(item){
        that.ipc.send('notice-main', {
            status: 'enterHome',
            homeName: item
        })
    }
    exitHome(){
        that.ipc.send('notice-main', {
            status: 'exitHome',
            homeName: that.currentHome,
            ip: that.ip
        })
    }
    sendStart(x,y){
        that.ipc.send('notice-main', {
            status: 'sendStart',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip,
                clientX: x,
                clientY: y,
                color: that.color
            }
        })
    }
    sendDrawing(x,y){
        that.ipc.send('notice-main', {
            status: 'sendDrawing',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip,
                clientX: x,
                clientY: y,
                color: that.color
            }
        })
    }
    sendStop(){
        if(that.currentLine && that.currentLine.points.length > 1){
            that.ipc.send('notice-main', {
                status: 'sendStop',
                homeName: that.currentHome,
                ip: that.ip,
                e: {
                    ip: that.ip
                },
                currentLine: that.currentLine
            })
            that.currentLine = null
        }
    }
    checkDelete(){
        let canvas = document.getElementById('canvas')
        let ctx = canvas.getContext('2d')
        ctx.strokeStyle = 'white'
        ctx.rect(that.markPoints[0][0],that.markPoints[0][1],that.markPoints[1][0] - that.markPoints[0][0],that.markPoints[1][1] - that.markPoints[0][1])
        that.ctx.putImageData(that.currentImageData,0,0);
        that.currentImageData = null
        let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        // console.log(that.homes[homeIndex].currentDraw)
        that.homes[homeIndex].currentDraw.forEach(e=>{
            if(e.color !== 'white'){
                for(let i = 0;i < e.points.length;i++){
                    if(ctx.isPointInPath(e.points[i][0],e.points[i][1])){
                        that.ipc.send('notice-main', {
                            status: 'deleteLine',
                            homeName: that.currentHome,
                            line: e
                        })
                        // ws.send(JSON.stringify({
                        //     status: 'deleteLine',
                        //     homeName: that.currentHome,
                        //     line: e
                        // }));
                        break
                    }
                }
            }
        })
        that.markpen = null
        that.markPoints = []
    }
}

export {Localnet}