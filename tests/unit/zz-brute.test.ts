import { it } from "vitest";
import { advance } from "@/lib/game/loop";
import { EMPTY_STATS } from "@/lib/game/scoring";
const D:any={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
const sn=(p:any,h:any,dir:any)=>({player:p,direction:dir,pendingDirection:dir,segments:[0,1,2].map(i=>({x:h.x-D[dir].x*i,y:h.y-D[dir].y*i}))});
it("brute",()=>{
  let bad=0;
  for(let n=0;n<20000;n++){
    const s:any={snakes:[sn(1,{x:10,y:10},"right"),sn(2,{x:12,y:10},"left")],stats:{1:{...EMPTY_STATS,lives:3},2:{...EMPTY_STATS,lives:3}}};
    const nx:any=advance(s);
    const a=nx.snakes.find((x:any)=>x.player===1), b=nx.snakes.find((x:any)=>x.player===2);
    for(const [me,ot] of [[a,b],[b,a]]){
      const used=new Set(ot.segments.map((c:any)=>c.x+","+c.y));
      for(let k=1;k<=2;k++){const h=me.segments[0];if(used.has((h.x+D[me.direction].x*k)+","+(h.y+D[me.direction].y*k)))bad++;}
    }
  }
  console.log("BADCOUNT",bad);
}, 3_000_000);
