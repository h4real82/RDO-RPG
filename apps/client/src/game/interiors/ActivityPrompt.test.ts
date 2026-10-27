import {expect,it} from 'vitest';
import {placeActivityPrompt} from './ActivityPrompt';
it('keeps the interaction button diagonally above the target and away from viewport edges',()=>{
 const regular=placeActivityPrompt({x:300,y:300},{width:800,height:600});expect(regular.x).toBeGreaterThan(360);expect(regular.y).toBeLessThan(260);
 const edge=placeActivityPrompt({x:410,y:300},{width:430,height:900});expect(edge.x).toBeLessThan(350);expect(edge.x).toBeGreaterThan(70);expect(edge.y).toBeLessThan(260);
});

it('accounts for a wider localized label instead of covering the target',()=>{
 const result=placeActivityPrompt({x:350,y:250},{width:1000,height:700},260);
 expect(result.x-130).toBeGreaterThan(360);
});
