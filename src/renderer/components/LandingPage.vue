<template>
  <div class="whole">
    <div class="select-net" v-if="!(internet || localnet)">
      <el-button @click="selectNet('localnet')" round type="primary">使用内网</el-button>
      <el-button @click="selectNet('internet')" round type="primary">使用公网</el-button>
    </div>

    <div class="create-home" v-if="createHomeIf">
      <i class="el-icon-close" title="关闭" @click="closeCreateHome"></i>
      <el-input v-model="newHomeName" placeholder="请输入房间名" maxlength="5"></el-input>
      <el-button @click="createHome" round type="success">Create</el-button>
    </div>

    <div class="title">Hello，欢迎来到协作助手</div>
    <hr>
    <main>
      <div class="home" v-if="this.currentHome == '' ? false : true">
        <div class="home-top">
          <div>当前房间：<span class="home-name">{{ this.currentHome }}</span></div>
          <el-button round type="danger" @click="exitHome">退出</el-button>
        </div>
        <ul>
          <li class="member" v-for="(item, index) in this.homes[this.currentHomeIndex].members" :key="index">
            <div>用户{{ index + 1 }}：{{ item }}</div>
            <!-- <el-button @click="connectTo(item)">和他协作</el-button> -->
          </li>
        </ul>
      </div>

      <div class="internet" v-if="internet && this.currentHome == '' ? true : false">
        <i class="el-icon-plus" title="创建房间" @click="openCreateHome"></i>
        <el-button class="change-net" icon="el-icon-sort" circle @click="changeNet" title="切换网络"></el-button>
        <el-button class="get-button" type="primary" round @click="getHomes" plain>刷新公网房间列表</el-button>
        <!-- <el-button class="get-button" type="primary" icon="el-icon-refresh" circle @click="getHomes"></el-button> -->
        <ul>
          <li class="home-item" v-for="(item, index) in homes" :key="index">
            <div style="cursor: pointer;">||房间{{ index + 1 }}：{{ item.homeName }}({{ item.members.length }}人)</div>
            <el-button round type="success" @click="enterHome(item.homeName,index)">进入</el-button>
          </li>
        </ul>
      </div>

      <div class="localnet" v-if="localnet && this.currentHome == '' ? true : false">
        <i class="el-icon-plus" title="创建房间" @click="openCreateHome"></i>
        <el-button class="change-net" icon="el-icon-sort" circle @click="changeNet" title="切换网络"></el-button>
        <el-button class="get-button" @click="getConnections" type="primary" round plain>刷新内网房间列表</el-button>
        <ul>
          <li class="home-item" v-for="(item, index) in homes" :key="index">
            <div style="cursor: pointer;">||房间{{ index + 1 }}：{{ item.homeName }}({{ item.members.length }}人)</div>
            <el-button round type="success" @click="enterHome(item.homeName,index)">进入</el-button>
          </li>
        </ul>
        <!-- <div class="user-title">用户列表:</div>
        <ul>
          <li v-for="(item, index) in connections" :key="index">
            <span>{{ item }}</span>
            <el-button @click="connectTo(item)" type="success" round>和他协作</el-button>
          </li>
        </ul> -->
      </div>
      <div class="canvas" id="canvasDiv" v-show="this.drawShow == 'block' ? true : false">
        <div v-if="this.drawShow == 'block' ? true : false" class="canvas-top">
          <div class="canvas-tip">您正在与 {{ otherAddress }} 协作...</div>
          <el-button @click="exitDraw" type="danger" round>终止协作</el-button>
        </div>
        <canvas @mousedown="start($event);sendStart($event)" @mousemove="drawing($event);sendDrawing($event)" @mouseup="stop();sendStop()" id="canvas" :style="{display:drawShow}">
          您的浏览器暂不支持canvas...
        </canvas>
        <div v-if="this.drawShow == 'block' ? true : false" class="canvas-tools">
          <div @click="changeColor('#F56C6C',0)" class="red" :style=colorStyle[0]></div>
          <div @click="changeColor('#67C23A',1)" class="green" :style=colorStyle[1]></div>
          <div @click="changeColor('#909399',2)" class="gray" :style=colorStyle[2]></div>
          <div @click="changeColor('#E6A23C',3)" class="orange" :style=colorStyle[3]></div>
          <div @click="changeColor('black',4)" class="black" :style=colorStyle[4]></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { fail } from 'assert';
