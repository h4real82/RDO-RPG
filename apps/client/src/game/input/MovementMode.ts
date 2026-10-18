export type TravelMode='walk'|'run';
export class MovementMode {
  private shift=false;
  private needsRelease=false;
  setShift(held:boolean):void {this.shift=held;if(!held)this.needsRelease=false;}
  cancel():void {this.shift=false;this.needsRelease=false;}
  resolve(restricted:boolean,captured:boolean,path?:TravelMode):TravelMode|'stopped' {
    if(captured){this.cancel();return 'stopped';}
    if(restricted){if(this.shift)this.needsRelease=true;return 'walk';}
    return path??(this.shift&&!this.needsRelease?'run':'walk');
  }
}
