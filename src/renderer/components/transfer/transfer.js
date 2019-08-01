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

        function debounce(func,wait){
            let id = null;
            return function(){
                let args = arguments;
                let that = this;
                if(id){
                    window.clearTimeout(id);
                }
                id = setTimeout(() => {
                    func.apply(that,args)
                }, wait);
            }
        }
        window.addEventListener('resize',debounce(()=>{
            if(that.drawShow !== 'none'){
                that.drawShow = 'none'
                this.openDraw()
            }
        },100),false)
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
        if(that.rubber){
            that.rubber = false
        }
        if(that.mark){
            that.mark = false
        }
        that.color = color
        that.ctx.lineWidth = 1
        that.toolStyle = []
        // that.toolStyle[index] = `background:white;border:7px solid ${color};`
        that.toolStyle[index] = 'box-shadow:aqua 0px 0px 30px 10px'
    }
    selectRubber(){
        if(that.mark){
            that.mark = false
        }
        that.color = 'white'
        that.ctx.lineWidth = 15
        if(!that.rubber){
            that.rubber = true
            that.toolStyle = []
            that.toolStyle[5] = `border: 1.5px dotted skyblue;`
        }
    }
    selectMark(){
        if(that.rubber){
            that.rubber = false
        }
        // that.color = 'white'
        if(!that.mark){
            that.mark = true
            that.toolStyle = []
            that.toolStyle[6] = `border: 1.5px dotted skyblue;`
        }
    }
    exitDraw(){
        that.drawShow = 'none'
        that.color = 'black'
        that.mark = false
        that.toolStyle = [,,,,'box-shadow:aqua 0px 0px 30px 10px']
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
            that.loading = true
            setTimeout(() => {
                that.loading = false
            }, 1000);
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
                }, 100);
            }
        }
    }
    start(e){
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
        
        if(that.mark){
            that.currentImageData = that.ctx.getImageData(0,0,canvas.width,canvas.height)
            that.markpen = canvas.getContext('2d')
            that.markpen.strokeStyle = '#FF00FF'
            that.markpen.lineWidth = 5
			that.markpen.beginPath()
            that.markpen.moveTo(that.x,that.y)
            that.tag = true
            that.markPoints[0] = [that.x,that.y]

            that.markLine = {}
            that.markLine.points = []
            that.markLine.points.push([that.x,that.y])
            that.markLine.x1 = that.x
            that.markLine.y1 = that.y
            that.markLine.x2 = that.x
            that.markLine.y2 = that.y
            return
        }

        that.path = new Path2D()
        that.path.moveTo(that.x,that.y)
        that.tag = true

        that.currentLine = {}
        that.currentLine.color = that.color
        that.currentLine.points = []
        that.currentLine.points.push([that.x,that.y])
        that.currentLine.x1 = that.x
        that.currentLine.y1 = that.y
        that.currentLine.x2 = that.x
        that.currentLine.y2 = that.y
    }
    otherStart(e){
        // if(that.color === 'white'){
        //     that.ctx.lineWidth = 15
        // }else{
        //     that.ctx.lineWidth = 1
        // }
        that.pens[e.ip].path = new Path2D()
        that.pens[e.ip].path.moveTo(e.clientX,e.clientY)
        that.pens[e.ip].tag = true
    }
    drawing(e){
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50

        if(that.mark && that.markpen){
            if(that.tag){
                that.markpen .lineTo(that.x,that.y)
                that.markpen .stroke()


                that.markLine.points.push([that.x,that.y])
                if(that.x < that.markLine.x1)   that.markLine.x1 = that.x
                if(that.y < that.markLine.y1)   that.markLine.y1 = that.y
                if(that.x > that.markLine.x2)   that.markLine.x2 = that.x
                if(that.y > that.markLine.y2)   that.markLine.y2 = that.y
            }
            return
        }
        
        if(that.tag){
            if(that.color === 'white'){
                that.ctx.lineWidth = 15
            }else{
                that.ctx.lineWidth = 1
            }
            that.ctx.strokeStyle = that.color
            that.path.lineTo(that.x,that.y)
            that.ctx.stroke(that.path)

            that.currentLine.points.push([that.x,that.y])
            if(that.x < that.currentLine.x1)   that.currentLine.x1 = that.x
            if(that.y < that.currentLine.y1)   that.currentLine.y1 = that.y
            if(that.x > that.currentLine.x2)   that.currentLine.x2 = that.x
            if(that.y > that.currentLine.y2)   that.currentLine.y2 = that.y
        }
    }
    otherDrawing(e){
        if(that.pens[e.ip].tag){
            if(e.color === 'white'){
                that.pens[e.ip].ctx.lineWidth = 15
            }else{
                that.pens[e.ip].ctx.lineWidth = 1
            }
            that.pens[e.ip].ctx.strokeStyle = e.color
            that.pens[e.ip].path.lineTo(e.clientX,e.clientY)
            that.pens[e.ip].ctx.stroke(that.pens[e.ip].path)
        }
    }
    stop(e){
        if(e){
            that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
            that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
        }

        if(that.mark && that.markpen){
            that.markPoints[1] = [that.x,that.y]
            if(that.internet){
                internet.checkDelete()
            }else{
                localnet.checkDelete()
            }
        }
        that.tag = false
    }
    otherStop(e){
        that.pens[e.ip].tag = false
    }
    sendStart(e){
        if(that.mark){
            return
        }
        let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
        let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
        if(that.internet){
            internet.sendStart(x,y)
        }else{
            localnet.sendStart(x,y)
        }
    }
    sendDrawing(e){
        if(that.mark){
            return
        }
        let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
        let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
        if(that.internet){
            internet.sendDrawing(x,y)
        }else{
            localnet.sendDrawing(x,y)
        }
    }
    sendStop(){
        if(that.mark){
            return
        }
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