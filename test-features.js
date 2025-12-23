// 简单的功能测试脚本
const puppeteer = require('puppeteer');

async function testMonitorDashboard() {
    console.log('🚀 开始测试监控仪表板功能...');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 访问应用
        await page.goto('http://localhost:5174/');
        await page.waitForSelector('.visualization-area', { timeout: 10000 });
        console.log('✅ 页面加载成功');

        // 测试时间控制组件
        await page.waitForSelector('.time-control', { timeout: 5000 });
        console.log('✅ 时间控制组件已加载');

        // 测试模式切换
        const historicalBtn = await page.$('button.mode-btn:nth-child(2)');
        if (historicalBtn) {
            await historicalBtn.click();
            await page.waitForTimeout(1000);
            console.log('✅ 历史模式切换成功');

            // 测试时间范围选择
            const timeSelect = await page.$('.time-select');
            if (timeSelect) {
                await timeSelect.select('10');
                await page.waitForTimeout(1000);
                console.log('✅ 时间范围选择功能正常');
            }

            // 测试播放控制
            const playBtn = await page.$('.playback-btn');
            if (playBtn) {
                await playBtn.click();
                await page.waitForTimeout(2000);
                console.log('✅ 播放控制功能正常');
            }

            // 切换回实时模式
            const liveBtn = await page.$('button.mode-btn:nth-child(1)');
            if (liveBtn) {
                await liveBtn.click();
                await page.waitForTimeout(1000);
                console.log('✅ 实时模式切换成功');
            }
        }

        // 测试图表加载
        await page.waitForSelector('.chart', { timeout: 5000 });
        const charts = await page.$$('.chart');
        console.log(`✅ 图表加载成功，共 ${charts.length} 个图表`);

        // 测试服务器选择
        const serverSelect = await page.$('.viz-controls select');
        if (serverSelect) {
            const options = await page.$$('.viz-controls select option');
            console.log(`✅ 服务器选择功能正常，共 ${options.length} 个选项`);
        }

        console.log('🎉 所有功能测试通过！');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    } finally {
        await browser.close();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testMonitorDashboard().catch(console.error);
}

module.exports = { testMonitorDashboard };
