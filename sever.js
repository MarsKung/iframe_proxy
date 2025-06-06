const https = require("https");
const querystring = require("querystring");
const url = require("url");

const port = 10101;
// 1.创建代理服务
https.createServer(onRequest).listen(port);

function onRequest(req, res) {
  const originUrl = url.parse(req.url);
  const qs = querystring.parse(originUrl.query);
  const targetUrl = qs["target"];
  const target = url.parse(targetUrl);

  const options = {
    hostname: target.hostname,
    port: 80,
    path: url.format(target),
    method: "GET"
  };

  // 2.代发请求
  const proxy = https.request(options, _res => {
    // 3.修改响应头
    const fieldsToRemove = ["x-frame-options", "content-security-policy"];
    Object.keys(_res.headers).forEach(field => {
      if (!fieldsToRemove.includes(field.toLocaleLowerCase())) {
        res.setHeader(field, _res.headers[field]);
      }
    });
    _res.pipe(res, {
      end: true
    });
  });
  req.pipe(proxy, {
    end: true
  });
}