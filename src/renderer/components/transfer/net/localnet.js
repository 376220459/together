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
        that.ipc.send('notice-main', {
            status: 'sendStop',
            homeName: that.currentHome,
            ip: that.ip,
            e: {
                ip: that.ip
            }
        })
    }
}

export {Localnet}