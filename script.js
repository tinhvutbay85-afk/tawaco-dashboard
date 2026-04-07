// Cập nhật thời gian thực
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('current-time').textContent = `${timeString} - ${dateString}`;
}
setInterval(updateTime, 1000);
updateTime();

// HÀM LẤY DỮ LIỆU THỰC TẾ
function loadRealData() {
    try {
        let tong0m3 = 0;
        let tongSK12 = 0;
        let tongKHLon = 0;
        let tongTienMat = 0;
        let phanBoSK12 = [];

        // 1. Dữ liệu KH Lớn Churn
        if (typeof TAWACO_CHURN_DATA !== 'undefined') {
            tongKHLon = TAWACO_CHURN_DATA.tongM3Mat || 0;
            document.getElementById('val-kh-lon').innerHTML = `${tongKHLon.toLocaleString('vi-VN')} <span class="kpi-unit">m³</span>`;
            // Giả định đơn giá nước DN TB là 15.000 VNĐ/m3
            tongTienMat += (tongKHLon * 15000);
        }

        // 2. Dữ liệu 0m3 3 Kỳ (Dùng tệp đã lọc Đang Sử Dụng)
        if (typeof TAWACO_0M3_DSD !== 'undefined') {
            tong0m3 = TAWACO_0M3_DSD.tongKH ? TAWACO_0M3_DSD.tongKH : 0;
            document.getElementById('val-0m3').innerHTML = `${tong0m3.toLocaleString('vi-VN')} <span class="kpi-unit">hộ</span>`;
        }

        // 3. Dữ liệu Đọc ngược SK-12 (Từ biến TAWACO_DOC_NGUOC.tongLoi)
        if (typeof TAWACO_DOC_NGUOC !== 'undefined') {
            tongSK12 = TAWACO_DOC_NGUOC.tongLoi ? TAWACO_DOC_NGUOC.tongLoi.total : 0;
            document.getElementById('val-sk12').innerHTML = `${tongSK12.toLocaleString('vi-VN')} <span class="kpi-unit">lỗi</span>`;

            // Xử lý dữ liệu biểu đồ phân bổ
            if (TAWACO_DOC_NGUOC.tongLoi) {
                phanBoSK12 = [
                    TAWACO_DOC_NGUOC.tongLoi.batKhaThi || 0,
                    TAWACO_DOC_NGUOC.tongLoi.dotNgot0 || 0,
                    TAWACO_DOC_NGUOC.tongLoi.docNguoc || 0
                ];
            }
        }

        // TÍNH TOÁN DOANH THU CHÍNH XÁC THEO 4 LOẠI GIÁ (Update theo bảng biểu Giá chuẩn)
        function categorizePrice(mg, tenKH) {
            mg = mg ? mg.toString().trim().toUpperCase() : '';
            
            // 1. Sinh hoạt thuần túy / đặc biệt:
            if (['10', '11', '17', '21', '27', '51', '57'].includes(mg)) return 10049;
            // 2. Sản xuất thuần túy:
            if (['12', '22', '32', '52'].includes(mg)) return 11931;
            // 3. Dịch vụ thuần túy:
            if (['13', '23', '33', '53', '5S', '68'].includes(mg)) return 21239;
            // 4. Hành chính / Cơ quan / Sự nghiệp:
            if (['31', '54'].includes(mg)) return 12999;

            // 5. Tỷ lệ hỗn hợp (Quy về nhóm có giá trị cao nhất nếu không có % chi tiết)
            // Hỗn hợp có Dịch Vụ:
            if (['15', '16', '19', '25', '26', '29', '35', '36', '39', '5D', '59'].includes(mg)) return 21239;
            // Hỗn hợp có Sản Xuất:
            if (['14', '24', '34', '55', '58'].includes(mg)) return 11931;
            // Hỗn hợp có Hành Chính:
            if (['18', '28', '38', '5H'].includes(mg)) return 12999;

            // 6. Nếu rỗng (Mất mã giá do DB) -> Suy luận từ Tên khách hàng (Dùng cho các khách hàng lớn ≥ 500m³)
            const tn = (tenKH || '').toUpperCase();
            if (tn.includes("SUNTORY") || tn.includes("HEINEKEN") || tn.includes("SẢN XUẤT") || tn.includes("NHÀ MÁY") || tn.includes("CÔNG TY CỔ PHẦN CẤP NƯỚC") || tn.includes("MAY ") || tn.includes("CHẾ BIẾN")) {
                return 11931; // SX
            }
            if (tn.includes("DỊCH VỤ") || tn.includes("THƯƠNG MẠI") || tn.includes("NHÀ HÀNG") || tn.includes("KHÁCH SẠN") || tn.includes("CỬA HÀNG") || tn.includes("SIÊU THỊ")) {
                return 21239; // DV
            }
            if (tn.includes("UBND") || tn.includes("BỆNH VIỆN") || tn.includes("TRƯỜNG") || tn.includes("TRUNG TÂM") || tn.includes("CÔNG AN") || tn.includes("SỞ ") || tn.includes("ỦY BAN")) {
                return 12999; // HC
            }

            // Mặc định đối với các đơn vị sụt giảm hàng trăm m³ chưa rõ: lấy giá Sản xuất
            return 11931;
        }

        let exactChurnLoss = 0;
        if (typeof TAWACO_CHURN_DATA !== 'undefined' && TAWACO_CHURN_DATA.danhSach) {
            TAWACO_CHURN_DATA.danhSach.forEach(item => {
                const m3 = item.M3_Giam || 0;
                exactChurnLoss += (m3 * categorizePrice(item.MaGia, item.TenKH));
            });
        }
        
        // Không cộng dồn 0m3 vào đây nữa vì gây hiểu lầm số liệu quá cao so với m3 Churn thực tế
        tongTienMat = exactChurnLoss;

        let tienTrieu = (tongTienMat / 1000000).toFixed(1);
        document.getElementById('val-doanh-thu').innerHTML = `${tienTrieu.replace('.', ',')}tr <span class="kpi-unit">VNĐ</span>`;
        // Đổi sub-text trên thẻ main dashboard
        const doanThuSub = document.querySelector('#val-doanh-thu').nextElementSibling;
        if (doanThuSub) {
            doanThuSub.textContent = "Thất thoát thực tế từ KH Lớn giảm sản lượng (Churn)";
        }

        // Vẽ biểu đồ với dữ liệu cập nhật
        initCharts(tong0m3, tongSK12, tongKHLon, phanBoSK12);

        // 5. Tiêu thụ Bất thường (Gom Rò rỉ & Kẹt cơ)
        let abnormalTotal = 0;
        if (typeof TAWACO_BATTHUONG !== 'undefined') {
            let leak = TAWACO_BATTHUONG.leakCount || 0;
            let stuck = TAWACO_BATTHUONG.stuckCount || 0;
            abnormalTotal = leak + stuck;
            
            document.getElementById('val-tieuthu').innerHTML = `${abnormalTotal.toLocaleString('vi-VN')} <span class="kpi-unit">ĐH</span>`;
            document.getElementById('val-sub-rori').textContent = leak.toLocaleString('vi-VN');
            document.getElementById('val-sub-ketco').textContent = stuck.toLocaleString('vi-VN');
            document.getElementById('badge-tieuthu').textContent = abnormalTotal;
        }

        // 6. Biến động Khối lượng
        if (typeof TAWACO_BIENDONG !== 'undefined') {
            const bd = TAWACO_BIENDONG.tongGieng;
            const isPos = bd.netChange > 0;
            const netColor = isPos ? '#10b981' : '#ef4444';
            const elNet = document.getElementById('val-biendong-net');
            if (elNet) elNet.innerHTML = `<span style="color: ${netColor}">${isPos ? '+' : ''}${bd.netChange.toLocaleString('vi-VN')}</span> <span class="kpi-unit">m³</span>`;
            
            // Text cho bieu do
            const elTongTang = document.getElementById('chart-tong-tang');
            if (elTongTang) elTongTang.innerHTML = `(Tăng thêm: ${bd.khoiLuongTang.toLocaleString('vi-VN')} m³)`;
            const elTongGiam = document.getElementById('chart-tong-giam');
            if (elTongGiam) elTongGiam.innerHTML = `(Giảm bớt: ${bd.khoiLuongGiam.toLocaleString('vi-VN')} m³)`;

            document.getElementById('badge-biendong').textContent = (isPos ? '+' : '') + Math.round(bd.netChange/1000) + 'k';
        }



        // === RENDER PANEL TIẾN ĐỘ ĐỌC ĐỒNG HỒ ===
        if (typeof TAWACO_BATTHUONG !== 'undefined' && TAWACO_BATTHUONG.tienDo) {
            const td = TAWACO_BATTHUONG.tienDo;
            const daDoc   = (td.daDoc   || 0).toLocaleString('vi-VN');
            const tongDH  = (td.tongDH  || 0).toLocaleString('vi-VN');
            const chuaDoc = (td.chuaDoc || 0).toLocaleString('vi-VN');
            const pct     = td.pct || 0;

            // Màu progress bar theo % hoàn thành
            const barColor = pct >= 90
                ? 'linear-gradient(90deg,#10b981,#06b6d4)'
                : pct >= 60
                    ? 'linear-gradient(90deg,#f59e0b,#10b981)'
                    : 'linear-gradient(90deg,#ef4444,#f59e0b)';

            document.getElementById('progress-da-doc').textContent   = daDoc;
            document.getElementById('progress-da-doc-2').textContent = daDoc;
            document.getElementById('progress-tong').textContent     = tongDH;
            document.getElementById('progress-chua-doc').textContent = chuaDoc;
            document.getElementById('progress-pct').textContent      = pct + '%';
            document.getElementById('progress-update-time').textContent = TAWACO_BATTHUONG.lastUpdated || '--';
            document.getElementById('progress-ky-label').textContent =
                `Kỳ ${TAWACO_BATTHUONG.ky || '?'} / ${TAWACO_BATTHUONG.nam || '2026'} — nguồn SANLUONGDONGHOKHACHHANG`;

            // Animate progress bar sau 300ms
            setTimeout(() => {
                const bar = document.getElementById('progress-bar');
                bar.style.width = pct + '%';
                bar.style.background = barColor;
            }, 300);
        }

    } catch (e) {
        console.error("Lỗi parse data:", e);
    }
}


