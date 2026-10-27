import{bootstrapGame}from'./game/bootstrap';

/** Local distributable map entry. Uses the production runtime without DEV hooks. */
try{
 const root=document.getElementById('game-container');if(!root)throw new Error('Game root missing.');
 bootstrapGame(root,{onStartupError:error=>{console.error('Valentine map failed to start.',error);const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='Die Karte konnte nicht geladen werden. Bitte den lokalen Kartenstart erneut öffnen.';root.append(message);}});
}catch(error){console.error('Valentine map startup failed.',error);}