const ipc = require('electron').ipcRenderer

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
window.addEventListener('resize',debounce(function(){
  let canvas = document.getElementById('canvas')
  let canvasDiv = document.getElementById('canvasDiv')
  if(canvas.style.display == 'block'){
    console.log(canvasDiv.offsetWidth,canvasDiv.offsetHeight)
    canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
    canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
  }
  // canvas.width = canvasDiv.offsetWidth
  // canvas.height = canvasDiv.offsetHeight
},500),false)

export default {
  data() {
    return {
      pens:{},
      localnetOpened: false,
      ws: null,
      internet: false,
      localnet: false,
      ip: '',
      currentHome: '',
      currentHomeIndex: '',
      homes: [],
      newHomeName: '',
      drawShow: 'none',
      createHomeIf: false,
      color: 'black',
      colorStyle: [,,,,'background:white;border:7px solid black;'],
      otherColor: 'black',
      connections: [],
      otherAddress: '',
      ctx: null,
      otherctx: null,
      path: null,
      otherpath: null,
      tag: false,
      othertag: false,
      x: 0,
      y: 0
    }
  },
  methods: {
    changeNet(){
      if(this.internet){
        if(this.otherAddress){
          this.exitDraw()
        }
        this.internet = false
        this.localnet = true

        this.ws.close()
        this.openLocalnet()
      }else{
        if(this.otherAddress){
          this.exitDraw()
        }
        this.localnet = false
        this.internet = true

        ipc.removeAllListeners('notice-vice')
        this.openInternet()
      }
      this.homes = []
    },
    getHomes(){
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'getHomes',
            ip: this.ip
        }));
      }else{
        ipc.send('notice-main', {
          status: 'getHomes'
        })
      }
    },
    openInternet(){
        this.ws = new WebSocket(`ws://192.168.1.196:8888?ip=${this.ip}`)
        // this.ws = new WebSocket(`ws://192.168.16.102:8888?ip=${this.ip}`)
        this.ws.onmessage = e=>{
            let obj = JSON.parse(e.data)
            if(obj.status == 'addNewHome'){
              this.homes = obj.homes
              
              this.enterHome(this.homes[this.homes.length - 1].homeName,this.homes.length - 1)
              // this.currentHomeIndex = this.homes.length - 1
              // this.currentHome = this.homes[this.homes.length - 1].homeName
            }else if(obj.status == 'getHomes'){
              this.homes = obj.homes
              this.$message({
                type: 'success',
                message: '房间列表已刷新',
                duration: 1000
              })
              if(this.currentHome){
                this.initPen()
              }
            }else if(obj.status == 'requestDraw'){
              this.$confirm(`${obj.otherAddress} 请求与您一同协作，是否同意？`, '协作助手', {
                confirmButtonText: '同意',
                cancelButtonText: '拒绝',
                type: 'warning'
              }).then(() => {
                console.log('同意对方的请求')
                this.openDraw();
                this.otherAddress = obj.otherAddress
                this.ws.send(JSON.stringify({
                    status: 'responseDraw',
                    ip: this.ip,
                    otherAddress: obj.otherAddress,
                    agree: 'yes'
                }))
              }).catch(() => {
                console.log('拒绝对方的请求')
                this.ws.send(JSON.stringify({
                    status: 'responseDraw',
                    ip: this.ip,
                    otherAddress: obj.otherAddress,
                    agree: 'no'
                }))          
              });
            }else if(obj.status == 'responseDraw'){
              // console.log(obj.agree)
              if(obj.agree == 'yes'){
                console.log(`${obj.otherAddress}同意了你的请求`)
                this.$message.success(`成功与${obj.otherAddress}建立连接`)
                this.openDraw();
                this.otherAddress = obj.otherAddress
              }else{
                console.log(`${obj.otherAddress}拒绝了你的请求`)
                this.$message.warning(`${obj.otherAddress}拒绝了你的请求`)
                this.otherAddress = ''
              }
            }else if(obj.status == 'otherStart'){
              this.otherStart(obj.e)
            }else if(obj.status == 'otherDrawing'){
              this.otherDrawing(obj.e)
            }else if(obj.status == 'otherStop'){
              // this.otherStop()
              this.otherStop(obj.e)
            }else if(obj.status == 'exitDraw'){
              this.$message.warning(`${this.otherAddress}终止了协作`)
              this.drawShow = 'none'
              this.otherAddress = ''
            }
        }
        this.ws.onopen = ()=>{
            console.log('ws通道已打开')
            if(this.ws.readyState === 1){
                this.ws.send(JSON.stringify({
                    status: 'connect',
                    ip: this.ip
                }));

                this.getHomes()
            }
        }
        this.ws.onclose = ()=>{
            console.log('ws通道已关闭');
            // this.openInternet()
        }
    },
    openLocalnet(){
      if(!this.localnetOpened){
        this.localnetOpened = true

        ipc.send('notice-main', {
          status: 'openLocalnet'
        })
      }
      
      ipc.send('notice-main', {
        status: 'connect'
      })
      
      this.getConnections()

      ipc.on('notice-vice', (event, arg)=>{
        if(arg.status == 'getConnections'){
          console.log(arg.msg)
        }else if(arg.status == 'returnConnections'){
          console.log(arg.msg)
          if(this.connections.join('') != arg.connections.join('')){
            this.$message({
              message: '用户列表更新啦',
              type: 'success',
              duration: 1500
            })
            this.connections = arg.connections
          // this.$set(this.connections,0,...arg.connections)
          }else{
            this.$message({
              message: '似乎并没有新用户加入',
              type: 'info',
              duration: 1500
            })
          }
        }else if(arg.status == 'responseDraw'){
          this.$confirm(`${arg.otherAddress} 请求与您一同协作，是否同意？`, '协作助手', {
            confirmButtonText: '同意',
            cancelButtonText: '拒绝',
            type: 'warning'
          }).then(() => {
            console.log('同意对方的请求')
            this.openDraw();
            this.otherAddress = arg.otherAddress
            ipc.send('notice-main', {
              status: 'agreeUser',
              agree: 'yes',
              otherAddress: arg.otherAddress
            })
          }).catch(()=>{
            console.log('拒绝对方的请求')
            ipc.send('notice-main', {
              status: 'agreeUser',
              agree: 'no',
              otherAddress: arg.otherAddress
            })
          });
        }else if(arg.status == 'responseUser'){
          if(arg.agree == 'yes'){
            console.log(`${arg.otherAddress}同意了你的请求`)
            this.$message.success(`成功与${arg.otherAddress}建立连接`)
            this.openDraw();
            this.otherAddress = arg.otherAddress
          }else{
            console.log(`${arg.otherAddress}拒绝了你的请求`)
            this.$message.warning(`${arg.otherAddress}拒绝了你的请求`)
            this.otherAddress = ''
          }
        }else if(arg.status == 'otherStart'){
          this.otherStart(arg.e)
        }else if(arg.status == 'otherDrawing'){
          this.otherDrawing(arg.e)
        }else if(arg.status == 'otherStop'){
          this.otherStop()
        }else if(arg.status == 'exitDraw'){
          // console.log('对方终止了协作')
          this.$message.warning(`${this.otherAddress}终止了协作`)
          this.drawShow = 'none'
          this.otherAddress = ''
        }else if(arg.status == 'getHomes'){
          this.homes = arg.homes
          console.log('房间列表更新')
        }else if(arg.status == 'addNewHome'){
          this.homes = arg.homes
          console.log(this.homes[this.homes.length - 1])
          this.enterHome(this.homes[this.homes.length - 1].homeName,this.homes.length - 1)
        }
      })
    },
    openCreateHome(){
      this.createHomeIf = true
    },
    closeCreateHome(){
      this.createHomeIf = false
      this.newHomeName = ''
    },
    createHome(){
      this.newHomeName = this.newHomeName.trim()
      if(this.newHomeName == '' || this.homes.map(e=>e.homeName).indexOf(this.newHomeName) !== -1){
        this.$message.error('创建失败，换个名字试试')
        return
      }
      if(this.internet){ 
        this.$message({
          type: 'success',
          message: '创建成功',
          duration: 1000
        })
        this.ws.send(JSON.stringify({
            status: 'addNewHome',
            homeName: this.newHomeName,
            ip: this.ip
        }));
        this.closeCreateHome()
      }else{
        this.$message({
          type: 'success',
          message: '创建成功',
          duration: 1000
        })
        ipc.send('notice-main', {
          status: 'addNewHome',
          homeName: this.newHomeName
        })
        this.closeCreateHome()
      }
    },
    enterHome(item,index){
      this.currentHomeIndex = index
      this.currentHome = item
      
      this.openDraw()
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'enterHome',
            homeName: this.currentHome,
            ip: this.ip
        }));
      }else{
        ipc.send('notice-main', {
          status: 'enterHome',
          homeName: this.currentHome
        })
      }
    },
    exitHome(){
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'exitHome',
            homeName: this.currentHome,
            ip: this.ip
        }));
      }else{
        ipc.send('notice-main', {
          status: 'exitHome',
          homeName: this.currentHome
        })
      }
      this.currentHome = ''
      this.currentHomeIndex = ''
      this.exitDraw()
    },
    selectNet(net){
      if(net === 'internet'){
        this.internet = true
        this.openInternet()
      }else{
        this.localnet = true
        this.openLocalnet()
      }
    },
    getConnections(){
      // this.openDraw();
      ipc.send('notice-main', {
        status: 'getConnections'
      })
    },
    connectTo(address){
      if(address === this.ip){
        this.$message({
          type: 'warning',
          message: '不能选择自己哦',
          duration: 1000
        })
        return
      }
      if(this.internet){
        if(this.drawShow === 'block'){
          this.$confirm(`您确定要终止与 ${this.otherAddress} 的协作吗？`, '协作助手', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            this.exitDraw()
          }).catch(()=>{
            console.log('取消操作')
          });
        }else{
          this.ws.send(JSON.stringify({
              status: 'requestDraw',
              ip: this.ip,
              otherAddress: address
          }));
          // address = address.slice(0,-5)
          // ipc.send('notice-main', {
          //   status: 'requestUser',
          //   otherAddress: address
          // })
        }
      }else{
        if(this.drawShow === 'block'){
          this.$confirm(`您确定要终止与 ${this.otherAddress} 的协作吗？`, '协作助手', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            this.exitDraw()
          }).catch(()=>{
            console.log('取消操作')
          });
        }else{
          address = address.slice(0,-5)
          ipc.send('notice-main', {
            status: 'requestUser',
            otherAddress: address
          })
        }
      }
    },
    changeColor(color,index){
      this.color = color
      this.colorStyle = []
      // this.colorStyle[index] = 'width:25px;height:25px;border:2px solid #B0B0B0;'
      this.colorStyle[index] = `background:white;border:7px solid ${color};`
    },
    exitDraw(){
      if(this.internet){
        this.drawShow = 'none'
        // this.ws.send(JSON.stringify({
        //     status: 'exitDraw',
        //     ip: this.ip,
        //     otherAddress: this.otherAddress
        // }));
        this.otherAddress = ''
      }else{
        this.drawShow = 'none'
        ipc.send('notice-main', {
          status: 'exitDraw',
          otherAddress: this.otherAddress
        })
        this.otherAddress = ''
      }
    },
    initPen(){
      let canvas = document.getElementById('canvas')
      let canvasDiv = document.getElementById('canvasDiv')

      this.homes[this.currentHomeIndex].members.forEach(e=>{
        this.pens[e] = {}
        this.pens[e].ctx = canvas.getContext("2d")
        this.pens[e].path = new Path2D()
        this.pens[e].tag = false
      })
    },
    openDraw(){
      if(this.drawShow == 'none'){
        this.drawShow = 'block'
        let canvas = document.getElementById('canvas')
        let canvasDiv = document.getElementById('canvasDiv')
        setTimeout(() => {
          canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
          canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
          // canvas.width = canvasDiv.offsetWidth - 50;
          // canvas.height = canvasDiv.offsetHeight - 50;
        }, 0);
        this.ctx = canvas.getContext("2d")
        this.ctx.lineWidth = 3


        this.initPen()

        this.otherctx = canvas.getContext("2d")
        this.otherctx.lineWidth = 3
        // this.path = new Path2D()
        // this.otherpath = new Path2D()
      }
    },
    start(e){
      let canvasDiv = document.getElementById('canvasDiv')
      this.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
      this.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
      // this.ctx.beginPath()
      this.path = new Path2D()
      // this.ctx.strokeStyle = this.color
      this.path.moveTo(this.x,this.y)
      this.tag = true
    },
    otherStart(e){
      // this.otherColor = e.color
      // // this.otherctx.beginPath()
      // this.otherpath = new Path2D()
      // // this.otherctx.strokeStyle = this.otherColor
      // this.otherpath.moveTo(e.clientX,e.clientY)
      // this.othertag = true


      
      
      this.pens[e.ip].path = new Path2D()
      this.pens[e.ip].path.moveTo(e.clientX,e.clientY)
      this.pens[e.ip].tag = true
    },
    drawing(e){
      let canvasDiv = document.getElementById('canvasDiv')
      if(this.tag){
        this.ctx.strokeStyle = this.color
        this.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
        this.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
        this.path.lineTo(this.x,this.y)
        this.ctx.stroke(this.path)
      }
    },
    otherDrawing(e){
      // if(this.othertag){
      if(this.pens[e.ip].tag){
        // this.otherctx.strokeStyle = this.otherColor
        // this.otherpath.lineTo(e.clientX,e.clientY)
        // this.otherctx.stroke(this.otherpath)


        // console.log(e)
        
        this.pens[e.ip].ctx.strokeStyle = e.color
        this.pens[e.ip].path.lineTo(e.clientX,e.clientY)
        this.pens[e.ip].ctx.stroke(this.pens[e.ip].path)
      }
    },
    stop(){
      this.tag = false
    },
    otherStop(e){
      // this.othertag = false



      this.pens[e.ip].tag = false
    },
    sendStart(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'sendStart',
            homeName: this.currentHome,
            ip: this.ip,
            // otherAddress: this.otherAddress,
            e: {
              ip: this.ip,
              clientX: x,
              clientY: y,
              color: this.color
            }
        }));
      }else{
        ipc.send('notice-main', {
          status: 'sendStart',
          otherAddress: this.otherAddress,
          e: {
            clientX: x,
            clientY: y,
            color: this.color
          }
        })
      }
    },
    sendDrawing(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'sendDrawing',
            homeName: this.currentHome,
            ip: this.ip,
            // otherAddress: this.otherAddress,
            e: {
              ip: this.ip,
              clientX: x,
              clientY: y,
              color: this.color
            }
        }));
      }else{
        ipc.send('notice-main', {
          status: 'sendDrawing',
          otherAddress: this.otherAddress,
          e: {
            clientX: x,
            clientY: y
          }
        })
      }
    },
    sendStop(){
      if(this.internet){
        this.ws.send(JSON.stringify({
            status: 'sendStop',
            homeName: this.currentHome,
            ip: this.ip,
            // otherAddress: this.otherAddress
            e: {
              ip: this.ip
            }
        }));
      }else{
        ipc.send('notice-main', {
          status: 'sendStop',
          otherAddress: this.otherAddress
        })
      }
    }
  },
  mounted() {
    ipc.send('notice-main', {
      status: 'getIP'
    })

    ipc.on('notice-ip', (event, arg)=>{
      if(arg.status == 'getIP'){
        this.ip = arg.ip
      }
    })
  }
}
</script>

