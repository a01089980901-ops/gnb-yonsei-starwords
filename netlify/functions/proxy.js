// netlify/functions/proxy.js — GnB 단어장 프록시 (유형 B / MAP)
const MAP = {
  "e1-1": "https://script.google.com/macros/s/AKfycbyoL3jlu0Qxji3LzX14ODkrZf_XzwM-O9zLa1FJf_T14pDu2db2WbQg15vTYTYpf41p/exec",
  "e2-1": "https://script.google.com/macros/s/AKfycbyzl5nxaZtB2LqRnOrnY73G8smihmSEm6bIFCqz9ttDPothHAITecZeM7SUOXgjX4ENlA/exec",
  "e2-2": "https://script.google.com/macros/s/AKfycbyxqqIUPJADP6xIx9sz24AW7hvrj50g2AncjoRPEx19LBubpDqI3B8l2QAvKIVI_soA3w/exec",
  "e2-3": "https://script.google.com/macros/s/AKfycbzrExcuj_Xy39uuHB5TmQmL1Vio5pcvAThkH-hBq8PoAcUD-8L46PJ5QfZKCFU3PLCA/exec",
  "e3-1": "https://script.google.com/macros/s/AKfycbw6bcYF2Mw-8tQnf-deGN3TXaJM_boYqnKJxUqDQgdflcnYzL62xs3Pipvb00aOiw/exec",
  "e3-2": "https://script.google.com/macros/s/AKfycbyMnLShf4mkuXyYfiEI_Vh6R6sIBaxrpKzTk7KvohmKq_Ydtft1alN8RoTMFyRBcWcz/exec",
  "e3-3": "https://script.google.com/macros/s/AKfycbyEbG4omNxsmQroa2s5k3Uzjm1BTtzjmnxEEN5Y9AXn2ZuTZKujCIHu7ZXz02oHF9kQLw/exec",
  "m1": "https://script.google.com/macros/s/AKfycbw8n0KUKvtu7zRYsgExYCs2BN8yQNvXJszc1ScIEGB8BFwrXeUsPenLmhfTI0htylNhfw/exec",
  "m2": "https://script.google.com/macros/s/AKfycbwQTsiSdowkBCUGuvL1CbvcEdNhH6sh-PkfNo_xKR7ZAywlYh2q4-afq9YiegDdLNRg/exec",
  "m3": "https://script.google.com/macros/s/AKfycby_WzlOJRdsV9X102GltEtXOqmMH2nwv7TfdqaV_55mKjbF5pSDnzdxruYF7kw26be3/exec",
  "h1": "https://script.google.com/macros/s/AKfycbzuxOjul2xQrT7RDQ5y_EkyPpZjU8BXABnmsElPoEvqAA-Q3JrPUCFZLk6mc0gQduh5GQ/exec",
  "sightword_stu": "https://script.google.com/macros/s/AKfycbzmcYQrzfckkczgpYbq1jgvzlErx2zjzLop4DYzXrxbZ6I8AmBXK9a_pJI7LEl3_9-L/exec",
  "verb_3_stu": "https://script.google.com/macros/s/AKfycbxTbPCmpFrtBmo0vUx_bs7P7n5W6qiX_yWKrzia2PCOz2M6YSSWM3J9Uf2xZw7YiVlpkQ/exec",
};
exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    let key = q.key;
    if (!key) {
      const path = event.path || "";
      const m = path.match(/(?:\/api|\/proxy)\/([^/?]+)/);
      if (m) key = decodeURIComponent(m[1]);
    }
    const GAS = MAP[key];
    if (!GAS) return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "알 수 없는 앱 이름표: " + (key || "(없음)") };
    const params = new URLSearchParams(event.rawQuery || "");
    params.delete("key");
    const qs = params.toString();
    const target = GAS + (qs ? "?" + qs : "");
    const init = { method: event.httpMethod || "GET", redirect: "follow" };
    if ((event.httpMethod || "GET").toUpperCase() === "POST") {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf-8")
        : (event.body || "");
      init.headers = { "Content-Type": "text/plain;charset=utf-8" };
      init.body = raw;
    }
    // 🆕 JSONP 요청이면 콜백 이름을 기억 (오류 시에도 '올바른 JS'로 답하기 위해)
    const cbName = /^[A-Za-z_$][\w$]*$/.test(params.get("callback") || "") ? params.get("callback") : null;
    const jsFail = (why) => ({
      statusCode: 200,
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      body: cbName + "(" + JSON.stringify({ success: false, error: why }) + ");"
    });

    // 🆕 Netlify 제한(10초) 전에 스스로 끊고 깔끔한 실패 응답을 줌
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    init.signal = ctrl.signal;

    let res, body;
    try {
      res = await fetch(target, init);
      body = await res.text();
    } catch (err) {
      clearTimeout(timer);
      if (cbName) return jsFail(err && err.name === "AbortError" ? "timeout" : "upstream_fetch");
      throw err;
    }
    clearTimeout(timer);

    // 🆕 구글이 데이터 대신 HTML 오류 페이지를 보낸 경우 → JSONP 형식의 실패로 바꿔 전달
    if (cbName) {
      const head = (body || "").trimStart();
      if (!head.startsWith(cbName + "(") && !head.startsWith("/**/" + cbName + "(")) {
        const hint = head.startsWith("<") ? "upstream_html" : "upstream_invalid";
        return jsFail(hint + "_" + res.status);
      }
    }

    const ct = res.headers.get("content-type") || "application/javascript; charset=utf-8";
    return { statusCode: 200,
      headers: { "Content-Type": ct, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      body };
  } catch (e) {
    return { statusCode: 502, headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "proxy error: " + (e && e.message ? e.message : String(e)) };
  }
};
