<template>
  <div class="whole">
    <div class="title">Hello，欢迎来到协作助手</div>
    <hr>
    <main>
      <div class="list">
        <el-button class="get-button" @click="getConnections" type="primary" round>刷新用户列表</el-button>
        <div class="user-title">用户列表:</div>
        <ul>
          <li v-for="(item, index) in connections" :key="index">
            <span>{{ item }}</span>
            <el-button @click="connectTo(item)" type="success" round>和他协作</el-button>
          </li>
        </ul>
      </div>
      <div class="canvas" id="canvasDiv">
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
import { clearTimeout } from 'timers';
const ipc = require('electron').ipcRenderer
function debounce(func,wait){
  let id = null;
  return function(){
    let args = arguments;
    let that = this;
    if(id){
      clearTimeout(id);
    }
    id = setTimeout(() => {
      func.apply(that,args)
    }, wait);
  }
}
window.addEventListener('resize',debounce(function(){
  let canvas = document.getElementById('canvas')
  let canvasDiv = document.getElementById('canvasDiv')
  canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
  canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
  // canvas.width = canvasDiv.offsetWidth
  // canvas.height = canvasDiv.offsetHeight
},500),false)

export default {
  data() {
    return {
      drawShow: 'none',
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
    getConnections(){
      // this.openDraw();
      ipc.send('notice-main', {
        status: 'getConnections'
      })
    },
    connectTo(address){
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
    },
    changeColor(color,index){
      this.color = color
      this.colorStyle = []
      // this.colorStyle[index] = 'width:25px;height:25px;border:2px solid #B0B0B0;'
      this.colorStyle[index] = `background:white;border:7px solid ${color};`
    },
    exitDraw(){
      this.drawShow = 'none'
      ipc.send('notice-main', {
        status: 'exitDraw',
        otherAddress: this.otherAddress
      })
      this.otherAddress = ''
    },
    openDraw(){
      this.drawShow = 'block'
      let canvas = document.getElementById('canvas')
      let canvasDiv = document.getElementById('canvasDiv')
      canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth
      canvas.height = canvasDiv.offsetHeight > 100 ? canvasDiv.offsetHeight - 100 : canvasDiv.offsetHeight
      // canvas.width = canvasDiv.offsetWidth - 50;
      // canvas.height = canvasDiv.offsetHeight - 50;
      this.ctx = canvas.getContext("2d")
      this.otherctx = canvas.getContext("2d")
      this.ctx.lineWidth = 3
      this.otherctx.lineWidth = 3
      // this.path = new Path2D()
      // this.otherpath = new Path2D()
    },
    start(e){
      let canvasDiv = document.getElementById('canvasDiv')
      this.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25
      this.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50
      this.ctx.beginPath()
      this.path = new Path2D()
      this.ctx.strokeStyle = this.color
      this.path.moveTo(this.x,this.y)
      this.tag = true
    },
    otherStart(e){
      this.otherColor = e.color
      this.ctx.beginPath()
      this.otherpath = new Path2D()
      this.otherctx.strokeStyle = this.otherColor
      this.otherpath.moveTo(e.clientX-50,e.clientY-50)
      this.othertag = true
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
      if(this.othertag){
        this.otherctx.strokeStyle = this.otherColor
        this.otherpath.lineTo(e.clientX-50,e.clientY-50)
        this.otherctx.stroke(this.otherpath)
      }
    },
    stop(){
      this.tag = false
    },
    otherStop(){
      this.othertag = false
    },
    sendStart(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
      ipc.send('notice-main', {
        status: 'sendStart',
        otherAddress: this.otherAddress,
        e: {
          clientX: x,
          clientY: y,
          color: this.color
        }
      })
    },
    sendDrawing(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft - 25;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop - 50;
      ipc.send('notice-main', {
        status: 'sendDrawing',
        otherAddress: this.otherAddress,
        e: {
          clientX: x,
          clientY: y
        }
      })
    },
    sendStop(){
      ipc.send('notice-main', {
        status: 'sendStop',
        otherAddress: this.otherAddress
      })
    }
  },
  mounted() {
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
        let con = confirm(`${arg.otherAddress} 请求与您一同协作，是否同意？`)
        if(con){
          console.log('同意对方的请求')
          this.openDraw();
          this.otherAddress = arg.otherAddress
          ipc.send('notice-main', {
            status: 'agreeUser',
            agree: 'yes',
            otherAddress: arg.otherAddress
          })
        }else{
          console.log('拒绝对方的请求')
          ipc.send('notice-main', {
            status: 'agreeUser',
            agree: 'no',
            otherAddress: arg.otherAddress
          })
        }
      }else if(arg.status == 'responseUser'){
        if(arg.agree == 'yes'){
          console.log(`${arg.otherAddress}同意了你的请求`)
          this.openDraw();
          this.otherAddress = arg.otherAddress
        }else{
          console.log(`${arg.otherAddress}拒绝了你的请求`)
          alert(`${arg.otherAddress}拒绝了你的请求`)
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
        this.drawShow = 'none'
        this.otherAddress = ''
      }
    })
  }
}
</script>

<style lang="scss" scoped>
  .whole{
    height: 100%;
    min-width: 1000px;
    min-height: 600px;
    display: flex;
    flex-direction: column;
    background: #F8F8F8;
    .title{
      padding: 15px 0;
      text-align: center;
      font-size: 30px;
      color: skyblue;
    }
    main{
      flex-grow: 1;
      display: flex;
      .list{
        box-sizing: border-box;
        width: 30%;
        border-right: 1px dotted black;
        padding: 20px;
        text-align: center;
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
