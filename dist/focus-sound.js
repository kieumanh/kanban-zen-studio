'use strict';
// v2.2.0 (Thanh Âm): âm thanh cho đồng hồ tập trung / Nén hương bế quan (studio-zen.js), mặc định TẮT, cả hai phong cách.
//  - Tắt | Chuông đồng (một tiếng khi bắt đầu, ba tiếng khi hết giờ) | Chuông đồng và tiếng suối (thêm tiếng suối êm khi đang đếm).
//  - Âm thanh tổng hợp ngay trên máy bằng Web Audio (không tải tệp, không bản quyền): chuông = các họa âm không điều hòa tắt dần;
//    suối = tiếng ồn nâu qua bộ lọc dải, âm lượng lên xuống chậm.
//  - Đọc thời gian từ chính đồng hồ (như nén hương v1.97.0) nên không đổi cách đồng hồ chạy. Âm thanh chỉ mở sau một lần bấm của
//    người dùng (chính sách tự phát của trình duyệt); tạm dừng, đặt lại, rời màn hình hoặc ẩn tab thì tiếng suối dừng.
//  - Lựa chọn lưu trên thiết bị: localStorage 'zen-focus-sound' = '' | 'bell' | 'stream'.
(() => {
  const KEY = 'zen-focus-sound';
  const read = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'bell' || v === 'stream' ? v : '';
    } catch {
      return '';
    }
  };
  const write = (v) => {
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {}
  };
  let ctx = null,
    stream = null,
    lastSecs = null,
    running = false;
  const log = { bells: 0, streams: 0 }; // đếm để kiểm thử
  const audio = () => {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  function bell(times = 1) {
    const c = audio();
    if (!c) return;
    log.bells += times;
    for (let k = 0; k < times; k++) {
      const t0 = c.currentTime + 0.05 + k * 2.2;
      const out = c.createGain();
      out.gain.value = 0.22;
      out.connect(c.destination);
      // Họa âm của chuông đồng (không điều hòa), tần số gốc ~196 Hz.
      [
        [1, 1, 5.5],
        [2.76, 0.5, 3.6],
        [5.4, 0.28, 2.2],
        [8.93, 0.14, 1.4],
      ].forEach(([ratio, amp, decay]) => {
        const o = c.createOscillator(),
          g = c.createGain();
        o.type = 'sine';
        o.frequency.value = 196 * ratio;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(amp, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
        o.connect(g).connect(out);
        o.start(t0);
        o.stop(t0 + decay + 0.1);
      });
    }
  }
  function startStream() {
    const c = audio();
    if (!c || stream) return;
    log.streams++;
    const len = c.sampleRate * 2,
      buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // tiếng ồn nâu
      d[i] = last * 3.5;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 1.5);
    const lfo = c.createOscillator(),
      depth = c.createGain();
    lfo.frequency.value = 0.15;
    depth.gain.value = 0.03;
    lfo.connect(depth).connect(g.gain);
    src.connect(band).connect(g).connect(c.destination);
    src.start();
    lfo.start();
    stream = { src, lfo, g };
  }
  function stopStream() {
    if (!stream || !ctx) return;
    const { src, lfo, g } = stream;
    stream = null;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    src.stop(t + 0.9);
    lfo.stop(t + 0.9);
  }
  // Mỗi giây đọc đồng hồ: đang đếm (giây giảm) → bắt đầu; dừng giảm → tạm dừng; về 0 → hết giờ.
  function tick() {
    const box = document.querySelector('.studio-pomodoro');
    field(box);
    const m = /^(\d+):(\d\d)$/.exec(box?.querySelector('output')?.textContent.trim() || '');
    const secs = m ? Number(m[1]) * 60 + Number(m[2]) : null;
    const mode = read();
    const now = secs != null && lastSecs != null && secs < lastSecs && !document.hidden;
    if (now && !running && mode) {
      bell(1);
      if (mode === 'stream') startStream();
    }
    if (secs === 0 && lastSecs > 0 && mode) bell(3);
    if (!now || mode !== 'stream') stopStream();
    running = now;
    lastSecs = secs;
  }
  // Ô chọn âm thanh trong khung đồng hồ.
  function field(box) {
    if (!box || box.querySelector('.zen-focus-sound')) return;
    const label = document.createElement('label');
    label.className = 'field zen-focus-sound';
    label.innerHTML =
      '<span>Âm thanh</span><select><option value="">Tắt</option><option value="bell">Chuông đồng</option><option value="stream">Chuông đồng và tiếng suối</option></select><small>Chuông khi bắt đầu và khi hết giờ; tiếng suối êm khi đang đếm. Mặc định tắt.</small>';
    const select = label.querySelector('select');
    select.value = read();
    select.addEventListener('change', () => {
      write(select.value);
      if (select.value) {
        audio(); // mở âm thanh ngay trong lần chọn (thao tác của người dùng)
        bell(1); // nghe thử
      } else stopStream();
      if (running && select.value === 'stream') startStream();
    });
    const after = box.querySelector('[data-studio=timer]')?.parentElement;
    (after || box.querySelector('output') || box).after(label);
  }
  // Bấm nút đồng hồ là một thao tác của người dùng: mở âm thanh sớm để chuông đầu tiên kêu đúng lúc.
  document.addEventListener('click', (e) => e.target.closest?.('.studio-pomodoro [data-studio=timer]') && read() && audio(), true);
  document.addEventListener('visibilitychange', () => document.hidden && stopStream());
  setInterval(tick, 1000);
  window.zenFocusSound = { tick, bell, startStream, stopStream, state: () => ({ mode: read(), running, stream: !!stream, ...log }) };
})();
