import {
  createServer
} from "node:http";
import {
  readFile,
  stat
} from "node:fs/promises";
import {
  extname,
  resolve,
  sep
} from "node:path";


const rootDirectory =
  process.cwd();


const port =
  Number(
    process.env.PORT ||
    4173
  );


const contentTypes = {
  ".css":
    "text/css; charset=utf-8",
  ".html":
    "text/html; charset=utf-8",
  ".js":
    "text/javascript; charset=utf-8",
  ".json":
    "application/json; charset=utf-8",
  ".webmanifest":
    "application/manifest+json; charset=utf-8",
  ".mjs":
    "text/javascript; charset=utf-8",
  ".png":
    "image/png",
  ".svg":
    "image/svg+xml"
};


createServer(
  async (
    request,
    response
  ) => {
    try {
      const requestUrl =
        new URL(
          request.url || "/",
          "http://127.0.0.1"
        );

      const pathname =
        decodeURIComponent(
          requestUrl.pathname
        );

      const relativePath =
        pathname === "/"
          ? "index.html"
          : pathname.replace(
              /^\/+/,
              ""
            );

      let filePath =
        resolve(
          rootDirectory,
          relativePath
        );

      if (
        filePath !==
          rootDirectory &&
        !filePath.startsWith(
          rootDirectory + sep
        )
      ) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      let fileStat =
        await stat(filePath);

      if (fileStat.isDirectory()) {
        filePath = resolve(
          filePath,
          "index.html"
        );
        fileStat = await stat(filePath);
      }

      if (
        !fileStat.isFile()
      ) {
        throw new Error(
          "Not a file"
        );
      }

      const content =
        await readFile(filePath);

      response.writeHead(
        200,
        {
          "Cache-Control":
            "no-store",
          "Content-Type":
            contentTypes[
              extname(filePath)
            ] ||
            "application/octet-stream"
        }
      );

      response.end(content);
    } catch (error) {
      response.writeHead(
        404,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );
      response.end("Not Found");
    }
  }
).listen(
  port,
  "127.0.0.1"
);
