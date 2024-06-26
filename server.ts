import net from "net"
import * as uuid from "uuid" 

const HOST = "localhost"
const PORT = 3000

const server = net.createServer()


interface data_format {
    type:string,
    data:any
}

interface userType {
    id:string,
    socket:any
}
interface roomType {
    id:string,
    name:string,
    user:string[],
    turn:number,
    stage:number[][]
}


let userList:userType[] = []
let roomList:roomType[] = [
    
]
let startRoomList:roomType[] = []

const set_format = (data:data_format)=>{
    return JSON.stringify(data)
}
const generateStage = ()=>{
    return [
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,1,2,0,0,0],
        [0,0,0,2,1,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
    ]
}
const reversePice = (x:number,y:number,stage:number[][],color:number)=>{
    let ban:number[] = []
    let canPush:number = 0
    let map:number[][] = stage
    for (let i = 1;8>i;i++){
        let co = 0
        for (let s = -1;1>=s;s++){
            for (let k = -1;1>=k;k++){
                co+=1
                if (ban.indexOf(co) == -1){
                    const nx = x+k*i
                    const ny = y+s*i
                    if (nx>=0 && nx<8 && ny>=0 && ny<8 && !(s == 0 && k == 0)){
                        if (map[ny][nx] === color && i > 1){
                            for (let n = i;n>=0;n--){
                                map[ny-s*n][nx-k*n] = color
                                canPush+=1
                            }
                        }else if (map[ny][nx] === 0 || (i == 1 && map[ny][nx] === color)){
                            ban.push(co)
                        }
                    } 
                }
            }
        }
    }
    console.log(canPush)
    return [canPush,map]
}
const checkPass = (map:number[][],color:number)=>{
    let caPut:number = 0
    for (let c = 0;2>c;c++){
        if (caPut === 0){
            for (let y = 0;8>y;y++){
                for (let x = 0;8>x;x++){
                    if (map[y][x] === 0){
                        let ban:number[] = []
                        for (let i = 1;8>i;i++){
                            let co = 0
                            for (let s = -1;1>=s;s++){
                                for (let k = -1;1>=k;k++){
                                    co+=1
                                    if (ban.indexOf(co) == -1){
                                        const nx = x+k*i
                                        const ny = y+s*i
                                        if (nx>=0 && nx<8 && ny>=0 && ny<8 && !(s == 0 && k == 0)){
                                            if (map[ny][nx] === color && i > 1){
                                                caPut = 1
                                            }else if (map[ny][nx] === 0 || (i == 1 && map[ny][nx] === Math.abs((3*c)-color))){
                                                ban.push(co)
                                            }
                                        } 
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }else{
            return 3
        }
    }
    if (caPut === 0){
        return "end"
    }else{
        return 1
    }
}

const checkWin = (stage:number[][],endFlg:boolean) =>{
    let black:number = 0
    let white:number = 0
    for (let i = 0;8>i;i++){
        for (let s = 0;8>s;s++){
            if (stage[i][s] === 1){
                black+=1
            }else if (stage[i][s] === 2){
                white+=1
            }
        }
    }
    if (black+white === 64 || black === 0 || white === 0 || endFlg){
        return [black,white]
    }
    return false
}

server.on("connection",(socket)=>{
    let userId:string = ""
    let joinRoom:string = ""
    console.log("connection user")
    socket.on("data",(data:string)=>{
        const getData:data_format = JSON.parse(data)
        if (getData.type === "first-connection"){
            const newUser:userType = {id:uuid.v4(),socket:socket}
            const send_data = {userInfo:newUser.id,roomList:roomList}
            userId = newUser.id
            userList.push(newUser)
            socket.write(set_format({type:"first-user-info",data:send_data}))
        }else if (getData.type === "room_join_request"){
            const roomIndex = roomList.findIndex((i)=>i.id === getData.data.roomId)
            if (roomIndex != -1){
                if (roomList[roomIndex].user.length === 1){
                    const otherUserIndex = userList.findIndex((i)=>i.id === roomList[roomIndex].user[0])
                    roomList[roomIndex].user.push(userId)
                    startRoomList.push(roomList[roomIndex])
                    roomList.splice(roomIndex,1)
                    joinRoom = getData.data.roomId
                    const color = Math.floor(Math.random()*2)+1
                    socket.write(set_format({type:"start_game",data:{roomId:getData.data.roomId,color:color}}))
                    //相手にもマッチング完了を送信
                    if (otherUserIndex != -1){
                        userList[otherUserIndex].socket.write(set_format({type:"start_game",data:{roomId:getData.data.roomId,color:3-color}}))
                    }else{
                        //error 
                    }
                }else{
                    //error
                }
            }
        }else if (getData.type === "create_room_request"){
            console.log(userId)
            const alreadyCreated = roomList.findIndex((i)=>i.user[0] === userId)
            if (alreadyCreated === -1){
                const newRoom:roomType = {
                    id:uuid.v4(),
                    name:getData.data.roomName,
                    user:[userId],
                    turn:1,
                    stage:generateStage()
                }
                roomList.push(newRoom)
                joinRoom = newRoom.id
                socket.write(set_format({type:"create_done_room",data:{}}))
            }
        }else if (getData.type === "done_game_setting"){
            const joinRoom = startRoomList.find((i)=>i.id === getData.data.roomId)
            socket.write(set_format({type:"move_game",data:{roomInfo:joinRoom,state:"done"}}))
        }else if (getData.type === "put_piece"){
            const roomIndex = startRoomList.findIndex((i)=>i.id === joinRoom)
            if (roomIndex !== -1){
                if (startRoomList[roomIndex].stage[getData.data.pos[1]-1][getData.data.pos[0]-1] === 0){
                    // startRoomList[roomIndex].stage[getData.data.pos[1]-1][getData.data.pos[0]-1] = startRoomList[roomIndex].turn
                    const isPut = reversePice(getData.data.pos[0]-1,getData.data.pos[1]-1,startRoomList[roomIndex].stage,startRoomList[roomIndex].turn)
                    if (isPut[0] === 0){
                        startRoomList[roomIndex].stage[getData.data.pos[1]-1][getData.data.pos[0]-1] = 0
                        socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"done"}}))
                    }else{
                        const checkPassResult = checkPass(startRoomList[roomIndex].stage,3-startRoomList[roomIndex].turn)
                        if (checkPassResult === 1){
                                //p1socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[0])?.socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"pass"}}))
                                //p2socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[1])?.socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"pass"}}))
                        }else if (checkPassResult === "end"){
                                let game_end2:any = checkWin(startRoomList[roomIndex].stage,true)
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[0])?.socket.write(set_format({type:"game_end",data:{result:game_end2,roomInfo:startRoomList[roomIndex],state:"done"}}))
                                //p2socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[1])?.socket.write(set_format({type:"game_end",data:{result:game_end2,roomInfo:startRoomList[roomIndex],state:"done"}}))
                                startRoomList.splice(roomIndex,1)
                        }else{
                            let game_end:any = checkWin(startRoomList[roomIndex].stage,false)
                            if (!game_end){
                                startRoomList[roomIndex].turn = 3 - startRoomList[roomIndex].turn
                                //p1socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[0])?.socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"done"}}))
                                //p2socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[1])?.socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"done"}}))
                            }else{
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[0])?.socket.write(set_format({type:"game_end",data:{result:game_end,roomInfo:startRoomList[roomIndex],state:"done"}}))
                                //p2socket
                                userList.find((i)=>i.id === startRoomList[roomIndex].user[1])?.socket.write(set_format({type:"game_end",data:{result:game_end,roomInfo:startRoomList[roomIndex],state:"done"}}))
                                startRoomList.splice(roomIndex,1)
                            }
                    }}
                }else{
                    socket.write(set_format({type:"move_game",data:{roomInfo:startRoomList[roomIndex],state:"done"}}))
                }
            }else{
                //error
            }
        }else if (getData.type === "game_reset"){
            joinRoom = ""
            const send_data = {userInfo:userId,roomList:roomList}
            socket.write(set_format({type:"first-user-info",data:send_data}))
        }else if (getData.type === "get_room_list"){
            socket.write(set_format({type:"room_list_data",data:{roomList:roomList}}))
        }
    })
    const disconnectUser = ()=>{
        const nowJoinRoomIndex = roomList.findIndex((i)=>i.id === joinRoom)
        const nowJoinStartedRoomIndex = startRoomList.findIndex((i)=>i.id === joinRoom)
        if (nowJoinRoomIndex !== -1){
            roomList.splice(nowJoinRoomIndex,1)
        }
        if (nowJoinStartedRoomIndex !== -1){
            const otherId =  startRoomList[nowJoinStartedRoomIndex].user[1 - startRoomList[nowJoinStartedRoomIndex].user.findIndex((i)=>i === userId)]
            const otherUser = userList.find((i)=>i.id === otherId)
            otherUser?.socket.write(set_format({type:"game_end",data:{state:"disconnection",roomInfo:startRoomList[nowJoinStartedRoomIndex]}}))
            startRoomList.splice(nowJoinStartedRoomIndex,1)
        }
        const userIndex = userList.findIndex((i)=>i.id === userId)
        userList.splice(userIndex,1)
    }
    socket.on("end",()=>{
        disconnectUser()
    })
    socket.on("error",(error)=>{
        //切断処理
        disconnectUser()
    })
})

server.listen(PORT,()=>{
    console.log("server run!")
})
