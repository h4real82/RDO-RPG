/** Authored branch/leaf sprites. Not a recovered Rockstar vegetation asset. */
export function foliageSvg(pine=false){
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">';
 s+='<path d="M128 250 Q118 135 132 15" fill="none" stroke="#635137" stroke-width="4"/>';
 for(let i=0;i<(pine?15:10);i++){const y=35+i*(pine?13:19),side=i%2?-1:1,len=(pine?35+i*3:40+i*2),x=128+side*len,shade=i%3===0?'#71804c':i%3===1?'#445c35':'#536d3d';s+=`<path d="M128 ${y+24} Q${128+side*20} ${y+8} ${x} ${y-5}" stroke="#655637" stroke-width="2" fill="none"/>`;
  if(pine){for(let j=0;j<13;j++){const t=j/13,px=128+side*len*t,py=y+24-29*t;for(const d of[-1,1])s+=`<path d="M${px} ${py} l${side*(11+4*t)} ${d*(14+8*t)-8}" stroke="${shade}" stroke-width="2.6" stroke-linecap="round"/>`;}}
  else for(let j=0;j<4;j++){const px=128+side*(14+j*len/4),py=y+19-j*7;s+=`<ellipse cx="${px}" cy="${py}" rx="12" ry="21" transform="rotate(${side*(32+j*9)} ${px} ${py})" fill="${shade}"/><path d="M${px-4*side} ${py+12} L${px+4*side} ${py-12}" stroke="#96a265" stroke-width=".8"/>`;}
 }return s+'</svg>';
}
