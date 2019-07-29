import {Localnet} from './net/localnet'
import {Internet} from './net/internet'
let localnet = new Localnet(),
    internet = new Internet()
let that,canvas,canvasDiv

class Transfer{
    init(context){
        canvas = document.getElementById('canvas')
        canvasDiv = document.getElementById('canvasDiv')
        that = context
        that.ipc = require('electron').ipcRenderer
        that.ipc.send('notice-main', {
            status: 'getIP'
        })
        that.ipc.on('notice-ip', (event, arg)=>{
            if(arg.status == 'getIP'){
                that.ip = arg.ip
            }
        })
        that.ipc.on('notice-close', (event, arg)=>{
            if(arg.status == 'closeWindow'){
                that.exitHome()
            }
        })
        
        localnet.init(that)
        internet.init(that)
    }
    openInternet(){
        internet.openInternet(that)
    }
    openLocalnet(){
        localnet.openLocalnet(that)
    }
    selectNet(net){
        if(net === 'internet'){
            that.internet = true
            this.openInternet()
        }else{
            that.localnet = true
            this.openLocalnet()
        }
    }
    changeNet(){
        if(that.internet){
            that.internet = false
            that.localnet = true

            internet.close()
            this.openLocalnet()
        }else{
            that.localnet = false
            that.internet = true
            that.ipc.removeAllListeners('notice-vice')
            this.openInternet()
        }
        that.homes = []
    }
    getHomes(){
        if(that.internet){
            internet.getHomes()
        }else{
            localnet.getHomes()
        }
    }
    createHome(){
        that.newHomeName = that.newHomeName.trim()
        if(that.newHomeName == '' || that.homes.map(e=>e.homeName).indexOf(that.newHomeName) !== -1){
            that.$message.error('创建失败，换个名字试试')
            return
        }
        if(that.internet){ 
            internet.createHome()
        }else{
            localnet.createHome()
        }
    }
    enterHome(item){
        if(that.internet){
            internet.enterHome(item)
        }else{
            localnet.enterHome(item)
        }
    }
    exitHome(){
        if(that.internet){
            internet.exitHome()
        }else{
            localnet.exitHome()
        }
        that.currentHome = ''
        that.exitDraw()
    }
    changeColor(color,index){
        that.color = color
        if(that.rubber){
            that.rubber = false
            that.ctx.lineWidth = 1
        }
        that.toolStyle = []
        that.toolStyle[index] = `background:white;border:7px solid ${color};`
    }
    selectRubber(){
        that.color = 'white'
        that.ctx.lineWidth = 15
        if(!that.rubber){
            that.rubber = true
            that.toolStyle = []
            that.toolStyle[5] = `border: 1.5px dotted skyblue;`
        }
    }
    exitDraw(){
        that.drawShow = 'none'
        that.color = 'black'
        that.toolStyle = [,,,,'background:white;border:7px solid black;']
    }
    initPen(){
        let currentHomeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        if(that.currentHome){
            if(currentHomeIndex === -1){
            return
            }
            that.homes[currentHomeIndex].members.forEach(e=>{
            that.pens[e] = {}
            that.pens[e].ctx = canvas.getContext("2d")
            that.pens[e].ctx.lineWidth = 1
            that.pens[e].path = new Path2D()
            that.pens[e].tag = false
            })
        }
    }
    openDraw(){
        if(that.drawShow == 'none'){
            that.drawShow = 'block'
            setTimeout(() => {
            canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
            canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
            }, 0);
            that.ctx = canvas.getContext("2d") 
            that.ctx.lineWidth = 1
            that.initPen()

            let currentHomeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
            if(that.homes[currentHomeIndex].currentDraw){
                setTimeout(() => {
                    that.homes[currentHomeIndex].currentDraw.forEach(e=>{
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
                }, 0);
            }
            
        }
    }
    start(e){
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
        that.path = new Path2D()
        that.path.moveTo(that.x,that.y)
        that.tag = true

        that.currentLine = {}
        that.currentLine.color = that.color
        that.currentLine.points = []
        that.currentLine.points.push([that.x,that.y])
    }
    otherStart(e){
        that.pens[e.ip].path = new Path2D()
        that.pens[e.ip].path.moveTo(e.clientX,e.clientY)
        that.pens[e.ip].tag = true
    }
    drawing(e){
        if(that.tag){
            that.ctx.strokeStyle = that.color
            that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
            that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
            that.path.lineTo(that.x,that.y)
            that.ctx.stroke(that.path)

            that.currentLine.points.push([that.x,that.y])
        }
    }
    otherDrawing(e){
        if(that.pens[e.ip].tag){
            if(e.color === 'white'){
                that.pens[e.ip].ctx.lineWidth = 15
            }
            that.pens[e.ip].ctx.strokeStyle = e.color
            that.pens[e.ip].path.lineTo(e.clientX,e.clientY)
            that.pens[e.ip].ctx.stroke(that.pens[e.ip].path)
        }
    }
    stop(){
        that.tag = false
    }
    otherStop(e){
        that.pens[e.ip].tag = false
    }
    sendStart(e){
        let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
        let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
        if(that.internet){
            internet.sendStart(x,y)
        }else{
            localnet.sendStart(x,y)
        }
    }
    sendDrawing(e){
        let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
        let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
        if(that.internet){
            internet.sendDrawing(x,y)
        }else{
            localnet.sendDrawing(x,y)
        }
    }
    sendStop(){
        if(that.internet){
            internet.sendStop()
        }else{
            localnet.sendStop()
        }
    }
    openCreateHome(){
        that.createHomeIf = true
    }
    closeCreateHome(){
        that.createHomeIf = false
        that.newHomeName = ''
    }
}

export {Transfer}