// 全局变量
let apiKeysData = null;

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', loadData);

// 从 JSONBin 加载数据
async function loadData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Bin-Meta': 'false' }
        });

        if (!response.ok) throw new Error('无法加载数据');

        apiKeysData = await response.json();
        updateRemainingCount();
    } catch (error) {
        console.error('加载失败:', error);
        document.getElementById('remaining-count').textContent = '加载失败';
        showError('数据加载失败，请刷新重试');
    }
}

// 更新剩余数量显示（当前轮次剩余）
function updateRemainingCount() {
    const minClaimCount = Math.min(...apiKeysData.keys.map(k => k.claimCount || 0));
    const available = apiKeysData.keys.filter(k => (k.claimCount || 0) === minClaimCount).length;
    document.getElementById('remaining-count').textContent = available;
}

// 申请 API Key
async function applyKey() {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();

    if (!name) {
        showError('请输入您的名字');
        return;
    }

    if (!apiKeysData) {
        showError('数据未加载，请刷新页面');
        return;
    }

    // 检查名字在当前轮次是否已领取过
    const minClaimCount = Math.min(...apiKeysData.keys.map(k => k.claimCount || 0));
    const currentRoundClaims = apiKeysData.keys.filter(k =>
        (k.claimCount || 0) > minClaimCount ||
        ((k.claimCount || 0) === minClaimCount && k.claimedBy === name)
    );
    const alreadyClaimedThisRound = currentRoundClaims.find(k => k.claimedBy === name);
    if (alreadyClaimedThisRound) {
        showError('您在本轮已领取过 API Key，请等待下一轮');
        return;
    }

    // 找当前轮次中未被领取的 key（claimCount 最小的）
    const availableKey = apiKeysData.keys.find(k => (k.claimCount || 0) === minClaimCount);
    if (!availableKey) {
        showError('系统错误，请刷新重试');
        return;
    }

    const btn = document.getElementById('apply-btn');
    btn.disabled = true;
    btn.textContent = '申请中...';

    try {
        availableKey.claimCount = (availableKey.claimCount || 0) + 1;
        availableKey.claimedBy = name;
        availableKey.claimedAt = new Date().toISOString();

        await updateBin();
        showResult(availableKey.key);
    } catch (error) {
        availableKey.claimCount = (availableKey.claimCount || 1) - 1;
        delete availableKey.claimedBy;
        delete availableKey.claimedAt;

        showError('申请失败，请重试');
        btn.disabled = false;
        btn.textContent = '确认申请';
    }
}

// 更新 JSONBin 数据
async function updateBin() {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': CONFIG.MASTER_KEY
        },
        body: JSON.stringify(apiKeysData)
    });

    if (!response.ok) throw new Error('更新失败');
}

// 显示申请结果
function showResult(key) {
    document.getElementById('apply-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('api-key-display').textContent = key;
    updateRemainingCount();
}

// 显示错误信息
function showError(msg) {
    document.getElementById('error-section').style.display = 'block';
    document.getElementById('error-msg').textContent = msg;
}

// 复制 API Key
function copyKey() {
    const key = document.getElementById('api-key-display').textContent;
    navigator.clipboard.writeText(key).then(() => {
        alert('已复制到剪贴板');
    }).catch(() => {
        alert('复制失败，请手动复制');
    });
}
