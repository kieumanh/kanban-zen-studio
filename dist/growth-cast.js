'use strict';
// v2.17.0 (Họa Cảnh): nhân vật và vật dụng trong tranh minh họa truyện ký (xem growth-scene.js).
// Nhân vật vẽ theo lối bóng mực: áo dài, đầu nhỏ, không mặt, mỗi người một màu áo, tóc, mũ và vật cầm riêng nên nhìn xa vẫn nhận ra.
// Tư thế dựng từ bộ xương hai đốt (vai → khuỷu → cổ tay) nên cùng một nhân vật làm được mọi thế mà không phải vẽ tay từng thế.
// Người đứng xa, nhỏ: tranh kể chuyện bằng nơi chốn và khoảnh khắc, không phải chân dung.
(function () {
  const Z = window.zenScene;
  const K = Z.kit;
  const { f, mix, clamp, between } = K;
  // ---- Bộ dạng từng người ---------------------------------------------------------------------------------------------------
  // robe: màu áo; trim: viền; sash: dây lưng; hair: màu tóc; kind: kiểu đầu; hold: vật cầm mặc định; ghost: mờ như hồn; s: cỡ người.
  const LOOK = {
    hero: { name: 'Hiệp khách', robe: '#3f7f86', trim: '#ecdcb4', sash: '#c4573a', hair: '#1c1620', kind: 'knot', hold: 'woodsword' },
    su: { name: 'Sư phụ Tùng Hạc', robe: '#8c8a88', trim: '#d9d4c8', sash: '#6b5a48', hair: '#efeae0', kind: 'oldman', hold: 'staff', stoop: 4 },
    moc: { name: 'Tiểu Mộc', robe: '#6a9a58', trim: '#e8e2b8', sash: '#b9803a', hair: '#2a2026', kind: 'buns', s: 0.72 },
    phong: { name: 'Hàn Phong', robe: '#23212b', trim: '#b8344a', sash: '#b8344a', hair: '#15131a', kind: 'knot', hold: 'sword' },
    giao: { name: 'Giáo chủ Lệ Vô Khuyết', robe: '#f1ece6', trim: '#c9b9b0', sash: '#a3283c', hair: '#17121a', kind: 'mask', hold: null },
    thien: { name: 'Thiền sư Không Nguyệt', robe: '#d7d3c8', trim: '#ffffff', sash: '#9a8a6a', hair: '#e8e4da', kind: 'monk', ghost: true, hold: null },
    hai: { name: 'Mạc Trấn Hải', robe: '#6b5640', trim: '#a8926f', sash: '#4a3a2c', hair: '#c9c4b8', kind: 'straw', hold: null, stoop: 3 },
    me: { name: 'Thủy Nương', robe: '#8a6c58', trim: '#b99c82', sash: '#5c4638', hair: '#2a2024', kind: 'bun', hold: null, s: 0.95 },
    be: { name: 'Tiểu Vô Khuyết', robe: '#8d7664', trim: '#b8a48e', sash: '#5c4638', hair: '#1c1620', kind: 'knot', s: 0.56 },
    batu: { name: 'Tô Bà Bà', robe: '#8a7a9a', trim: '#c9bcd6', sash: '#6a5a48', hair: '#d9d6d0', kind: 'scarf', hold: 'fan', s: 0.92, stoop: 3 },
    hinh: { name: 'Thiên Hình', robe: '#c9d3e0', trim: '#ffffff', sash: '#8fa3c0', hair: '#f4f4f8', kind: 'crown', hold: 'ruler', ghost: true, s: 1.08 },
    mien: { name: 'Miên Hồ', robe: '#7e5bb0', trim: '#d9c4f0', sash: '#e3b0d0', hair: '#1c1620', kind: 'fox', hold: 'fan' },
    dien: { name: 'Thiên Diện', robe: '#d28a2c', trim: '#f4d38a', sash: '#6b3d8a', hair: '#1c1620', kind: 'hood', hold: 'lamp' },
    loi: { name: 'Lôi Tốc', robe: '#3478c8', trim: '#ffe27a', sash: '#ffe27a', hair: '#1c1620', kind: 'knot', hold: 'sabers' },
    khuc: { name: 'Khúc U', robe: '#2f5a58', trim: '#79b8ae', sash: '#1a2a2a', hair: '#0d1413', kind: 'cowl', hold: 'flute' },
    bach: { name: 'Bách Tý', robe: '#8a5a2c', trim: '#d4a05a', sash: '#4a2f18', hair: '#2a1a12', kind: 'knot', hold: null, s: 1.12, arms: 6 },
    ngoc: { name: 'Ngọc Vô Hà', robe: '#8fd6e0', trim: '#e8fbff', sash: '#2a8a9a', hair: '#e8fbff', kind: 'helm', hold: null, glass: true },
    kho: { name: 'Khô Vinh', robe: '#8a8a3c', trim: '#c8c27a', sash: '#4a4a1e', hair: '#d8d2b8', kind: 'oldman', hold: 'staff', s: 1.04, stoop: 6 },
    kinh: { name: 'Ảnh Song', robe: '#a88a44', trim: '#e6cf86', sash: '#6a5420', hair: '#1c1620', kind: 'knot', hold: 'mirror' },
    suong: { name: 'Lãnh Tịch', robe: '#a9c4e0', trim: '#ffffff', sash: '#5f84b3', hair: '#f2f6fb', kind: 'long', hold: null },
    vong: { name: 'Vô Vọng', robe: '#2e2a40', trim: '#5a5478', sash: '#15121f', hair: '#0d0b14', kind: 'hood', hold: 'chain', s: 1.28 },
    dan: { name: 'Trấn dân', robe: '#9a8668', trim: '#c6b595', sash: '#5c4a36', hair: '#2a2024', kind: 'knot' },
    dan2: { name: 'Thôn dân', robe: '#7f8f78', trim: '#b4c0aa', sash: '#5a4a36', hair: '#2a2024', kind: 'scarf', s: 0.95 },
    tho: { name: 'Công tượng', robe: '#6a4a3a', trim: '#a0806a', sash: '#2a1c14', hair: '#1c1620', kind: 'knot', hold: 'hammer', s: 1.06 },
    quan: { name: 'Quan binh', robe: '#6a2a32', trim: '#d4a05a', sash: '#2a1014', hair: '#15131a', kind: 'helm2', hold: 'spear' },
    kid: { name: 'Đồng tử', robe: '#c9a063', trim: '#e6c98c', sash: '#8a5a36', hair: '#1c1620', kind: 'buns', s: 0.5 },
    thay: { name: 'Y sư', robe: '#5f8a78', trim: '#cfe0d4', sash: '#8a6a3a', hair: '#1c1620', kind: 'bun', hold: 'box', s: 0.98 },
    king: { name: 'Thần Vương', robe: '#e8d8a8', trim: '#fff6d0', sash: '#b8863a', hair: '#ffffff', kind: 'crown', ghost: true, s: 1.2, hold: null, stoop: 3 },
    god: { name: 'Thần giới', robe: '#d8c8f0', trim: '#ffffff', sash: '#9a7ac8', hair: '#f8f4ff', kind: 'crown', ghost: true, hold: null },
    heronu: { name: 'Nữ hiệp', robe: '#b8344a', trim: '#e7c46a', sash: '#e7c46a', hair: '#1c1620', kind: 'bun', hold: 'woodsword' },
    ma: { name: 'Tâm ma', robe: '#1a1620', trim: '#4a3a5a', sash: '#2a1c34', hair: '#000000', kind: 'cowl', ghost: true, s: 1.3, hold: null },
    // Kỳ ngộ (v2.17.0): mỗi người một màu áo, một kiểu đầu, một vật cầm riêng để nhìn xa vẫn nhận ra.
    luc: { name: 'Tiểu Lục Tử', robe: '#8a7a62', trim: '#b8a88a', sash: '#4a3a2c', hair: '#2a2024', kind: 'buns', s: 0.62 },
    cuu: { name: 'Thiết Cửu', robe: '#5a4a44', trim: '#b09070', sash: '#2a1c14', hair: '#1c1620', kind: 'knot', hold: 'hammer', s: 1.12 },
    diep: { name: 'Diệp Thanh Đàn', robe: '#5f9a86', trim: '#e0efe6', sash: '#9a6a3a', hair: '#1c1620', kind: 'bun', hold: 'box', s: 0.98 },
    yen: { name: 'Phi Yến', robe: '#2f3a5a', trim: '#8ea0d0', sash: '#d06a4a', hair: '#15131a', kind: 'long', hold: null, s: 0.96 },
    nhan: { name: 'Ảnh Nhận', robe: '#1c1a24', trim: '#b8344a', sash: '#b8344a', hair: '#0d0b14', kind: 'cowl', hold: 'sword' },
    lamhat: { name: 'Lam Hạt', robe: '#2d6ab0', trim: '#9fd0f0', sash: '#1a3a6a', hair: '#15131a', kind: 'bun', hold: 'fan' },
    kytien: { name: 'Kỳ Tiên Ông', robe: '#7a8a68', trim: '#d0d8c0', sash: '#5a4a2c', hair: '#f0ede6', kind: 'oldman', hold: 'staff', stoop: 5 },
    cokiem: { name: 'Cô Kiếm Lãng Tử', robe: '#58626e', trim: '#aeb8c4', sash: '#2a2a34', hair: '#1c1620', kind: 'straw', hold: 'sword' },
    vantam: { name: 'Tạ Văn Tâm', robe: '#5a6aa0', trim: '#d0d8f0', sash: '#8a7a5a', hair: '#1c1620', kind: 'bun', hold: null },
    nhuy: { name: 'Kim Như Ý', robe: '#a8742c', trim: '#f0d890', sash: '#6a3a1a', hair: '#1c1620', kind: 'scarf', hold: null, s: 1.04 },
    ngao: { name: 'Hách Liên Ngạo', robe: '#7a3a2a', trim: '#e8c870', sash: '#2a1a14', hair: '#15131a', kind: 'helm2', hold: 'sword' },
    tuytang: { name: 'Túy Tăng', robe: '#c47a3a', trim: '#f0d0a0', sash: '#8a4a24', hair: '#e8e4da', kind: 'monk', hold: null, s: 1.06, stoop: 3 },
    dao: { name: 'Đào Nhi', robe: '#c8486a', trim: '#ffd0dc', sash: '#ffd04a', hair: '#1c1620', kind: 'buns', s: 0.78 },
    ly: { name: 'Lý Nhi', robe: '#3a9aa8', trim: '#d0f0f4', sash: '#ffd04a', hair: '#1c1620', kind: 'buns', s: 0.78 },
    vongtinh: { name: 'Vọng Tinh Bà', robe: '#4a4668', trim: '#c8c0e8', sash: '#8a7ac0', hair: '#e8e6ee', kind: 'scarf', hold: 'staff', s: 0.9, stoop: 4 },
    hotam: { name: 'Hồ Tam', robe: '#4a3236', trim: '#b8344a', sash: '#1a1214', hair: '#15131a', kind: 'cowl', hold: null },
    trinhho: { name: 'Trịnh Bá Hổ', robe: '#6a2a3a', trim: '#e8c870', sash: '#e8c870', hair: '#15131a', kind: 'helm2', hold: null, s: 1.08 },
    moclao: { name: 'Mộc Lão', robe: '#6a5a3a', trim: '#a89a70', sash: '#3a2c1a', hair: '#d8d4c8', kind: 'straw', hold: 'hammer', stoop: 3 },
    tieuhuyet: { name: 'Tiểu Huyết', robe: '#2a2430', trim: '#b8344a', sash: '#b8344a', hair: '#15131a', kind: 'buns', hold: 'sword', s: 0.6 },
    bacham: { name: 'Bạch Âm', robe: '#a8c8e8', trim: '#ffffff', sash: '#6a88b8', hair: '#15131a', kind: 'long', hold: null },
    // Thần giới: cùng một dáng thần, bốn sắc áo theo quy luật.
    godg: { name: 'Thần giới', robe: '#e8d098', trim: '#fff6d0', sash: '#b8863a', hair: '#fffaf0', kind: 'crown', ghost: true, hold: null },
    godj: { name: 'Thần giới', robe: '#b8e0cc', trim: '#ffffff', sash: '#4a9a7a', hair: '#f4fff8', kind: 'crown', ghost: true, hold: null },
    godb: { name: 'Thần giới', robe: '#b4c8f0', trim: '#ffffff', sash: '#5a78c0', hair: '#f4f8ff', kind: 'crown', ghost: true, hold: null },
    godr: { name: 'Thần giới', robe: '#f0c0c8', trim: '#ffffff', sash: '#c0506a', hair: '#fff4f6', kind: 'crown', ghost: true, hold: null },
    // v2.25.0 (Chân Dung Phương Thần): mười hai Phương thần mỗi vị một dáng riêng — sắc áo theo phương, kiểu đầu, vật cầm, vóc người —
    // vẫn mờ chân như hồn để nhận ra là thần.
    godty: { name: 'Huyền Minh', robe: '#3a4a7a', trim: '#9aa8e0', sash: '#1e2848', hair: '#e8ecff', kind: 'long', ghost: true, hold: null, s: 1.04 },
    godsuu: { name: 'Hậu Tải', robe: '#7a5a48', trim: '#e8d8b8', sash: '#3a2a20', hair: '#efeae0', kind: 'scarf', ghost: true, hold: 'staff', s: 0.92, stoop: 8 },
    goddan: { name: 'Khai Dương', robe: '#ffb36a', trim: '#fff2d0', sash: '#d8743a', hair: '#2a2024', kind: 'knot', ghost: true, hold: null, s: 0.88 },
    godmao: { name: 'Thanh Mộc', robe: '#4f8a52', trim: '#cfe8c0', sash: '#5a4030', hair: '#d8e8c8', kind: 'straw', ghost: true, hold: 'staff', s: 1.16 },
    godthin: { name: 'Vân Vũ', robe: '#6a8ac8', trim: '#e0ecff', sash: '#3a5a98', hair: '#f4f8ff', kind: 'crown', ghost: true, hold: 'fan', s: 1.06 },
    godtyj: { name: 'Xích Diễm', robe: '#d84a3a', trim: '#ffd08a', sash: '#7a1a1a', hair: '#ff9a4a', kind: 'long', ghost: true, hold: null, s: 1.08 },
    godngo: { name: 'Chính Dương', robe: '#f4e2a0', trim: '#ffffff', sash: '#c8962a', hair: '#fffaf0', kind: 'crown', ghost: true, hold: 'mirror' },
    godmui: { name: 'Phong Nhiêu', robe: '#c9a04a', trim: '#f4e4b0', sash: '#7a5a20', hair: '#2a2024', kind: 'bun', ghost: true, hold: 'box', s: 1.12 },
    godthan: { name: 'Kim Cương', robe: '#4a7078', trim: '#e0e6f0', sash: '#3a4250', hair: '#15131a', kind: 'helm2', ghost: true, hold: 'sword', s: 1.1 },
    goddau: { name: 'Thu Liễm', robe: '#c9784a', trim: '#f4d8b0', sash: '#7a3a1a', hair: '#e8e0d0', kind: 'straw', ghost: true, hold: 'staff', stoop: 3 },
    godtuat: { name: 'Trấn Thủ', robe: '#7a2a3a', trim: '#c8b8e0', sash: '#2a1e34', hair: '#15131a', kind: 'helm2', ghost: true, hold: 'spear', s: 1.16 },
    godhoi: { name: 'Phong Đăng', robe: '#9a4a6a', trim: '#f0d0c0', sash: '#5a2a20', hair: '#e8e4da', kind: 'oldman', ghost: true, hold: 'staff', stoop: 4 },
    // v2.26.0 (Thiên Cang Chân Dung): ba mươi sáu Thiên Cang mỗi vị một dáng riêng — Thiên Hình (hinh) và Phong Đăng (godhoi) đã có từ trước,
    // ba mươi bốn vị còn lại thêm ở đây: sắc áo khác nhau ít nhất 40 đơn vị màu, mỗi vị một kiểu đầu / vật cầm / vóc người / nét riêng ở bóng.
    godc01: { name: 'Minh Báo', robe: '#4a1a2a', trim: '#e8c9a0', sash: '#c9a04a', hair: '#1a1216', kind: 'hat', ghost: true, hold: 'scroll' },
    godc02: { name: 'Thông Bảo', robe: '#653a78', trim: '#f0d070', sash: '#c9a04a', hair: '#15131a', kind: 'turban', ghost: true, hold: 'abacus', s: 1.06 },
    godc03: { name: 'Tịch Chiếu', robe: '#9683c6', trim: '#e6defa', sash: '#5a4a8a', hair: '#e8e4f4', kind: 'veil', ghost: true, hold: null, train: '#b8a8e0', s: 0.98 },
    godc04: { name: 'Kết Duyên', robe: '#d8708a', trim: '#ffe0e6', sash: '#a8283c', hair: '#15131a', kind: 'pins', ghost: true, hold: 'thread', s: 0.94 },
    godc05: { name: 'Xuân Sinh', robe: '#9ad07a', trim: '#f0f8d0', sash: '#4a8a3a', hair: '#2a2a1a', kind: 'sprout', ghost: true, hold: 'pot', s: 0.82 },
    godc06: { name: 'Động Vi', robe: '#24644d', trim: '#d0e8d8', sash: '#c9a04a', hair: '#efeae0', kind: 'oldman', ghost: true, hold: 'book', dipper: '#f0d070', stoop: 5 },
    godc07: { name: 'Tích Vi', robe: '#9ba0aa', trim: '#d8dce4', sash: '#5a5e68', hair: '#2a2024', kind: 'band', ghost: true, hold: 'stone', s: 1.06 },
    godc08: { name: 'Thái Hòa', robe: '#f0e16a', robe2: '#34346e', split: 'h', trim: '#fff6c0', sash: '#c9a04a', hair: '#15131a', kind: 'long', ghost: true, hold: 'scale', halo: ['#f6d060', '#8a8ad8'] },
    godc09: { name: 'Chính Quả', robe: '#bae9b9', trim: '#ffffff', sash: '#5aa86a', hair: '#f4fff4', kind: 'longhat', ghost: true, hold: 'soul', s: 1.04 },
    godc10: { name: 'Lưu Kim', robe: '#2a50b0', trim: '#c9d8ff', sash: '#f0d070', hair: '#15131a', kind: 'ponytail', ghost: true, hold: 'ladle', s: 0.96 },
    godc11: { name: 'An Lan', robe: '#2a8aa8', trim: '#d0f0f8', sash: '#f4f0e0', hair: '#d8f4ff', kind: 'long', ghost: true, hold: 'trident', ripple: '#bfeaf4', s: 1.1 },
    godc12: { name: 'Đồng Tâm', robe: '#a8553a', trim: '#f0d890', sash: '#6a2a1a', hair: '#15131a', kind: 'helm2', ghost: true, hold: 'banner', cape: '#7a2a1e', s: 1.08 },
    godc13: { name: 'Kiện Hành', robe: '#e0f6f8', trim: '#ffffff', sash: '#6a9aa8', hair: '#cfd8dc', kind: 'fur', ghost: true, hold: 'staff', s: 1.1, stoop: 2 },
    godc14: { name: 'Cách Vật', robe: '#a8883a', trim: '#f0e4b0', sash: '#5a4620', hair: '#1c1620', kind: 'knot', ghost: true, hold: 'compass', goggles: true },
    godc15: { name: 'Khai Sơn', robe: '#4a4a44', trim: '#aaa89c', sash: '#2a2a26', hair: '#d8d4c8', kind: 'monk', ghost: true, hold: 'chisel', s: 1.12 },
    godc16: { name: 'Trú Dạ', robe: '#f08a3a', robe2: '#2a2030', split: 'v', trim: '#ffd09a', sash: '#8a3a1a', hair: '#2a2030', kind: 'long', ghost: true, hold: 'gong', s: 1.04 },
    godc17: { name: 'Hồi Hướng', robe: '#a89a78', trim: '#e0d6b8', sash: '#6a5a38', hair: '#d8d4c8', kind: 'scarf', ghost: true, hold: 'yoke', stoop: 8 },
    godc18: { name: 'Tán Tụ', robe: '#a0c8f0', trim: '#ffffff', sash: '#5a88c0', hair: '#f4f8ff', kind: 'cloudcap', ghost: true, hold: 'crook', s: 1.02 },
    godc19: { name: 'Chỉ Thủy', robe: '#7ad0c8', trim: '#e0f8f4', sash: '#2a8a82', hair: '#dff6f2', kind: 'long', ghost: true, hold: null, ripple: '#bff0ea', s: 0.96 },
    godc20: { name: 'Tri Âm', robe: '#e8a0a0', trim: '#fff0f0', sash: '#b8505a', hair: '#2a2024', kind: 'knot', ghost: true, hold: 'horn', ears: true, s: 0.98 },
    godc21: { name: 'Dưỡng Chính', robe: '#5aa890', trim: '#e0f4ec', sash: '#2a7a68', hair: '#1c1620', kind: 'bun', ghost: true, hold: 'herbs', s: 0.98 },
    godc22: { name: 'Vấn Tân', robe: '#809b6e', trim: '#d8e4cc', sash: '#4a5a3a', hair: '#d0ccc0', kind: 'straw', ghost: true, hold: 'oar', s: 1.04 },
    godc23: { name: 'Trì Hằng', robe: '#d2911f', trim: '#ffe6a0', sash: '#7a4a10', hair: '#15131a', kind: 'hood', ghost: true, hold: 'lamp', s: 1.02 },
    godc24: { name: 'Trương Thỉ', robe: '#5e762c', trim: '#d0dca0', sash: '#3a4a18', hair: '#1c1620', kind: 'feathercap', ghost: true, hold: 'bow', s: 1.06 },
    godc25: { name: 'Thiện Căn', robe: '#2a3a2a', trim: '#8ab88a', sash: '#4a6a3a', hair: '#0d1413', kind: 'cowl', ghost: true, hold: 'seedbag', s: 0.94 },
    godc26: { name: 'Tiết Độ', robe: '#c8b28a', trim: '#f0e6c8', sash: '#8a6a3a', hair: '#2a2024', kind: 'hat', ghost: true, hold: 'jar', s: 1.08 },
    godc27: { name: 'Định Phong', robe: '#7e8c96', trim: '#dfe6ea', sash: '#4a5864', hair: '#e8ecee', kind: 'long', ghost: true, hold: null, swirl: '#e6eef2', s: 1.02 },
    godc28: { name: 'Hòa Quang', robe: '#8a7660', trim: '#d8ccb8', sash: '#5a4a38', hair: '#d8d2c4', kind: 'scarf', ghost: true, hold: 'basket', glow: '#ffe6a0', s: 0.94 },
    godc29: { name: 'Cố Bản', robe: '#754a1f', trim: '#d8b078', sash: '#3a2410', hair: '#1c1620', kind: 'band', ghost: true, hold: 'spade', s: 1.06 },
    godc30: { name: 'Minh Kính', robe: '#b0c2c4', trim: '#ffffff', sash: '#6a8a94', hair: '#e6f0f4', kind: 'circlet', ghost: true, hold: 'mirror2' },
    godc31: { name: 'Đại Thành', robe: '#d2681f', trim: '#cfd6df', sash: '#6a2a0a', hair: '#4a3a30', kind: 'helm', ghost: true, hold: 'hammer', s: 1.2 },
    godc32: { name: 'Tiêu Dao', robe: '#5a7aa0', trim: '#d0def0', sash: '#2a3a58', hair: '#d8d4c8', kind: 'straw', ghost: true, hold: 'sword', hold2: 'gourd' },
    godc35: { name: 'Vô Ba', robe: '#15171d', trim: '#a8b8d8', sash: '#4a5878', hair: '#e8ecf4', kind: 'plume', ghost: true, hold: 'sword', cape: '#2a3448', s: 1.22 },
    godc36: { name: 'Hằng Nguyệt', robe: '#98a8d8', trim: '#f0f4ff', sash: '#5a6aa8', hair: '#f4f6ff', kind: 'crown', ghost: true, hold: null, moon: '#eef2ff' },
  };
  // ---- Tư thế --------------------------------------------------------------------------------------------------------------------
  // legs: kiểu chân; hands: [tay trái, tay phải] (toạ độ trong khung người, chân ở y=0, đỉnh đầu ở y≈-100); lean: độ ngả của thân trên.
  const POSE = {
    stand: { legs: 'stand', hands: [[-11, -52], [11, -52]] },
    talk: { legs: 'stand', hands: [[-11, -54], [20, -74]], lean: 2 },
    zen: { legs: 'stand', hands: [[-3, -60], [3, -60]], lean: 3 },
    bow: { legs: 'stand', hands: [[-3, -66], [3, -66]], lean: 22 },
    walk: { legs: 'stride', hands: [[-12, -56], [14, -58]], lean: 4 },
    carry: { legs: 'stride', hands: [[-19, -80], [19, -82]], lean: 5, pole: true },
    martial: { legs: 'wide', hands: [[-17, -64], [26, -80]], lean: 4 },
    strike: { legs: 'lunge', hands: [[-14, -70], [32, -64]], lean: 14 },
    taichi: { legs: 'wide', hands: [[-17, -72], [17, -62]], lean: 0 },
    sit: { legs: 'sit', hands: [[-4, -26], [4, -26]], lean: 0 },
    kneel: { legs: 'kneel', hands: [[-8, -38], [8, -38]], lean: 3 },
    point: { legs: 'stand', hands: [[-11, -54], [34, -88]], lean: 0 },
    fall: { legs: 'stride', hands: [[-24, -100], [24, -96]], lean: -22 },
    cast: { legs: 'wide', hands: [[-20, -106], [20, -106]], lean: -4 },
    hold: { legs: 'stand', hands: [[-8, -64], [8, -64]], lean: 2 },
    hurt: { legs: 'kneel', hands: [[-10, -66], [12, -40]], lean: 8 },
    lie: { legs: 'stand', hands: [[-8, -50], [8, -50]], lie: true },
    float: { legs: 'float', hands: [[-14, -62], [14, -62]], lean: 0 },
    stagger: { legs: 'stride', hands: [[-12, -48], [18, -60]], lean: 12 },
    back: { legs: 'stand', hands: [[-10, -52], [10, -52]], back: true },
  };
  // Thân dưới (váy áo + chân) theo kiểu chân.
  const SKIRT = {
    stand: 'M-8,-48 C-10,-30 -14,-14 -16,-2 Q0,3 16,-2 C14,-14 10,-30 8,-48Z',
    stride: 'M-8,-48 C-10,-32 -15,-16 -21,-3 Q-12,3 -6,-3 L1,-24 L8,-4 Q17,3 25,-3 C17,-16 10,-32 8,-48Z',
    wide: 'M-8,-48 C-14,-38 -26,-26 -32,-3 Q-22,3 -14,-3 L-4,-26 L0,-28 L4,-26 L14,-3 Q22,3 32,-3 C26,-26 14,-38 8,-48Z',
    lunge: 'M-8,-48 C-14,-34 -28,-18 -36,-3 Q-26,3 -16,-3 C-10,-14 -4,-24 4,-28 C10,-22 18,-14 26,-6 Q32,0 38,-4 C32,-18 20,-34 8,-48Z',
    sit: 'M-8,-30 C-14,-18 -34,-12 -38,-2 Q0,7 38,-2 C34,-12 14,-18 8,-30Z',
    kneel: 'M-8,-38 C-10,-26 -16,-12 -17,-2 Q0,4 17,-2 C16,-12 10,-26 8,-38Z',
    float: 'M-8,-48 C-9,-30 -5,-12 0,8 C5,-12 9,-30 8,-48Z',
  };
  const FEET = { stand: [[-7, -1], [7, -1]], stride: [[-14, -1], [18, -1]], wide: [[-25, -1], [25, -1]], lunge: [[-26, -1], [31, -3]], sit: [], kneel: [], float: [] };
  const DROP = { sit: 20, kneel: 11 };
  // ---- Cánh tay -------------------------------------------------------------------------------------------------------------------
  const A1 = 17, A2 = 17;
  function armPts(sh, hand, bend) {
    let dx = hand[0] - sh[0], dy = hand[1] - sh[1];
    let d = Math.hypot(dx, dy) || 1;
    const max = A1 + A2 - 0.6;
    if (d > max) {
      hand = [sh[0] + (dx * max) / d, sh[1] + (dy * max) / d];
      dx = hand[0] - sh[0];
      dy = hand[1] - sh[1];
      d = max;
    }
    const a = (A1 * A1 - A2 * A2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A1 * A1 - a * a));
    const ux = dx / d, uy = dy / d;
    return [sh, [sh[0] + ux * a - uy * h * bend, sh[1] + uy * a + ux * h * bend], hand];
  }
  // ---- Đầu --------------------------------------------------------------------------------------------------------------------------
  function head(L, ink) {
    const skin = L.glass ? '#dff3f6' : '#e8c9a8', hair = L.hair, k = L.kind;
    let s = '';
    // v2.26.0: vầng trăng (đĩa sáng) hoặc vầng sáng một / hai sắc nằm sau đầu.
    if (L.moon) s += '<circle cx="0" cy="-93" r="12.8" fill="' + L.moon + '" opacity=".88"/><circle cx="-4.8" cy="-99.4" r="2.1" fill="' + mix(L.moon, '#7080b8', 0.35) + '" opacity=".45"/><circle cx="5.4" cy="-87" r="1.5" fill="' + mix(L.moon, '#7080b8', 0.35) + '" opacity=".45"/>';
    if (L.halo) {
      const hc = Array.isArray(L.halo) ? L.halo : [L.halo, L.halo];
      s += '<path d="M0,-105.8 A12.8,12.8 0 0 0 0,-80.2" stroke="' + hc[0] + '" stroke-width="1.7" fill="none" opacity=".85"/><path d="M0,-105.8 A12.8,12.8 0 0 1 0,-80.2" stroke="' + hc[1] + '" stroke-width="1.7" fill="none" opacity=".85"/>';
    }
    const back = (k === 'long' || k === 'mask' || k === 'fox') ? '<path class="sc-hair" d="M-6.4,-93 C-9,-80 -8,-66 -5,-54 L5,-54 C8,-66 9,-80 6.4,-93Z" fill="' + hair + '"/>' : '';
    s += back;
    s += '<rect x="-2.4" y="-89" width="4.8" height="5" fill="' + skin + '"/>';
    if (L.ears) s += '<path d="M-6,-95 Q-10.8,-96 -9.6,-87.6 Q-7.8,-88.8 -6,-91Z M6,-95 Q10.8,-96 9.6,-87.6 Q7.8,-88.8 6,-91Z" fill="' + skin + '"/>';
    s += '<circle cx="0" cy="-93" r="6.4" fill="' + skin + '"/>';
    const cap = '<path d="M-6.7,-92 A6.7,6.7 0 0 1 6.7,-92 Q3.5,-96.5 0,-95.6 Q-3.5,-96.5 -6.7,-92Z" fill="' + hair + '"/>';
    if (k === 'knot') s += cap + '<circle cx="0" cy="-101" r="3" fill="' + hair + '"/><path d="M-3,-98 h6" stroke="' + L.sash + '" stroke-width="1.2"/>';
    else if (k === 'bun') s += cap + '<circle cx="0" cy="-100.5" r="3.6" fill="' + hair + '"/>';
    else if (k === 'buns') s += cap + '<circle cx="-5" cy="-99" r="2.9" fill="' + hair + '"/><circle cx="5" cy="-99" r="2.9" fill="' + hair + '"/>';
    else if (k === 'oldman') s += '<path d="M-6.8,-92 A6.8,6.8 0 0 1 6.8,-92 Q4,-95 0,-94.5 Q-4,-95 -6.8,-92Z" fill="' + hair + '"/><path d="M-4.2,-88.5 Q0,-71 4.2,-88.5Z" fill="' + hair + '"/><path d="M-6.4,-93 C-7.5,-86 -7,-80 -5.5,-76" stroke="' + hair + '" stroke-width="2.2" fill="none"/><path d="M6.4,-93 C7.5,-86 7,-80 5.5,-76" stroke="' + hair + '" stroke-width="2.2" fill="none"/>';
    else if (k === 'monk') s += '<path d="M-6.5,-96 Q0,-101 6.5,-96" stroke="' + mix(skin, '#000', 0.2) + '" stroke-width="1" fill="none" opacity=".4"/>';
    else if (k === 'straw') s += '<path d="M-17,-94 L0,-110 L17,-94 Q0,-89 -17,-94Z" fill="#c9a869"/><path d="M-17,-94 Q0,-89 17,-94" stroke="#8a6a34" stroke-width="1.4" fill="none"/><path d="M-4.2,-88.5 Q0,-76 4.2,-88.5Z" fill="#dcd6c8"/>';
    else if (k === 'scarf') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L8,-86 Q0,-83 -8,-86Z" fill="' + mix(L.robe, '#ffffff', 0.15) + '"/>';
    else if (k === 'crown') s += '<path d="M-6.8,-92 A6.8,6.8 0 0 1 6.8,-92 Q3.5,-96 0,-95.4 Q-3.5,-96 -6.8,-92Z" fill="' + hair + '"/><path d="M-7,-97 L-4,-103 L0,-98 L4,-103 L7,-97Z" fill="#f2cf6a"/>';
    else if (k === 'hood' || k === 'cowl') s += '<path d="M-8.4,-86 C-9,-100 -3,-104 0,-104 C3,-104 9,-100 8.4,-86 Q0,-90 -8.4,-86Z" fill="' + L.robe + '"/><ellipse cx="0" cy="-92.5" rx="4.4" ry="5" fill="#0c0a10"/>';
    else if (k === 'helm') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L7.4,-90 L-7.4,-90Z" fill="' + L.trim + '"/><path d="M0,-99 L0,-106" stroke="' + L.trim + '" stroke-width="2"/>';
    else if (k === 'helm2') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L7.4,-90 L-7.4,-90Z" fill="#4a3a30"/><path d="M0,-99 L0,-107" stroke="#b8344a" stroke-width="2.4"/>';
    else if (k === 'long') s += cap + '<path d="M-6.5,-92 C-9,-80 -8,-68 -6,-58" stroke="' + hair + '" stroke-width="2.4" fill="none"/>';
    else if (k === 'mask') s += cap + '<circle cx="0" cy="-93" r="5.6" fill="#f3f1ec"/><path d="M-2.2,-97 A5.4,5.4 0 1 0 -2.2,-89 A3.6,3.6 0 1 1 -2.2,-97Z" fill="#2a2430"/>';
    else if (k === 'fox') s += cap + '<path d="M-6,-95 L-8,-104 L-2.4,-97Z M6,-95 L8,-104 L2.4,-97Z" fill="#f4f0f6"/><path d="M-5.8,-93 Q0,-99 5.8,-93 L0,-86Z" fill="#f4f0f6"/><path d="M-3,-92.5 l2,0.6 M3,-92.5 l-2,0.6" stroke="#c0305a" stroke-width="1.2"/>';
    // v2.26.0 (Thiên Cang Chân Dung): thêm kiểu đầu để ba mươi sáu Thiên Cang mỗi vị một dáng.
    else if (k === 'hat') s += cap + '<rect x="-6.4" y="-101" width="12.8" height="6.2" rx="1.3" fill="' + hair + '"/><path d="M-6.4,-96.6 H6.4" stroke="' + L.trim + '" stroke-width=".9"/><rect x="-15" y="-98.6" width="9.6" height="2" rx="1" fill="' + hair + '"/><rect x="5.4" y="-98.6" width="9.6" height="2" rx="1" fill="' + hair + '"/>';
    else if (k === 'turban') s += '<path d="M-7.3,-91 A7.3,7.3 0 0 1 7.3,-91 L7.5,-90 Q0,-87.4 -7.5,-90Z" fill="' + L.trim + '"/><path d="M-6.6,-96 Q0,-99.4 6.6,-96 M-7,-93.4 Q0,-96.8 7,-93.4" stroke="' + L.sash + '" stroke-width=".9" fill="none"/><path d="M5,-99 Q10.6,-105 13,-99 Q9,-97.4 5,-99Z" fill="' + L.trim + '"/>';
    else if (k === 'pins') s += cap + '<circle cx="0" cy="-100.6" r="3.3" fill="' + hair + '"/><path d="M-3.4,-99 L-11.5,-105 M-2.4,-101 L-8,-108.4 M3.4,-99 L11.5,-105 M2.4,-101 L8,-108.4" stroke="#f2cf6a" stroke-width="1" stroke-linecap="round"/><circle cx="-11.5" cy="-105" r="1.4" fill="' + L.sash + '"/><circle cx="11.5" cy="-105" r="1.4" fill="' + L.sash + '"/><circle cx="-8" cy="-108.4" r="1.1" fill="' + L.sash + '"/><circle cx="8" cy="-108.4" r="1.1" fill="' + L.sash + '"/>';
    else if (k === 'sprout') s += cap + '<circle cx="0" cy="-100.2" r="3.4" fill="' + hair + '"/><path d="M0,-102 Q-9.4,-109.6 -11,-102 Q-4.6,-99.8 0,-102Z M0,-102 Q9.4,-109.6 11,-102 Q4.6,-99.8 0,-102Z" fill="#6ac85a"/><path d="M0,-102 V-107" stroke="#4a9a3a" stroke-width="1.2"/>';
    else if (k === 'longhat') s += cap + '<path d="M-5.6,-94.6 L-3.4,-127 Q0,-129.4 3.4,-127 L5.6,-94.6 Q0,-91.8 -5.6,-94.6Z" fill="' + L.trim + '" stroke="' + L.sash + '" stroke-width=".9"/><path d="M-5.2,-101 H5.2" stroke="' + L.sash + '" stroke-width="2"/><path d="M0,-123 V-105" stroke="' + L.sash + '" stroke-width="1.6" stroke-dasharray="3 1.8" opacity=".85"/><path d="M0,-128 Q6.4,-124 5,-114" stroke="' + L.sash + '" stroke-width="1" fill="none"/>';
    else if (k === 'ponytail') s += cap + '<circle cx="4.4" cy="-98.8" r="1.8" fill="' + L.sash + '"/><path d="M4.6,-98.6 Q15,-101 19.4,-90 Q14.6,-95.4 6,-95.8Z" fill="' + hair + '"/>';
    else if (k === 'fur') {
      let r = '';
      for (let i = 0; i < 9; i++) {
        const a = ((-190 + i * 25) * Math.PI) / 180;
        r += '<circle cx="' + f(Math.cos(a) * 8) + '" cy="' + f(-93 + Math.sin(a) * 8) + '" r="3.1" fill="' + hair + '"/>';
      }
      s += '<path d="M-8.4,-92 A8.4,8.4 0 0 1 8.4,-92Z" fill="' + hair + '"/>' + r;
    }
    else if (k === 'feathercap') s += cap + '<path d="M-7.6,-94 L0,-105.6 L7.6,-94 Q0,-91.6 -7.6,-94Z" fill="' + L.robe + '"/><path d="M3.4,-100 Q14,-114 21,-107 Q13.6,-107.4 5.4,-97.6Z" fill="#efe8d4"/><path d="M3.8,-99.4 Q13,-106.6 20.6,-107" stroke="' + L.sash + '" stroke-width=".8" fill="none"/>';
    else if (k === 'cloudcap') s += cap + '<circle cx="-4.6" cy="-98.4" r="4.2" fill="#fff"/><circle cx="0.4" cy="-101.4" r="5.2" fill="#fff"/><circle cx="5.6" cy="-98.2" r="4.2" fill="#fff"/><path d="M-8.4,-95.4 H8.4" stroke="' + mix(L.robe, '#ffffff', 0.2) + '" stroke-width="1.6" opacity=".6"/>';
    else if (k === 'circlet') s += cap + '<path d="M-6.8,-95.6 Q0,-99 6.8,-95.6" stroke="#e6ecf8" stroke-width="1.8" fill="none"/><circle cx="0" cy="-97.2" r="2.1" fill="#8ad0f4"/><path d="M-6.8,-95.6 l-1.6,5 M6.8,-95.6 l1.6,5" stroke="#e6ecf8" stroke-width="1"/>';
    else if (k === 'plume') s += '<path d="M-7.6,-92 A7.6,7.6 0 0 1 7.6,-92 L7.6,-89.6 L-7.6,-89.6Z" fill="#cfd6df"/><path d="M-7.6,-92 L-8.2,-86.6 L-5,-86.6 M7.6,-92 L8.2,-86.6 L5,-86.6" stroke="#aab4c2" stroke-width="1.4" fill="none"/><path d="M0,-99.6 C-3,-111 5,-120 15,-117 C9,-114.6 5,-108 3.4,-99.6Z" fill="' + L.trim + '"/><path d="M0,-99.6 V-101" stroke="#cfd6df" stroke-width="2"/>';
    else if (k === 'band') s += cap + '<circle cx="0" cy="-100.6" r="3" fill="' + hair + '"/><path d="M-6.8,-96.2 Q0,-98.4 6.8,-96.2" stroke="' + L.sash + '" stroke-width="2"/><path d="M6.6,-96.4 L11.6,-93.6 M6.4,-96.8 L11.2,-98.6" stroke="' + L.sash + '" stroke-width="1.3" stroke-linecap="round"/>';
    else if (k === 'veil') s += cap + '<path d="M-8.2,-96.4 Q0,-104.6 8.2,-96.4 L13,-62 Q0,-55 -13,-62Z" fill="' + mix(L.robe, '#ffffff', 0.38) + '" opacity=".5"/><path d="M-8.2,-96.4 Q0,-104.6 8.2,-96.4" stroke="' + L.trim + '" stroke-width="1.2" fill="none"/>';
    else s += cap;
    if (L.goggles) s += '<path d="M-6.7,-96.2 Q0,-99 6.7,-96.2" stroke="#6a4a24" stroke-width="1.6" fill="none"/><circle cx="-3.1" cy="-97.4" r="2.7" fill="#bfe8f0" stroke="#b08a3a" stroke-width="1.1"/><circle cx="3.1" cy="-97.4" r="2.7" fill="#bfe8f0" stroke="#b08a3a" stroke-width="1.1"/><path d="M-3.4,-98.4 l1.2,-0.8" stroke="#fff" stroke-width=".8"/>';
    return s;
  }
  // ---- Vật cầm trong tay -------------------------------------------------------------------------------------------------------------
  // Tọa độ gốc tại bàn tay (hx, hy); ang: độ nghiêng.
  function holding(kind, hx, hy, L, ink) {
    const g = (inner, ang) => '<g transform="translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + (ang || 0) + ')">' + inner + '</g>';
    switch (kind) {
      case 'staff': return g('<path d="M0,26 L0,-58" stroke="#6b4a2c" stroke-width="2.6" stroke-linecap="round"/>', 0);
      case 'woodsword': return g('<path d="M0,6 L0,-6 M-4,-6 h8" stroke="#6b4a2c" stroke-width="2.2"/><path d="M-2,-6 L-2,-46 L2,-46 L2,-6Z" fill="#c69a63"/><path d="M-2,-18 l2,1.4" stroke="#6b4a2c" stroke-width="1.2"/>', 20);
      case 'sword': return g('<path d="M0,5 L0,-5 M-5,-5 h10" stroke="#bfae7a" stroke-width="2"/><path d="M-1.6,-5 L-1.6,-54 L0,-58 L1.6,-54 L1.6,-5Z" fill="#dfe6ee"/>', 24);
      case 'sabers': return g('<path d="M0,4 L0,-4 M-4,-4 h8" stroke="#c9b25a" stroke-width="2"/><path d="M-1.6,-4 L-1.6,-40 Q0,-48 1.6,-40 L1.6,-4Z" fill="#e8f2ff"/><path d="M-1,-6 L-1,-40" stroke="#6ab4ff" stroke-width="1" opacity=".8"/>', 26) + g('<path d="M0,4 L0,-4 M-4,-4 h8" stroke="#c9b25a" stroke-width="2"/><path d="M-1.6,-4 L-1.6,-40 Q0,-48 1.6,-40 L1.6,-4Z" fill="#e8f2ff"/>', -30);
      case 'fan': return g('<path d="M0,2 L-14,-16 Q0,-26 14,-16Z" fill="' + L.sash + '" stroke="' + L.trim + '" stroke-width="1"/><path d="M0,2 L0,-20 M0,2 L-9,-18 M0,2 L9,-18" stroke="' + L.trim + '" stroke-width=".8"/>', 8);
      case 'lamp': return g('<path d="M0,0 L0,16" stroke="' + ink + '" stroke-width="1.4"/><ellipse cx="0" cy="22" rx="7" ry="9" fill="#ffc86a"/><path d="M-5,13 h10 M-4,31 h8" stroke="' + ink + '" stroke-width="2"/>', 0);
      case 'flute': return g('<path d="M-12,-3 L16,3" stroke="#efe9d6" stroke-width="3.2" stroke-linecap="round"/><circle cx="-3" cy="-1.4" r=".9" fill="#222"/><circle cx="4" cy="0.4" r=".9" fill="#222"/>', -22);
      case 'ruler': return g('<path d="M0,10 L0,-32" stroke="#bfe8d0" stroke-width="4" stroke-linecap="round"/><path d="M0,10 L0,-32" stroke="#ffffff" stroke-width="1.4" opacity=".7"/>', 0);
      case 'mirror': return g('<circle cx="0" cy="-14" r="11" fill="#d8bc6a" stroke="#8a6a24" stroke-width="2"/><circle cx="0" cy="-14" r="8" fill="#f4ecc8"/><path d="M0,-3 L0,8" stroke="#8a6a24" stroke-width="3"/>', 0);
      case 'chain': return g('<path d="M0,0 Q16,10 22,28 T34,52" stroke="#1a1822" stroke-width="3" fill="none" stroke-dasharray="4 2.4"/>', 0);
      case 'hammer': return g('<path d="M0,6 L0,-22" stroke="#6b4a2c" stroke-width="2.4"/><rect x="-7" y="-30" width="14" height="9" fill="#4a4e58"/>', 18);
      case 'spear': return g('<path d="M0,26 L0,-66" stroke="#6b4a2c" stroke-width="2.2"/><path d="M0,-66 L-3,-58 L3,-58Z M0,-80 L3,-66 L-3,-66Z" fill="#cfd6df"/><path d="M0,-62 l0,6" stroke="#b8344a" stroke-width="3"/>', 0);
      case 'box': return g('<rect x="-9" y="2" width="18" height="14" rx="2" fill="#8a5a36"/><rect x="-9" y="2" width="18" height="4" fill="#6b4226"/>', 0);
      // v2.26.0 (Thiên Cang Chân Dung): vật cầm của ba mươi sáu Thiên Cang.
      case 'scroll': return g('<rect x="-10" y="-7" width="20" height="11" rx="2" fill="#efe4c4" stroke="#8a6a3c" stroke-width="1"/><path d="M-6,-3 h12 M-6,0 h9" stroke="#8a6a3c" stroke-width=".8"/><circle cx="-10" cy="-1.5" r="2.8" fill="#b8863a"/><circle cx="10" cy="-1.5" r="2.8" fill="#b8863a"/><path d="M0,4 V14" stroke="#b8344a" stroke-width="1.4"/>', -4);
      case 'abacus': return g('<rect x="-11" y="-10" width="22" height="14" rx="1.6" fill="#d9a85a" stroke="#6b4226" stroke-width="1.4"/><path d="M-5.5,-10 V4 M0,-10 V4 M5.5,-10 V4 M-11,-4 H11" stroke="#6b4226" stroke-width="1"/><path d="M-5.5,-7 h0 M0,-7 h0 M5.5,-7 h0 M-5.5,0 h0 M-5.5,2 h0 M0,0.4 h0 M5.5,-0.6 h0 M5.5,1.6 h0" stroke="#fff3c0" stroke-width="3" stroke-linecap="round"/>', -8);
      case 'thread': return g('<path d="M0,0 C11,-15 24,-5 15,9 C9,18 -6,10 4,-3" stroke="#d6405a" stroke-width="1.7" fill="none"/><path d="M2,1 Q17,14 9,32 M0,3 Q-12,18 -3,36 M14,9 Q26,22 21,38" stroke="#e8506a" stroke-width="1.2" fill="none" opacity=".85"/><circle cx="15" cy="9" r="1.6" fill="#ffd0d8"/>', 0);
      case 'pot': return g('<path d="M-7,5 H7 L5,15 H-5Z" fill="#a8683a"/><path d="M-7.6,4 H7.6" stroke="#7a4a24" stroke-width="2"/><path d="M0,4 V-6" stroke="#4a9a3a" stroke-width="1.8"/><path d="M0,-3 Q-9,-4 -10,-11 Q-3,-10 0,-3Z M0,-6 Q9,-7 10,-14 Q3,-13 0,-6Z" fill="#6ac85a"/>', 0);
      case 'book': return g('<rect x="-9" y="-12" width="17" height="4.2" fill="#4a6a9a"/><rect x="-10" y="-8" width="18" height="4.2" fill="#9a4a4a"/><rect x="-9" y="-4" width="17" height="4.2" fill="#c9a15a"/><path d="M-9,-10 h17 M-10,-6 h18 M-9,-2 h17" stroke="#f4ecd0" stroke-width=".7" opacity=".8"/>', 0);
      case 'stone': return g('<rect x="-9" y="-8" width="18" height="11" rx="1.8" fill="#aab0b8" stroke="#5a6068" stroke-width="1"/><path d="M-9,-2.6 H9 M-2,-8 V-2.6 M3,-2.6 V3" stroke="#5a6068" stroke-width=".8"/>', 0);
      case 'scale': return g('<path d="M0,8 V-28 M-15,-23 H15" stroke="#8a6a24" stroke-width="2"/><path d="M-15,-23 L-19,-9 M-15,-23 L-11,-9 M15,-23 L11,-9 M15,-23 L19,-9" stroke="#8a6a24" stroke-width=".9"/><path d="M-20,-9 H-10 Q-15,-3 -20,-9Z" fill="#f0c96a"/><path d="M10,-9 H20 Q15,-3 10,-9Z" fill="#cfd8ec"/><circle cx="0" cy="-30" r="2.4" fill="#e6c36a"/>', 0);
      case 'soul': return g('<path d="M0,10 V-40" stroke="#6b4a2c" stroke-width="1.8" stroke-linecap="round"/><path d="M0,-40 H12" stroke="#6b4a2c" stroke-width="1.6"/><ellipse cx="12" cy="-32" rx="6.4" ry="8" fill="#c8f6dc" stroke="#4a9a7a" stroke-width="1.2"/><path d="M12,-40 V-43 M7,-32 h10" stroke="#4a9a7a" stroke-width="1"/><ellipse cx="12" cy="-32" rx="3" ry="4.4" fill="#fffbe0"/>', 0);
      case 'ladle': return g('<path d="M0,12 L1,-34" stroke="#b8c4d4" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="1.4" cy="-40" rx="8" ry="6.2" fill="#e8eef6" stroke="#8a96a8" stroke-width="1.2"/><ellipse cx="1.4" cy="-41" rx="5.6" ry="3.6" fill="#9ab8f0" opacity=".8"/>', 6);
      case 'trident': return g('<path d="M0,26 L0,-64" stroke="#6b4a2c" stroke-width="2.2"/><path d="M-8.4,-62 L-7,-77 L-5.6,-62Z M-1.4,-62 L0,-84 L1.4,-62Z M5.6,-62 L7,-77 L8.4,-62Z" fill="#d4dce6"/><path d="M-8.4,-62 H8.4" stroke="#d4dce6" stroke-width="2"/>', 0);
      case 'banner': return g('<path d="M0,26 V-72" stroke="#6b4a2c" stroke-width="2.4"/><path d="M0,-72 H28 L22,-62 L28,-52 H0Z" fill="' + L.sash + '" stroke="' + L.trim + '" stroke-width="1"/><circle cx="10" cy="-62" r="3.4" fill="' + L.trim + '"/>', 0);
      case 'compass': return g('<path d="M0,-3 L-9,26 M0,-3 L9,26" stroke="#b08a4a" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-3" r="3" fill="#d9b04a" stroke="#6b4a2c" stroke-width="1"/><path d="M-6,14 H6" stroke="#6b4a2c" stroke-width="1.2"/>', 0);
      case 'chisel': return g('<path d="M0,10 L0,-28" stroke="#6b4a2c" stroke-width="3.4" stroke-linecap="round"/><path d="M-2.4,-28 L2.4,-28 L0.8,-46 L-0.8,-46Z" fill="#cfd6df" stroke="#8a929c" stroke-width=".8"/><rect x="-5" y="-30" width="10" height="3" fill="#8a929c"/>', 12);
      case 'gong': return g('<path d="M0,6 V-30" stroke="#6b4a2c" stroke-width="2"/><path d="M-14,-30 H14 M-12,-30 V-26 M12,-30 V-26" stroke="#6b4a2c" stroke-width="1.4"/><circle cx="0" cy="-17" r="10.4" fill="#d9b04a" stroke="#8a6a24" stroke-width="1.4"/><circle cx="0" cy="-17" r="4" fill="#f0d070"/>', 0);
      case 'yoke': return g('<g transform="translate(' + f(-hx) + ' ' + f(-84 - hy) + ') rotate(' + -(L.stoop || 0) + ')"><path d="M-36,-2 L34,2" stroke="#6b4a2c" stroke-width="2.8" stroke-linecap="round"/><path d="M-32,-1.8 V22 M30,1.6 V26" stroke="#9a7a4a" stroke-width="1"/><path d="M-42,22 Q-32,36 -22,22Z" fill="#c9a869" stroke="#8a6a34" stroke-width="1"/><path d="M20,26 Q30,40 40,26Z" fill="#c9a869" stroke="#8a6a34" stroke-width="1"/></g>', 0);
      case 'crook': return g('<path d="M0,26 L0,-56 Q0,-70 -9,-68 Q-14.4,-66 -12,-59" stroke="#8a6a44" stroke-width="2.6" fill="none" stroke-linecap="round"/>', 0);
      case 'horn': return g('<path d="M-6,4 Q-8,-14 4,-22 Q14,-26 18,-18 Q8,-18 6,-6 Q4,2 -6,4Z" fill="#e8d8b0" stroke="#8a6a34" stroke-width="1.2"/><path d="M-6,4 Q-3,-1 2,-2" stroke="#8a6a34" stroke-width="1" fill="none"/>', -10);
      case 'herbs': return g('<path d="M0,3 L-7,-20 M0,3 L0,-24 M0,3 L7,-20" stroke="#4a7a3a" stroke-width="1.6"/><path d="M-7,-20 Q-13,-24 -11,-29 Q-6,-26 -7,-20Z M0,-24 Q-5,-29 0,-34 Q5,-29 0,-24Z M7,-20 Q13,-24 11,-29 Q6,-26 7,-20Z" fill="#6ac85a"/><path d="M-3,1 h6" stroke="' + L.sash + '" stroke-width="2.4"/>', 0);
      case 'oar': return g('<path d="M0,-62 L0,16" stroke="#8a6a44" stroke-width="2.4"/><path d="M-4.6,14 H4.6 L3.6,40 Q0,44 -3.6,40Z" fill="#b8905a" stroke="#6b4a2c" stroke-width="1"/>', 0);
      case 'bow': return g('<path d="M-3,-38 Q-20,0 -3,38" stroke="#6b4a2c" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-3,-38 L-3,38" stroke="#e8e0cc" stroke-width=".9"/><path d="M-3,0 H24" stroke="#c9b078" stroke-width="1.4"/><path d="M24,0 l-4,-2.4 v4.8Z" fill="#cfd6df"/>', 0);
      case 'seedbag': return g('<path d="M-8,4 Q-10,-8 -4,-14 H4 Q10,-8 8,4Z" fill="#8a6a4a" stroke="#4a3a2a" stroke-width="1"/><path d="M-4,-14 L-5,-18 H5 L4,-14" fill="#6a4a2a"/><path d="M-4,-13 Q0,-11 4,-13" stroke="#e6d08a" stroke-width="1.2" fill="none"/><circle cx="11" cy="6" r="1.3" fill="#e6d08a"/><circle cx="14" cy="10" r="1.3" fill="#e6d08a"/><circle cx="9" cy="12" r="1.3" fill="#e6d08a"/>', 0);
      case 'jar': return g('<path d="M-8,-12 Q-13,0 -8,10 H8 Q13,0 8,-12Z" fill="#c08a4a" stroke="#6b4226" stroke-width="1.2"/><rect x="-6.4" y="-16.4" width="12.8" height="4.6" rx="1" fill="#8a5a36"/><path d="M-9,-3 H9" stroke="#6b4226" stroke-width=".9"/><path d="M-2,-2 h4 v5 h-4Z" fill="#efe0b0"/>', 0);
      case 'basket': return g('<path d="M-10,-2 Q0,13 10,-2Z" fill="#c9a869" stroke="#8a6a34" stroke-width="1"/><path d="M-10,-2 Q0,-24 10,-2" stroke="#8a6a34" stroke-width="1.5" fill="none"/><path d="M-6,0 L-5,8 M0,1 V10 M6,0 L5,8" stroke="#8a6a34" stroke-width=".8"/><path d="M-4,-4 q3,-8 0,-9 M1,-4 q4,-8 1,-10" stroke="#6ac85a" stroke-width="1.4" fill="none"/>', 0);
      case 'mirror2': return g('<rect x="-9" y="-26" width="18" height="22" rx="3" fill="#aab6c6" stroke="#6a7a8c" stroke-width="1.8"/><rect x="-6.4" y="-23.4" width="12.8" height="17" rx="2" fill="#e6f0fa"/><path d="M-4,-21 L2,-9" stroke="#fff" stroke-width="1.4" opacity=".8"/><path d="M0,-4 V10" stroke="#6a7a8c" stroke-width="3.2" stroke-linecap="round"/>', 0);
      case 'gourd': return g('<path d="M0,0 V7" stroke="#6b4a2c" stroke-width="1.2"/><g transform="translate(0 31)"><path d="M0,2 C-8,-2 -8,-12 -3.4,-14.6 C-6.4,-18.6 -2.4,-25 1.6,-25 C5.6,-25 8.4,-18.6 4.8,-14.6 C9.4,-12 8,-2 0,2Z" fill="#c98a3a" stroke="#7a5018" stroke-width="1"/><path d="M1.6,-25.4 V-30" stroke="#6b4a2c" stroke-width="1.6"/><path d="M-3,-14.6 Q1,-12.6 5,-14.6" stroke="#7a5018" stroke-width=".9" fill="none"/></g>', 0);
      case 'spade': return g('<path d="M0,26 L0,-52" stroke="#6b4a2c" stroke-width="2.6" stroke-linecap="round"/><path d="M-4.4,-52 h8.8" stroke="#6b4a2c" stroke-width="3" stroke-linecap="round"/><path d="M-6,26 H6 L5,40 Q0,45 -5,40Z" fill="#aeb4bc" stroke="#6a7078" stroke-width="1"/>', 0);
      default: return '';
    }
  }
  // ---- Một người ---------------------------------------------------------------------------------------------------------------------
  // Trả về nhóm SVG có chân ở (0,0), đỉnh đầu ở khoảng y=-100 (cỡ theo bộ dạng).
  function draw(c, who, poseId) {
    const L = LOOK[who === 'hero' && Z.heroKind === 'nu' ? 'heronu' : who] || LOOK.dan, Pz = POSE[poseId] || POSE.stand, P = c.P;
    const ink = P.ink;
    const robe = L.glass ? mix(L.robe, '#ffffff', 0.35) : L.robe;
    const g = c.lin('fg' + robe.slice(1), [[0, mix(robe, '#ffffff', 0.22)], [0.55, robe], [1, mix(robe, ink, P.dark ? 0.55 : 0.35)]]);
    const drop = DROP[Pz.legs] || 0;
    const sc = L.s || 1;
    const stoop = (L.stoop || 0) + (Pz.lean || 0);
    let s = '<g class="sc-fig" transform="scale(' + sc + ') ' + (Pz.lie ? 'translate(46 -8) rotate(-86)' : '') + '">';
    // bóng dưới chân
    if (!L.ghost) s += '<ellipse cx="0" cy="1.4" rx="' + f(20 * (Pz.legs === 'wide' || Pz.legs === 'sit' || Pz.legs === 'lunge' ? 1.5 : 1)) + '" ry="3.4" fill="' + ink + '" opacity=".28"/>';
    // vật phía sau lưng (đòn gánh gác vai nằm sau đầu)
    let after = '';
    const ghostGrad = (col) => c.lin('gh' + col.slice(1), [[0, col, 0.92], [0.6, col, 0.7], [1, col, 0]]);
    // v2.26.0 (Thiên Cang Chân Dung): nét riêng phía sau thân — quầng sáng, gió, sóng, áo choàng, đuôi voan.
    if (L.glow) s += K.glow(c, 0, -58, 42, L.glow, 0.6);
    if (L.swirl) s += '<g fill="none" stroke="' + L.swirl + '" stroke-width="1.3" stroke-linecap="round" opacity=".72"><path d="M-36,-70 Q-26,-80 -16,-72 T4,-74"/><path d="M12,-52 Q24,-62 34,-54 T50,-56"/><path d="M-40,-36 Q-28,-46 -18,-38 T2,-40"/><path d="M18,-22 Q30,-30 40,-22 T54,-24"/></g>';
    if (L.ripple) s += '<g fill="none" stroke="' + L.ripple + '" opacity=".8"><ellipse cx="0" cy="1.5" rx="21" ry="3.6" stroke-width="1.2"/><ellipse cx="0" cy="1.5" rx="32" ry="5.4" stroke-width=".9" opacity=".6"/><ellipse cx="0" cy="1.5" rx="44" ry="7.2" stroke-width=".7" opacity=".35"/></g>';
    if (L.cape) {
      const cp = 'M-8,-84 C-21,-70 -28,-36 -33,-3 Q0,8 33,-3 C28,-36 21,-70 8,-84Z';
      s += '<path d="' + cp + '" fill="' + (L.ghost ? ghostGrad(L.cape) : L.cape) + '"/><path d="' + cp + '" fill="none" stroke="' + L.trim + '" stroke-width=".8" opacity=".4"/>';
    }
    if (L.train) s += '<path d="M4,-72 C30,-67 48,-40 68,-8 Q62,-1 53,-6 C38,-16 22,-26 4,-40Z" fill="' + L.train + '" opacity=".5"/><path d="M4,-60 C24,-54 40,-34 56,-12" stroke="' + L.trim + '" stroke-width=".8" fill="none" opacity=".5"/>';
    // thân dưới
    const skirt = SKIRT[Pz.legs] || SKIRT.stand;
    const fade = L.ghost ? ghostGrad(robe) : g;
    // Áo hai sắc: 'h' = thân trên một màu, váy một màu; 'v' = nửa trái nửa phải (phần phải phủ bằng clipPath).
    const robe2 = L.split && L.robe2 ? L.robe2 : null;
    const fade2 = !robe2 ? null : L.ghost ? ghostGrad(robe2) : c.lin('fg' + robe2.slice(1), [[0, mix(robe2, '#ffffff', 0.22)], [0.55, robe2], [1, mix(robe2, ink, P.dark ? 0.55 : 0.35)]]);
    let half = '';
    if (L.split === 'v') {
      const cid = c.id + 'cpR';
      if (!c.cpR) {
        c.cpR = 1;
        c.defs.push('<clipPath id="' + cid + '"><rect x="0" y="-140" width="90" height="170"/></clipPath>');
      }
      half = ' clip-path="url(#' + cid + ')"';
    }
    s += '<path d="' + skirt + '" fill="' + (L.split === 'h' ? fade2 : fade) + '"/>';
    if (half) s += '<path d="' + skirt + '" fill="' + fade2 + '"' + half + '/>';
    if (!L.ghost) {
      s += '<path d="' + skirt + '" fill="none" stroke="' + L.trim + '" stroke-width="1.2" opacity=".35" stroke-dasharray="0 0"/>';
      for (const ft of FEET[Pz.legs] || []) s += '<ellipse cx="' + ft[0] + '" cy="' + ft[1] + '" rx="5.2" ry="2.4" fill="' + mix(ink, '#000', 0.2) + '"/>';
    }
    // thân trên (xoay quanh hông khi ngả người)
    const pivot = -46 + drop;
    s += '<g transform="translate(0 ' + drop + ') rotate(' + stoop + ' 0 -46)">';
    const torso = 'M-9,-85 Q-10.8,-66 -8.2,-46 L8.2,-46 Q10.8,-66 9,-85 Q0,-89.5 -9,-85Z';
    s += '<path d="' + torso + '" fill="' + fade + '"/>';
    if (half) s += '<path d="' + torso + '" fill="' + fade2 + '"' + half + '/>';
    s += '<path d="M-3.4,-87 L0,-72 L3.4,-87Z" fill="' + L.trim + '" opacity=".9"/>';
    // Bảy sao Bắc Đẩu thêu trước ngực (Động Vi).
    if (L.dipper) s += '<path d="M-6,-76 L-3.4,-73.2 L-0.4,-71.6 L2,-67.6 L6.4,-68.6 L5.6,-62.4 L1.2,-62.8 L2,-67.6" stroke="' + L.dipper + '" stroke-width=".6" fill="none" opacity=".7"/>' + [[-6, -76], [-3.4, -73.2], [-0.4, -71.6], [2, -67.6], [6.4, -68.6], [5.6, -62.4], [1.2, -62.8]].map((q) => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.15" fill="' + L.dipper + '"/>').join('');
    s += '<path d="M-8.4,-52 Q0,-49.4 8.4,-52 L8.2,-46.4 Q0,-44 -8.2,-46.4Z" fill="' + L.sash + '"/>';
    if (L.glass) s += '<path d="M-6,-82 L-3,-56 M5,-80 L2,-54 M-8,-70 L8,-66" stroke="#ffffff" stroke-width="1" opacity=".7"/>';
    // cánh tay
    const arms = [armPts([-8.6, -83.5], Pz.hands[0], 1), armPts([8.6, -83.5], Pz.hands[1], -1)];
    const extra = [];
    if (L.arms === 6) {
      extra.push(armPts([-7, -80], [-24, -60], 1), armPts([7, -80], [26, -58], -1), armPts([-6, -78], [-19, -88], 1), armPts([6, -78], [22, -92], -1));
    }
    if (Pz.pole) after += '<path d="M-38,-86 L38,-80" stroke="#2a2018" stroke-width="2.8" stroke-linecap="round"/><g class="sc-sway" style="transform-origin:-34px -86px"><path d="M-34,-86 L-34,-66" stroke="#6b4a2c" stroke-width="1"/><path d="M-42,-66 h16 l-2,16 h-12Z" fill="#8a6a44"/><ellipse cx="-34" cy="-66" rx="8" ry="1.8" fill="#9fc6d8"/></g><g class="sc-sway" style="transform-origin:34px -80px"><path d="M34,-80 L34,-60" stroke="#6b4a2c" stroke-width="1"/><path d="M26,-60 h16 l-2,16 h-12Z" fill="#8a6a44"/><ellipse cx="34" cy="-60" rx="8" ry="1.8" fill="#9fc6d8"/></g>';
    const sleeve = (a, w, col) => '<path d="M' + a.map(pt0).join(' L') + '" stroke="' + (col || robe) + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="' + (L.ghost ? 0.88 : 1) + '"/>';
    const pt0 = (p) => f(p[0]) + ',' + f(p[1]);
    for (const a of extra) s += sleeve(a, 4.4) + '<circle cx="' + f(a[2][0]) + '" cy="' + f(a[2][1]) + '" r="1.9" fill="#e8c9a8"/>';
    for (const a of arms) {
      s += sleeve(a, 6.8, L.split === 'v' && a === arms[1] ? robe2 : null);
      const e = a[1], h = a[2];
      const ux = h[0] - e[0], uy = h[1] - e[1], d = Math.hypot(ux, uy) || 1;
      s += '<path d="M' + f(h[0] - (ux / d) * 5) + ',' + f(h[1] - (uy / d) * 5) + ' L' + f(h[0]) + ',' + f(h[1]) + '" stroke="' + L.trim + '" stroke-width="8" stroke-linecap="round" opacity=".92"/>';
      s += '<circle cx="' + f(h[0] + (ux / d) * 1.8) + '" cy="' + f(h[1] + (uy / d) * 1.8) + '" r="2.5" fill="' + (L.glass ? '#dff3f6' : '#e8c9a8') + '"/>';
    }
    // đầu
    s += '<g class="sc-head">' + head(L, ink) + '</g>';
    // vật cầm
    const hold = Pz.hold !== undefined ? Pz.hold : L.hold;
    if (hold && !Pz.pole) {
      const r = arms[1][2];
      s += holding(hold, r[0], r[1], L, ink);
    }
    if (L.hold2 && !Pz.pole) {
      const l = arms[0][2];
      s += holding(L.hold2, l[0], l[1], L, ink);
    }
    s += after + '</g></g>';
    return s;
  }
  Z.CAST = { LOOK, POSE, draw, name: (who) => (LOOK[who] || LOOK.dan).name, has: (who) => !!LOOK[who] };
})();
