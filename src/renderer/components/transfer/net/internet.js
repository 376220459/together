let ws,that
class Internet{
    init(context){
        that = context
    }
    openInternet(){
        ws = new WebSocket(`ws://192.168.1.196:8888`)
        // ws = new WebSocket('ws://huaban.com')
        ws.onmessage = e=>{
            let obj = JSON.parse(e.data)
            if(obj.status == 'addNewHome'){
                that.homes = obj.homes
                this.enterHome(that.homes[that.homes.length - 1].homeName)
                that.openDraw()
            }else if(obj.status == 'getHomes'){
                that.homes = obj.homes
                that.$message({
                    type: 'success',
                    message: '房间列表已刷新',
                    duration: 1000
                })
                if(that.currentHome){
                    that.initPen()
                }
            }else if(obj.status == 'enterHome'){
                that.homes = obj.homes
                that.openDraw()
            }else if(obj.status == 'otherStart'){
                that.otherStart(obj.e)
            }else if(obj.status == 'otherDrawing'){
                that.otherDrawing(obj.e)
            }else if(obj.status == 'otherStop'){
                that.otherStop(obj.e)
            }else if(obj.status == 'updateCurrentDraw'){
                if(that.currentHome){
                    let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
                    that.homes[homeIndex].currentDraw = obj.currentDraw
                }
            }
        }
        ws.onopen = ()=>{
            console.log('ws通道已打开')
            if(ws.readyState === 1){
                ws.send(JSON.stringify({
                    status: 'connect',
                    ip: that.ip
                }));
                this.getHomes()
            }
        }
        ws.onclose = ()=>{
            if(that.currentHome){
                this.exitHome()
            }
            console.log('ws通道已关闭');
            if(that.internet){
                this.openInternet()
            }
        }
    }
    close(){
        ws.close()
    }
    getHomes(){
        ws.send(JSON.stringify({
            status: 'getHomes',
            ip: that.ip
        }));
    }
    createHome(){
        that.$message({
            type: 'success',
            message: '创建成功',
            duration: 1000
        })
        ws.send(JSON.stringify({
            status: 'addNewHome',
            homeName: that.newHomeName,
            ip: that.ip
        }));
        that.closeCreateHome()
    }
    enterHome(item){
        that.currentHome = item
        // setTimeout(() => {
        //     that.openDraw()
        // }, 0);
        ws.send(JSON.stringify({
            status: 'enterHome',
            homeName: that.currentHome,
            ip: that.ip
        }))
    }
    exitHome(){
        ws.send(JSON.stringify({
            status: 'exitHome',
            homeName: that.currentHome,
            ip: that.ip
        }))
    }
    sendStart(x,y){
        ws.send(JSON.stringify({
            status: 'sendStart',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip,
                clientX: x,
                clientY: y,
                color: that.color
            }
        }))
    }
    sendDrawing(x,y){
        ws.send(JSON.stringify({
            status: 'sendDrawing',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip,
                clientX: x,
                clientY: y,
                color: that.color
            }
        }));
    }
    sendStop(){
        if(that.currentLine && that.currentLine.points.length > 1){
            ws.send(JSON.stringify({
                status: 'sendStop',
                homeName: that.currentHome,
                ip: that.ip,
                e: {
                    ip: that.ip
                },
                currentLine: that.currentLine
            }));
            that.currentLine = null
        }
    }
    checkDelete(){
        that.ctx.putImageData(that.currentImageData,0,0);
        that.currentImageData = null
        let canvas = document.getElementById('canvas')
        let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        that.homes[homeIndex].currentDraw.forEach(e=>{
            if(e.color !== 'white'){
                // console.log(that.markpen)
                for(let i = 0;i < e.points.length;i++){
                    if(that.markpen.isPointInPath(e.points[i][0],e.points[i][1])){
                        console.log(e.points[i][0],e.points[i][1])
                        let ctx = canvas.getContext("2d")
                        ctx.strokeStyle = '#ffffff'
                        ctx.lineWidth = 2
                        e.points.forEach((item,index)=>{
                            if(index == 0){
                                ctx.moveTo(item[0],item[1])
                            }else{
                                ctx.lineTo(item[0],item[1])
                                ctx.stroke()
                            }
                        })
                        ws.send(JSON.stringify({
                            status: 'deleteLine',
                            homeName: that.currentHome,
                            line: e
                        }));
                        break
                    }
                }
            }
        })
        that.markpen = null
    }
}

export {Internet}