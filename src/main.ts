import "./style.css";
import { SterlingCity } from "./game";

const canvas = document.getElementById("gl") as HTMLCanvasElement;
new SterlingCity(canvas);
