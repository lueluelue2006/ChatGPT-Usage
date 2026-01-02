import { MODEL_DISPLAY_ORDER, TIME_WINDOWS } from "../config.js";
import { usageData } from "../state.js";
import { formatTimestampForFilename, tsOf } from "../utils.js";
import { showToast } from "../ui/toast.js";

function generateWeeklyReport() {
    const now = new Date();
    // 获取今天的开始时间（0点）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // 获取7天前的开始时间
    const sevenDaysAgoStart = todayStart - 6 * TIME_WINDOWS.daily;

    const report = {
        totalRequests: 0,
        modelBreakdown: {},
        dailyData: [], // 最近7天的数据
        peakDay: '',
        averageDaily: 0,
        generatedAt: new Date().toISOString()
    };

    // 初始化最近7天的数据（包括今天）
    for (let i = 0; i < 7; i++) {
        const dayStart = todayStart - (6 - i) * TIME_WINDOWS.daily;
        const date = new Date(dayStart);
        report.dailyData.push({
            date: date.toLocaleDateString('zh-CN'),
            dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
            models: {},
            total: 0,
            dayStart: dayStart,
            dayEnd: dayStart + TIME_WINDOWS.daily - 1
        });
    }

    // 按固定顺序分析每个模型（排除特殊模型）
    const currentPlanForWeekly = (usageData && usageData.planType) || 'team';
    const sortedModelEntries = MODEL_DISPLAY_ORDER
        .filter(modelKey => usageData.models[modelKey])
        .filter(modelKey => !(modelKey === 'o3-pro' && currentPlanForWeekly !== 'pro'))
        .map(modelKey => [modelKey, usageData.models[modelKey]]);

    // 添加不在固定顺序中的其他模型（如果有的话）
    Object.entries(usageData.models).forEach(([modelKey, model]) => {
        if (!MODEL_DISPLAY_ORDER.includes(modelKey)) {
            if (modelKey === 'o3-pro' && currentPlanForWeekly !== 'pro') return;
            sortedModelEntries.push([modelKey, model]);
        }
    });

    sortedModelEntries.forEach(([modelKey, model]) => {
        // 只统计7天内的请求
        const validRequests = model.requests
            .map(req => tsOf(req))
            .filter(ts => ts >= sevenDaysAgoStart && ts < todayStart + TIME_WINDOWS.daily);

        if (validRequests.length > 0) {
            if (!report.modelBreakdown[modelKey]) {
                report.modelBreakdown[modelKey] = 0;
            }

            // 按天分组统计
            validRequests.forEach(ts => {
                // 找到请求所属的天
                const dayData = report.dailyData.find(day => ts >= day.dayStart && ts <= day.dayEnd);

                if (dayData) {
                    dayData.total++;
                    dayData.models[modelKey] = (dayData.models[modelKey] || 0) + 1;
                    report.modelBreakdown[modelKey]++;
                    report.totalRequests++;
                }
            });
        }
    });

    // 计算平均每天使用量
    const activeDays = report.dailyData.filter(d => d.total > 0).length || 1;
    report.averageDaily = Math.round(report.totalRequests / activeDays);

    // 找出使用高峰日
    const maxDayUsage = Math.max(...report.dailyData.map(d => d.total), 0);
    const peakDayData = report.dailyData.find(d => d.total === maxDayUsage);
    if (peakDayData) {
        report.peakDay = `${peakDayData.date} ${peakDayData.dayOfWeek}`;
    }

    return report;
}

