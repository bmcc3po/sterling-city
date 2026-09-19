import { isLiteGpu } from "./device";
import "./style.css";
import { SterlingCity } from "./game";

document.documentElement.classList.toggle("lite-gpu", isLiteGpu);
document.body.classList.toggle("lite-gpu", isLiteGpu);

const canvas = document.getElementById("gl") as HTMLCanvasElement;
new SterlingCity(canvas);
