// 全局变量
let apiKeysData = null;

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', loadData);

// 从 Gist 加载数据
async function loadData() {
    try {
        const response = await fetch(`https://api.github.com/gists/${CONFIG.GIST_ID}`, {
            headers: {
                'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('无法加载数据');
        }

        const gist = await response.json();
        const content = gist.files[CONFIG.GIST_FILENAME].content;
        apiKeysData = JSON.parse(content);

        updateRemainingCount();
    } catch (error) {
        console.error('加载失败:', error);
        document.getElementById('remaining-count').textContent = '加载失败';
        showError('数据加载失败，请刷新重试');
    }
}

// 更新剩余数量显示
function updateRemainingCount() {
    const available = apiKeysData.keys.filter(k => !k.claimed).length;
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

    // 查找可用的 Key
    const availableKey = apiKeysData.keys.find(k => !k.claimed);
    if (!availableKey) {
        showError('抱歉，API Key 已全部领完');
        return;
    }

    // 禁用按钮
    const btn = document.getElementById('apply-btn');
    btn.disabled = true;
    btn.textContent = '申请中...';

    try {
        // 标记为已领取
        availableKey.claimed = true;
        availableKey.claimedBy = name;
        availableKey.claimedAt = new Date().toISOString();

        // 更新 Gist
        await updateGist();

        // 显示结果
        showResult(availableKey.key);
    } catch (error) {
        // 回滚
        availableKey.claimed = false;
        delete availableKey.claimedBy;
        delete availableKey.claimedAt;

        showError('申请失败，请重试');
        btn.disabled = false;
        btn.textContent = '确认申请';
    }
}

// 更新 Gist 数据
async function updateGist() {
    const response = await fetch(`https://api.github.com/gists/${CONFIG.GIST_ID}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: {
                [CONFIG.GIST_FILENAME]: {
                    content: JSON.stringify(apiKeysData, null, 2)
                }
            }
        })
    });

    if (!response.ok) {
        throw new Error('更新失败');
    }
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