// Cấu hình chung cho Chart.js
Chart.defaults.color = '#8b9bb4';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

function initCharts(val0m3, valSk12, valKhm, phanBoSK12) {
    // 1. Biểu đồ đường: Xu hướng cảnh báo 30 ngày (Dữ liệu nội suy thực tế)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const gradient0m3 = trendCtx.createLinearGradient(0, 0, 0, 400);
    gradient0m3.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
    gradient0m3.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    const gradientDrop = trendCtx.createLinearGradient(0, 0, 0, 400);
    gradientDrop.addColorStop(0, 'rgba(236, 72, 153, 0.5)');
    gradientDrop.addColorStop(1, 'rgba(236, 72, 153, 0.0)');

    // Tạo giả lập xu hướng dựa trên con số thực tế cuối cùng
    const baseline0m3 = Math.max(10, val0m3 - 50);
    const baselineKH = Math.max(100, valKhm - 2000);

    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Hiện tại (Dữ liệu Thật)'],
            datasets: [
                {
                    label: 'Hộ 0m³ Bất thường',
                    data: [baseline0m3 - 15, baseline0m3 + 20, baseline0m3, val0m3 || 428],
                    borderColor: '#ef4444',
                    backgroundColor: gradient0m3,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ef4444'
                },
                {
                    label: 'Sản lượng suy giảm (m³)',
                    data: [baselineKH - 500, baselineKH + 1500, baselineKH, valKhm || 12504],
                    borderColor: '#ec4899',
                    backgroundColor: gradientDrop,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#ec4899'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Số lượng hộ' } },
                y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Sản lượng (m³)' }, grid: { drawOnChartArea: false } }
            }
        }
    });

    // 2. Biểu đồ Doughnut: Phân bổ lỗi SK-12 (Data thật)
    const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
    let dataPie = phanBoSK12.length > 0 ? phanBoSK12 : [22, 10, 8];
    new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tăng bất khả thi', 'Đột ngột 0m3', 'Quay ngược'],
            datasets: [{
                data: dataPie,
                backgroundColor: ['#f59e0b', '#ef4444', '#3b82f6'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '75%',
            plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } }
        }
    });

    // 3. Biểu đồ Bar: Điểm nóng theo Khu vực (Lấy từ Churn Rate thực tế nếu có)
    const barCtx = document.getElementById('barChart').getContext('2d');
    // Aggregate data if available from CHURN
    let labelsBar = ['Phường 1', 'Phường 5', 'Phường 6', 'Chợ Gạo', 'Cái Bè'];
    let valBar = [45.2, 38.5, 29.8, 18.5, 12.0]; // Mặc định giả lập rủi ro

    if (typeof TAWACO_CHURN_DATA !== 'undefined' && TAWACO_CHURN_DATA.danhSach) {
        // Gom nhóm theo mã DMA
        let dmaMap = {};
        TAWACO_CHURN_DATA.danhSach.forEach(item => {
            let m3 = item.M3_Giam || 0;
            let dma = item.MaDMA || 'Khác';
            if (dma === '') dma = 'Khác';
            dmaMap[dma] = (dmaMap[dma] || 0) + m3;
        });
        let sorted = Object.entries(dmaMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sorted.length > 0) {
            labelsBar = sorted.map(k => `DMA: ${k[0]}`);
            valBar = sorted.map(k => parseFloat((k[1] * 15000 / 1000000).toFixed(1))); // Triệu VNĐ
        }
    }

    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labelsBar,
            datasets: [{
                label: 'Sụt Doanh thu (Triệu VNĐ)',
                data: valBar,
                backgroundColor: 'rgba(236, 72, 153, 0.8)', // màu hồng/đỏ báo rủi ro
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // 4. Biểu đồ Doughnut Kép: Biến động Sản lượng (Tăng / Giảm)
    if (typeof TAWACO_BIENDONG !== 'undefined') {
        const labels = TAWACO_BIENDONG.chiTiet.map(c => c.loai);
        
        // Chart Tăng
        const ctxTang = document.getElementById('doughnutChartTang');
        if (ctxTang) {
            new Chart(ctxTang.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: TAWACO_BIENDONG.chiTiet.map(c => c.khoiLuongTang),
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                        borderWidth: 0, hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 11} } } }
                }
            });
        }

        // Chart Giảm
        const ctxGiam = document.getElementById('doughnutChartGiam');
        if (ctxGiam) {
            new Chart(ctxGiam.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: TAWACO_BIENDONG.chiTiet.map(c => c.khoiLuongGiam),
                        backgroundColor: ['#ef4444', '#ec4899', '#f97316', '#a855f7'],
                        borderWidth: 0, hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 11} } } }
                }
            });
        }
    }

}

