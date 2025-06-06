const https = require("https-proxy-agent"); // 注意：這裡可能需要根據實際代理需求調整，但為了部署先這樣
const querystring = require("querystring");
const url = require("url");
const http = require("http"); // 在 Render 上通常使用 http，SSL 由其外層處理

// Render 會透過 process.env.PORT 提供你必須使用的 port
const port = process.env.PORT || 10101; 

// 1.創建代理服務
// 改用 http.createServer
http.createServer(onRequest).listen(port, () => {
  // 加上這段日誌，告訴 Render 和你自己，服務已經成功啟動
  console.log(`Server is running on port ${port}`);
});

function onRequest(req, res) {
  // 增加一個基本路徑的檢查，避免服務因無效請求而崩潰
  if (!req.url.includes("?target=")) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request: Missing ?target= parameter.");
    return;
  }
  
  const originUrl = url.parse(req.url);
  const qs = querystring.parse(originUrl.query);
  const targetUrl = qs["target"];

  // 增加對無效 targetUrl 的保護
  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request: Target URL is empty.");
    return;
  }

  const target = url.parse(targetUrl);

  const options = {
    hostname: target.hostname,
    port: target.port || 80, // 如果目標 URL 沒有指定 port，預設為 80
    path: url.format(target),
    method: req.method, // 使用原始請求的方法
    headers: req.headers // 轉發原始請求的 headers
  };

  // 2.代發請求
  const proxy = http.request(options, _res => {
    // 3.修改響應頭
    const fieldsToRemove = ["x-frame-options", "content-security-policy"];
    const newHeaders = {};
    
    Object.keys(_res.headers).forEach(field => {
      if (!fieldsToRemove.includes(field.toLowerCase())) {
        newHeaders[field] = _res.headers[field];
      }
    });

    res.writeHead(_res.statusCode, newHeaders);
    _res.pipe(res, {
      end: true
    });
  });

  proxy.on('error', (e) => {
    console.error(`Proxy error: ${e.message}`);
    res.writeHead(502);
    res.end(`Proxy Error: ${e.message}`);
  });

  req.pipe(proxy, {
    end: true
  });
}