// 生成一个月用量分析报告（按自然日统计）
function generateMonthlyReport() {
    const now = new Date();
    // 获取今天的开始时间（0点）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // 获取30天前的开始时间
    const thirtyDaysAgoStart = todayStart - 29 * TIME_WINDOWS.daily;

    const report = {
        totalRequests: 0,
        modelBreakdown: {},
        dailyData: [], // 最近30天的数据
        peakDay: '',
        averageDaily: 0,
        generatedAt: new Date().toISOString()
    };

    // 初始化最近30天的数据（包括今天）
    for (let i = 0; i < 30; i++) {
        const dayStart = todayStart - (29 - i) * TIME_WINDOWS.daily;
        const date = new Date(dayStart);
        report.dailyData.push({
            date: date.toLocaleDateString('zh-CN'),
            dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
            models: {},
            total: 0,
            dayStart: dayStart,
            dayEnd: dayStart + TIME_WINDOWS.daily - 1
        });
    }

    // 按固定顺序分析每个模型（排除特殊模型）
    const currentPlanForMonthly = (usageData && usageData.planType) || 'team';
    const sortedModelEntries = MODEL_DISPLAY_ORDER
        .filter(modelKey => usageData.models[modelKey])
        .filter(modelKey => !(modelKey === 'o3-pro' && currentPlanForMonthly !== 'pro'))
        .map(modelKey => [modelKey, usageData.models[modelKey]]);

    // 添加不在固定顺序中的其他模型（如果有的话）
    Object.entries(usageData.models).forEach(([modelKey, model]) => {
        if (!MODEL_DISPLAY_ORDER.includes(modelKey)) {
            if (modelKey === 'o3-pro' && currentPlanForMonthly !== 'pro') return;
            sortedModelEntries.push([modelKey, model]);
        }
    });

    sortedModelEntries.forEach(([modelKey, model]) => {
        // 只统计30天内的请求
        const validRequests = model.requests
            .map(req => tsOf(req))
            .filter(ts => ts >= thirtyDaysAgoStart && ts < todayStart + TIME_WINDOWS.daily);

        if (validRequests.length > 0) {
            if (!report.modelBreakdown[modelKey]) {
                report.modelBreakdown[modelKey] = 0;
            }

            // 按天分组统计
            validRequests.forEach(ts => {
                // 找到请求所属的天
                const dayData = report.dailyData.find(day => ts >= day.dayStart && ts <= day.dayEnd);

                if (dayData) {
                    dayData.total++;
                    dayData.models[modelKey] = (dayData.models[modelKey] || 0) + 1;
                    report.modelBreakdown[modelKey]++;
                    report.totalRequests++;
                }
            });
        }
    });

    // 计算平均每天使用量
    const activeDays = report.dailyData.filter(d => d.total > 0).length || 1;
    report.averageDaily = Math.round(report.totalRequests / activeDays);

    // 找出使用高峰日
    const maxDayUsage = Math.max(...report.dailyData.map(d => d.total), 0);
    const peakDayData = report.dailyData.find(d => d.total === maxDayUsage);
    if (peakDayData) {
        report.peakDay = `${peakDayData.date} ${peakDayData.dayOfWeek}`;
    }

    return report;
}

// 将未知模型（未在我们预设列表中的）合并到 gpt-5-2-instant（仅用于 HTML 导出展示，不改动存储）
function mergeUnknownModelsForHtml(report) {
    try {
        const KNOWN = new Set([
            // 采用固定显示顺序中的模型
            ...MODEL_DISPLAY_ORDER,
            // 再补充兼容显示顺序外但“已知”的模型键
            'gpt-5', 'gpt-5-thinking',
            'gpt-5-2-instant', 'gpt-5-2-thinking', 'gpt-5-2-pro',
            'gpt-5-1', 'gpt-5-1-thinking', 'gpt-5-1-instant',
            'alpha'
        ]);

        const targetKey = 'gpt-5-2-instant';
        if (!report.modelBreakdown[targetKey]) report.modelBreakdown[targetKey] = 0;

        const unknownKeys = Object.keys(report.modelBreakdown).filter(k => !KNOWN.has(k));
        if (unknownKeys.length === 0) return report;

        // 合并总览
        for (const key of unknownKeys) {
            report.modelBreakdown[targetKey] += (report.modelBreakdown[key] || 0);
            delete report.modelBreakdown[key];
        }

        // 合并每日数据
        for (const day of report.dailyData) {
            let add = 0;
            for (const key of unknownKeys) {
                if (day.models[key]) {
                    add += day.models[key];
                    delete day.models[key];
                }
            }
            if (add > 0) {
                day.models[targetKey] = (day.models[targetKey] || 0) + add;
            }
        }

        return report;
    } catch (e) {
        console.warn('[monitor] Failed to merge unknown models for HTML:', e);
        return report;
    }
}

