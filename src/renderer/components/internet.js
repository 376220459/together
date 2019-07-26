class Internet{
    openInternet(that){
        this.ws = new WebSocket(`ws://172.20.10.3:8888?ip=${that.ip}`)
        // this.ws = new WebSocket(`ws://192.168.1.183:8888?ip=${that.ip}`)
        // this.ws = new WebSocket(`ws://192.168.1.196:8888?ip=${that.ip}`)
        // this.ws = new WebSocket(`ws://192.168.16.102:8888?ip=${that.ip}`)
        this.ws.onmessage = e=>{
            let obj = JSON.parse(e.data)
            if(obj.status == 'addNewHome'){
                that.homes = obj.homes
                this.enterHome(that.homes[that.homes.length - 1].homeName,that)
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
            }else if(obj.status == 'otherStart'){
                that.otherStart(obj.e)
            }else if(obj.status == 'otherDrawing'){
                that.otherDrawing(obj.e)
            }else if(obj.status == 'otherStop'){
                that.otherStop(obj.e)
            }
        }
        this.ws.onopen = ()=>{
            console.log('ws通道已打开')
            if(this.ws.readyState === 1){
                this.ws.send(JSON.stringify({
                    status: 'connect',
                    ip: that.ip
                }));
                this.getHomes(that)
            }
        }
        this.ws.onclose = ()=>{
            if(that.currentHome){
                this.exitHome(that)
            }
            console.log('ws通道已关闭');
            if(that.internet){
                this.openInternet()
            }
        }
    }
    close(){
        this.ws.close()
    }
    getHomes(that){
        this.ws.send(JSON.stringify({
            status: 'getHomes',
            ip: that.ip
        }));
    }
    createHome(that){
        that.$message({
            type: 'success',
            message: '创建成功',
            duration: 1000
        })
        this.ws.send(JSON.stringify({
            status: 'addNewHome',
            homeName: that.newHomeName,
            ip: that.ip
        }));
        that.closeCreateHome()
    }
    enterHome(item,that){
        that.currentHome = item
        that.openDraw()
        this.ws.send(JSON.stringify({
            status: 'enterHome',
            homeName: that.currentHome,
            ip: that.ip
        }))
    }
    exitHome(that){
        this.ws.send(JSON.stringify({
            status: 'exitHome',
            homeName: that.currentHome,
            ip: that.ip
        }))
    }
    sendStart(x,y,that){
        this.ws.send(JSON.stringify({
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
    sendDrawing(x,y,that){
        this.ws.send(JSON.stringify({
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
    sendStop(that){
        this.ws.send(JSON.stringify({
            status: 'sendStop',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip
            }
        }));
    }
}

export {Internet}