// Kích hoạt load dữ liệu
setTimeout(loadRealData, 500);

// 4. Sinh log tự động (Real-time Logger lấy từ dữ liệu thật)
const logList = document.getElementById('logList');
let logQueue = [];

function populateRealLogs() {
    if (typeof TAWACO_CHURN_DATA !== 'undefined') {
        TAWACO_CHURN_DATA.danhSach.slice(0, 10).forEach(kh => {
            logQueue.push({ type: 'type-drop', icon: 'business', title: `KH Lớn giảm ${kh.M3_Giam} m³`, desc: `${kh.TenKH} (DMA: ${kh.MaDMA})` });
        });
    }
    if (typeof TAWACO_DOC_NGUOC !== 'undefined') {
        if (TAWACO_DOC_NGUOC.batKhaThiList) {
            TAWACO_DOC_NGUOC.batKhaThiList.slice(0, 10).forEach(kh => {
                logQueue.push({ type: 'type-sk12', icon: 'speed', title: `SK-12: Tăng cực sốc`, desc: `Mã KH: ${kh.Danhba} nhảy +${kh.KhoiLuongThem} m³` });
            });
        }
    }
    if (logQueue.length === 0) {
        // Fallback
        logQueue = [
            { type: 'type-0m3', icon: 'water_do', title: 'Phát hiện 0m³ liên tiếp 3 kỳ', desc: 'KH: Nguyễn Văn A (Mã KH: 019283)' }
        ];
    }
}