// 导出一周分析报告为HTML文件
function exportWeeklyAnalysis() {
    const report = mergeUnknownModelsForHtml(generateWeeklyReport());

    // 创建按固定顺序排列的模型数组
    const sortedModelKeys = MODEL_DISPLAY_ORDER
        .filter(modelKey => report.modelBreakdown[modelKey])
        .concat(Object.keys(report.modelBreakdown).filter(key => !MODEL_DISPLAY_ORDER.includes(key)));

    // 生成HTML内容
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChatGPT 一周用量分析报告 - ${new Date().toLocaleDateString('zh-CN')}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #1a1b1e;
        color: #e5e7eb;
        padding: 20px;
        margin: 0;
    }
    .container {
        max-width: 1200px;
        margin: 0 auto;
    }
    h1, h2 {
        color: #f59e0b;
    }
    .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }
    .card {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
    }
    .card h3 {
        margin-top: 0;
        color: #9ca3af;
        font-size: 14px;
    }
    .card .value {
        font-size: 28px;
        font-weight: bold;
        color: #f59e0b;
    }
    .card .subtext {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
    }
    .chart-container {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
        margin-bottom: 20px;
        position: relative;
    }
    .chart-container.daily {
        height: 400px;
    }
    .chart-container.pie {
        height: 350px;
    }
    .table-container {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
        overflow-x: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #363636;
    }
    th {
        background: #1a1b1e;
        color: #f59e0b;
        font-weight: 600;
    }
    .highlight {
        color: #f59e0b;
        font-weight: bold;
    }
    .footer {
        text-align: center;
        margin-top: 40px;
        color: #9ca3af;
        font-size: 12px;
    }
    .info-text {
        color: #9ca3af;
        font-size: 14px;
        margin: 10px 0;
    }
