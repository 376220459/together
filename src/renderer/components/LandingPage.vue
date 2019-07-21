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
            <el-button @click="connectTo(item)">和他协作</el-button>
          </li>
        </ul>
      </div>
      <div class="canvas" id="canvasDiv">
        <canvas @mousedown="start($event);sendStart($event)" @mousemove="drawing($event);sendDrawing($event)" @mouseup="stop();sendStop()" id="canvas" :style="{display:drawShow}">
          <div>画板</div>
        </canvas>
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
  // canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth;
  // canvas.height = canvasDiv.offsetHeight > 50 ? canvasDiv.offsetHeight - 50 : canvasDiv.offsetHeight;
  canvas.width = canvasDiv.offsetWidth;
  canvas.height = canvasDiv.offsetHeight;
},500),false)

export default {
  data() {
    return {
      drawShow: 'none',
      connections: [],
      otherAddress: '',
      ctx: null,
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
      address = address.slice(0,-5)
      this.otherAddress = address
      ipc.send('notice-main', {
        status: 'requestUser',
        otherAddress: this.otherAddress
      })
    },
    openDraw(){
      this.drawShow = 'block'
      let canvas = document.getElementById('canvas')
      let canvasDiv = document.getElementById('canvasDiv')
      // canvas.width = canvasDiv.offsetWidth > 50 ? canvasDiv.offsetWidth - 50 : canvasDiv.offsetWidth;
      // canvas.height = canvasDiv.offsetHeight > 50 ? canvasDiv.offsetHeight - 50 : canvasDiv.offsetHeight;
      canvas.width = canvasDiv.offsetWidth;
      canvas.height = canvasDiv.offsetHeight;
      this.ctx = canvas.getContext("2d")
      this.ctx.lineWidth = 3
      this.path = new Path2D()
      this.otherpath = new Path2D()
    },
    start(e){
      let canvasDiv = document.getElementById('canvasDiv')
      this.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft;
      this.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop;
      this.path.moveTo(this.x,this.y)
      this.tag = true
    },
    otherStart(e){
      this.otherpath.moveTo(e.clientX,e.clientY)
      this.othertag = true
    },
    drawing(e){
      let canvasDiv = document.getElementById('canvasDiv')
      if(this.tag){
        this.x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft;
        this.y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop;
        this.path.lineTo(this.x,this.y)
        this.ctx.stroke(this.path)
      }
    },
    otherDrawing(e){
      if(this.othertag){
        this.otherpath.lineTo(e.clientX,e.clientY)
        this.ctx.stroke(this.otherpath)
      }
    },
    stop(){
      this.tag = false
    },
    otherStop(){
      this.othertag = false
    },
    sendStart(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop;
      ipc.send('notice-main', {
        status: 'sendStart',
        otherAddress: this.otherAddress,
        e: {
          clientX: x,
          clientY: y
        }
      })
    },
    sendDrawing(e){
      let x = document.documentElement.scrollLeft + e.clientX - canvasDiv.offsetLeft;
      let y = document.documentElement.scrollTop + e.clientY - canvasDiv.offsetTop;
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
    ipc.on('notice-vice', (event, arg)=>{
      if(arg.status == 'getConnections'){
        console.log(arg.msg)
      }else if(arg.status == 'returnConnections'){
        console.log(arg.msg)
        this.connections = arg.connections
        this.$message.success('有新用户加入啦')
        // this.$set(this.connections,0,...arg.connections)
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
      }
      // else if(arg.status == 'start'){
      //   this.start_2(arg.e)
      // }else if(arg.status == 'stop'){
      //   this.stop_2()
      // }else if(arg.status == 'putPoint'){
      //   this.putPoint_2(arg.e)
      // }
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
    .title{
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
          margin: 15px 0;
        }
        ul{
          overflow: auto;
        }
      }
      .canvas{
        box-sizing: border-box;
        width: 70%;
        position: relative;
        z-index: 10;
        canvas{
          position: relative;
          background: pink;
          border-radius: 50px;
          div{
            position: absolute;
          }
        }
      }
    }
  }
</style>
