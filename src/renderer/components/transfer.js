import {Localnet} from './localnet'
import {Internet} from './internet'
let localnet = new Localnet(),
    internet = new Internet()
let that
class Transfer{
    init(context){
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
    selectNet(net){
        if(net === 'internet'){
            that.internet = true
            that.openInternet()
        }else{
            that.localnet = true
            that.openLocalnet()
        }
    }
    changeNet(){
        if(that.internet){
            that.internet = false
            that.localnet = true

            internet.close()
            that.openLocalnet()
        }else{
            that.localnet = false
            that.internet = true
            that.ipc.removeAllListeners('notice-vice')
            that.openInternet()
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
        that.colorStyle = []
        that.colorStyle[index] = `background:white;border:7px solid ${color};`
    }
    exitDraw(){
        that.drawShow = 'none'
        that.color = 'black'
        that.colorStyle = [,,,,'background:white;border:7px solid black;']
    }
    initPen(){
        let canvas = document.getElementById('canvas')
        let canvasDiv = document.getElementById('canvasDiv')
        let currentHomeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        if(that.currentHome){
            if(currentHomeIndex === -1){
            return
            }
            that.homes[currentHomeIndex].members.forEach(e=>{
            that.pens[e] = {}
            that.pens[e].ctx = canvas.getContext("2d")
            that.pens[e].ctx.lineWidth = 3
            that.pens[e].path = new Path2D()
            that.pens[e].tag = false
            })
        }
    }
    openDraw(){
        if(that.drawShow == 'none'){
            that.drawShow = 'block'
            let canvas = document.getElementById('canvas')
            let canvasDiv = document.getElementById('canvasDiv')
            setTimeout(() => {
            canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
            canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
            }, 0);
            that.ctx = canvas.getContext("2d")
            that.ctx.lineWidth = 3
            that.initPen()
        }
    }
    start(e){
        let canvasDiv = document.getElementById('canvasDiv')
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
        that.path = new Path2D()
        that.path.moveTo(that.x,that.y)
        that.tag = true
    }
    otherStart(e){
        that.pens[e.ip].path = new Path2D()
        that.pens[e.ip].path.moveTo(e.clientX,e.clientY)
        that.pens[e.ip].tag = true
    }
    drawing(e){
        let canvasDiv = document.getElementById('canvasDiv')
        if(that.tag){
            that.ctx.strokeStyle = that.color
            that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
            that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
            that.path.lineTo(that.x,that.y)
            that.ctx.stroke(that.path)
        }
    }
    otherDrawing(e){
        if(that.pens[e.ip].tag){
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
}

export {Transfer}