// netlify/functions/proxy.js
// ─────────────────────────────────────────────────────────────
// 단어장 사이트 전용 멀티-앱 프록시.
// 단어장이 /api/<이름표> 로 부르면, 아래 주소록(MAP)에서 알맞은 GAS로 중계합니다.
// 예: /api/e1-1?action=getWords&callback=cb  →  e1-1 의 GAS로 전달
// 학생 폰은 우리 netlify 주소로만 통신하므로, 구글이 차단돼도 단어가 옵니다.
// ─────────────────────────────────────────────────────────────

// ▼▼▼ 단어장별 GAS 웹앱 주소록 (이름표 → 주소). 새 단어장이 생기면 여기 한 줄 추가 ▼▼▼
const MAP = {
  "e1-1": "https://script.google.com/macros/s/AKfycbyoL3jlu0Qxji3LzX14ODkrZf_XzwM-O9zLa1FJf_T14pDu2db2WbQg15vTYTYpf41p/exec",
  "e2-1": "https://script.google.com/macros/s/AKfycbyzl5nxaZtB2LqRnOrnY73G8smihmSEm6bIFCqz9ttDPothHAITecZeM7SUOXgjX4ENlA/exec",
  "e2-2": "https://script.google.com/macros/s/AKfycbyxqqIUPJADP6xIx9sz24AW7hvrj50g2AncjoRPEx19LBubpDqI3B8l2QAvKIVI_soA3w/exec",
  "e2-3": "https://script.google.com/macros/s/AKfycbzrExcuj_Xy39uuHB5TmQmL1Vio5pcvAThkH-hBq8PoAcUD-8L46PJ5QfZKCFU3PLCA/exec",
  "e3-1": "https://script.google.com/macros/s/AKfycbw6bcYF2Mw-8tQnf-deGN3TXaJM_boYqnKJxUqDQgdflcnYzL62xs3Pipvb00aOiw/exec",
  "e3-2": "https://script.google.com/macros/s/AKfycbyMnLShf4mkuXyYfiEI_Vh6R6sIBaxrpKzTk7KvohmKq_Ydtft1alN8RoTMFyRBcWcz/exec",
  "e3-3": "https://script.google.com/macros/s/AKfycbyEbG4omNxsmQroa2s5k3Uzjm1BTtzjmnxEEN5Y9AXn2ZuTZKujCIHu7ZXz02oHF9kQLw/exec",
  "h1":   "https://script.google.com/macros/s/AKfycbzuxOjul2xQrT7RDQ5y_EkyPpZjU8BXABnmsElPoEvqAA-Q3JrPUCFZLk6mc0gQduh5GQ/exec",
  "m1":   "https://script.google.com/macros/s/AKfycbw8n0KUKvtu7zRYsgExYCs2BN8yQNvXJszc1ScIEGB8BFwrXeUsPenLmhfTI0htylNhfw/exec",
  "m2":   "https://script.google.com/macros/s/AKfycbwQTsiSdowkBCUGuvL1CbvcEdNhH6sh-PkfNo_xKR7ZAywlYh2q4-afq9YiegDdLNRg/exec",
  "m3":   "https://script.google.com/macros/s/AKfycby_WzlOJRdsV9X102GltEtXOqmMH2nwv7TfdqaV_55mKjbF5pSDnzdxruYF7kw26be3/exec",
  "sightword_stu": "https://script.google.com/macros/s/AKfycbzmcYQrzfckkczgpYbq1jgvzlErx2zjzLop4DYzXrxbZ6I8AmBXK9a_pJI7LEl3_9-L/exec",
  "verb_3_stu":    "https://script.google.com/macros/s/AKfycbxTbPCmpFrtBmo0vUx_bs7P7n5W6qiX_yWKrzia2PCOz2M6YSSWM3J9Uf2xZw7YiVlpkQ/exec",
};
// ▲▲▲ 이름표는 단어장 HTML 파일명과 똑같이 맞췄습니다 (e1-1.html → 이름표 e1-1) ▲▲▲

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const key = q.key;
    const GAS = MAP[key];
    if (!GAS) {
      return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "알 수 없는 앱 이름표: " + (key || "(없음)") };
    }

    // key 를 뺀 나머지 쿼리만 구글로 전달
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

    const res = await fetch(target, init);
    const body = await res.text();
    const ct = res.headers.get("content-type") || "application/javascript; charset=utf-8";

    return {
      statusCode: 200,
      headers: { "Content-Type": ct, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      body,
    };
  } catch (e) {
    return { statusCode: 502, headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "proxy error: " + (e && e.message ? e.message : String(e)) };
  }
};