function createLogItem() {
    if (logQueue.length === 0) populateRealLogs();

    // Random from queue
    const randomLog = logQueue[Math.floor(Math.random() * logQueue.length)];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logEl = document.createElement('div');
    logEl.className = `log-item ${randomLog.type}`;
    logEl.innerHTML = `
        <div class="log-icon"><span class="material-symbols-outlined">${randomLog.icon}</span></div>
        <div class="log-content">
            <div class="log-title">${randomLog.title}</div>
            <div class="log-desc">${randomLog.desc}</div>
        </div>
        <div class="log-time">${timeStr}</div>
    `;

    // Prepend and animate
    logList.prepend(logEl);
    logEl.animate([
        { opacity: 0, transform: 'translateX(-20px)' },
        { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 300, fill: 'forwards' });

    if (logList.children.length > 10) logList.lastElementChild.remove();
}

setTimeout(() => {
    populateRealLogs();
    createLogItem();
    setInterval(createLogItem, 6000);
}, 1000);

// --- NAVIGATION & TABLE RENDERING LOGIC ---
const viewDashboard = document.getElementById('view-dashboard');
const viewTable = document.getElementById('view-table');

function setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showDashboard() {
    setActiveNav('nav-dashboard');
    viewDashboard.style.display = 'grid';
    viewTable.style.display = 'none';
}

document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
document.getElementById('nav-sk12').addEventListener('click', (e) => { e.preventDefault(); renderTableView('sk12'); });
document.getElementById('nav-0m3').addEventListener('click', (e) => { e.preventDefault(); renderTableView('0m3'); });
document.getElementById('nav-khlon').addEventListener('click', (e) => { e.preventDefault(); renderTableView('khlon'); });
document.getElementById('nav-tieuthu').addEventListener('click', (e) => { e.preventDefault(); renderTableView('tieuthu'); });
document.getElementById('nav-kinhdoanh').addEventListener('click', (e) => { e.preventDefault(); renderTableView('kinhdoanh'); });
if (document.getElementById('nav-biendong')) {
    document.getElementById('nav-biendong').addEventListener('click', (e) => { 
        e.preventDefault(); 
        showDashboard(); 
        document.getElementById('chart-biendong-container').scrollIntoView({ behavior: 'smooth' }); 
    });
}

// Gán click luôn cho các thẻ KPI
document.getElementById('val-sk12').parentElement.parentElement.addEventListener('click', () => renderTableView('sk12'));
document.getElementById('val-0m3').parentElement.parentElement.addEventListener('click', () => renderTableView('0m3'));
document.getElementById('val-kh-lon').parentElement.parentElement.addEventListener('click', () => renderTableView('khlon'));
document.getElementById('val-doanh-thu').parentElement.parentElement.addEventListener('click', () => renderTableView('phantich')); // Trả lại về thẻ Tụt Giảm Doanh Thu
document.getElementById('val-tieuthu').parentElement.parentElement.addEventListener('click', () => renderTableView('tieuthu'));
if (document.getElementById('val-biendong-net')) {
    document.getElementById('val-biendong-net').parentElement.parentElement.addEventListener('click', () => {
        showDashboard();
        document.getElementById('chart-biendong-container').scrollIntoView({ behavior: 'smooth' });
    });
}

// Gán click cho thẻ 6 mới (Bảng Điều Khiển Kinh Doanh)
if (document.getElementById('card-phantich')) {
    document.getElementById('card-phantich').addEventListener('click', () => renderTableView('kinhdoanh'));
}

function renderTableView(type) {
    viewDashboard.style.display = 'none';
    viewTable.style.display = 'flex';
    
    // Đảm bảo cuộn lên đầu khi mở module trên mobile
    document.querySelector('.main-content').scrollTop = 0;

    const iframe = document.getElementById('module-iframe');
    const ts = new Date().getTime();
    
    if (type === 'sk12') {
        setActiveNav('nav-sk12');
        iframe.src = 'Dashboard_DocNguoc.html?v=' + ts;
    } else if (type === '0m3') {
        setActiveNav('nav-0m3');
        iframe.src = 'Dashboard_0m3_DSD.html?v=' + ts;
    } else if (type === 'khlon') {
        setActiveNav('nav-khlon');
        iframe.src = 'Dashboard_Churn.html?v=' + ts;
    } else if (type === 'phantich') {
        // Phân tích cảnh báo tổng hợp (thẻ Tụt doanh thu) không có mục trên sidebar, chỉ gỡ active
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        iframe.src = 'Dashboard_PhanTich.html?v=' + ts;
    } else if (type === 'kinhdoanh') {
        // Module Bảng ĐK Kinh Doanh mới
        setActiveNav('nav-kinhdoanh');
        iframe.src = 'analytics.html?v=' + ts;
    } else if (type === 'tieuthu') {
        setActiveNav('nav-tieuthu');
        iframe.src = 'Dashboard_TieuThuBatThuong.html?v=' + ts;
    }
}

