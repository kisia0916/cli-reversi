const x = 6
const y = 3

const map = [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,2,1,1,0,0],
    [0,0,0,2,1,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
]

let ban:number[] = []
let canPush:number = 0
for (let i = 1;8>i;i++){
    let co = 0
    for (let s = -1;1>=s;s++){
        for (let k = -1;1>=k;k++){
            co+=1
            if (ban.indexOf(co) == -1){
                const nx = x+k*i
                const ny = y+s*i
                if (nx>=0 && nx<8 && ny>=0 && ny<8 && !(s == 0 && k == 0)){
                    if (map[ny][nx] === 1 && i > 1){
                        for (let n = i;n>=0;n--){
                            map[ny-s*n][nx-k*n] = 1
                            console.log(ny-s*n,nx-k*n)
                            canPush+=1
                        }
                    }else if (map[ny][nx] === 0 || (i == 1 && map[ny][nx] === 1)){
                        ban.push(co)
                    }
                } 
            }
        }
    }
}
console.log(ban)

map.forEach((i)=>{
    let s = ""
    i.forEach((k)=>{
        s+=k
    })
    console.log(s)
})

if (canPush === 0){
    console.log(false)
}else{
    console.log(true)
}