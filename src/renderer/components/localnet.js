class Localnet{
    openLocalnet(){
        if(!this.localnetOpened){
            this.localnetOpened = true
            ipc.send('notice-main', {
                status: 'openLocalnet'
            })
        }
        this.getHomes()
        ipc.on('notice-vice', (event, arg)=>{
            if(arg.status == 'otherStart'){
                this.otherStart(arg.e)
            }else if(arg.status == 'otherDrawing'){
                this.otherDrawing(arg.e)
            }else if(arg.status == 'otherStop'){
                this.otherStop(arg.e)
            }else if(arg.status == 'createHome'){
                this.homes = arg.homes
                this.currentHome = this.homes[this.homes.length - 1].homeName
                this.openDraw()
            }else if(arg.status == 'updateHomes'){
                this.homes = arg.homes
                console.log('房间列表更新')
                this.initPen()
            }else if(arg.status == 'enterHome'){
                this.homes = arg.homes
                this.currentHome = this.homes[this.homes.length - 1].homeName
                this.openDraw()
            }
        })
    }
    getHomes(){
        ipc.send('notice-main', {
            status: 'getHomes'
        })
        this.$message({
            type: 'success',
            message: '房间列表已刷新',
            duration: 1000
        })
    }
    createHome(){
        this.$message({
            type: 'success',
            message: '创建成功',
            duration: 1000
        })
        ipc.send('notice-main', {
            status: 'createHome',
            homeName: this.newHomeName
        })
        this.closeCreateHome()
    }
    enterHome(item,index){
        ipc.send('notice-main', {
            status: 'enterHome',
            homeName: item
        })
    }
    exitHome(){
        ipc.send('notice-main', {
            status: 'exitHome',
            homeName: this.currentHome,
            ip: this.ip
        })
    }
    sendStart(e){
        ipc.send('notice-main', {
            status: 'sendStart',
            homeName: this.currentHome,
            ip: this.ip,
            e: {
                ip: this.ip,
                clientX: x,
                clientY: y,
                color: this.color
            }
        })
    }
    sendDrawing(e){
        ipc.send('notice-main', {
            status: 'sendDrawing',
            homeName: this.currentHome,
            ip: this.ip,
            e: {
                ip: this.ip,
                clientX: x,
                clientY: y,
                color: this.color
            }
        })
    }
    sendStop(){
        ipc.send('notice-main', {
            status: 'sendStop',
            homeName: this.currentHome,
            ip: this.ip,
            e: {
                ip: this.ip
            }
        })
    }
}

export {Localnet}