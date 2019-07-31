<template>
  <div class="whole" v-loading="loading" element-loading-text="努力加载画板中..." element-loading-spinner="el-icon-loading" element-loading-background="rgba(0, 0, 0, 0.8)">
    <div class="select-net" v-if="!(internet || localnet)">
      <el-button @click="selectNet('localnet')" round type="primary">使用内网</el-button>
      <el-button @click="selectNet('internet')" round type="primary">使用公网</el-button>
    </div>

    <div class="create-home" v-if="createHomeIf">
      <i class="el-icon-close" title="关闭" @click="closeCreateHome"></i>
      <el-input v-model="newHomeName" placeholder="请输入房间名" maxlength="9" @keydown.enter.native="createHome" autofocus></el-input>
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
          <li class="member" v-for="(item, index) in this.homes[this.homes.map(e=>e.homeName).indexOf(this.currentHome)].members" :key="index">
            <div class="self" v-if="item == ip">自己：{{ item }}</div>
            <div v-else>用户{{ index + 1 }}：{{ item }}</div>
          </li>
        </ul>
      </div>

      <div class="internet" v-if="internet && this.currentHome == '' ? true : false">
        <i class="el-icon-plus" title="创建房间" @click="openCreateHome"></i>
        <el-button class="change-net" icon="el-icon-sort" circle @click="changeNet" title="切换网络"></el-button>
        <el-button class="get-button" type="primary" round @click="getHomes" plain>刷新公网房间列表</el-button>
        <ul v-if="homes.length ? true :false">
          <li class="home-item" v-for="(item, index) in homes" :key="index">
            <div style="cursor: pointer;">||房间{{ index + 1 }}：{{ item.homeName }}({{ item.members.length }}人)</div>
            <el-button round type="success" @click="enterHome(item.homeName)">进入</el-button>
          </li>
        </ul>
      </div>

      <div class="localnet" v-if="localnet && this.currentHome == '' ? true : false">
        <i class="el-icon-plus" title="创建房间" @click="openCreateHome"></i>
        <el-button class="change-net" icon="el-icon-sort" circle @click="changeNet" title="切换网络"></el-button>
        <el-button class="get-button" @click="getHomes" type="primary" round plain>刷新内网房间列表</el-button>
        <ul v-if="homes.length ? true :false">
          <li class="home-item" v-for="(item, index) in homes" :key="index">
            <div style="cursor: pointer;">||房间{{ index + 1 }}：{{ item.homeName }}({{ item.members.length }}人)</div>
            <el-button round type="success" @click="enterHome(item.homeName)">进入</el-button>
          </li>
        </ul>
      </div>
      <div class="canvas" id="canvasDiv" v-show="this.drawShow == 'block' ? true : false">
        <canvas @mousedown="start($event);sendStart($event)" @mousemove="drawing($event);sendDrawing($event)" @mouseup="stop();sendStop()" @mouseleave="stop();sendStop()" id="canvas" :style="{display:drawShow}">
          您的浏览器暂不支持canvas...
        </canvas>
        <div v-if="this.drawShow == 'block' ? true : false" class="canvas-tools">
          <div @click="changeColor('#F56C6C',0)" class="red pen" :style=toolStyle[0]></div>
          <div @click="changeColor('#67C23A',1)" class="green pen" :style=toolStyle[1]></div>
          <div @click="changeColor('#909399',2)" class="gray pen" :style=toolStyle[2]></div>
          <div @click="changeColor('#E6A23C',3)" class="orange pen" :style=toolStyle[3]></div>
          <div @click="changeColor('black',4)" class="black pen" :style=toolStyle[4]></div>
          <div @click="selectRubber" class="rubber" :style=toolStyle[5]><i class="iconfont icon-xiangpi"></i></div>
          <div @click="selectMark" class="mark" :style=toolStyle[6]><i class="iconfont icon-masaike"></i></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import {Localnet} from './transfer/net/localnet'
import {Internet} from './transfer/net/internet'
import {Transfer} from './transfer/transfer'
let localnet = new Localnet(),
    internet = new Internet(),
    transfer = new Transfer()



export default {
  data() {
    return {
      loading: false,
      currentLine: null,
      rubber: false,
      mark: false,
      markpen: null,
      currentImageData: null,
      pens:{},
      localnetOpened: false,
      ipc: null,
      ws: null,
      internet: false,
      localnet: false,
      ip: '',
      currentHome: '',
      homes: [],
      newHomeName: '',
      drawShow: 'none',
      createHomeIf: false,
      color: 'black',
      toolStyle: [,,,,'box-shadow:aqua 0px 0px 30px 10px'],
      otherColor: 'black',
      connections: [],
      ctx: null,
      path: null,
      tag: false,
      x: 0,
      y: 0
    }
  },
  methods: {
    selectNet(net){
      transfer.selectNet(net)
    },
    getHomes(){
      transfer.getHomes()
    },
    changeNet(){
      transfer.changeNet()
    },
    createHome(){
      transfer.createHome()
    },
    enterHome(item){
      transfer.enterHome(item)
    },
    exitHome(){
      transfer.exitHome()
    },
    openDraw(){
      transfer.openDraw()
    },
    initPen(){
      transfer.initPen()
    },
    changeColor(color,index){
      transfer.changeColor(color,index)
    },
    selectRubber(){
      transfer.selectRubber()
    },
    selectMark(){
      transfer.selectMark()
    },
    start(e){
      transfer.start(e)
    },
    otherStart(e){
      transfer.otherStart(e)
    },
    drawing(e){
      transfer.drawing(e)
    },
    otherDrawing(e){
      transfer.otherDrawing(e)
    },
    stop(){
      transfer.stop()
    },
    otherStop(e){
      transfer.otherStop(e)
    },
    sendStart(e){
      transfer.sendStart(e)
    },
    sendDrawing(e){
      transfer.sendDrawing(e)
    },
    sendStop(){
      transfer.sendStop()
    },
    exitDraw(){
      transfer.exitDraw()
    },
    openCreateHome(){
      transfer.openCreateHome()
    },
    closeCreateHome(){
      transfer.closeCreateHome()
    }
  },
  mounted() {
    transfer.init(this)
    
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
          text-align: left;
          .self{
            color: #67C23A;
          }
        }
      }
      .internet,.localnet{
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
          color: #67C23A;
        }
      }
      .canvas{
        box-sizing: border-box;
        position: relative;
        width: 70%;
        z-index: 10;
        padding: 50px 25px;
        .canvas-tools{
          position: absolute;
          width: 100%;
          height: 48px;
          margin-left: -25px;
          margin-bottom: -50px;
          display: flex;
          justify-content: center;
          align-items: center;
          .pen{
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
          .rubber,.mark{
            box-sizing: border-box;
            width: 40px;
            height: 35px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            i{
              font-size: 30px;
            }
          }
          .mark{
            color: #B8B8B8;
            i{
              font-size: 27px;
            }
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
