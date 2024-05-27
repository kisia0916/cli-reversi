import { copyFileSync, promises, read } from "fs"
import net, { SocketAddress } from "net"
import * as readline from "readline"
import { data_format } from "./data-format"

const HOST = "localhost"
const PORT = 3000

interface roomType {
    id:string,
    user:string[],
    turn:string,
    name:string,
    stage:number[][]
}

const client = new net.Socket()
const set_format = (data:data_format)=>{
    return JSON.stringify(data)
}
const writeRoomList = (list:roomType[]) =>{
    console.log("----------Room list------------")
    list.forEach((i:roomType,index:number)=>{
        console.log(`${index+1}.${i.name}`)
    })
    console.log("-------------------------------")
}
const writeStage = (stage:number[][])=>{
    const stageElement = ["-","○","●"]
    console.log("  1 2 3 4 5 6 7 8")
    stage.forEach((i,index)=>{
        let line:string = `${index+1}`
        i.forEach((s)=>{
            line+=` ${stageElement[s]}`
        })
        console.log(line)
    })
}

const inputAnalyze = (type:string,getData:any,ans:any)=>{
    try{
        if (type === "room_name"){
            if (ans.length>0 && ans.length<11){
                return ans
            }else{
                return ""
            }
        }else if (type === "title_mode_select"){
            if (ans === "j" || ans === "c" || ans === "r"){
                return ans
            }else{
                return ""
            }
        }else if (type === "select_room_index"){
            if ((Number(ans)>0 && Number(ans)<=getData.roomList.length) || ans === "-1"){
                return Number(ans)
            }else{
                return ""
            }
        }else if (type === "put_piece"){
            if (!isDisconnect){
                let ansList = ans.split(" ")
                if (ansList.length === 2){
                    const x = Math.floor(Number(ansList[0]))
                    const y = Math.floor(Number(ansList[1]))
                    if (x>0 && x<9 && y>0 && y<9){
                        return [x,y]
                    }
                }
            }else{
                isDisconnect = false
                console.log("other player disconnected... you win!")
                console.log("")
                client.write(set_format({type:"game_reset",data:{}}))
                return "disconnect"
            }
            return ""
        }
    }catch{
        return ""
    }
}

let rl:any = undefined
const inputTemplate = (rl:any,question:string,type:string,getData:any)=>{
    return new Promise((resolve)=>{
        rl.question(`${question}`,(ans:string)=>{
            resolve(inputAnalyze(type,getData,ans))
        })
    })
}
const inputFun = async(question:string,type:string,getData:any)=>{
    let inputData:any = ""
    while (!inputData){
        rl = readline.createInterface({
            input:process.stdin,
            output:process.stdout
        })
        inputData = await inputTemplate(rl,question,type,getData)
        rl.close()
    }
    return inputData
}


let userId:string = ""
let joinRoom:string = ""
let nowMode:string = ""
let color:number = 0
let isDisconnect:boolean = false

const first_page_fun = async(getData:any)=>{
    joinRoom = ""
    nowMode = ""
    color = 0
    nowMode = await inputFun("Join (j) or Create (c) or Reload(r) : ","title_mode_select",getData)
    if (nowMode === "j"){
        const roomIndex = await inputFun("Select room (exit -1): ","select_room_index",getData)
        if (roomIndex === -1){
            first_page_fun(getData)
        }else{
            client.write(set_format({type:"room_join_request",data:{roomId:getData.roomList[roomIndex-1].id}}))
        }
    }else if (nowMode === "c"){
        const createRoomName = await inputFun("Room name (exit -1) : ","room_name",getData)
        if (createRoomName === "-1"){
            first_page_fun(getData)
        }else{
            client.write(set_format({type:"create_room_request",data:{roomName:createRoomName}}))
        }
    }else if (nowMode === "r"){
        client.write(set_format({type:"get_room_list",data:{}}))
    }
}

client.on("data",async(data:string)=>{
    const getData = JSON.parse(data)
    if (getData.type === "first-user-info"){
        userId = getData.userId
        writeRoomList(getData.data.roomList)
        first_page_fun(getData.data)
    }else if (getData.type === "create_done_room"){
        console.log("Room created !")
        console.log("Waiting player.....")
    }else if (getData.type === "start_game"){
        joinRoom = getData.data.roomId
        color = getData.data.color
        client.write(set_format({type:"done_game_setting",data:{roomId:joinRoom}}))
    }else if (getData.type === "move_game"){
        writeStage(getData.data.roomInfo.stage)
        if (getData.data.roomInfo.turn === color){
            const putPos = await inputFun("Place a piece (x y) : ","put_piece",getData)
            client.write(set_format({type:"put_piece",data:{pos:putPos}}))
        }else if (getData.data.state === "pass"){
            console.log("you pass")
        }
    }else if (getData.type === "game_end"){
        if (getData.data.state === "done"){
            writeStage(getData.data.roomInfo.stage)
            if (getData.data.result[0] > getData.data.result[1]){
                if (color === 1){
                    console.log("You win!")
                }else{console.log("You lose")}
            }else if (getData.data.result[0] < getData.data.result[1]){
                if (color === 2){
                    console.log("You win!")
                }else{console.log("You lose....")}
            }else{
                console.log(getData.data.result)
                console.log("draw...")
            }
            client.write(set_format({type:"game_reset",data:{}}))
        }else{
            isDisconnect = true
            if (getData.data.roomInfo.turn !== color){
                console.log("other player disconnected... you win!")
                console.log("")
                client.write(set_format({type:"game_reset",data:{}}))
            }
        }
    }else if (getData.type === "room_list_data"){
        writeRoomList(getData.data.roomList)
        first_page_fun({roomList:getData.data.roomList})
    }
})

client.connect(PORT,HOST,()=>{
    console.log("connection done")
    client.write(set_format({type:"first-connection",data:{}}))
})