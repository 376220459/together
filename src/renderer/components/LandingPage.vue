<template>
  <div class="whole">
    <div class="title">Hello，欢迎来到协作助手</div>
    <hr>
    <main>
      <div class="list">
        <el-button class="get-button" @click="getConnections">获取当前用户</el-button>
        <ul>
          <li v-for="(item, index) in connections" :key="index">
            <span>{{ item }}</span>
            <el-button @click="connectTo(item)">和他协作</el-button>
          </li>
        </ul>
      </div>
      <canvas @mousedown="start($event)" @mousemove="drawing($event)" @mouseup="stop" id="canvas" :style="{display:drawShow}">

      </canvas>
    </main>
  </div>
</template>

<script>
const ipc = require('electron').ipcRenderer

export default {
  data() {
    return {
      drawShow: 'none',
      connections: [],
      otherAddress: '',
      cxt: null,
      tag: false,
      x: 0,
      y: 0
    }
  },
  methods: {
    getConnections(){
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
      let canvas = document.getElementById('canvas')
      cxt = canvas.getContext("2d")
      ctx.lineWidth = 3
    },
    start(e){
      this.x = document.documentElement.scrollLeft + e.clientX;
      this.y = document.documentElement.scrollTop + e.clientY;
      ctx.moveTo(this.x,this.y)
      this.tag = true
    },
    drawing(e){
      if(this.tag){
        this.x = document.documentElement.scrollLeft + e.clientX;
        this.y = document.documentElement.scrollTop + e.clientY;
        ctx.lineTo(this.x,this.y)
        ctx.stroke()
      }
    },
    stop(){
      this.tag = false
    }
  },
  mounted() {
    ipc.on('notice-vice', (event, arg)=>{
      if(arg.status == 'getConnections'){
        console.log(arg.msg)
      }else if(arg.status == 'returnConnections'){
        console.log(arg.msg)
        this.connections = arg.connections;
        // this.$set(this.connections,0,...arg.connections)
      }else if(arg.status == 'responseDraw'){
        let con = confirm(`${arg.otherAddress} 请求与您一同协作，是否同意？`)
        if(con){
          console.log('同意对方的请求')
          this.openDraw();
          this.otherAddress = arg.otherAddress
          this.drawShow = 'block'
          ipc.send('notice-main', {
            status: 'agreeUser',
            agree: 'yes',
            otherAddress: this.otherAddress
          })
        }else{
          console.log('拒绝对方的请求')
          ipc.send('notice-main', {
            status: 'agreeUser',
            agree: 'no'
          })
        }
      }else if(arg.status == 'responseUser'){
        if(arg.agree == 'yes'){
          console.log('对方同意了你的请求')
          this.openDraw();
          this.otherAddress = arg.otherAddress
          this.drawShow = 'block'
        }else{
          console.log('对方拒绝了你的请求')
          alert('对方拒绝了你的请求')
          this.otherAddress = ''
        }
      }
      // else if(arg.status == 'start'){
      //   this.start_2(arg.e)
      // }else if(arg.status == 'stop'){
      //   this.stop_2()
      // }else if(arg.status == 'putPoint'){
      //   this.putPoint_2(arg.e)
      // }
    })
  },
}
</script>

<style lang="scss" scoped>
  .whole{
    height: 100%;
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
        padding: 20px;
        ul{
          margin-top: 15px;
        }
      }
      canvas{
        box-sizing: border-box;
        width: 70%;
        background: silver;
      }
    }
  }
</style>
