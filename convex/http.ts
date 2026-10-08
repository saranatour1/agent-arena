import { httpRouter } from "convex/server";
import { sharePage } from "./share";

const http = httpRouter();
http.route({ pathPrefix: "/share/", method: "GET", handler: sharePage });
export default http;