<style lang="scss" scoped>
  .whole{
    position: relative;
    height: 100%;
    min-width: 1000px;
    min-height: 600px;
    display: flex;
    flex-direction: column;
    background: #F8F8F8;
    .select-net{
      position: absolute;
      width: 240px;
      height: 150px;
      border: 1px solid skyblue;
      border-radius: 30px;
      left: 50%;
      top: 50%;
      margin-left: -90px;
      margin-top: -50px;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      button{
        margin: 0;
      }
    }
    .create-home{
      position: absolute;
      width: 270px;
      height: 180px;
      border: 1px solid #67C23A;
      border-radius: 30px;
      left: 50%;
      top: 50%;
      margin-left: -90px;
      margin-top: -50px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .el-input{
        width: 80%;
        margin-bottom: 15px;
      }
      .el-icon-close{
        position: absolute;
        right: 20px;
        top: 10px;
        cursor: pointer;
      }
    }
    .title{
      padding: 15px 0;
      text-align: center;
      font-size: 30px;
      color: skyblue;
    }
    main{
      flex-grow: 1;
      display: flex;
      .home,.internet,.localnet{
        box-sizing: border-box;
        position: relative;
        width: 30%;
        border-right: 1px dotted black;
        padding: 20px;
        text-align: center;
      }
      .home{
        .home-top{
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px dotted black;
          padding: 10px 0;
          .home-name{
            color: #67C23A;
          }
        }
        .member{
          margin: 10px 0 10px 20px;
          color: skyblue;
          display: flex;
          justify-content: space-around;
          align-items: center;
        }
      }
      .internet{
        // box-sizing: border-box;
        // position: relative;
        // width: 30%;
        // border-right: 1px dotted black;
        // padding: 20px;
        // text-align: center;
        .change-net{
          position: absolute;
          top: 5px;
          left: 5px;
          cursor: pointer;
        }
        .el-icon-plus{
          position: absolute;
          top: 5px;
          right: 5px;
          color: #409EFF;
          font-size: 30px;
          cursor: pointer;
        }
        .home-item{
          position: relative;
          display: flex;
          justify-content: space-around;
          align-items: center;
          margin: 15px 0;
          // text-align: left;
          color: #67C23A;
          // .member{
          //   margin: 10px 0 10px 20px;
          //   color: skyblue;
          //   display: flex;
          //   justify-content: space-around;
          //   align-items: center;
          // }
          // .enter-home{
          //   position: absolute;
          //   top: 0;
          //   right: 0;
          //   cursor: pointer;
          // }
        }
      }
      .localnet{
        // box-sizing: border-box;
        // width: 30%;
        // border-right: 1px dotted black;
        // padding: 20px;
        // text-align: center;
        .change-net{
          position: absolute;
          top: 5px;
          left: 5px;
          cursor: pointer;
        }
        .el-icon-plus{
          position: absolute;
          top: 5px;
          right: 5px;
          color: #409EFF;
          font-size: 30px;
          cursor: pointer;
        }
        .user-title{
          box-sizing: border-box;
          border-top: 1px dashed black;
          margin: 15px 0;
          padding-top: 5px;
          text-align: left;
        }
        ul{
          overflow: auto;
        }
      }
      .canvas{
        box-sizing: border-box;
        position: relative;
        width: 70%;
        z-index: 10;
        padding: 50px 25px;
        .canvas-top{
          position: absolute;
          width: 100%;
          height: 48px;
          margin-left: -25px;
          margin-top: -50px;
          display: flex;
          justify-content: center;
          align-items: center;
          .canvas-tip{
            margin-right: 15px;
          }
        }
        .canvas-tools{
          position: absolute;
          width: 100%;
          height: 48px;
          margin-left: -25px;
          margin-bottom: -50px;
          display: flex;
          justify-content: center;
          align-items: center;
          div{
            box-sizing: border-box;
            margin: 0 10px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
          }
          .red{
            background: #F56C6C;
          }
          .green{
            background: #67C23A;
          }
          .gray{
            background: #909399;
          }
          .orange{
            background: #E6A23C;
          }
          .black{
            background: black;
          }
        }
        canvas{
          box-sizing: border-box;
          position: relative;
          background: white;
          border: 1px solid skyblue;
          border-radius: 50px;
          cursor: crosshair;
        }
      }
    }
  }
</style>
