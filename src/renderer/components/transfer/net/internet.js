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
            if(obj.status == 'createHome'){
                if(that.loading){
                    that.loading = false
                }
                if(obj.canCreate){
                    that.currentHome = obj.home.homeName
                    that.homes.push(obj.home)
                    that.openDraw()
                    that.$message({
                        type: 'success',
                        message: '创建成功',
                        duration: 1000
                    })
                    that.closeCreateHome()
                }else{
                    that.$message({
                        type: 'warning',
                        message: '此房名已被占用，重新起个名字吧',
                        duration: 1000
                    })
                    that.newHomeName = ''
                }
                // that.homes = obj.homes
                // this.enterHome(that.homes[that.homes.length - 1].homeName)
                // that.openDraw()
            }else if(obj.status == 'getHomes'){
                if(that.loading){
                    that.loading = false
                }
                that.homes = []
                obj.homeNames.forEach(e=>{
                    that.homes.push({
                        homeName: e,
                        members: [],
                        currentDraw: []
                    })
                })
                that.$message({
                    type: 'success',
                    message: '房间列表已刷新',
                    duration: 1000
                })
                // that.homes = obj.homes
                // that.$message({
                //     type: 'success',
                //     message: '房间列表已刷新',
                //     duration: 1000
                // })
                // if(that.currentHome){
                //     that.initPen()
                // }
            }else if(obj.status == 'addHome'){
                that.homes.push({
                    homeName: obj.homeName,
                    members: [],
                    currentDraw: []
                })
            }else if(obj.status == 'enterHome'){
                that.currentHome = obj.home.homeName
                that.homes[that.currentHomeIndex] = obj.home
                that.loading = false
                that.openDraw()
                that.$message({
                    type: 'success',
                    message: `进入房间-${obj.home.homeName}`,
                    duration: 1000
                })

                // that.homes = obj.homes
                // that.openDraw()
            }else if(obj.status == 'addMember'){
                if(that.currentHome === obj.homeName){
                    // let that.currentHomeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
                    if(that.homes[that.currentHomeIndex].members.indexOf(obj.ip) === -1){
                        that.homes[that.currentHomeIndex].members.push(obj.ip)
                    }
                    that.pens[obj.ip] = {}
                    that.pens[obj.ip].ctx = canvas.getContext("2d")
                    that.pens[obj.ip].ctx.lineWidth = 1
                    that.pens[obj.ip].path = new Path2D()
                    that.pens[obj.ip].tag = false
                }
            }else if(obj.status == 'deleteMember'){
                if(that.currentHome === obj.homeName){
                    let memberIndex = that.homes[that.currentHomeIndex].members.indexOf(obj.ip)
                    if(memberIndex !== -1){
                        that.homes[that.currentHomeIndex].members.splice(memberIndex,1)
                        let home = that.homes[that.currentHomeIndex]
                        that.$set(that.homes, that.currentHomeIndex, home)
                        that.pens[obj.ip] = null
                    }
                }
            }else if(obj.status == 'deleteHome'){
                let homeIndex = that.homes.map(e=>e.homeName).indexOf(obj.homeName)
                if(homeIndex !== -1){
                    that.homes.splice(homeIndex,1)
                }
            }else if(obj.status == 'otherStart'){
                that.otherStart(obj.e)
            }else if(obj.status == 'otherDrawing'){
                that.otherDrawing(obj.e)
            }else if(obj.status == 'otherStop'){
                that.otherStop(obj.e)
                that.homes[that.currentHomeIndex].currentDraw.push(obj.currentLine)
            }else if(obj.status == 'deleteLines'){
                let canvas = document.getElementById('canvas')
                if(that.currentHome === obj.homeName){
                    //本地删除
                    obj.deleteLines.forEach(e=>{
                        let lineIndex = that.homes[that.currentHomeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(e))
                        if(lineIndex !== -1){
                            that.homes[that.currentHomeIndex].currentDraw.splice(lineIndex,1)
                        }
                    })

                    //本地重绘
                    that.ctx.clearRect(0,0,canvas.width,canvas.height)
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
                }
            }
            // }else if(obj.status == 'updateCurrentDraw'){
            //     let canvas = document.getElementById('canvas')
            //     if(that.currentHome){
            //         let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
            //         that.homes[homeIndex].currentDraw = obj.currentDraw
            //         if(obj.deleteLine){
            //             that.ctx.clearRect(0,0,canvas.width,canvas.height)
            //             that.homes[homeIndex].currentDraw.forEach(e=>{
            //                 let ctx = canvas.getContext("2d")
            //                 let path = new Path2D()
            //                 ctx.strokeStyle = e.color
            //                 if(e.color === 'white'){
            //                     ctx.lineWidth = 15
            //                 }else{
            //                     ctx.lineWidth = 1
            //                 }
            //                 e.points.forEach((item,index)=>{
            //                     if(index == 0){
            //                         path.moveTo(item[0],item[1])
            //                     }else{
            //                         path.lineTo(item[0],item[1])
            //                         ctx.stroke(path)
            //                     }
            //                 })
            //             })
            //         }
            //     }
            // }
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
        that.loading = true
        ws.send(JSON.stringify({
            status: 'getHomes',
            ip: that.ip
        }));

        // ws.send(JSON.stringify({
        //     status: 'getHomes',
        //     ip: that.ip
        // }));
    }
    createHome(){
        that.loading = true
        ws.send(JSON.stringify({
            status: 'createHome',
            homeName: that.newHomeName,
            ip: that.ip
        }));
        // that.closeCreateHome()
        // that.$message({
        //     type: 'success',
        //     message: '创建成功',
        //     duration: 1000
        // })
        // ws.send(JSON.stringify({
        //     status: 'createHome',
        //     homeName: that.newHomeName,
        //     ip: that.ip
        // }));
        // that.closeCreateHome()
    }
    enterHome(item){
        let tag = true
        that.loading = true
        setTimeout(() => {
            if(that.loading && tag){
                that.loading = false
                that.$message({
                    type: 'erorr',
                    message: '进入失败，请稍后再试',
                    duration: 1000
                })
            }
        }, 5000);
        ws.send(JSON.stringify({
            status: 'enterHome',
            homeName: item,
            ip: that.ip
        }))

        // that.currentHome = item
        // ws.send(JSON.stringify({
        //     status: 'enterHome',
        //     homeName: that.currentHome,
        //     ip: that.ip
        // }))
    }
    exitHome(){
        // let currentHome = that.currentHome
        that.homes[that.currentHomeIndex] = {
            homeName: that.currentHome,
            members: [],
            currentDraw: []
        }
        ws.send(JSON.stringify({
            status: 'exitHome',
            homeName: that.currentHome,
            ip: that.ip
        }))
        that.exitDraw() //先关闭画板
        that.currentHome = '' //后退房

        


        // ws.send(JSON.stringify({
        //     status: 'exitHome',
        //     homeName: that.currentHome,
        //     ip: that.ip
        // }))
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
            that.homes[that.currentHomeIndex].currentDraw.push(that.currentLine)
            that.currentLine = null
        }
        // if(that.currentLine && that.currentLine.points.length > 1){
        //     ws.send(JSON.stringify({
        //         status: 'sendStop',
        //         homeName: that.currentHome,
        //         ip: that.ip,
        //         e: {
        //             ip: that.ip
        //         },
        //         currentLine: that.currentLine
        //     }));
        //     that.currentLine = null
        // }
    }
    checkDelete(){
        let canvas = document.getElementById('canvas')
        that.ctx.putImageData(that.currentImageData,0,0);
        that.currentImageData = null
        let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        if(this.checkIsLine(that.markLine.points)){//直线
            let last = that.markLine.points.length - 1
            let k = (that.markLine.points[0][1] - that.markLine.points[last][1]) / (that.markLine.points[0][0] - that.markLine.points[last][0])
            let b = (that.markLine.points[0][1] - k * that.markLine.points[0][0])
            that.homes[homeIndex].currentDraw.forEach(e=>{
                if(e.color !== 'white'){
                    if((this.judgePoint(k,b,e.x1,e.y1) == true && this.judgePoint(k,b,e.x1,e.y2) == true && this.judgePoint(k,b,e.x2,e.y1) == true && this.judgePoint(k,b,e.x2,e.y2) == true) || (this.judgePoint(k,b,e.x1,e.y1) == false && this.judgePoint(k,b,e.x1,e.y2) == false && this.judgePoint(k,b,e.x2,e.y1) == false && this.judgePoint(k,b,e.x2,e.y2) == false)){
                        // break
                    }else{
                        let ctx = canvas.getContext('2d')
                        ctx.beginPath()
                        ctx.strokeStyle = 'white'
                        ctx.ellipse((that.markPoints[0][0] + that.markPoints[1][0]) / 2,(that.markPoints[0][1] + that.markPoints[1][1]) / 2,Math.sqrt(Math.pow(that.markPoints[0][0] - that.markPoints[1][0],2) + Math.pow(that.markPoints[0][1] - that.markPoints[1][1],2)) / 2,20,Math.atan((that.markPoints[0][1] - that.markPoints[1][1]) / (that.markPoints[0][0] - that.markPoints[1][0])),0,2*Math.PI);
                        for(let i = 0;i < e.points.length;i++){
                            if(ctx.isPointInPath(e.points[i][0],e.points[i][1])){
                                that.deleteLines.push(e)
                                break
                            }
                        }
                    }
                }
            })
        }else{//曲线
            let ctx = canvas.getContext('2d')
            ctx.beginPath()
            ctx.strokeStyle = 'red'
            ctx.rect(that.markLine.x1,that.markLine.y1,Math.abs(that.markLine.x1 - that.markLine.x2),Math.abs(that.markLine.y1 - that.markLine.y2))
            that.homes[homeIndex].currentDraw.forEach(e=>{
                if(e.color !== 'white'){
                    for(let i = 0;i < e.points.length;i++){
                        if(ctx.isPointInPath(e.points[i][0],e.points[i][1])){
                            that.deleteLines.push(e)
                            break
                        }
                    }
                }
            })
        }
        //本地删除
        that.deleteLines.forEach(e=>{
            let lineIndex = that.homes[that.currentHomeIndex].currentDraw.map(e=>JSON.stringify(e)).indexOf(JSON.stringify(e))
            if(lineIndex !== -1){
                that.homes[that.currentHomeIndex].currentDraw.splice(lineIndex,1)
            }
        })

        //本地重绘
        that.ctx.clearRect(0,0,canvas.width,canvas.height)
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

        //把要删去的线条数组发送至房内其他用户
        ws.send(JSON.stringify({
            status: 'deleteLines',
            homeName: that.currentHome,
            deleteLines: that.deleteLines,
            ip: that.ip
        }));

        that.deleteLines = []
        that.markpen = null
        that.markPoints = []
        that.markLine = null



        // let canvas = document.getElementById('canvas')
        // that.ctx.putImageData(that.currentImageData,0,0);
        // that.currentImageData = null
        // let homeIndex = that.homes.map(e=>e.homeName).indexOf(that.currentHome)
        // if(this.checkIsLine(that.markLine.points)){//直线
        //     let last = that.markLine.points.length - 1
        //     let k = (that.markLine.points[0][1] - that.markLine.points[last][1]) / (that.markLine.points[0][0] - that.markLine.points[last][0])
        //     let b = (that.markLine.points[0][1] - k * that.markLine.points[0][0])
        //     that.homes[homeIndex].currentDraw.forEach(e=>{
        //         if(e.color !== 'white'){
        //             if((this.judgePoint(k,b,e.x1,e.y1) == true && this.judgePoint(k,b,e.x1,e.y2) == true && this.judgePoint(k,b,e.x2,e.y1) == true && this.judgePoint(k,b,e.x2,e.y2) == true) || (this.judgePoint(k,b,e.x1,e.y1) == false && this.judgePoint(k,b,e.x1,e.y2) == false && this.judgePoint(k,b,e.x2,e.y1) == false && this.judgePoint(k,b,e.x2,e.y2) == false)){
        //                 // break
        //             }else{
        //                 let ctx = canvas.getContext('2d')
        //                 ctx.beginPath()
        //                 ctx.strokeStyle = 'white'
        //                 ctx.ellipse((that.markPoints[0][0] + that.markPoints[1][0]) / 2,(that.markPoints[0][1] + that.markPoints[1][1]) / 2,Math.sqrt(Math.pow(that.markPoints[0][0] - that.markPoints[1][0],2) + Math.pow(that.markPoints[0][1] - that.markPoints[1][1],2)) / 2,20,Math.atan((that.markPoints[0][1] - that.markPoints[1][1]) / (that.markPoints[0][0] - that.markPoints[1][0])),0,2*Math.PI);
        //                 for(let i = 0;i < e.points.length;i++){
        //                     if(ctx.isPointInPath(e.points[i][0],e.points[i][1])){
        //                         ws.send(JSON.stringify({
        //                             status: 'deleteLine',
        //                             homeName: that.currentHome,
        //                             line: e
        //                         }));
        //                         break
        //                     }
        //                 }
        //             }
        //         }
        //     })
        // }else{//曲线
        //     let ctx = canvas.getContext('2d')
        //     ctx.beginPath()
        //     ctx.strokeStyle = 'red'
        //     ctx.rect(that.markLine.x1,that.markLine.y1,Math.abs(that.markLine.x1 - that.markLine.x2),Math.abs(that.markLine.y1 - that.markLine.y2))
        //     that.homes[homeIndex].currentDraw.forEach(e=>{
        //         if(e.color !== 'white'){
        //             for(let i = 0;i < e.points.length;i++){
        //                 if(ctx.isPointInPath(e.points[i][0],e.points[i][1])){
        //                     ws.send(JSON.stringify({
        //                         status: 'deleteLine',
        //                         homeName: that.currentHome,
        //                         line: e
        //                     }));
        //                     break
        //                 }
        //             }
        //         }
        //     })
        // }
        // that.markpen = null
        // that.markPoints = []
        // that.markLine = null
    }
    checkIsLine(pointArray){
        if (pointArray === null || pointArray === undefined || pointArray.length < 3) {
            return false;
        }
        let startX = pointArray[0][0];
        let startY = pointArray[0][1];

        let endX = pointArray[pointArray.length - 1][0];
        let endY = pointArray[pointArray.length - 1][1];

        let tan = this.atan(endX - startX, endY - startY);
        for (let i in pointArray) {
            if (i > 4) {//这里相隔4个点比较一次
                let tantemp = this.atan(pointArray[i][0] - pointArray[i - 4][0],
                    pointArray[i][1] - pointArray[i - 4][1]);
                if (Math.abs(tantemp - tan) > 16) {//允许误差在16度
                    return false;
                }
            }
        }
        return true;
    }
    atan(x, y){
        return Math.atan(y / x) * 180 / Math.PI;
    }
    judgePoint(k,b,x,y){
        return y > k * x + b
    }
}

export {Internet}