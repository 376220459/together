import {Localnet} from './net/localnet'
import {Internet} from './net/internet'
let localnet = new Localnet(),
    internet = new Internet()
let that,canvas,canvasDiv

class Transfer{
    init(context){  //初始化
        canvas = document.getElementById('canvas')
        canvasDiv = document.getElementById('canvasDiv')
        that = context
        if(!that.ip){
            that.loading = true //防止网络慢，限制用户操作
        }
        that.ipc = require('electron').ipcRenderer  //ipc模块用于主进程和渲染进程通讯
        that.ipc.send('notice-main', {
            status: 'getIP'
        })
        that.ipc.on('notice-ip', (event, arg)=>{
            if(arg.status == 'getIP'){
                that.ip = arg.ip
                if(that.loading){
                    that.loading = false
                }
            }
        })
        that.ipc.on('notice-close', (event, arg)=>{
            if(arg.status == 'closeWindow' && that.currentHome){
                that.exitHome()
            }
        })
        
        localnet.init(that) //初始化局域网
        internet.init(that) //初始化公网

        function debounce(func,wait){   //防抖函数，用于用户缩放页面改变画布大小
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

    openInternet(){ //打开公网
        internet.openInternet(that)
    }

    openLocalnet(){ //打开局域网
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

    changeNet(){    //切换网络
        that.loading = true
        setTimeout(() => {  //防止网络太慢，限制用户操作
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
            that.loading = false
        }, 1000);
    }

    getHomes(){ //获取房间列表
        if(that.internet){
            internet.getHomes()
        }else{
            localnet.getHomes()
        }
    }

    createHome(){
        that.newHomeName = that.newHomeName.trim()
        if(that.newHomeName == ''){
            that.$message({
                type: 'warning',
                message: '空空如也，不知去向~',
                duration: 1000
            })
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

    changeColor(color,index){   //改变画笔颜色
        if(that.rubber){
            that.rubber = false
        }
        if(that.mark){
            that.mark = false
        }
        that.color = color
        that.ctx.lineWidth = 1
        that.toolStyle = []
        that.toolStyle[index] = 'box-shadow:aqua 0px 0px 30px 10px'
    }

    selectRubber(){ //普通橡皮擦
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

    selectMark(){   //选择擦除
        if(that.rubber){
            that.rubber = false
        }
        if(!that.mark){
            that.mark = true
            that.toolStyle = []
            that.toolStyle[6] = `border: 1.5px dotted skyblue;`
        }
    }

    

    initPen(){  //初始化房内用户的画笔
        if(that.currentHome){
            if(that.currentHomeIndex === -1){
                return
            }
            that.homes[that.currentHomeIndex].members.forEach(e=>{
                if(e !== that.ip){
                    that.pens[e] = {}
                    that.pens[e].ctx = canvas.getContext("2d")
                    that.pens[e].ctx.lineWidth = 1
                    that.pens[e].path = new Path2D()
                    that.pens[e].tag = false
                }
            })
        }
    }

    openDraw(){ //打开画布
        if(that.drawShow == 'none'){
            that.drawShow = 'block'
            setTimeout(() => {
                canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
                canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
            }, 0);
            that.ctx = canvas.getContext("2d") 
            that.ctx.lineWidth = 1

            if(that.currentHomeIndex !== -1 && that.homes[that.currentHomeIndex].members.length > 1){
                that.initPen()
            }

            if(that.homes[that.currentHomeIndex].currentDraw.length > 0){
                that.loading = true
                setTimeout(() => {
                    that.loading = false
                }, 1000);

                setTimeout(() => {
                    that.homes[that.currentHomeIndex].currentDraw.forEach(e=>{
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
                }, 0)
            }
        }
    }

    exitDraw(){ //退出画布
        that.drawShow = 'none'
        that.color = 'black'
        that.mark = false
        that.toolStyle = [,,,,'box-shadow:aqua 0px 0px 30px 10px']
    }

    start(e){   //自己画-开始
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50

        if(that.mark){
            that.currentImageData = that.ctx.getImageData(0,0,canvas.width,canvas.height)
            that.markpen = canvas.getContext('2d')
            that.markpen.lineWidth = 5
            that.markpen.strokeStyle = '#FF00FF'
			that.markpen.beginPath()
            that.markpen.moveTo(that.x,that.y)
            that.markPoints[0] = [that.x,that.y]
            that.tag = true

            //开始记录markLine
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

        //开始记录currentLine
        that.currentLine = {}
        that.currentLine.color = that.color
        that.currentLine.points = []
        that.currentLine.points.push([that.x,that.y])
        that.currentLine.x1 = that.x
        that.currentLine.y1 = that.y
        that.currentLine.x2 = that.x
        that.currentLine.y2 = that.y
    }

    otherStart(e){   //别人画-开始
        that.pens[e.ip].path = new Path2D()
        that.pens[e.ip].path.moveTo(e.clientX,e.clientY)
        that.pens[e.ip].tag = true
    }

    drawing(e){   //自己画-过程
        that.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        that.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50

        if(that.mark && that.markpen){
            if(that.tag){
                that.markpen.lineWidth = 5
                that.markpen.strokeStyle = '#FF00FF'
                that.markpen.lineTo(that.x,that.y)
                that.markpen.stroke()

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

    otherDrawing(e){   //别人画-过程
        otherDrawingArr.push(e)
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

    stop(e){   //自己画-结束
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
    
    otherStop(e){   //别人画-结束
        that.pens[e.ip].tag = false
    }

    sendStart(e){  //发送开始画信号
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

    sendDrawing(e){  //发送正在画信号
        if(that.mark){
            return
        }
        let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
        let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
        if(that.tag){
            if(that.internet){
                internet.sendDrawing(x,y)
            }else{
                localnet.sendDrawing(x,y)
            }
        }
    }
    
    sendStop(){  //发送结束画信号
        if(that.mark){
            return
        }
        if(that.internet){
            internet.sendStop()
        }else{
            localnet.sendStop()
        }
    }
    
    openCreateHome(){   //打开创建房间页面
        that.createHomeIf = true
    }

    closeCreateHome(){   //关闭创建房间页面
        that.createHomeIf = false
        that.newHomeName = ''
    }
}

export {Transfer}