</style>
</head>
<body>
<div class="container">
    <h1>ChatGPT 一周用量分析报告</h1>
    <p class="info-text">分析时间段: ${report.dailyData[0].date} 至 ${report.dailyData[6].date}</p>
    <p class="info-text">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

    <div class="summary-cards">
        <div class="card">
            <h3>总请求数</h3>
            <div class="value">${report.totalRequests}</div>
            <div class="subtext">最近7天</div>
        </div>
        <div class="card">
            <h3>日均使用</h3>
            <div class="value">${report.averageDaily}</div>
            <div class="subtext">活跃天数平均</div>
        </div>
        <div class="card">
            <h3>使用高峰日</h3>
            <div class="value" style="font-size: 20px;">${report.peakDay || 'N/A'}</div>
        </div>
        <div class="card">
            <h3>活跃模型数</h3>
            <div class="value">${sortedModelKeys.length}</div>
            <div class="subtext">有使用记录</div>
        </div>
    </div>

    <h2>每日使用趋势</h2>
    <div class="chart-container daily">
        <canvas id="dailyChart"></canvas>
    </div>

    <h2>模型使用分布</h2>
    <div class="chart-container pie">
        <canvas id="modelChart"></canvas>
    </div>

    <h2>详细数据表</h2>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>星期</th>
                    <th>总请求数</th>
                    ${sortedModelKeys.map(model => `<th>${model}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${report.dailyData.map((day, index) => `
                    <tr ${index === 6 ? 'style="background: rgba(245, 158, 11, 0.1);"' : ''}>
                        <td>${day.date} ${index === 6 ? '<span style="color: #f59e0b;">(今天)</span>' : ''}</td>
                        <td>${day.dayOfWeek}</td>
                        <td class="highlight">${day.total}</td>
                        ${sortedModelKeys.map(model =>
                            `<td>${day.models[model] || 0}</td>`
                        ).join('')}
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="background: #1a1b1e; font-weight: bold;">
                    <td colspan="2">总计</td>
                    <td class="highlight">${report.totalRequests}</td>
                    ${sortedModelKeys.map(model =>
                        `<td>${report.modelBreakdown[model] || 0}</td>`
                    ).join('')}
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="footer">
        <p>此报告由 ChatGPT 用量统计脚本自动生成</p>
    </div>
</div>

<script>
    // 配置图表默认选项
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.borderColor = '#363636';

    // 每日使用趋势图
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(report.dailyData.map((d, i) =>
                i === 6 ? d.date + ' (今天)' : d.date
            ))},
            datasets: [{
                label: '每日请求数',
                data: ${JSON.stringify(report.dailyData.map(d => d.total))},
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            const dayData = ${JSON.stringify(report.dailyData.map(d => d.dayOfWeek))};
                            return dayData[index];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#363636'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        color: '#363636'
                    }
                }
            }
        }
    });

    // 模型使用分布饼图
    const modelCtx = document.getElementById('modelChart').getContext('2d');
    new Chart(modelCtx, {
        type: 'doughnut',
        data: {
            labels: ${JSON.stringify(sortedModelKeys)},
            datasets: [{
                data: ${JSON.stringify(sortedModelKeys.map(key => report.modelBreakdown[key] || 0))},
                backgroundColor: [
                    '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
                    '#9333ea', '#ec4899', '#14b8a6', '#f97316',
                    '#06b6d4', '#84cc16', '#f43f5e', '#8b5cf6'
                ],
                borderWidth: 2,
                borderColor: '#1a1b1e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
</script>
</body>
</html>
    `;

    // 下载HTML文件
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-weekly-analysis-${formatTimestampForFilename()}.html`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("一周用量分析报告已导出", "success");
    }, 100);
}

// 导出一个月分析报告为HTML文件
function exportMonthlyAnalysis() {
    const report = mergeUnknownModelsForHtml(generateMonthlyReport());

    // 创建按固定顺序排列的模型数组
    const sortedModelKeys = MODEL_DISPLAY_ORDER
        .filter(modelKey => report.modelBreakdown[modelKey])
        .concat(Object.keys(report.modelBreakdown).filter(key => !MODEL_DISPLAY_ORDER.includes(key)));

    // 生成HTML内容
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChatGPT 一个月用量分析报告 - ${new Date().toLocaleDateString('zh-CN')}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #1a1b1e;
        color: #e5e7eb;
        padding: 20px;
        margin: 0;
    }
    .container {
        max-width: 1200px;
        margin: 0 auto;
    }
    h1, h2 {
        color: #f59e0b;
    }
    .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }
    .card {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
    }
    .card h3 {
        margin-top: 0;
        color: #9ca3af;
        font-size: 14px;
    }
    .card .value {
        font-size: 28px;
        font-weight: bold;
        color: #f59e0b;
    }
    .card .subtext {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
    }
    .chart-container {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
        margin-bottom: 20px;
        position: relative;
    }
    .chart-container.daily {
        height: 500px;
    }
    .chart-container.pie {
        height: 350px;
    }
    .table-container {
        background: #2a2b2e;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #363636;
        overflow-x: auto;
        max-height: 600px;
        overflow-y: auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #363636;
        font-size: 12px;
    }
    th {
        background: #1a1b1e;
        color: #f59e0b;
        font-weight: 600;
        position: sticky;
        top: 0;
        z-index: 1;
    }
    .highlight {
        color: #f59e0b;
        font-weight: bold;
    }
    .footer {
        text-align: center;
        margin-top: 40px;
        color: #9ca3af;
        font-size: 12px;
    }
    .info-text {
        color: #9ca3af;
        font-size: 14px;
        margin: 10px 0;
    }
    .week-separator {
        border-top: 2px solid #f59e0b;
        background: rgba(245, 158, 11, 0.1);
    }
</style>
</head>
<body>
<div class="container">
    <h1>ChatGPT 一个月用量分析报告</h1>
    <p class="info-text">分析时间段: ${report.dailyData[0].date} 至 ${report.dailyData[29].date}</p>
    <p class="info-text">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

    <div class="summary-cards">
        <div class="card">
            <h3>总请求数</h3>
            <div class="value">${report.totalRequests}</div>
            <div class="subtext">最近30天</div>
        </div>
        <div class="card">
            <h3>日均使用</h3>
            <div class="value">${report.averageDaily}</div>
            <div class="subtext">活跃天数平均</div>
        </div>
        <div class="card">
            <h3>使用高峰日</h3>
            <div class="value" style="font-size: 20px;">${report.peakDay || 'N/A'}</div>
        </div>
        <div class="card">
            <h3>活跃模型数</h3>
            <div class="value">${sortedModelKeys.length}</div>
            <div class="subtext">有使用记录</div>
        </div>
    </div>

    <h2>每日使用趋势</h2>
    <div class="chart-container daily">
        <canvas id="dailyChart"></canvas>
    </div>

    <h2>模型使用分布</h2>
    <div class="chart-container pie">
        <canvas id="modelChart"></canvas>
    </div>

    <h2>详细数据表</h2>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>星期</th>
                    <th>总请求数</th>
                    ${sortedModelKeys.map(model => `<th>${model}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${report.dailyData.map((day, index) => {
                    const isToday = index === 29;
                    const isWeekStart = new Date(day.dayStart).getDay() === 1; // 周一
                    return `
                    <tr ${isToday ? 'style="background: rgba(245, 158, 11, 0.1);"' : ''} ${isWeekStart && !isToday ? 'class="week-separator"' : ''}>
                        <td>${day.date} ${isToday ? '<span style="color: #f59e0b;">(今天)</span>' : ''}</td>
                        <td>${day.dayOfWeek}</td>
                        <td class="highlight">${day.total}</td>
                        ${sortedModelKeys.map(model =>
                            `<td>${day.models[model] || 0}</td>`
                        ).join('')}
                    </tr>
                `}).join('')}
            </tbody>
            <tfoot>
                <tr style="background: #1a1b1e; font-weight: bold;">
                    <td colspan="2">总计</td>
                    <td class="highlight">${report.totalRequests}</td>
                    ${sortedModelKeys.map(model =>
                        `<td>${report.modelBreakdown[model] || 0}</td>`
                    ).join('')}
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="footer">
        <p>此报告由 ChatGPT 用量统计脚本自动生成</p>
    </div>
</div>

<script>
    // 配置图表默认选项
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.borderColor = '#363636';

    // 每日使用趋势图
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(report.dailyData.map((d, i) =>
                i === 29 ? d.date + ' (今天)' : d.date
            ))},
            datasets: [{
                label: '每日请求数',
                data: ${JSON.stringify(report.dailyData.map(d => d.total))},
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            const dayData = ${JSON.stringify(report.dailyData.map(d => d.dayOfWeek))};
                            return dayData[index];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#363636'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        color: '#363636'
                    },
                    ticks: {
                        maxTicksLimit: 15,
                        callback: function(value, index) {
                            // 只显示部分日期标签，避免过于拥挤
                            const date = new Date(${JSON.stringify(report.dailyData.map(d => d.dayStart))}[index]);
                            if (index === 0 || index === 14 || index === 29 || date.getDate() === 1 || date.getDay() === 1) {
                                return this.getLabelForValue(value);
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });

    // 模型使用分布饼图
    const modelCtx = document.getElementById('modelChart').getContext('2d');
    new Chart(modelCtx, {
        type: 'doughnut',
        data: {
            labels: ${JSON.stringify(sortedModelKeys)},
            datasets: [{
                data: ${JSON.stringify(sortedModelKeys.map(key => report.modelBreakdown[key] || 0))},
                backgroundColor: [
                    '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
                    '#9333ea', '#ec4899', '#14b8a6', '#f97316',
                    '#06b6d4', '#84cc16', '#f43f5e', '#8b5cf6'
                ],
                borderWidth: 2,
                borderColor: '#1a1b1e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
</script>
</body>
</html>
    `;

    // 下载HTML文件
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-monthly-analysis-${formatTimestampForFilename()}.html`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("一个月用量分析报告已导出", "success");
    }, 100);
}

// Component Functions

export { exportWeeklyAnalysis, exportMonthlyAnalysis };
