// This tells TypeScript that any import from 'vanta/*' is valid and returns a function
declare module 'vanta/dist/vanta.*' {
  type VantaEffect = {
    destroy: () => void;
    resize: () => void;
    setOptions: (options: any) => void;
  };

  type VantaFunction = (options: {
    el: HTMLElement | null;
    THREE: any;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color1?: number;
    color2?: number;
    size?: number;
    speed?: number;
    [key: string]: any;
  }) => VantaEffect;

  const effect: VantaFunction;
  export default effect;
}